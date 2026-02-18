import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { calls, usageRecords, subscriptions, businesses } from "../db/schema.js";
import { logger } from "../config/logger.js";
import { broadcastToBusiness } from "../websocket/live-monitor.js";
import { COST_PER_MINUTE_CENTS } from "@callo/shared";

// ── Types ──────────────────────────────────────────

export interface MinuteLimitCheck {
  allowed: boolean;
  minutesUsed: number;
  minuteLimit: number;
  remainingMinutes: number;
}

export interface DailyUsageData {
  date: string;
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  totalMinutes: number;
  totalCostCents: number;
}

// ── Constants ──────────────────────────────────────

const FREE_TIER_MINUTES = 100;
const DEFAULT_STARTER_MINUTES = 1000;
const USAGE_THRESHOLD_WARNING = 0.8; // 80%
const USAGE_THRESHOLD_CRITICAL = 0.95; // 95%

// ── Track Call Minutes ─────────────────────────────
// Records call duration in usage_records table, updates daily rollup

export async function trackCallMinutes(
  businessId: string,
  callId: string,
  durationSeconds: number
): Promise<void> {
  try {
    const minutes = Math.ceil(durationSeconds / 60);
    const costCents = minutes * COST_PER_MINUTE_CENTS;
    const today = new Date().toISOString().split("T")[0];

    // Determine call direction for the rollup
    const [callRecord] = await db
      .select({ direction: calls.direction })
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    const isInbound = callRecord?.direction === "inbound";

    // Upsert the daily usage record
    await db
      .insert(usageRecords)
      .values({
        businessId,
        date: today,
        totalCalls: 1,
        inboundCalls: isInbound ? 1 : 0,
        outboundCalls: isInbound ? 0 : 1,
        totalMinutes: minutes,
        appointmentsBooked: 0,
        leadsCaptured: 0,
        totalCostCents: costCents,
      })
      .onConflictDoUpdate({
        target: [usageRecords.businessId, usageRecords.date],
        set: {
          totalCalls: sql`${usageRecords.totalCalls} + 1`,
          inboundCalls: isInbound
            ? sql`${usageRecords.inboundCalls} + 1`
            : sql`${usageRecords.inboundCalls}`,
          outboundCalls: isInbound
            ? sql`${usageRecords.outboundCalls}`
            : sql`${usageRecords.outboundCalls} + 1`,
          totalMinutes: sql`${usageRecords.totalMinutes} + ${minutes}`,
          totalCostCents: sql`${usageRecords.totalCostCents} + ${costCents}`,
        },
      });

    // Also update the subscription's minutesUsed counter
    await db
      .update(subscriptions)
      .set({
        minutesUsed: sql`${subscriptions.minutesUsed} + ${minutes}`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.businessId, businessId));

    logger.info(
      { businessId, callId, durationSeconds, minutes, costCents },
      "Call minutes tracked"
    );
  } catch (error) {
    logger.error({ error, businessId, callId }, "Failed to track call minutes");
  }
}

// ── Get Monthly Usage ──────────────────────────────
// Calculates total minutes used in current billing period by summing
// call durations from the calls table

export async function getMonthlyUsage(businessId: string): Promise<number> {
  try {
    // Look up the subscription to find the current billing period
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.businessId, businessId))
      .limit(1);

    let periodStart: Date;
    let periodEnd: Date;

    if (subscription) {
      periodStart = new Date(subscription.currentPeriodStart);
      periodEnd = new Date(subscription.currentPeriodEnd);
    } else {
      // No subscription: use calendar month
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // Sum call durations from the calls table for the billing period
    const [result] = await db
      .select({
        totalSeconds: sql<number>`coalesce(sum(${calls.durationSeconds}), 0)`,
      })
      .from(calls)
      .where(
        and(
          eq(calls.businessId, businessId),
          eq(calls.status, "completed"),
          gte(calls.startedAt, periodStart),
          lte(calls.startedAt, periodEnd)
        )
      );

    const totalMinutes = Math.ceil((result?.totalSeconds ?? 0) / 60);
    return totalMinutes;
  } catch (error) {
    logger.error({ error, businessId }, "Failed to get monthly usage");
    return 0;
  }
}

