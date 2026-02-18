export interface Call {
  id: string;
  businessId: string;
  phoneNumberId: string;
  scriptId: string | null;
  campaignId: string | null;
  leadId: string | null;
  direction: CallDirection;
  status: CallStatus;
  outcome: CallOutcome | null;
  fromNumber: string;
  toNumber: string;
  twilioCallSid: string;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  recordingSid: string | null;
  costCents: number | null;
  summary: string | null;
  sentiment: CallSentiment | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CallDirection = "inbound" | "outbound";

export type CallStatus =
  | "queued"
  | "ringing"
  | "in_progress"
  | "completed"
  | "failed"
  | "busy"
  | "no_answer"
  | "canceled";

export type CallOutcome =
  | "appointment_booked"
  | "lead_captured"
  | "transferred"
  | "voicemail"
  | "qualified"
  | "disqualified"
  | "callback_requested"
  | "info_provided"
  | "hung_up"
  | "error";

export type CallSentiment = "positive" | "neutral" | "negative";

export interface TranscriptEntry {
  id: string;
  callId: string;
  speaker: "ai" | "caller";
  text: string;
  timestamp: number; // seconds from call start
  confidence: number | null;
  createdAt: Date;
}

export interface CallListParams {
  businessId: string;
  direction?: CallDirection;
  status?: CallStatus;
  outcome?: CallOutcome;
  startDate?: string;
  endDate?: string;
  phoneNumberId?: string;
  campaignId?: string;
  page?: number;
  limit?: number;
}
