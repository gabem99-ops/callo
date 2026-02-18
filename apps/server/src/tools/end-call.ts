import { db } from "../config/db.js";
import { calls } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../config/logger.js";
import type { CallSessionContext } from "./index.js";

interface EndCallArgs {
  reason: string;
  summary?: string;
}

export async function handleEndCall(
  args: EndCallArgs,
  callSession: CallSessionContext
): Promise<string> {
  try {
    const { reason, summary } = args;

    logger.info(
      { callId: callSession.callId, reason },
      "Ending call via tool call"
    );

    // Update the call record with the summary and end status
    const updateData: Record<string, unknown> = {
      endedAt: new Date(),
      updatedAt: new Date(),
    };

    if (summary) {
      updateData.summary = summary;
    }

    // Only set status to completed if it's currently in_progress
    // The Twilio status callback will also update this, but we set it proactively
    updateData.status = "completed";

    await db
      .update(calls)
      .set(updateData)
      .where(eq(calls.id, callSession.callId));

    logger.info(
      { callId: callSession.callId, reason },
      "Call ended, record updated"
    );

    // TODO: Close the Twilio media stream
    // This would be handled by the WebSocket handler that manages the media stream.
    // The tool output signals to the session manager that the call should be terminated.
    // The WebSocket handler should:
    // 1. Send a final AI response (the goodbye message below)
    // 2. Close the WebSocket connection to the Twilio media stream
    // 3. Optionally call twilioClient.calls(callSession.twilioCallSid).update({ status: "completed" })

    // Build a goodbye message based on the reason
    let goodbyeMessage: string;

    switch (reason) {
      case "caller_request":
        goodbyeMessage = "Thank you for calling. Have a great day! Goodbye.";
        break;
      case "issue_resolved":
        goodbyeMessage = "Glad I could help! If you need anything else, don't hesitate to call back. Goodbye!";
        break;
      case "appointment_booked":
        goodbyeMessage = "Your appointment is all set. We look forward to seeing you! Goodbye.";
        break;
      case "transferred":
        goodbyeMessage = "I'm connecting you now. Thank you for your patience.";
        break;
      case "after_hours":
        goodbyeMessage = "We're currently outside of business hours. Please call back during our regular hours. Thank you and goodbye!";
        break;
      case "no_response":
        goodbyeMessage = "I haven't heard a response. I'll go ahead and end the call. Feel free to call back anytime. Goodbye!";
        break;
      default:
        goodbyeMessage = "Thank you for calling. Goodbye!";
        break;
    }

    return goodbyeMessage;
  } catch (error) {
    logger.error({ err: error, callId: callSession.callId }, "Error ending call");
    return "Thank you for calling. Goodbye!";
  }
}
