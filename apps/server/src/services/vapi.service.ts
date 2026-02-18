import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const VAPI_BASE_URL = "https://api.vapi.ai";

// ── Types ──────────────────────────────────────────
interface VapiAssistantConfig {
  name: string;
  voice: {
    provider: "openai";
    voiceId: string;
  };
  model: {
    provider: "openai";
    model: string;
    messages: Array<{ role: string; content: string }>;
    tools: VapiTool[];
  };
  firstMessage: string;
  serverUrl: string;
  recordingEnabled: boolean;
  endCallFunctionEnabled: boolean;
  transcriber: {
    provider: "deepgram";
    model: string;
    language: string;
  };
  silenceTimeoutSeconds?: number;
  maxDurationSeconds?: number;
}

interface VapiTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  server?: {
    url: string;
  };
}

interface VapiPhoneNumberConfig {
  provider: "vapi" | "twilio" | "vonage";
  number?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  assistantId?: string;
  serverUrl?: string;
}

interface VapiCallConfig {
  assistantId?: string;
  assistant?: Partial<VapiAssistantConfig>;
  phoneNumberId: string;
  customer: {
    number: string;
    name?: string;
  };
}

export interface VapiAssistant {
  id: string;
  name: string;
  voice: Record<string, unknown>;
  model: Record<string, unknown>;
  firstMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface VapiPhoneNumber {
  id: string;
  number: string;
  provider: string;
  assistantId: string | null;
  createdAt: string;
}

export interface VapiCall {
  id: string;
  assistantId: string;
  phoneNumberId: string;
  type: "inboundPhoneCall" | "outboundPhoneCall" | "webCall";
  status: string;
  startedAt: string;
  endedAt: string | null;
  cost: number | null;
  transcript: string | null;
  recordingUrl: string | null;
  summary: string | null;
  customer: { number: string; name?: string };
  endedReason: string | null;
  messages: VapiMessage[];
}

export interface VapiMessage {
  role: "assistant" | "user" | "system" | "tool_calls" | "tool_call_result";
  message?: string;
  time: number;
  secondsFromStart: number;
}

// ── API Client ─────────────────────────────────────

async function vapiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${VAPI_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.VAPI_API_KEY}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    logger.error({ status: res.status, body: errorBody, path }, "Vapi API error");
    throw new Error(`Vapi API error ${res.status}: ${errorBody}`);
  }

  return res.json() as Promise<T>;
}

// ── Assistants ─────────────────────────────────────

export async function createAssistant(config: {
  name: string;
  voice: string;
  firstMessage: string;
  systemPrompt: string;
  tools: VapiTool[];
  serverUrl: string;
}): Promise<VapiAssistant> {
  const payload: VapiAssistantConfig = {
    name: config.name,
    voice: {
      provider: "openai",
      voiceId: config.voice,
    },
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [{ role: "system", content: config.systemPrompt }],
      tools: config.tools,
    },
    firstMessage: config.firstMessage,
    serverUrl: config.serverUrl,
    recordingEnabled: true,
    endCallFunctionEnabled: true,
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 1800, // 30 minutes max
  };

  const assistant = await vapiRequest<VapiAssistant>("POST", "/assistant", payload);
  logger.info({ assistantId: assistant.id, name: config.name }, "Vapi assistant created");
  return assistant;
}

export async function updateAssistant(
  assistantId: string,
  updates: Partial<VapiAssistantConfig>
): Promise<VapiAssistant> {
  const assistant = await vapiRequest<VapiAssistant>("PATCH", `/assistant/${assistantId}`, updates);
  logger.info({ assistantId }, "Vapi assistant updated");
  return assistant;
}

export async function deleteAssistant(assistantId: string): Promise<void> {
  await vapiRequest("DELETE", `/assistant/${assistantId}`);
  logger.info({ assistantId }, "Vapi assistant deleted");
}

export async function getAssistant(assistantId: string): Promise<VapiAssistant> {
  return vapiRequest<VapiAssistant>("GET", `/assistant/${assistantId}`);
}

export async function listAssistants(): Promise<VapiAssistant[]> {
  return vapiRequest<VapiAssistant[]>("GET", "/assistant");
}

// ── Phone Numbers ──────────────────────────────────

export async function importPhoneNumber(config: VapiPhoneNumberConfig): Promise<VapiPhoneNumber> {
  const phoneNumber = await vapiRequest<VapiPhoneNumber>("POST", "/phone-number", config);
  logger.info({ phoneNumberId: phoneNumber.id, number: phoneNumber.number }, "Phone number imported to Vapi");
  return phoneNumber;
}

export async function buyPhoneNumber(config: {
  areaCode?: string;
  assistantId?: string;
  serverUrl?: string;
}): Promise<VapiPhoneNumber> {
  const payload = {
    provider: "vapi",
    ...config,
  };
  const phoneNumber = await vapiRequest<VapiPhoneNumber>("POST", "/phone-number/buy", payload);
  logger.info({ phoneNumberId: phoneNumber.id, number: phoneNumber.number }, "Phone number purchased via Vapi");
  return phoneNumber;
}

