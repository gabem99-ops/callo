import type { PlanConfig } from "../types/subscription";

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    tier: "starter",
    name: "Starter",
    priceMonthly: 199,
    minutesIncluded: 1000,
    phoneNumbers: 1,
    features: [
      "1 phone number",
      "1,000 minutes/month",
      "Inbound call handling",
      "AI script builder",
      "Call transcripts",
      "Lead capture",
      "Email support",
    ],
  },
  professional: {
    tier: "professional",
    name: "Professional",
    priceMonthly: 499,
    minutesIncluded: 5000,
    phoneNumbers: 5,
    features: [
      "Up to 5 phone numbers",
      "5,000 minutes/month",
      "Inbound + outbound calls",
      "Outbound campaigns",
      "Google Calendar integration",
      "CSV lead import",
      "Priority support",
      "Live call monitor",
    ],
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    priceMonthly: 0, // custom pricing
    minutesIncluded: 0,
    phoneNumbers: 0,
    features: [
      "Unlimited phone numbers",
      "Custom minute packages",
      "CRM integrations",
      "Custom AI training",
      "Dedicated account manager",
      "SLA guarantee",
      "White-label options",
    ],
  },
};

export const COST_PER_MINUTE_CENTS = 16; // ~$0.16/min blended cost
export const OVERAGE_PER_MINUTE_CENTS = 25; // $0.25/min overage
