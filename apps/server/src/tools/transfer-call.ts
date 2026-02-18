import { db } from "../config/db.js";
import { scripts, calls } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import type { CallSessionContext } from "./index.js";

interface TransferCallArgs {
  reason: string;
  transfer_to?: string;
}

export async function handleTransferCall(
  args: TransferCallArgs,
  callSession: CallSessionContext
): Promise<string> {
  try {
    const { reason, transfer_to } = args;

    logger.info(
      { callId: callSession.callId, reason, transfer_to },
      "Transferring call via tool call"
    );

    // Determine the transfer number
    let transferNumber = transfer_to;

    // If no explicit transfer_to was provided, look up the script's configured transfer number
    if (!transferNumber && callSession.scriptId) {
      const [script] = await db
        .select()
        .from(scripts)
        .where(eq(scripts.id, callSession.scriptId))
        .limit(1);

      if (script?.transferEnabled && script.transferNumber) {
        transferNumber = script.transferNumber;
      }
    }

    if (!transferNumber) {
      logger.warn(
        { callId: callSession.callId },
        "No transfer number available for call"
      );
      return "I'm sorry, I'm unable to transfer the call right now because no transfer number is configured. Is there anything else I can help you with?";
    }

    // Update the call outcome to transferred
    await db
      .update(calls)
      .set({
        outcome: "transferred",
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callSession.callId));

    // TODO: Execute the actual Twilio transfer/conference
    // This would use the Twilio REST API to:
    // 1. Create a new participant in the call (conference approach), or
    // 2. Use <Dial> TwiML to redirect the call
    //
    // Example implementation:
    // const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    // await twilioClient.calls(callSession.twilioCallSid).update({
    //   twiml: `<Response><Dial>${transferNumber}</Dial></Response>`,
    // });
    //
    // For a warm transfer (conference):
    // const conference = await twilioClient.conferences.create({
    //   friendlyName: `transfer-${callSession.callId}`,
    // });
    // await twilioClient.conferences(conference.sid)
    //   .participants.create({ from: callSession.toNumber, to: transferNumber });

    logger.info(
      { callId: callSession.callId, transferNumber },
      "Call transfer initiated (stub)"
    );

    return `I'm transferring you now to ${transferNumber}. The reason for the transfer is: ${reason}. Please hold while I connect you.`;
  } catch (error) {
    logger.error({ err: error, callId: callSession.callId }, "Error transferring call");
    return "I'm sorry, I wasn't able to transfer the call at this time. Let me see if there's another way I can help you.";
  }
}
