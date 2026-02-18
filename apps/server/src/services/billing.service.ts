import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";
import { PLAN_CONFIGS } from "@callo/shared";
import type { PlanTier } from "@callo/shared";

// ── Stripe Client ──────────────────────────────────
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

// ── Plan Price Mapping ─────────────────────────────
// Map plan tiers to Stripe price IDs (set via environment or defaults)
const PLAN_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || "price_starter_monthly",
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || "price_professional_monthly",
};

// ── Types ──────────────────────────────────────────
interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

interface PortalSessionResult {
  url: string;
}

interface SubscriptionDetails {
  id: string;
  businessId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: string;
  status: string;
  minutesIncluded: number;
  minutesUsed: number;
  phoneNumbersIncluded: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UsageSummary {
  minutesUsed: number;
  minutesIncluded: number;
  minutesRemaining: number;
  percentUsed: number;
  plan: string;
  phoneNumbersUsed: number;
  phoneNumbersIncluded: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

interface UsageLimitResult {
  allowed: boolean;
  minutesRemaining: number;
  minutesUsed: number;
  minutesIncluded: number;
  plan: string;
}

// ── Create or Get Stripe Customer ────────────────────
export async function createOrGetCustomer(
  businessId: string,
  email: string
): Promise<string> {
  // Check if we already have a subscription with a Stripe customer ID
  const [existing] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.businessId, businessId))
    .limit(1);

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  // Look up business for metadata
  const [business] = await db
    .select()
    .from(schema.businesses)
    .where(eq(schema.businesses.id, businessId))
    .limit(1);

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      businessId,
      businessName: business?.name ?? "",
    },
  });

  logger.info(
    { businessId, customerId: customer.id },
    "Created Stripe customer"
  );

  return customer.id;
}

// ── Create Checkout Session ────────────────────────
export async function createCheckoutSession(
  businessId: string,
  plan: PlanTier,
  returnUrl: string
): Promise<CheckoutSessionResult> {
  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for plan: ${plan}`);
  }

  // Look up the user email for Stripe customer creation
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.businessId, businessId))
    .limit(1);

  const email = user?.email ?? "";
  const stripeCustomerId = await createOrGetCustomer(businessId, email);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?canceled=true`,
    metadata: { businessId, plan },
    subscription_data: {
      metadata: { businessId, plan },
    },
  });

  logger.info(
    { businessId, plan, sessionId: session.id },
    "Created Stripe checkout session"
  );

  return {
    sessionId: session.id,
    url: session.url ?? "",
  };
}

// ── Create Portal Session ──────────────────────────
export async function createPortalSession(
  businessId: string,
  returnUrl: string
): Promise<PortalSessionResult> {
  // Get the subscription to find the Stripe customer ID
  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.businessId, businessId))
    .limit(1);

  if (!subscription?.stripeCustomerId) {
    throw new Error("No Stripe customer found for this business");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  logger.info(
    { businessId, customerId: subscription.stripeCustomerId },
    "Created Stripe portal session"
  );

  return {
    url: session.url,
  };
}

// ── Get Subscription Details ─────────────────────────
export async function getSubscriptionDetails(
  businessId: string
): Promise<SubscriptionDetails | null> {
  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.businessId, businessId))
    .limit(1);

  if (!subscription) {
    return null;
  }

  return subscription;
}

// ── Get Usage Summary ─────────────────────────────────
export async function getUsageSummary(
  businessId: string
): Promise<UsageSummary | null> {
  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.businessId, businessId))
    .limit(1);

  if (!subscription) {
    return null;
  }

  // Count active phone numbers for this business
  const phoneNumbers = await db
    .select()
    .from(schema.phoneNumbers)
    .where(eq(schema.phoneNumbers.businessId, businessId));

  const activePhoneNumbers = phoneNumbers.filter((p) => p.isActive).length;
  const minutesRemaining = Math.max(
    0,
    subscription.minutesIncluded - subscription.minutesUsed
  );

  return {
    minutesUsed: subscription.minutesUsed,
    minutesIncluded: subscription.minutesIncluded,
    minutesRemaining,
    percentUsed:
      subscription.minutesIncluded > 0
        ? Math.round(
            (subscription.minutesUsed / subscription.minutesIncluded) * 100
          )
        : 0,
    plan: subscription.plan,
    phoneNumbersUsed: activePhoneNumbers,
    phoneNumbersIncluded: subscription.phoneNumbersIncluded,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}

