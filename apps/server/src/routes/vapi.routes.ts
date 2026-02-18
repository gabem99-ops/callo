import { Router, type Request, type Response } from "express";
import { db } from "../config/db.js";
import { calls, transcriptEntries, phoneNumbers, scripts, businesses } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { logger } from "../config/logger.js";
import { COST_PER_MINUTE_CENTS } from "@callo/shared";
import { broadcastToBusiness } from "../websocket/live-monitor.js";
import { handleToolCall } from "../tools/index.js";
import { buildSystemPrompt } from "../services/call-handler.service.js";
import * as outboundService from "../services/outbound.service.js";
import { checkMinuteLimit, trackCallMinutes, checkAndNotifyUsageThresholds } from "../services/usage.service.js";
import { validateVapiSignature } from "../middleware/vapi-signature.js";

const router = Router();

// Apply Vapi signature validation to all routes
router.use(validateVapiSignature);

// ── Vapi Webhook Types ─────────────────────────────
interface VapiWebhookPayload {
  message: {
    type: string;
    call?: VapiCallData;
    timestamp?: string;
    // function-call specific
    functionCall?: {
      name: string;
      parameters: Record<string, unknown>;
    };
    // transcript specific
    transcript?: string;
    role?: string;
    // assistant-request specific
    // (Vapi asks our server what assistant config to use)
  };
}

interface VapiCallData {
  id: string;
  orgId: string;
  type: "inboundPhoneCall" | "outboundPhoneCall" | "webCall";
  status: string;
  phoneNumberId: string;
  phoneNumber?: {
    id: string;
    number: string;
  };
  customer?: {
    number: string;
    name?: string;
  };
  assistantId?: string;
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  endedReason?: string;
  messages?: Array<{
    role: string;
    message?: string;
    time: number;
    secondsFromStart: number;
  }>;
}

