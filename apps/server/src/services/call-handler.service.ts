import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { logger } from "../config/logger.js";
import * as schema from "../db/schema.js";
import { COST_PER_MINUTE_CENTS } from "@callo/shared";
import { broadcastToBusiness } from "../websocket/live-monitor.js";

// ── Types ──────────────────────────────────────────
interface ScriptData {
  id: string;
  name: string;
  voice: string;
  greeting: string;
  systemPrompt: string | null;
  faqs: unknown;
  bookingEnabled: boolean;
  bookingInstructions: string | null;
  transferEnabled: boolean;
  transferNumber: string | null;
  transferConditions: string | null;
  escalationMessage: string | null;
  qualificationQuestions: unknown;
  tone: string;
}

interface BusinessData {
  id: string;
  name: string;
  industry: string | null;
  timezone: string;
  businessHours: unknown;
  phone: string | null;
}

// ── On Call Start ──────────────────────────────────
export async function onCallStart(
  businessId: string,
  phoneNumberId: string,
  twilioCallSid: string,
  direction: "inbound" | "outbound",
  fromNumber: string,
  toNumber: string
): Promise<string> {
  try {
    // Look up which script is assigned to this phone number
    const [phoneNumber] = await db
      .select()
      .from(schema.phoneNumbers)
      .where(eq(schema.phoneNumbers.id, phoneNumberId))
      .limit(1);

    const scriptId = phoneNumber?.scriptId || null;

    // Create call record
    const [call] = await db
      .insert(schema.calls)
      .values({
        businessId,
        phoneNumberId,
        scriptId,
        twilioCallSid,
        direction,
        fromNumber,
        toNumber,
        status: "in_progress",
        startedAt: new Date(),
      })
      .returning();

    logger.info(
      {
        callId: call.id,
        businessId,
        twilioCallSid,
        direction,
      },
      "Call started"
    );

    // Broadcast to dashboard
    broadcastToBusiness(businessId, "call_started", {
      callId: call.id,
      direction,
      fromNumber,
      toNumber,
      startedAt: call.startedAt,
    });

    return call.id;
  } catch (error) {
    logger.error({ error, businessId, twilioCallSid }, "Failed to create call record");
    throw error;
  }
}

// ── On Call End ────────────────────────────────────
export async function onCallEnd(
  twilioCallSid: string,
  durationSeconds: number
): Promise<void> {
  try {
    // Calculate cost: per-minute billing
    const minutes = Math.ceil(durationSeconds / 60);
    const costCents = minutes * COST_PER_MINUTE_CENTS;

    const [updatedCall] = await db
      .update(schema.calls)
      .set({
        status: "completed",
        endedAt: new Date(),
        durationSeconds,
        costCents,
        updatedAt: new Date(),
      })
      .where(eq(schema.calls.twilioCallSid, twilioCallSid))
      .returning();

    if (!updatedCall) {
      logger.warn({ twilioCallSid }, "Call record not found for end event");
      return;
    }

    // Update daily usage record
    await updateUsageRecord(updatedCall.businessId, durationSeconds, updatedCall.direction, costCents);

    logger.info(
      {
        callId: updatedCall.id,
        durationSeconds,
        costCents,
      },
      "Call ended"
    );

    // Broadcast to dashboard
    broadcastToBusiness(updatedCall.businessId, "call_ended", {
      callId: updatedCall.id,
      durationSeconds,
      costCents,
      outcome: updatedCall.outcome,
    });
  } catch (error) {
    logger.error({ error, twilioCallSid }, "Failed to update call end record");
    throw error;
  }
}

// ── On Call Failed ─────────────────────────────────
export async function onCallFailed(
  twilioCallSid: string,
  reason: string
): Promise<void> {
  try {
    const [updatedCall] = await db
      .update(schema.calls)
      .set({
        status: "failed",
        endedAt: new Date(),
        metadata: { failureReason: reason },
        updatedAt: new Date(),
      })
      .where(eq(schema.calls.twilioCallSid, twilioCallSid))
      .returning();

    if (!updatedCall) {
      logger.warn({ twilioCallSid }, "Call record not found for failure event");
      return;
    }

    logger.error(
      {
        callId: updatedCall.id,
        reason,
      },
      "Call failed"
    );

    // Broadcast to dashboard
    broadcastToBusiness(updatedCall.businessId, "call_ended", {
      callId: updatedCall.id,
      status: "failed",
      reason,
    });
  } catch (error) {
    logger.error({ error, twilioCallSid, reason }, "Failed to update call failure record");
    throw error;
  }
}

