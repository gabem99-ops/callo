import { Router, type Response } from "express";
import { db } from "../config/db.js";
import { calls, usageRecords, subscriptions, campaigns } from "../db/schema.js";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { type AuthRequest, requireAuth, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { z } from "zod";
import {
  getMonthlyUsage,
  checkMinuteLimit,
  getDailyUsageRollup,
} from "../services/usage.service.js";

const router = Router();

// All routes require auth and business
router.use(requireAuth);
router.use(requireBusiness);

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
});

// ── GET /stats ─ Dashboard overview stats ──
router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    // Get subscription for minutes remaining
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.businessId, businessId))
      .limit(1);

    // Total calls this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    // Aggregate usage records for the current month
    const [monthlyUsage] = await db
      .select({
        totalCalls: sql<number>`coalesce(sum(${usageRecords.totalCalls}), 0)`,
        totalMinutes: sql<number>`coalesce(sum(${usageRecords.totalMinutes}), 0)`,
        appointmentsBooked: sql<number>`coalesce(sum(${usageRecords.appointmentsBooked}), 0)`,
        leadsCaptured: sql<number>`coalesce(sum(${usageRecords.leadsCaptured}), 0)`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.businessId, businessId),
          gte(usageRecords.date, monthStart),
          lte(usageRecords.date, monthEnd)
        )
      );

    // Average call duration
    const [avgDuration] = await db
      .select({
        avg: sql<number>`coalesce(avg(${calls.durationSeconds}), 0)`,
      })
      .from(calls)
      .where(
        and(
          eq(calls.businessId, businessId),
          eq(calls.status, "completed"),
          gte(calls.createdAt, new Date(monthStart))
        )
      );

    // Success rate (calls with positive outcomes / total completed calls)
    const [completedCalls] = await db
      .select({ total: count() })
      .from(calls)
      .where(
        and(
          eq(calls.businessId, businessId),
          eq(calls.status, "completed"),
          gte(calls.createdAt, new Date(monthStart))
        )
      );

    const [successfulCalls] = await db
      .select({ total: count() })
      .from(calls)
      .where(
        and(
          eq(calls.businessId, businessId),
          eq(calls.status, "completed"),
          gte(calls.createdAt, new Date(monthStart)),
          sql`${calls.outcome} IN ('appointment_booked', 'lead_captured', 'qualified', 'transferred')`
        )
      );

    const successRate = completedCalls.total > 0
      ? Math.round((successfulCalls.total / completedCalls.total) * 100)
      : 0;

    // Active campaigns count
    const [activeCampaigns] = await db
      .select({ total: count() })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.businessId, businessId),
          eq(campaigns.status, "running")
        )
      );

    const minutesRemaining = subscription
      ? Math.max(0, subscription.minutesIncluded - subscription.minutesUsed)
      : 0;

    res.json({
      data: {
        totalCalls: monthlyUsage.totalCalls,
        totalMinutes: Math.round(monthlyUsage.totalMinutes * 10) / 10,
        appointmentsBooked: monthlyUsage.appointmentsBooked,
        leadsCaptured: monthlyUsage.leadsCaptured,
        avgCallDuration: Math.round(avgDuration.avg),
        successRate,
        activeCampaigns: activeCampaigns.total,
        minutesRemaining: Math.round(minutesRemaining * 10) / 10,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error getting dashboard stats");
    throw error;
  }
});

// ── GET /call-volume ─ Call volume over time ──
router.get("/call-volume", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const { startDate, endDate } = dateRangeSchema.parse(req.query);

    const dailyVolume = await db
      .select({
        date: usageRecords.date,
        inbound: usageRecords.inboundCalls,
        outbound: usageRecords.outboundCalls,
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

    res.json({ data: dailyVolume });
  } catch (error) {
    logger.error({ err: error }, "Error getting call volume");
    throw error;
  }
});

// ── GET /outcomes ─ Outcome breakdown ──
router.get("/outcomes", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const { startDate, endDate } = dateRangeSchema.parse(req.query);

    // Get outcome counts for completed calls in the date range
    const outcomes = await db
      .select({
        outcome: calls.outcome,
        count: count(),
      })
      .from(calls)
      .where(
        and(
          eq(calls.businessId, businessId),
          eq(calls.status, "completed"),
          gte(calls.createdAt, new Date(startDate)),
          lte(calls.createdAt, new Date(endDate))
        )
      )
      .groupBy(calls.outcome);

    // Calculate total for percentages
    const total = outcomes.reduce((sum, o) => sum + o.count, 0);

    const data = outcomes.map((o) => ({
      outcome: o.outcome ?? "unknown",
      count: o.count,
      percentage: total > 0 ? Math.round((o.count / total) * 1000) / 10 : 0,
    }));

    res.json({ data });
  } catch (error) {
    logger.error({ err: error }, "Error getting outcome breakdown");
    throw error;
  }
});

// ── GET /usage ─ Monthly usage and daily breakdown ──
router.get("/usage", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const { startDate, endDate } = dateRangeSchema.parse(req.query);

    const [monthlyMinutes, dailyBreakdown, limitCheck] = await Promise.all([
      getMonthlyUsage(businessId),
      getDailyUsageRollup(businessId, startDate, endDate),
      checkMinuteLimit(businessId),
    ]);

    res.json({
      data: {
        monthly: {
          minutesUsed: monthlyMinutes,
          minuteLimit: limitCheck.minuteLimit,
          remainingMinutes: limitCheck.remainingMinutes,
          usagePercent:
            limitCheck.minuteLimit > 0
              ? Math.round((monthlyMinutes / limitCheck.minuteLimit) * 100)
              : 0,
        },
        daily: dailyBreakdown,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error getting usage data");
    throw error;
  }
});

// ── GET /usage/check ─ Limit check result ──
router.get("/usage/check", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const limitCheck = await checkMinuteLimit(businessId);

    res.json({
      data: limitCheck,
    });
  } catch (error) {
    logger.error({ err: error }, "Error checking usage limits");
    throw error;
  }
});

export default router;
