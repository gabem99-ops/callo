import { Router, type Request, type Response } from "express";
import express from "express";
import { db } from "../config/db.js";
import { subscriptions, usageRecords } from "../db/schema.js";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { type AuthRequest, requireAuth, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { env } from "../config/env.js";
import { PLAN_CONFIGS } from "@callo/shared";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionDetails,
  getUsageSummary,
  handleWebhookEvent,
  constructWebhookEvent,
} from "../services/billing.service.js";

const router = Router();

// ── POST /webhook ─ Stripe webhook handler (no auth, raw body) ──
// This must be defined BEFORE the auth middleware.
// IMPORTANT: The raw body parsing is handled via express.raw() middleware
// applied specifically to this route, so Stripe signature verification works.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const sig = req.headers["stripe-signature"] as string;

      if (!sig) {
        logger.warn("Stripe webhook received without signature");
        res.sendStatus(400);
        return;
      }

      if (!env.STRIPE_WEBHOOK_SECRET) {
        logger.error("STRIPE_WEBHOOK_SECRET not configured");
        res.status(500).json({ error: "Webhook secret not configured" });
        return;
      }

      // Verify and construct the webhook event using the raw body
      let event;
      try {
        event = constructWebhookEvent(req.body, sig);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logger.warn({ err: message }, "Stripe webhook signature verification failed");
        res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
        return;
      }

      // Process the verified event
      await handleWebhookEvent(event);

      res.json({ received: true });
    } catch (error) {
      logger.error({ err: error }, "Error handling Stripe webhook");
      res.sendStatus(500);
    }
  }
);

// All remaining routes require auth and business
router.use(requireAuth);
router.use(requireBusiness);

// ── GET /plans ─ Return available plans ──
router.get("/plans", (_req: AuthRequest, res: Response) => {
  const plans = Object.values(PLAN_CONFIGS).map((config) => ({
    tier: config.tier,
    name: config.name,
    priceMonthly: config.priceMonthly,
    minutesIncluded: config.minutesIncluded,
    phoneNumbers: config.phoneNumbers,
    features: config.features,
  }));

  res.json({ data: plans });
});

// ── GET /subscription ─ Get current subscription for business ──
router.get("/subscription", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    const subscription = await getSubscriptionDetails(businessId);

    if (!subscription) {
      // Return null data instead of 404 so the frontend can handle "no subscription" gracefully
      res.json({ data: null });
      return;
    }

    res.json({ data: subscription });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error getting subscription");
    throw error;
  }
});

// ── GET /usage ─ Get usage stats for current period ──
router.get("/usage", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    // Get the usage summary from the billing service
    const summary = await getUsageSummary(businessId);

    if (!summary) {
      res.json({ data: null });
      return;
    }

    // Get the current subscription to determine the billing period
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.businessId, businessId))
      .limit(1);

    if (!subscription) {
      res.json({ data: null });
      return;
    }

    const periodStart = subscription.currentPeriodStart.toISOString().split("T")[0];
    const periodEnd = subscription.currentPeriodEnd.toISOString().split("T")[0];

    // Aggregate usage records for the current period
    const usage = await db
      .select({
        totalCalls: sql<number>`coalesce(sum(${usageRecords.totalCalls}), 0)`,
        inboundCalls: sql<number>`coalesce(sum(${usageRecords.inboundCalls}), 0)`,
        outboundCalls: sql<number>`coalesce(sum(${usageRecords.outboundCalls}), 0)`,
        totalMinutes: sql<number>`coalesce(sum(${usageRecords.totalMinutes}), 0)`,
        appointmentsBooked: sql<number>`coalesce(sum(${usageRecords.appointmentsBooked}), 0)`,
        leadsCaptured: sql<number>`coalesce(sum(${usageRecords.leadsCaptured}), 0)`,
        totalCostCents: sql<number>`coalesce(sum(${usageRecords.totalCostCents}), 0)`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.businessId, businessId),
          gte(usageRecords.date, periodStart),
          lte(usageRecords.date, periodEnd)
        )
      );

    // Get daily breakdown
    const dailyUsage = await db
      .select()
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.businessId, businessId),
          gte(usageRecords.date, periodStart),
          lte(usageRecords.date, periodEnd)
        )
      )
      .orderBy(usageRecords.date);

    res.json({
      data: {
        period: {
          start: subscription.currentPeriodStart,
          end: subscription.currentPeriodEnd,
        },
        plan: subscription.plan,
        minutesIncluded: subscription.minutesIncluded,
        minutesUsed: subscription.minutesUsed,
        minutesRemaining: Math.max(0, subscription.minutesIncluded - subscription.minutesUsed),
        percentUsed: summary.percentUsed,
        phoneNumbersUsed: summary.phoneNumbersUsed,
        phoneNumbersIncluded: summary.phoneNumbersIncluded,
        totals: usage[0],
        daily: dailyUsage,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error getting usage stats");
    throw error;
  }
});

// ── POST /checkout ─ Create Stripe checkout session ──
router.post("/checkout", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const { plan } = req.body;

    if (!plan || !["starter", "professional"].includes(plan)) {
      throw new AppError(400, "Invalid plan. Must be one of: starter, professional");
    }

    const returnUrl = `${env.CORS_ORIGIN}/dashboard/billing`;

    const result = await createCheckoutSession(businessId, plan, returnUrl);

    logger.info({ businessId, plan, sessionId: result.sessionId }, "Checkout session created");

    res.json({
      data: {
        url: result.url,
        sessionId: result.sessionId,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error creating checkout session");
    throw error;
  }
});

// ── POST /portal ─ Create Stripe customer portal session ──
router.post("/portal", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const returnUrl = `${env.CORS_ORIGIN}/dashboard/billing`;

    const result = await createPortalSession(businessId, returnUrl);

    logger.info({ businessId }, "Portal session created");

    res.json({
      data: {
        url: result.url,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error creating portal session");
    throw error;
  }
});

export default router;
