export const CALL_STATUSES = [
  "queued",
  "ringing",
  "in_progress",
  "completed",
  "failed",
  "busy",
  "no_answer",
  "canceled",
] as const;

export const CALL_OUTCOMES = [
  "appointment_booked",
  "lead_captured",
  "transferred",
  "voicemail",
  "qualified",
  "disqualified",
  "callback_requested",
  "info_provided",
  "hung_up",
  "error",
] as const;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "disqualified",
  "converted",
  "unresponsive",
] as const;

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "canceled",
] as const;

export const CAMPAIGN_LEAD_STATUSES = [
  "pending",
  "calling",
  "completed",
  "failed",
  "skipped",
  "retry",
] as const;

export const SUBSCRIPTION_STATUSES = [
  "active",
  "past_due",
  "canceled",
  "trialing",
  "incomplete",
] as const;

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "canceled",
  "completed",
  "no_show",
] as const;

export const SCRIPT_TONES = [
  "professional",
  "friendly",
  "casual",
  "formal",
] as const;

export const AI_VOICES = [
  "alloy",
  "echo",
  "shimmer",
  "ash",
  "ballad",
  "coral",
  "sage",
  "verse",
] as const;

export const CALL_DIRECTIONS = ["inbound", "outbound"] as const;
