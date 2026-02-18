export interface Subscription {
  id: string;
  businessId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  minutesIncluded: number;
  minutesUsed: number;
  phoneNumbersIncluded: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PlanTier = "starter" | "professional" | "enterprise";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete";

export interface UsageRecord {
  id: string;
  businessId: string;
  date: string; // YYYY-MM-DD
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  totalMinutes: number;
  appointmentsBooked: number;
  leadsCapured: number;
  totalCostCents: number;
  createdAt: Date;
}

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  priceMonthly: number;
  minutesIncluded: number;
  phoneNumbers: number;
  features: string[];
}