// ── Build System Prompt ────────────────────────────
export function buildSystemPrompt(
  script: ScriptData,
  business: BusinessData
): string {
  const faqs = (script.faqs || []) as Array<{ question: string; answer: string }>;
  const qualificationQuestions = (script.qualificationQuestions || []) as string[];

  const parts: string[] = [];

  // Core identity
  parts.push(
    `You are an AI phone agent for ${business.name}.`,
    `Your role is to handle ${script.name} calls in a ${script.tone} manner.`
  );

  // Business context
  if (business.industry) {
    parts.push(`The business operates in the ${business.industry} industry.`);
  }
  if (business.timezone) {
    parts.push(`Business timezone: ${business.timezone}.`);
  }
  if (business.phone) {
    parts.push(`Business phone number: ${business.phone}.`);
  }

  // Custom system prompt from script
  if (script.systemPrompt) {
    parts.push("", "--- Custom Instructions ---", script.systemPrompt);
  }

  // Greeting instruction
  parts.push(
    "",
    "--- Greeting ---",
    `Start each call by saying: "${script.greeting}"`
  );

  // FAQs
  if (faqs.length > 0) {
    parts.push("", "--- Frequently Asked Questions ---");
    parts.push("When the caller asks any of these questions, use the provided answers:");
    for (const faq of faqs) {
      parts.push(`Q: ${faq.question}`);
      parts.push(`A: ${faq.answer}`);
      parts.push("");
    }
  }

  // Booking rules
  if (script.bookingEnabled) {
    parts.push(
      "",
      "--- Appointment Booking ---",
      "You can book appointments for callers. Use the book_appointment function when a caller wants to schedule."
    );
    if (script.bookingInstructions) {
      parts.push(`Booking instructions: ${script.bookingInstructions}`);
    }
  }

  // Transfer rules
  if (script.transferEnabled) {
    parts.push(
      "",
      "--- Call Transfer ---",
      "You can transfer calls to a human agent using the transfer_call function."
    );
    if (script.transferConditions) {
      parts.push(`Transfer when: ${script.transferConditions}`);
    }
    if (script.transferNumber) {
      parts.push(`Default transfer number: ${script.transferNumber}`);
    }
    if (script.escalationMessage) {
      parts.push(
        `Before transferring, tell the caller: "${script.escalationMessage}"`
      );
    }
  }

  // Qualification questions
  if (qualificationQuestions.length > 0) {
    parts.push(
      "",
      "--- Lead Qualification ---",
      "During the conversation, try to gather answers to these qualification questions:"
    );
    for (const q of qualificationQuestions) {
      parts.push(`- ${q}`);
    }
  }

  // Tone guidance
  parts.push(
    "",
    "--- Communication Style ---",
    `Maintain a ${script.tone} tone throughout the conversation.`,
    "Keep responses concise and natural-sounding for a phone conversation.",
    "Do not use markdown, bullet points, or any text formatting - you are speaking, not writing.",
    "Use natural pauses and conversational fillers when appropriate.",
    "Always use the capture_lead function when you learn the caller's contact information.",
    "Use the end_call function when the conversation is naturally concluding."
  );

  return parts.join("\n");
}

// ── Update Usage Record ────────────────────────────
async function updateUsageRecord(
  businessId: string,
  durationSeconds: number,
  direction: string,
  costCents: number
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const minutes = durationSeconds / 60;

  try {
    // Try to upsert the daily usage record
    const [existing] = await db
      .select()
      .from(schema.usageRecords)
      .where(eq(schema.usageRecords.businessId, businessId))
      .limit(1);

    if (existing && existing.date === today) {
      // Update existing record
      await db
        .update(schema.usageRecords)
        .set({
          totalCalls: existing.totalCalls + 1,
          inboundCalls:
            direction === "inbound"
              ? existing.inboundCalls + 1
              : existing.inboundCalls,
          outboundCalls:
            direction === "outbound"
              ? existing.outboundCalls + 1
              : existing.outboundCalls,
          totalMinutes: existing.totalMinutes + minutes,
          totalCostCents: existing.totalCostCents + costCents,
        })
        .where(eq(schema.usageRecords.id, existing.id));
    } else {
      // Create new daily record
      await db.insert(schema.usageRecords).values({
        businessId,
        date: today,
        totalCalls: 1,
        inboundCalls: direction === "inbound" ? 1 : 0,
        outboundCalls: direction === "outbound" ? 1 : 0,
        totalMinutes: minutes,
        totalCostCents: costCents,
      });
    }

    // Update subscription minutes used
    await db
      .update(schema.subscriptions)
      .set({
        minutesUsed: (await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.businessId, businessId))
          .limit(1)
          .then((rows) => (rows[0]?.minutesUsed || 0) + minutes)),
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.businessId, businessId));
  } catch (error) {
    logger.error({ error, businessId }, "Failed to update usage record");
    // Non-fatal: don't throw, the call record was already updated
  }
}