// ── POST /webhook ─ Main Vapi webhook handler ──────
// Vapi sends all events here: assistant-request, function-call,
// status-update, end-of-call-report, transcript, etc.
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const payload = req.body as VapiWebhookPayload;
    const messageType = payload.message?.type;

    logger.info({ messageType }, "Vapi webhook received");

    switch (messageType) {
      case "assistant-request":
        return handleAssistantRequest(payload, res);

      case "function-call":
        return await handleFunctionCall(payload, res);

      case "status-update":
        return await handleStatusUpdate(payload, res);

      case "end-of-call-report":
        return await handleEndOfCallReport(payload, res);

      case "transcript":
        return await handleTranscript(payload, res);

      case "hang":
        return await handleHang(payload, res);

      case "speech-update":
        // Real-time speech event — broadcast to live monitor
        return await handleSpeechUpdate(payload, res);

      default:
        logger.debug({ messageType }, "Unhandled Vapi webhook type");
        res.status(200).json({});
    }
  } catch (error) {
    logger.error({ err: error }, "Error processing Vapi webhook");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── assistant-request ──────────────────────────────
// Vapi asks what assistant configuration to use for this call.
// We look up the phone number → script → build dynamic assistant config.
async function handleAssistantRequest(payload: VapiWebhookPayload, res: Response) {
  const call = payload.message.call;
  if (!call) {
    res.status(200).json({});
    return;
  }

  const calledNumber = call.phoneNumber?.number;
  const vapiPhoneNumberId = call.phoneNumberId || call.phoneNumber?.id;
  logger.info({ calledNumber, vapiPhoneNumberId, vapiCallId: call.id, type: call.type }, "Assistant request");

  // Look up the phone number in our DB — try by Vapi ID first, then by number
  let phoneNumber: (typeof phoneNumbers.$inferSelect) | undefined;

  if (vapiPhoneNumberId) {
    const [found] = await db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.twilioSid, vapiPhoneNumberId))
      .limit(1);
    phoneNumber = found;
  }

  if (!phoneNumber && calledNumber) {
    const [found] = await db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.number, calledNumber))
      .limit(1);
    phoneNumber = found;
  }

  if (!phoneNumber || !phoneNumber.scriptId) {
    logger.warn({ calledNumber }, "No script assigned for incoming call");
    res.status(200).json({
      assistant: {
        firstMessage: "Hello! Thanks for calling. How can I help you today?",
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI phone assistant. Be concise and natural.",
            },
          ],
        },
        voice: { provider: "openai", voiceId: "alloy" },
      },
    });
    return;
  }

  // Look up script and business
  const [script] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.id, phoneNumber.scriptId))
    .limit(1);

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, phoneNumber.businessId))
    .limit(1);

  if (!script || !business) {
    res.status(200).json({});
    return;
  }

  // Check usage limits before allowing the call
  const usageCheck = await checkMinuteLimit(phoneNumber.businessId);
  if (!usageCheck.allowed) {
    logger.warn(
      {
        businessId: phoneNumber.businessId,
        minutesUsed: usageCheck.minutesUsed,
        minuteLimit: usageCheck.minuteLimit,
      },
      "Call blocked — minute limit exceeded"
    );

    // Return a polite rejection assistant instead of dropping the call
    res.status(200).json({
      assistant: {
        firstMessage: `I'm sorry, but ${business.name} is currently unable to take calls. Please try again later or contact them through their website.`,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `I'm sorry, but ${business.name} is currently unable to take calls. Please try again later or contact them through their website. Politely end the conversation after delivering this message.`,
            },
          ],
        },
        voice: { provider: "openai", voiceId: "alloy" },
        maxDurationSeconds: 30,
      },
    });
    return;
  }

  // Build the system prompt
  const systemPrompt = buildSystemPrompt(
    {
      id: script.id,
      name: script.name,
      voice: script.voice,
      greeting: script.greeting,
      systemPrompt: script.systemPrompt,
      faqs: script.faqs,
      bookingEnabled: script.bookingEnabled,
      bookingInstructions: script.bookingInstructions,
      transferEnabled: script.transferEnabled,
      transferNumber: script.transferNumber,
      transferConditions: script.transferConditions,
      escalationMessage: script.escalationMessage,
      qualificationQuestions: script.qualificationQuestions,
      tone: script.tone,
    },
    {
      id: business.id,
      name: business.name,
      industry: business.industry,
      timezone: business.timezone,
      businessHours: business.businessHours,
      phone: business.phone,
    }
  );

  // Build tool definitions
  const serverUrl = `${env.SERVER_URL}/api/vapi/webhook`;
  const tools = buildToolsForScript(script, serverUrl);

  // Create call record in our DB
  const [callRecord] = await db
    .insert(calls)
    .values({
      businessId: phoneNumber.businessId,
      phoneNumberId: phoneNumber.id,
      scriptId: script.id,
      direction: call.type === "outboundPhoneCall" ? "outbound" : "inbound",
      status: "ringing",
      fromNumber: call.customer?.number || "unknown",
      toNumber: calledNumber ?? "unknown",
      twilioCallSid: call.id, // Store Vapi call ID here
      startedAt: new Date(),
    })
    .returning();

  logger.info(
    { callId: callRecord.id, vapiCallId: call.id, scriptId: script.id },
    "Call record created, returning assistant config"
  );

  // Broadcast to live monitor
  broadcastToBusiness(phoneNumber.businessId, "call_started", {
    callId: callRecord.id,
    vapiCallId: call.id,
    direction: callRecord.direction,
    fromNumber: callRecord.fromNumber,
    toNumber: calledNumber,
    startedAt: callRecord.startedAt,
  });

  // Return dynamic assistant config to Vapi
  res.status(200).json({
    assistant: {
      firstMessage: script.greeting,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
        tools,
      },
      voice: {
        provider: "openai",
        voiceId: script.voice || "alloy",
      },
      recordingEnabled: true,
      endCallFunctionEnabled: true,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
      },
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 1800,
      serverUrl,
      // Pass metadata so we can identify this call in future webhooks
      metadata: {
        calloCallId: callRecord.id,
        businessId: phoneNumber.businessId,
        scriptId: script.id,
      },
    },
  });
}

// ── function-call ──────────────────────────────────
// Vapi calls our server URL when the AI invokes a function tool.
// We execute the tool and return the result.
async function handleFunctionCall(payload: VapiWebhookPayload, res: Response) {
  const call = payload.message.call;
  const functionCall = payload.message.functionCall;

  if (!functionCall || !call) {
    res.status(200).json({ result: "No function call data provided." });
    return;
  }

  const metadata = (call as unknown as Record<string, unknown>).metadata as Record<string, string> | undefined;
  const calloCallId = metadata?.calloCallId || "";
  const businessId = metadata?.businessId || "";
  const scriptId = metadata?.scriptId || null;

  logger.info(
    {
      functionName: functionCall.name,
      vapiCallId: call.id,
      calloCallId,
      args: functionCall.parameters,
    },
    "Vapi function call"
  );

  const callSession = {
    callId: calloCallId,
    businessId,
    scriptId,
    fromNumber: call.customer?.number || "unknown",
    toNumber: call.phoneNumber?.number || "unknown",
    twilioCallSid: call.id, // Vapi call ID
  };

  const result = await handleToolCall(
    functionCall.name,
    functionCall.parameters,
    callSession
  );

  // Vapi expects { result: "..." } for function call responses
  res.status(200).json({ result });
}

