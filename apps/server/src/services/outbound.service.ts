import { eq, and, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { logger } from "../config/logger.js";
import * as schema from "../db/schema.js";
import { createOutboundCall } from "./vapi.service.js";
import { broadcastToBusiness } from "../websocket/live-monitor.js";
import { checkMinuteLimit } from "./usage.service.js";
import type { CampaignSchedule } from "@callo/shared";

// ── Types ──────────────────────────────────────────
interface CampaignState {
  campaignId: string;
  businessId: string;
  isRunning: boolean;
  activeCallIds: Set<string>;       // Track individual call IDs
  maxConcurrentCalls: number;
  retryAttempts: number;
  schedule: CampaignSchedule;
  intervalId?: ReturnType<typeof setInterval>;
  scheduleCheckId?: ReturnType<typeof setInterval>;
  // Token bucket rate limiter (calls per minute)
  rateLimiter: {
    tokens: number;
    maxTokens: number;
    lastRefill: number;             // ms timestamp
    refillRate: number;             // tokens per ms
  };
}

// Default calls per minute (no DB column for this)
const DEFAULT_CALLS_PER_MINUTE = 5;

// Track running campaigns in memory
const runningCampaigns = new Map<string, CampaignState>();

// ── Token Bucket Rate Limiter ─────────────────────

function createRateLimiter(callsPerMinute: number) {
  return {
    tokens: callsPerMinute,
    maxTokens: callsPerMinute,
    lastRefill: Date.now(),
    refillRate: callsPerMinute / 60_000, // tokens per ms
  };
}

function tryConsumeToken(state: CampaignState): boolean {
  const now = Date.now();
  const elapsed = now - state.rateLimiter.lastRefill;

  // Refill tokens based on elapsed time
  state.rateLimiter.tokens = Math.min(
    state.rateLimiter.maxTokens,
    state.rateLimiter.tokens + elapsed * state.rateLimiter.refillRate
  );
  state.rateLimiter.lastRefill = now;

  if (state.rateLimiter.tokens >= 1) {
    state.rateLimiter.tokens -= 1;
    return true;
  }
  return false;
}

// ── Business Hours Check ──────────────────────────

function isWithinSchedule(schedule: CampaignSchedule): boolean {
  try {
    // Get current time in the campaign's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: schedule.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: schedule.timezone,
      weekday: "short",
    });

    const timeParts = formatter.formatToParts(now);
    const hour = parseInt(timeParts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(timeParts.find((p) => p.type === "minute")?.value || "0", 10);
    const currentMinutes = hour * 60 + minute;

    // Get day of week (0 = Sunday)
    const dayStr = dayFormatter.format(now);
    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const currentDay = dayMap[dayStr] ?? new Date().getDay();

    // Check day of week
    if (!schedule.daysOfWeek.includes(currentDay)) {
      return false;
    }

    // Parse start/end times
    const [startH, startM] = schedule.startTime.split(":").map(Number);
    const [endH, endM] = schedule.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    // If timezone parsing fails, allow calls (fail open)
    logger.warn({ schedule }, "Failed to parse campaign schedule, allowing calls");
    return true;
  }
}

function msUntilNextScheduleWindow(schedule: CampaignSchedule): number {
  // Conservative estimate: check again in 1 minute
  // A more precise calculation would involve timezone math,
  // but frequent checks are cheap and more robust
  return 60_000;
}

// ── Start Campaign ─────────────────────────────────

