import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Users ──────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    imageUrl: text("image_url"),
    businessId: uuid("business_id").references(() => businesses.id),
    role: varchar("role", { length: 20 }).notNull().default("owner"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("users_clerk_id_idx").on(t.clerkId),
    index("users_business_id_idx").on(t.businessId),
  ]
);

// ── Businesses ──────────────────────────────────────
export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  website: text("website"),
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  businessHours: jsonb("business_hours").default({}),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Phone Numbers ──────────────────────────────────
export const phoneNumbers = pgTable(
  "phone_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    twilioSid: varchar("twilio_sid", { length: 64 }).notNull().unique(),
    number: varchar("number", { length: 20 }).notNull(),
    friendlyName: varchar("friendly_name", { length: 100 }).notNull(),
    scriptId: uuid("script_id").references(() => scripts.id, { onDelete: "set null" }),
    isActive: boolean("is_active").default(true).notNull(),
    capabilities: jsonb("capabilities").default({ voice: true, sms: false, mms: false }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("phone_numbers_business_id_idx").on(t.businessId)]
);

// ── Scripts ────────────────────────────────────────
export const scripts = pgTable(
  "scripts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    type: varchar("type", { length: 20 }).notNull().default("inbound"),
    voice: varchar("voice", { length: 20 }).notNull().default("alloy"),
    greeting: text("greeting").notNull(),
    systemPrompt: text("system_prompt"),
    faqs: jsonb("faqs").default([]),
    bookingEnabled: boolean("booking_enabled").default(false).notNull(),
    bookingInstructions: text("booking_instructions"),
    transferEnabled: boolean("transfer_enabled").default(false).notNull(),
    transferNumber: varchar("transfer_number", { length: 20 }),
    transferConditions: text("transfer_conditions"),
    escalationMessage: text("escalation_message"),
    qualificationQuestions: jsonb("qualification_questions").default([]),
    tone: varchar("tone", { length: 20 }).notNull().default("professional"),
    vapiAssistantId: varchar("vapi_assistant_id", { length: 64 }),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("scripts_business_id_idx").on(t.businessId)]
);

// ── Calls ──────────────────────────────────────────
export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    phoneNumberId: uuid("phone_number_id")
      .references(() => phoneNumbers.id)
      .notNull(),
    scriptId: uuid("script_id").references(() => scripts.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    leadId: uuid("lead_id").references(() => leads.id),
    direction: varchar("direction", { length: 10 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    outcome: varchar("outcome", { length: 30 }),
    fromNumber: varchar("from_number", { length: 20 }).notNull(),
    toNumber: varchar("to_number", { length: 20 }).notNull(),
    twilioCallSid: varchar("twilio_call_sid", { length: 64 }).notNull(),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    durationSeconds: integer("duration_seconds"),
    recordingUrl: text("recording_url"),
    recordingSid: varchar("recording_sid", { length: 64 }),
    costCents: integer("cost_cents"),
    summary: text("summary"),
    sentiment: varchar("sentiment", { length: 10 }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("calls_business_id_idx").on(t.businessId),
    index("calls_campaign_id_idx").on(t.campaignId),
    index("calls_created_at_idx").on(t.createdAt),
    index("calls_twilio_sid_idx").on(t.twilioCallSid),
  ]
);

// ── Transcript Entries ─────────────────────────────
export const transcriptEntries = pgTable(
  "transcript_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    callId: uuid("call_id")
      .references(() => calls.id, { onDelete: "cascade" })
      .notNull(),
    speaker: varchar("speaker", { length: 10 }).notNull(),
    text: text("text").notNull(),
    timestamp: real("timestamp").notNull(),
    confidence: real("confidence"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("transcript_entries_call_id_idx").on(t.callId)]
);

// ── Leads ──────────────────────────────────────────
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }).notNull(),
    company: varchar("company", { length: 200 }),
    title: varchar("title", { length: 100 }),
    source: varchar("source", { length: 20 }).notNull().default("manual"),
    status: varchar("status", { length: 20 }).notNull().default("new"),
    notes: text("notes"),
    customFields: jsonb("custom_fields").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("leads_business_id_idx").on(t.businessId),
    index("leads_phone_idx").on(t.phone),
  ]
);

// ── Campaigns ──────────────────────────────────────
export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    scriptId: uuid("script_id")
      .references(() => scripts.id)
      .notNull(),
    phoneNumberId: uuid("phone_number_id")
      .references(() => phoneNumbers.id)
      .notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    schedule: jsonb("schedule").notNull(),
    maxConcurrentCalls: integer("max_concurrent_calls").default(1).notNull(),
    retryAttempts: integer("retry_attempts").default(2).notNull(),
    totalLeads: integer("total_leads").default(0).notNull(),
    completedLeads: integer("completed_leads").default(0).notNull(),
    successfulLeads: integer("successful_leads").default(0).notNull(),
    failedLeads: integer("failed_leads").default(0).notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("campaigns_business_id_idx").on(t.businessId)]
);