// ── status-update ──────────────────────────────────
async function handleStatusUpdate(payload: VapiWebhookPayload, res: Response) {
  const call = payload.message.call;
  if (!call) {
    res.status(200).json({});
    return;
  }

  const metadata = (call as unknown as Record<string, unknown>).metadata as Record<string, string> | undefined;
  const calloCallId = metadata?.calloCallId;

  if (!calloCallId) {
    // Try to find by Vapi call ID
    const [existing] = await db
      .select()
      .from(calls)
      .where(eq(calls.twilioCallSid, call.id))
      .limit(1);

    if (existing) {
      const statusMap: Record<string, string> = {
        queued: "queued",
        ringing: "ringing",
        "in-progress": "in_progress",
        forwarding: "in_progress",
        ended: "completed",
      };

      await db
        .update(calls)
        .set({
          status: statusMap[call.status] || call.status,
          updatedAt: new Date(),
        })
        .where(eq(calls.id, existing.id));
    }
  } else {
    const statusMap: Record<string, string> = {
      queued: "queued",
      ringing: "ringing",
      "in-progress": "in_progress",
      forwarding: "in_progress",
      ended: "completed",
    };

    await db
      .update(calls)
      .set({
        status: statusMap[call.status] || call.status,
        updatedAt: new Date(),
      })
      .where(eq(calls.id, calloCallId));
  }

  logger.info({ vapiCallId: call.id, status: call.status }, "Call status update");
  res.status(200).json({});
}