// ── Handle Webhook Event ───────────────────────────
export async function handleWebhookEvent(
  event: Stripe.Event
): Promise<void> {
  logger.info({ type: event.type, id: event.id }, "Processing Stripe webhook event");

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const businessId = session.metadata?.businessId;
      const plan = session.metadata?.plan as PlanTier;

      if (!businessId || !plan) {
        logger.warn(
          { sessionId: session.id },
          "checkout.session.completed missing businessId or plan in metadata"
        );
        break;
      }

      const planConfig = PLAN_CONFIGS[plan];
      if (!planConfig) {
        logger.warn({ plan }, "Unknown plan tier in checkout metadata");
        break;
      }

      // Retrieve the Stripe subscription to get period dates
      const stripeSubscriptionId = session.subscription as string;
      let periodStart = new Date();
      let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      if (stripeSubscriptionId) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          periodStart = new Date(stripeSub.current_period_start * 1000);
          periodEnd = new Date(stripeSub.current_period_end * 1000);
        } catch (err) {
          logger.warn({ err, stripeSubscriptionId }, "Failed to retrieve Stripe subscription for period dates");
        }
      }

      // Check if subscription record already exists for this business
      const [existing] = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.businessId, businessId))
        .limit(1);

      if (existing) {
        // Update the existing subscription
        await db
          .update(schema.subscriptions)
          .set({
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId,
            plan,
            status: "active",
            minutesIncluded: planConfig.minutesIncluded,
            phoneNumbersIncluded: planConfig.phoneNumbers,
            minutesUsed: 0,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.businessId, businessId));

        logger.info(
          { businessId, plan, subscriptionId: existing.id },
          "Updated existing subscription from checkout"
        );
      } else {
        // Create new subscription record
        await db.insert(schema.subscriptions).values({
          businessId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId,
          plan,
          status: "active",
          minutesIncluded: planConfig.minutesIncluded,
          minutesUsed: 0,
          phoneNumbersIncluded: planConfig.phoneNumbers,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        });

        logger.info(
          { businessId, plan },
          "Created subscription record from checkout"
        );
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const businessId = subscription.metadata?.businessId;

      if (!businessId) {
        logger.warn(
          { subscriptionId: subscription.id },
          "customer.subscription.updated missing businessId in metadata"
        );
        break;
      }

      const plan = subscription.metadata?.plan as PlanTier | undefined;
      const planConfig = plan ? PLAN_CONFIGS[plan] : null;

      const updateData: Record<string, unknown> = {
        status: subscription.status === "active" ? "active" : subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      };

      // If plan metadata is present, update plan-related fields
      if (planConfig) {
        updateData.plan = plan;
        updateData.minutesIncluded = planConfig.minutesIncluded;
        updateData.phoneNumbersIncluded = planConfig.phoneNumbers;
      }

      await db
        .update(schema.subscriptions)
        .set(updateData)
        .where(eq(schema.subscriptions.businessId, businessId));

      logger.info(
        { businessId, status: subscription.status, plan },
        "Updated subscription from webhook"
      );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const businessId = subscription.metadata?.businessId;

      if (!businessId) {
        logger.warn(
          { subscriptionId: subscription.id },
          "customer.subscription.deleted missing businessId in metadata"
        );
        break;
      }

      await db
        .update(schema.subscriptions)
        .set({
          status: "canceled",
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.businessId, businessId));

      logger.info(
        { businessId, subscriptionId: subscription.id },
        "Marked subscription as canceled"
      );
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string | null;

      if (!subscriptionId) {
        logger.debug({ invoiceId: invoice.id }, "Invoice not associated with a subscription");
        break;
      }

      // Look up subscription by Stripe subscription ID
      const [sub] = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (!sub) {
        logger.warn(
          { subscriptionId },
          "No local subscription found for invoice.payment_succeeded"
        );
        break;
      }

      // On successful payment, reset usage for the new period and update status
      await db
        .update(schema.subscriptions)
        .set({
          status: "active",
          minutesUsed: 0,
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.id, sub.id));

      logger.info(
        { businessId: sub.businessId, invoiceId: invoice.id },
        "Payment succeeded, reset usage for new period"
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string | null;

      if (!subscriptionId) {
        break;
      }

      const [sub] = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (!sub) {
        logger.warn(
          { subscriptionId },
          "No local subscription found for invoice.payment_failed"
        );
        break;
      }

      await db
        .update(schema.subscriptions)
        .set({
          status: "past_due",
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.id, sub.id));

      logger.info(
        { businessId: sub.businessId, invoiceId: invoice.id },
        "Payment failed, marked subscription as past_due"
      );
      break;
    }

    default:
      logger.debug({ type: event.type }, "Unhandled Stripe event type");
  }
}

// ── Check Usage Limit ──────────────────────────────
export async function checkUsageLimit(
  businessId: string
): Promise<UsageLimitResult> {
  try {
    const [subscription] = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.businessId, businessId))
      .limit(1);

    if (!subscription) {
      // No subscription = no calls allowed
      return {
        allowed: false,
        minutesRemaining: 0,
        minutesUsed: 0,
        minutesIncluded: 0,
        plan: "none",
      };
    }

    const minutesRemaining = Math.max(
      0,
      subscription.minutesIncluded - subscription.minutesUsed
    );

    return {
      allowed:
        subscription.status === "active" && minutesRemaining > 0,
      minutesRemaining,
      minutesUsed: subscription.minutesUsed,
      minutesIncluded: subscription.minutesIncluded,
      plan: subscription.plan,
    };
  } catch (error) {
    logger.error({ error, businessId }, "Failed to check usage limit");
    // Fail open in development, closed in production
    return {
      allowed: env.NODE_ENV !== "production",
      minutesRemaining: 0,
      minutesUsed: 0,
      minutesIncluded: 0,
      plan: "unknown",
    };
  }
}

// ── Construct Webhook Event ────────────────────────
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );
}