export async function updatePhoneNumber(
  phoneNumberId: string,
  updates: { assistantId?: string; serverUrl?: string }
): Promise<VapiPhoneNumber> {
  const phoneNumber = await vapiRequest<VapiPhoneNumber>(
    "PATCH",
    `/phone-number/${phoneNumberId}`,
    updates
  );
  logger.info({ phoneNumberId }, "Vapi phone number updated");
  return phoneNumber;
}

export async function deletePhoneNumber(phoneNumberId: string): Promise<void> {
  await vapiRequest("DELETE", `/phone-number/${phoneNumberId}`);
  logger.info({ phoneNumberId }, "Vapi phone number deleted");
}

export async function listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
  return vapiRequest<VapiPhoneNumber[]>("GET", "/phone-number");
}

// ── Calls ──────────────────────────────────────────

export async function createOutboundCall(config: VapiCallConfig): Promise<VapiCall> {
  const call = await vapiRequest<VapiCall>("POST", "/call/phone", config);
  logger.info(
    { callId: call.id, customer: config.customer.number },
    "Vapi outbound call initiated"
  );
  return call;
}

export async function getCall(callId: string): Promise<VapiCall> {
  return vapiRequest<VapiCall>("GET", `/call/${callId}`);
}

export async function listCalls(params?: {
  assistantId?: string;
  limit?: number;
  createdAtGe?: string;
  createdAtLe?: string;
}): Promise<VapiCall[]> {
  const searchParams = new URLSearchParams();
  if (params?.assistantId) searchParams.set("assistantId", params.assistantId);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.createdAtGe) searchParams.set("createdAtGe", params.createdAtGe);
  if (params?.createdAtLe) searchParams.set("createdAtLe", params.createdAtLe);

  const query = searchParams.toString();
  return vapiRequest<VapiCall[]>("GET", `/call${query ? `?${query}` : ""}`);
}

// ── Tool Definitions ───────────────────────────────
// These are the tools (functions) the Vapi assistant can call.
// When called, Vapi will POST to our serverUrl with the function call details.

export function getAssistantTools(serverUrl: string): VapiTool[] {
  return [
    {
      type: "function",
      function: {
        name: "book_appointment",
        description:
          "Book an appointment for the caller. Use this when the caller wants to schedule a meeting, consultation, or appointment.",
        parameters: {
          type: "object",
          properties: {
            attendee_name: {
              type: "string",
              description: "Full name of the person booking the appointment",
            },
            attendee_phone: {
              type: "string",
              description: "Phone number of the attendee",
            },
            attendee_email: {
              type: "string",
              description: "Email address of the attendee (optional)",
            },
            preferred_date: {
              type: "string",
              description: "Preferred date for the appointment (YYYY-MM-DD format)",
            },
            preferred_time: {
              type: "string",
              description: "Preferred time for the appointment (HH:MM format, 24-hour)",
            },
            reason: {
              type: "string",
              description: "Reason for the appointment",
            },
          },
          required: ["attendee_name", "attendee_phone", "preferred_date", "preferred_time"],
        },
      },
      server: { url: serverUrl },
    },
    {
      type: "function",
      function: {
        name: "transfer_call",
        description:
          "Transfer the call to a human agent. Use this when the caller requests to speak with a person, or the issue requires human intervention.",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Why the call is being transferred",
            },
            department: {
              type: "string",
              description: "Department or person to transfer to (optional)",
            },
          },
          required: ["reason"],
        },
      },
      server: { url: serverUrl },
    },
    {
      type: "function",
      function: {
        name: "capture_lead",
        description:
          "Capture the caller's contact information as a lead. Use this whenever you learn the caller's name, email, company, or other contact details.",
        parameters: {
          type: "object",
          properties: {
            first_name: { type: "string", description: "Caller's first name" },
            last_name: { type: "string", description: "Caller's last name" },
            email: { type: "string", description: "Caller's email address" },
            phone: { type: "string", description: "Caller's phone number" },
            company: { type: "string", description: "Caller's company name" },
            notes: { type: "string", description: "Additional notes about the caller or their needs" },
          },
          required: ["phone"],
        },
      },
      server: { url: serverUrl },
    },
  ];
}

// ── Build Assistant Config from Script ─────────────

export function buildAssistantConfigFromScript(script: {
  name: string;
  voice: string;
  greeting: string;
  systemPrompt: string;
  tone: string;
  bookingEnabled: boolean;
  transferEnabled: boolean;
}, serverUrl: string) {
  const tools = getAssistantTools(serverUrl);

  // Remove booking/transfer tools if not enabled
  const filteredTools = tools.filter((tool) => {
    if (tool.function.name === "book_appointment" && !script.bookingEnabled) return false;
    if (tool.function.name === "transfer_call" && !script.transferEnabled) return false;
    return true;
  });

  return {
    name: script.name,
    voice: script.voice,
    firstMessage: script.greeting,
    systemPrompt: script.systemPrompt,
    tools: filteredTools,
    serverUrl,
  };
}