// ── end-of-call-report ─────────────────────────────
// Vapi sends this after a call ends with full transcript, recording, cost, etc.
async function handleEndOfCallReport(payload: VapiWebhookPayload, res: Response) {
  const call = payload.message.call;
  if (!call) {
    res.status(200).json({});
    return;
  }

  const metadata = (call as unknown as Record<string, unknown>).metadata as Record<string, string> | undefined;
  const calloCallId = metadata?.calloCallId;
  const businessId = metadata?.businessId;

  // Calculate duration
  let durationSeconds = 0;
  if (call.startedAt && call.endedAt) {
    durationSeconds = Math.round(
      (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000
    );
  }

  const minutes = Math.ceil(durationSeconds / 60);
  const costCents = minutes * COST_PER_MINUTE_CENTS;

  // Find the call record
  const callId = calloCallId || (await findCallIdByVapiId(call.id));

  if (callId) {
    // Update call record with final data
    await db
      .update(calls)
      .set({
        status: "completed",
        endedAt: call.endedAt ? new Date(call.endedAt) : new Date(),
        durationSeconds,
        costCents,
        recordingUrl: call.recordingUrl || null,
        summary: call.summary || null,
        metadata: {
          vapiCallId: call.id,
          vapiCost: call.cost,
          endedReason: call.endedReason,
        },
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId));

    // Save transcript entries from Vapi messages
    if (call.messages && call.messages.length > 0) {
      const entries = call.messages
        .filter((msg) => msg.role === "assistant" || msg.role === "user")
        .filter((msg) => msg.message)
        .map((msg) => ({
          callId,
          speaker: msg.role === "assistant" ? ("ai" as const) : ("caller" as const),
          text: msg.message!,
          timestamp: msg.secondsFromStart,
        }));

      if (entries.length > 0) {
        await db.insert(transcriptEntries).values(entries);
      }
    }

    logger.info(
      {
        callId,
        vapiCallId: call.id,
        durationSeconds,
        costCents,
        endedReason: call.endedReason,
        messageCount: call.messages?.length,
      },
      "Call completed — end-of-call report processed"
    );

    // Track usage minutes and check thresholds
    if (businessId && durationSeconds > 0) {
      trackCallMinutes(businessId, callId, durationSeconds).catch((err) => {
        logger.error({ err, callId, businessId }, "Failed to track call minutes");
      });

      checkAndNotifyUsageThresholds(businessId).catch((err) => {
        logger.error({ err, businessId }, "Failed to check usage thresholds");
      });
    }

    // Broadcast to live monitor
    if (businessId) {
      broadcastToBusiness(businessId, "call_ended", {
        callId,
        durationSeconds,
        costCents,
        summary: call.summary,
        endedReason: call.endedReason,
      });
    }

    // Check if this call is part of an outbound campaign
    // If so, notify the outbound service so it can update campaign lead
    // status, aggregate counters, and potentially trigger the next call
    const [callRecord] = await db
      .select({ campaignId: calls.campaignId })
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    if (callRecord?.campaignId) {
      const callOutcome = call.endedReason || "completed";
      outboundService.onOutboundCallCompleted(callId, callRecord.campaignId, callOutcome).catch((err) => {
        logger.error(
          { err, callId, campaignId: callRecord.campaignId },
          "Failed to process outbound call completion for campaign"
        );
      });
    }
  } else {
    logger.warn({ vapiCallId: call.id }, "End-of-call report for unknown call");
  }

  res.status(200).json({});
}

// ── transcript (real-time) ─────────────────────────
async function handleTranscript(payload: VapiWebhookPayload, res: Response) {
  const call = payload.message.call;
  const transcript = payload.message.transcript;
  const role = payload.message.role;

  if (call && transcript) {
    const metadata = (call as unknown as Record<string, unknown>).metadata as Record<string, string> | undefined;
    const businessId = metadata?.businessId;

    if (businessId) {
      broadcastToBusiness(businessId, "transcript_update", {
        vapiCallId: call.id,
        calloCallId: metadata?.calloCallId,
        role: role || "unknown",
        text: transcript,
        timestamp: new Date().toISOString(),
      });
    }
  }

  res.status(200).json({});
}

// ── hang ───────────────────────────────────────────
async function handleHang(payload: VapiWebhookPayload, res: Response) {
  const call = payload.message.call;
  logger.info({ vapiCallId: call?.id }, "Vapi hang event");
  res.status(200).json({});
}

// ── speech-update ──────────────────────────────────
async function handleSpeechUpdate(payload: VapiWebhookPayload, res: Response) {
  const call = payload.message.call;
  if (call) {
    const metadata = (call as unknown as Record<string, unknown>).metadata as Record<string, string> | undefined;
    const businessId = metadata?.businessId;

    if (businessId) {
      broadcastToBusiness(businessId, "speech_update", {
        vapiCallId: call.id,
        calloCallId: metadata?.calloCallId,
        status: (payload.message as Record<string, unknown>).status,
        role: (payload.message as Record<string, unknown>).role,
      });
    }
  }
  res.status(200).json({});
}

// ── Helpers ────────────────────────────────────────

async function findCallIdByVapiId(vapiCallId: string): Promise<string | null> {
  const [found] = await db
    .select({ id: calls.id })
    .from(calls)
    .where(eq(calls.twilioCallSid, vapiCallId))
    .limit(1);
  return found?.id || null;
}

function buildToolsForScript(
  script: {
    bookingEnabled: boolean;
    transferEnabled: boolean;
  },
  serverUrl: string
) {
  const tools: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
    server?: { url: string };
  }> = [];

  // Always include capture_lead
  tools.push({
    type: "function",
    function: {
      name: "capture_lead",
      description: "Capture the caller's contact information as a lead.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Caller's first name" },
          last_name: { type: "string", description: "Caller's last name" },
          email: { type: "string", description: "Caller's email address" },
          phone: { type: "string", description: "Caller's phone number" },
          company: { type: "string", description: "Caller's company name" },
          notes: { type: "string", description: "Notes about the caller" },
        },
        required: ["phone"],
      },
    },
    server: { url: serverUrl },
  });

  if (script.bookingEnabled) {
    tools.push({
      type: "function",
      function: {
        name: "book_appointment",
        description: "Book an appointment for the caller.",
        parameters: {
          type: "object",
          properties: {
            attendee_name: { type: "string", description: "Full name of the person" },
            attendee_phone: { type: "string", description: "Phone number" },
            attendee_email: { type: "string", description: "Email (optional)" },
            preferred_date: { type: "string", description: "Date (YYYY-MM-DD)" },
            preferred_time: { type: "string", description: "Time (HH:MM, 24-hour)" },
            reason: { type: "string", description: "Reason for appointment" },
          },
          required: ["attendee_name", "attendee_phone", "preferred_date", "preferred_time"],
        },
      },
      server: { url: serverUrl },
    });
  }

  if (script.transferEnabled) {
    tools.push({
      type: "function",
      function: {
        name: "transfer_call",
        description: "Transfer the call to a human agent.",
        parameters: {
          type: "object",
          properties: {
            reason: { type: "string", description: "Why the call is being transferred" },
            department: { type: "string", description: "Department to transfer to" },
          },
          required: ["reason"],
        },
      },
      server: { url: serverUrl },
    });
  }

  return tools;
}

// Import env for server URL
import { env } from "../config/env.js";

export default router;
