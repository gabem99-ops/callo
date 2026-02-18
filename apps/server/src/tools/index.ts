import { handleBookAppointment } from "./book-appointment.js";
import { handleTransferCall } from "./transfer-call.js";
import { handleCaptureLead } from "./capture-lead.js";
import { handleEndCall } from "./end-call.js";
import { logger } from "../config/logger.js";

export interface CallSessionContext {
  callId: string;
  businessId: string;
  scriptId: string | null;
  fromNumber: string;
  toNumber: string;
  twilioCallSid: string;
}

/**
 * Routes an OpenAI function call to the appropriate tool handler.
 *
 * @param toolName - The name of the tool as defined in the OpenAI function calling schema
 * @param args - The parsed arguments from the function call
 * @param callSession - Context about the current call session
 * @returns The tool output string for the AI to use in its response
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  callSession: CallSessionContext
): Promise<string> {
  logger.info(
    { toolName, callId: callSession.callId, args },
    "Handling tool call"
  );

  switch (toolName) {
    case "book_appointment":
      return handleBookAppointment(
        args as unknown as Parameters<typeof handleBookAppointment>[0],
        callSession
      );

    case "transfer_call":
      return handleTransferCall(
        args as unknown as Parameters<typeof handleTransferCall>[0],
        callSession
      );

    case "capture_lead":
      return handleCaptureLead(
        args as unknown as Parameters<typeof handleCaptureLead>[0],
        callSession
      );

    case "end_call":
      return handleEndCall(
        args as unknown as Parameters<typeof handleEndCall>[0],
        callSession
      );

    default:
      logger.warn(
        { toolName, callId: callSession.callId },
        "Unknown tool call received"
      );
      return `Unknown tool "${toolName}". I'll continue the conversation without that action.`;
  }
}

export { handleBookAppointment } from "./book-appointment.js";
export { handleTransferCall } from "./transfer-call.js";
export { handleCaptureLead } from "./capture-lead.js";
export { handleEndCall } from "./end-call.js";