// ── Check Minute Limit ─────────────────────────────
// Returns whether the business is allowed to make/receive calls

export async function checkMinuteLimit(businessId: string): Promise<MinuteLimitCheck> {
  try {
    // Look up subscription for minute limit
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.businessId, businessId))
      .limit(1);

    let minuteLimit: number;

    if (subscription && (subscription.status === "active" || subscription.status === "trialing")) {
      minuteLimit = subscription.minutesIncluded || DEFAULT_STARTER_MINUTES;
    } else {
      // No active subscription — use free tier
      minuteLimit = FREE_TIER_MINUTES;
    }

    const minutesUsed = await getMonthlyUsage(businessId);
    const remainingMinutes = Math.max(0, minuteLimit - minutesUsed);
    const allowed = minutesUsed < minuteLimit;

    return {
      allowed,
      minutesUsed,
      minuteLimit,
      remainingMinutes,
    };
  } catch (error) {
    logger.error({ error, businessId }, "Failed to check minute limit");
    // Fail open — allow the call if we can't check
    return {
      allowed: true,
      minutesUsed: 0,
      minuteLimit: DEFAULT_STARTER_MINUTES,
      remainingMinutes: DEFAULT_STARTER_MINUTES,
    };
  }
}

// ── Get Daily Usage Rollup ─────────────────────────
// Returns daily usage data for analytics charts

export async function getDailyUsageRollup(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<DailyUsageData[]> {
  try {
    const rows = await db
      .select({
        date: usageRecords.date,
        totalCalls: usageRecords.totalCalls,
        inboundCalls: usageRecords.inboundCalls,
        outboundCalls: usageRecords.outboundCalls,
        totalMinutes: usageRecords.totalMinutes,
        totalCostCents: usageRecords.totalCostCents,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.businessId, businessId),
          gte(usageRecords.date, startDate),
          lte(usageRecords.date, endDate)
        )
      )
      .orderBy(usageRecords.date);

    return rows;
  } catch (error) {
    logger.error({ error, businessId, startDate, endDate }, "Failed to get daily usage rollup");
    return [];
  }
}

// ── Check and Notify Usage Thresholds ──────────────
// If usage hits 80% or 95%, broadcast a WebSocket alert

export async function checkAndNotifyUsageThresholds(businessId: string): Promise<void> {
  try {
    const { minutesUsed, minuteLimit } = await checkMinuteLimit(businessId);

    if (minuteLimit === 0) return;

    const usagePercent = minutesUsed / minuteLimit;

    if (usagePercent >= USAGE_THRESHOLD_CRITICAL) {
      broadcastToBusiness(businessId, "usage_alert", {
        level: "critical",
        message: `You have used ${minutesUsed} of ${minuteLimit} minutes (${Math.round(usagePercent * 100)}%). Your calls will be restricted when you reach your limit.`,
        minutesUsed,
        minuteLimit,
        remainingMinutes: Math.max(0, minuteLimit - minutesUsed),
        usagePercent: Math.round(usagePercent * 100),
      });

      logger.warn(
        { businessId, minutesUsed, minuteLimit, usagePercent: Math.round(usagePercent * 100) },
        "Business at critical usage threshold (95%+)"
      );
    } else if (usagePercent >= USAGE_THRESHOLD_WARNING) {
      broadcastToBusiness(businessId, "usage_alert", {
        level: "warning",
        message: `You have used ${minutesUsed} of ${minuteLimit} minutes (${Math.round(usagePercent * 100)}%). Consider upgrading your plan to avoid interruptions.`,
        minutesUsed,
        minuteLimit,
        remainingMinutes: Math.max(0, minuteLimit - minutesUsed),
        usagePercent: Math.round(usagePercent * 100),
      });

      logger.info(
        { businessId, minutesUsed, minuteLimit, usagePercent: Math.round(usagePercent * 100) },
        "Business at warning usage threshold (80%+)"
      );
    }
  } catch (error) {
    logger.error({ error, businessId }, "Failed to check usage thresholds");
  }
}