// ── Campaign Leads ─────────────────────────────────
export const campaignLeads = pgTable(
  "campaign_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    leadId: uuid("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    callId: uuid("call_id").references(() => calls.id),
    attempts: integer("attempts").default(0).notNull(),
    lastAttemptAt: timestamp("last_attempt_at"),
    outcome: varchar("outcome", { length: 30 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("campaign_leads_campaign_id_idx").on(t.campaignId),
    index("campaign_leads_lead_id_idx").on(t.leadId),
  ]
);

// ── Subscriptions ──────────────────────────────────
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 64 }).notNull(),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 64 }).notNull(),
    plan: varchar("plan", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    minutesIncluded: integer("minutes_included").notNull(),
    minutesUsed: real("minutes_used").default(0).notNull(),
    phoneNumbersIncluded: integer("phone_numbers_included").notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("subscriptions_business_id_idx").on(t.businessId)]
);

// ── Usage Records ──────────────────────────────────
export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    totalCalls: integer("total_calls").default(0).notNull(),
    inboundCalls: integer("inbound_calls").default(0).notNull(),
    outboundCalls: integer("outbound_calls").default(0).notNull(),
    totalMinutes: real("total_minutes").default(0).notNull(),
    appointmentsBooked: integer("appointments_booked").default(0).notNull(),
    leadsCaptured: integer("leads_captured").default(0).notNull(),
    totalCostCents: integer("total_cost_cents").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("usage_records_business_id_idx").on(t.businessId),
    uniqueIndex("usage_records_business_date_idx").on(t.businessId, t.date),
  ]
);

// ── Integrations ───────────────────────────────────
export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 30 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("disconnected"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("integrations_business_id_idx").on(t.businessId),
    uniqueIndex("integrations_business_provider_idx").on(t.businessId, t.provider),
  ]
);

// ── Appointments ───────────────────────────────────
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .references(() => businesses.id, { onDelete: "cascade" })
      .notNull(),
    callId: uuid("call_id").references(() => calls.id),
    leadId: uuid("lead_id").references(() => leads.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    timezone: varchar("timezone", { length: 50 }).notNull(),
    calendarEventId: varchar("calendar_event_id", { length: 255 }),
    calendarProvider: varchar("calendar_provider", { length: 30 }),
    status: varchar("status", { length: 20 }).notNull().default("scheduled"),
    attendeeName: varchar("attendee_name", { length: 200 }),
    attendeeEmail: varchar("attendee_email", { length: 255 }),
    attendeePhone: varchar("attendee_phone", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("appointments_business_id_idx").on(t.businessId),
    index("appointments_start_time_idx").on(t.startTime),
  ]
);

// ── Relations ──────────────────────────────────────
export const usersRelations = relations(users, ({ one }) => ({
  business: one(businesses, {
    fields: [users.businessId],
    references: [businesses.id],
  }),
}));

export const businessesRelations = relations(businesses, ({ many }) => ({
  users: many(users),
  phoneNumbers: many(phoneNumbers),
  scripts: many(scripts),
  calls: many(calls),
  leads: many(leads),
  campaigns: many(campaigns),
  subscriptions: many(subscriptions),
  integrations: many(integrations),
  appointments: many(appointments),
}));

export const callsRelations = relations(calls, ({ one, many }) => ({
  business: one(businesses, {
    fields: [calls.businessId],
    references: [businesses.id],
  }),
  phoneNumber: one(phoneNumbers, {
    fields: [calls.phoneNumberId],
    references: [phoneNumbers.id],
  }),
  script: one(scripts, {
    fields: [calls.scriptId],
    references: [scripts.id],
  }),
  campaign: one(campaigns, {
    fields: [calls.campaignId],
    references: [campaigns.id],
  }),
  lead: one(leads, {
    fields: [calls.leadId],
    references: [leads.id],
  }),
  transcriptEntries: many(transcriptEntries),
}));

export const transcriptEntriesRelations = relations(transcriptEntries, ({ one }) => ({
  call: one(calls, {
    fields: [transcriptEntries.callId],
    references: [calls.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  business: one(businesses, {
    fields: [leads.businessId],
    references: [businesses.id],
  }),
  calls: many(calls),
  campaignLeads: many(campaignLeads),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  business: one(businesses, {
    fields: [campaigns.businessId],
    references: [businesses.id],
  }),
  script: one(scripts, {
    fields: [campaigns.scriptId],
    references: [scripts.id],
  }),
  phoneNumber: one(phoneNumbers, {
    fields: [campaigns.phoneNumberId],
    references: [phoneNumbers.id],
  }),
  campaignLeads: many(campaignLeads),
  calls: many(calls),
}));

export const campaignLeadsRelations = relations(campaignLeads, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignLeads.campaignId],
    references: [campaigns.id],
  }),
  lead: one(leads, {
    fields: [campaignLeads.leadId],
    references: [leads.id],
  }),
  call: one(calls, {
    fields: [campaignLeads.callId],
    references: [calls.id],
  }),
}));