export async function startCampaign(campaignId: string): Promise<void> {
  try {
    // If already running, skip
    if (runningCampaigns.has(campaignId)) {
      logger.warn({ campaignId }, "Campaign already running in this process");
      return;
    }

    const [campaign] = await db
      .select()
      .from(schema.campaigns)
      .where(eq(schema.campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (
      campaign.status !== "draft" &&
      campaign.status !== "paused" &&
      campaign.status !== "scheduled" &&
      campaign.status !== "running" // Allow re-attach if DB says running
    ) {
      throw new Error(`Campaign ${campaignId} cannot be started (status: ${campaign.status})`);
    }

    // Update campaign status to running
    await db
      .update(schema.campaigns)
      .set({
        status: "running",
        startedAt: campaign.startedAt || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.campaigns.id, campaignId));

    const schedule = campaign.schedule as CampaignSchedule;

    // Initialize campaign state
    const state: CampaignState = {
      campaignId,
      businessId: campaign.businessId,
      isRunning: true,
      activeCallIds: new Set(),
      maxConcurrentCalls: campaign.maxConcurrentCalls,
      retryAttempts: campaign.retryAttempts,
      schedule,
      rateLimiter: createRateLimiter(DEFAULT_CALLS_PER_MINUTE),
    };

    // Set up lead-processing interval
    state.intervalId = setInterval(async () => {
      if (!state.isRunning) return;

      // Check business hours
      if (!isWithinSchedule(state.schedule)) {
        logger.info({ campaignId }, "Outside schedule hours, auto-pausing campaign");
        await autoPauseForSchedule(campaignId);
        return;
      }

      // Only start new calls if under concurrency limit
      if (state.activeCallIds.size < state.maxConcurrentCalls) {
        // Check rate limit
        if (tryConsumeToken(state)) {
          await processNextLead(campaignId);
        } else {
          logger.debug({ campaignId }, "Rate limit reached, waiting for next token");
        }
      }
    }, 3000); // Check every 3 seconds

    runningCampaigns.set(campaignId, state);

    // Broadcast campaign started
    broadcastToBusiness(campaign.businessId, "campaign_progress", {
      campaignId,
      status: "running",
      totalLeads: campaign.totalLeads,
      completedLeads: campaign.completedLeads,
      successfulLeads: campaign.successfulLeads,
      failedLeads: campaign.failedLeads,
      activeCalls: 0,
    });

    logger.info(
      {
        campaignId,
        maxConcurrent: campaign.maxConcurrentCalls,
        retryAttempts: campaign.retryAttempts,
      },
      "Campaign started"
    );
  } catch (error) {
    logger.error({ error, campaignId }, "Failed to start campaign");
    throw error;
  }
}

// ── Auto-pause for Schedule ───────────────────────

async function autoPauseForSchedule(campaignId: string): Promise<void> {
  const state = runningCampaigns.get(campaignId);
  if (!state) return;

  state.isRunning = false;
  if (state.intervalId) clearInterval(state.intervalId);
  if (state.scheduleCheckId) clearInterval(state.scheduleCheckId);

  // Update DB
  await db
    .update(schema.campaigns)
    .set({
      status: "paused",
      updatedAt: new Date(),
    })
    .where(eq(schema.campaigns.id, campaignId));

  // Broadcast
  broadcastToBusiness(state.businessId, "campaign_progress", {
    campaignId,
    status: "paused",
    reason: "outside_schedule",
  });

  // Set a timer to check when we can resume
  state.scheduleCheckId = setInterval(async () => {
    if (isWithinSchedule(state.schedule)) {
      // Clear the schedule check
      if (state.scheduleCheckId) clearInterval(state.scheduleCheckId);
      state.scheduleCheckId = undefined;
      // Remove old state and restart
      runningCampaigns.delete(campaignId);
      logger.info({ campaignId }, "Schedule window opened, auto-resuming campaign");
      await startCampaign(campaignId);
    }
  }, msUntilNextScheduleWindow(state.schedule));

  logger.info({ campaignId }, "Campaign auto-paused (outside schedule hours)");
}

// ── Pause Campaign ─────────────────────────────────

export async function pauseCampaign(campaignId: string): Promise<void> {
  try {
    const state = runningCampaigns.get(campaignId);

    if (state) {
      state.isRunning = false;
      if (state.intervalId) clearInterval(state.intervalId);
      if (state.scheduleCheckId) clearInterval(state.scheduleCheckId);
      runningCampaigns.delete(campaignId);
    }

    await db
      .update(schema.campaigns)
      .set({
        status: "paused",
        updatedAt: new Date(),
      })
      .where(eq(schema.campaigns.id, campaignId));

    if (state) {
      broadcastToBusiness(state.businessId, "campaign_progress", {
        campaignId,
        status: "paused",
      });
    }

    logger.info({ campaignId }, "Campaign paused");
  } catch (error) {
    logger.error({ error, campaignId }, "Failed to pause campaign");
    throw error;
  }
}

// ── Cancel Campaign ────────────────────────────────

export async function cancelCampaign(campaignId: string): Promise<void> {
  try {
    const state = runningCampaigns.get(campaignId);

    if (state) {
      state.isRunning = false;
      if (state.intervalId) clearInterval(state.intervalId);
      if (state.scheduleCheckId) clearInterval(state.scheduleCheckId);
      runningCampaigns.delete(campaignId);
    }

    // Mark all pending/calling leads as skipped
    await db
      .update(schema.campaignLeads)
      .set({
        status: "skipped",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.campaignLeads.campaignId, campaignId),
          eq(schema.campaignLeads.status, "pending")
        )
      );

    await db
      .update(schema.campaigns)
      .set({
        status: "canceled",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.campaigns.id, campaignId));

    if (state) {
      broadcastToBusiness(state.businessId, "campaign_progress", {
        campaignId,
        status: "canceled",
      });
    }

    logger.info({ campaignId }, "Campaign canceled");
  } catch (error) {
    logger.error({ error, campaignId }, "Failed to cancel campaign");
    throw error;
  }
}

// ── Process Next Lead ──────────────────────────────

export async function processNextLead(campaignId: string): Promise<void> {
  try {
    const state = runningCampaigns.get(campaignId);
    if (!state || !state.isRunning) return;

    // Double-check concurrency
    if (state.activeCallIds.size >= state.maxConcurrentCalls) return;

    // Check usage limits before placing outbound call
    const usageCheck = await checkMinuteLimit(state.businessId);
    if (!usageCheck.allowed) {
      logger.warn(
        {
          campaignId,
          businessId: state.businessId,
          minutesUsed: usageCheck.minutesUsed,
          minuteLimit: usageCheck.minuteLimit,
        },
        "Usage limit reached — auto-pausing campaign"
      );

      // Auto-pause the campaign
      await pauseCampaign(campaignId);

      // Broadcast usage limit reached event
      broadcastToBusiness(state.businessId, "usage_limit_reached", {
        campaignId,
        minutesUsed: usageCheck.minutesUsed,
        minuteLimit: usageCheck.minuteLimit,
        remainingMinutes: usageCheck.remainingMinutes,
        message: "Campaign paused: monthly minute limit reached. Please upgrade your plan to continue.",
      });

      return;
    }

    // Find the next pending lead (including those marked for retry)
    const [nextCampaignLead] = await db
      .select()
      .from(schema.campaignLeads)
      .where(
        and(
          eq(schema.campaignLeads.campaignId, campaignId),
          eq(schema.campaignLeads.status, "pending")
        )
      )
      .limit(1);

    if (!nextCampaignLead) {
      // Check if there are still active calls — if so, wait for them
      if (state.activeCallIds.size > 0) {
        logger.debug(
          { campaignId, activeCalls: state.activeCallIds.size },
          "No pending leads but calls still active, waiting"
        );
        return;
      }

      logger.info({ campaignId }, "No more pending leads, completing campaign");
      await completeCampaign(campaignId);
      return;
    }

    // Look up the lead contact info
    const [lead] = await db
      .select()
      .from(schema.leads)
      .where(eq(schema.leads.id, nextCampaignLead.leadId))
      .limit(1);

    if (!lead) {
      await db
        .update(schema.campaignLeads)
        .set({ status: "skipped", updatedAt: new Date() })
        .where(eq(schema.campaignLeads.id, nextCampaignLead.id));

      broadcastToBusiness(state.businessId, "campaign_lead_updated", {
        campaignId,
        campaignLeadId: nextCampaignLead.id,
        leadId: nextCampaignLead.leadId,
        status: "skipped",
      });
      return;
    }

    // Look up campaign for phone number
    const [campaign] = await db
      .select()
      .from(schema.campaigns)
      .where(eq(schema.campaigns.id, campaignId))
      .limit(1);

    if (!campaign) return;

    const [phoneNumber] = await db
      .select()
      .from(schema.phoneNumbers)
      .where(eq(schema.phoneNumbers.id, campaign.phoneNumberId))
      .limit(1);

    if (!phoneNumber) {
      logger.error({ campaignId, phoneNumberId: campaign.phoneNumberId }, "Phone number not found");
      return;
    }

    // Mark campaign lead as "calling"
    await db
      .update(schema.campaignLeads)
      .set({
        status: "calling",
        attempts: nextCampaignLead.attempts + 1,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.campaignLeads.id, nextCampaignLead.id));

    broadcastToBusiness(state.businessId, "campaign_lead_updated", {
      campaignId,
      campaignLeadId: nextCampaignLead.id,
      leadId: nextCampaignLead.leadId,
      leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || undefined,
      leadPhone: lead.phone,
      status: "calling",
      attempt: nextCampaignLead.attempts + 1,
    });

    // Use the campaign lead ID as a tracking identifier
    const trackingId = nextCampaignLead.id;
    state.activeCallIds.add(trackingId);

    // Initiate outbound call via Vapi
    try {
      const vapiCall = await createOutboundCall({
        phoneNumberId: phoneNumber.twilioSid, // Vapi phone number ID
        customer: {
          number: lead.phone,
          name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || undefined,
        },
        assistantId: undefined, // Will use assistant-request webhook
      });

      logger.info(
        {
          campaignId,
          leadId: lead.id,
          campaignLeadId: nextCampaignLead.id,
          vapiCallId: vapiCall.id,
          activeCalls: state.activeCallIds.size,
        },
        "Outbound call initiated via Vapi"
      );
    } catch (error) {
      logger.error(
        { error, campaignId, leadId: lead.id },
        "Failed to initiate outbound call"
      );

      // Remove from active calls
      state.activeCallIds.delete(trackingId);

      // Determine if we should retry
      const currentAttempts = nextCampaignLead.attempts + 1;
      if (currentAttempts < state.retryAttempts) {
        // Schedule for retry: set back to pending so it's picked up again
        await db
          .update(schema.campaignLeads)
          .set({
            status: "pending",
            updatedAt: new Date(),
          })
          .where(eq(schema.campaignLeads.id, nextCampaignLead.id));

        broadcastToBusiness(state.businessId, "campaign_lead_updated", {
          campaignId,
          campaignLeadId: nextCampaignLead.id,
          leadId: nextCampaignLead.leadId,
          status: "pending",
          reason: "retry_scheduled",
          attempt: currentAttempts,
          maxAttempts: state.retryAttempts,
        });

        logger.info(
          { campaignId, leadId: lead.id, attempt: currentAttempts, maxAttempts: state.retryAttempts },
          "Call failed, scheduling retry"
        );
      } else {
        // Max retries exceeded
        await db
          .update(schema.campaignLeads)
          .set({
            status: "failed",
            outcome: "max_retries_exceeded",
            updatedAt: new Date(),
          })
          .where(eq(schema.campaignLeads.id, nextCampaignLead.id));

        // Update campaign failed counter
        await db
          .update(schema.campaigns)
          .set({
            failedLeads: sql`${schema.campaigns.failedLeads} + 1`,
            completedLeads: sql`${schema.campaigns.completedLeads} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(schema.campaigns.id, campaignId));

        broadcastToBusiness(state.businessId, "campaign_lead_updated", {
          campaignId,
          campaignLeadId: nextCampaignLead.id,
          leadId: nextCampaignLead.leadId,
          status: "failed",
          outcome: "max_retries_exceeded",
        });

        logger.warn(
          { campaignId, leadId: lead.id, attempts: currentAttempts },
          "Lead failed after max retries"
        );

        // Broadcast updated stats
        await broadcastCampaignProgress(campaignId, state.businessId, state.activeCallIds.size);
      }
    }
  } catch (error) {
    logger.error({ error, campaignId }, "Failed to process next lead");
  }
}

// ── On Outbound Call Completed ─────────────────────
// Called from vapi webhook when an outbound campaign call finishes

export async function onOutboundCallCompleted(
  callId: string,
  campaignId: string,
  outcome: string
): Promise<void> {
  try {
    const state = runningCampaigns.get(campaignId);

    // Find the campaign lead that is currently "calling" for this campaign
    // We match by callId if it was linked, or find by status "calling"
    const [campaignLead] = await db
      .select()
      .from(schema.campaignLeads)
      .where(
        and(
          eq(schema.campaignLeads.campaignId, campaignId),
          eq(schema.campaignLeads.callId, callId)
        )
      )
      .limit(1);

    // If not found by callId, try to find a "calling" lead
    let targetLead = campaignLead;
    if (!targetLead) {
      const [callingLead] = await db
        .select()
        .from(schema.campaignLeads)
        .where(
          and(
            eq(schema.campaignLeads.campaignId, campaignId),
            eq(schema.campaignLeads.status, "calling")
          )
        )
        .limit(1);
      targetLead = callingLead;
    }

    if (!targetLead) {
      logger.warn(
        { callId, campaignId },
        "No campaign lead found for completed outbound call"
      );
      return;
    }

    // Determine if the call outcome warrants a retry
    const failureOutcomes = [
      "no-answer",
      "busy",
      "voicemail",
      "failed",
      "machine-end-other",
      "customer-busy",
      "customer-no-answer",
    ];

    const isFailure = failureOutcomes.some((fo) =>
      outcome.toLowerCase().includes(fo.toLowerCase())
    );

    // Look up the campaign for retry config
    const [campaign] = await db
      .select()
      .from(schema.campaigns)
      .where(eq(schema.campaigns.id, campaignId))
      .limit(1);

    const maxRetries = campaign?.retryAttempts ?? state?.retryAttempts ?? 2;

    if (isFailure && targetLead.attempts < maxRetries) {
      // Retry: set back to pending with exponential backoff delay
      // The backoff is implicit — the lead will be picked up in the next cycle
      // but we increment attempts so the token bucket naturally spaces them out
      await db
        .update(schema.campaignLeads)
        .set({
          status: "pending",
          callId,
          outcome,
          updatedAt: new Date(),
        })
        .where(eq(schema.campaignLeads.id, targetLead.id));

      const businessId = state?.businessId || campaign?.businessId;
      if (businessId) {
        broadcastToBusiness(businessId, "campaign_lead_updated", {
          campaignId,
          campaignLeadId: targetLead.id,
          leadId: targetLead.leadId,
          status: "pending",
          reason: "retry_after_failure",
          outcome,
          attempt: targetLead.attempts,
          maxAttempts: maxRetries,
        });
      }

      logger.info(
        {
          campaignId,
          campaignLeadId: targetLead.id,
          outcome,
          attempt: targetLead.attempts,
          maxRetries,
        },
        "Call failed, lead queued for retry"
      );
    } else {
      // Final outcome: mark as completed or failed
      const finalStatus = isFailure ? "failed" : "completed";

      await db
        .update(schema.campaignLeads)
        .set({
          status: finalStatus,
          callId,
          outcome,
          updatedAt: new Date(),
        })
        .where(eq(schema.campaignLeads.id, targetLead.id));

      // Update campaign aggregate counters
      const updates: Record<string, unknown> = {
        completedLeads: sql`${schema.campaigns.completedLeads} + 1`,
        updatedAt: new Date(),
      };

      if (isFailure) {
        updates.failedLeads = sql`${schema.campaigns.failedLeads} + 1`;
      } else {
        updates.successfulLeads = sql`${schema.campaigns.successfulLeads} + 1`;
      }

      await db
        .update(schema.campaigns)
        .set(updates)
        .where(eq(schema.campaigns.id, campaignId));

      const businessId = state?.businessId || campaign?.businessId;
      if (businessId) {
        broadcastToBusiness(businessId, "campaign_lead_updated", {
          campaignId,
          campaignLeadId: targetLead.id,
          leadId: targetLead.leadId,
          status: finalStatus,
          outcome,
        });

        // Broadcast updated campaign progress
        const activeCalls = state?.activeCallIds.size ?? 0;
        await broadcastCampaignProgress(campaignId, businessId, activeCalls);
      }

      logger.info(
        {
          campaignId,
          campaignLeadId: targetLead.id,
          callId,
          outcome,
          finalStatus,
        },
        "Campaign lead call completed"
      );
    }

    // Remove from active calls tracking
    if (state) {
      // Remove by campaign lead ID (our tracking key)
      state.activeCallIds.delete(targetLead.id);

      // Check if the campaign is done
      const [pendingCheck] = await db
        .select({ cnt: sql<number>`count(*)` })
        .from(schema.campaignLeads)
        .where(
          and(
            eq(schema.campaignLeads.campaignId, campaignId),
            sql`${schema.campaignLeads.status} IN ('pending', 'calling')`
          )
        );

      if (pendingCheck && pendingCheck.cnt === 0 && state.activeCallIds.size === 0) {
        logger.info({ campaignId }, "All leads processed, completing campaign");
        await completeCampaign(campaignId);
      }
    }
  } catch (error) {
    logger.error({ error, callId, campaignId }, "Failed to handle outbound call completion");
  }
}

// ── Complete Campaign ──────────────────────────────

async function completeCampaign(campaignId: string): Promise<void> {
  const state = runningCampaigns.get(campaignId);

  if (state) {
    state.isRunning = false;
    if (state.intervalId) clearInterval(state.intervalId);
    if (state.scheduleCheckId) clearInterval(state.scheduleCheckId);
  }

  runningCampaigns.delete(campaignId);

  await db
    .update(schema.campaigns)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.campaigns.id, campaignId));

  // Fetch final stats for broadcast
  const [campaign] = await db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.id, campaignId))
    .limit(1);

  if (campaign) {
    broadcastToBusiness(campaign.businessId, "campaign_completed", {
      campaignId,
      totalLeads: campaign.totalLeads,
      completedLeads: campaign.completedLeads,
      successfulLeads: campaign.successfulLeads,
      failedLeads: campaign.failedLeads,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
    });
  }

  logger.info({ campaignId }, "Campaign completed");
}

// ── Broadcast Campaign Progress ───────────────────

async function broadcastCampaignProgress(
  campaignId: string,
  businessId: string,
  activeCalls: number
): Promise<void> {
  const [campaign] = await db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.id, campaignId))
    .limit(1);

  if (campaign) {
    broadcastToBusiness(businessId, "campaign_progress", {
      campaignId,
      status: campaign.status,
      totalLeads: campaign.totalLeads,
      completedLeads: campaign.completedLeads,
      successfulLeads: campaign.successfulLeads,
      failedLeads: campaign.failedLeads,
      activeCalls,
    });
  }
}

// ── Get Running Campaign State ─────────────────────

export function getCampaignState(campaignId: string): CampaignState | undefined {
  return runningCampaigns.get(campaignId);
}
