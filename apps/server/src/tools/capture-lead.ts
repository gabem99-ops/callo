import { db } from "../config/db.js";
import { leads, calls } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { logger } from "../config/logger.js";
import type { CallSessionContext } from "./index.js";

interface CaptureLeadArgs {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone: string;
  company?: string;
  notes?: string;
}

export async function handleCaptureLead(
  args: CaptureLeadArgs,
  callSession: CallSessionContext
): Promise<string> {
  try {
    const { first_name, last_name, email, phone, company, notes } = args;

    logger.info(
      { callId: callSession.callId, phone, first_name, last_name },
      "Capturing lead via tool call"
    );

    // Check if a lead with this phone number already exists for this business
    const [existingLead] = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.businessId, callSession.businessId),
          eq(leads.phone, phone)
        )
      )
      .limit(1);

    let leadId: string;

    if (existingLead) {
      // Update the existing lead with any new information
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (first_name && !existingLead.firstName) {
        updateData.firstName = first_name;
      }
      if (last_name && !existingLead.lastName) {
        updateData.lastName = last_name;
      }
      if (email && !existingLead.email) {
        updateData.email = email;
      }
      if (company && !existingLead.company) {
        updateData.company = company;
      }
      if (notes) {
        // Append new notes to existing notes
        updateData.notes = existingLead.notes
          ? `${existingLead.notes}\n---\n${notes}`
          : notes;
      }

      await db
        .update(leads)
        .set(updateData)
        .where(eq(leads.id, existingLead.id));

      leadId = existingLead.id;

      logger.info(
        { leadId, callId: callSession.callId },
        "Existing lead updated"
      );
    } else {
      // Create a new lead record
      const [newLead] = await db
        .insert(leads)
        .values({
          businessId: callSession.businessId,
          firstName: first_name ?? null,
          lastName: last_name ?? null,
          email: email ?? null,
          phone,
          company: company ?? null,
          source: "inbound_call",
          status: "new",
          notes: notes ?? null,
        })
        .returning();

      leadId = newLead.id;

      logger.info(
        { leadId, callId: callSession.callId },
        "New lead created"
      );
    }

    // Link the lead to the current call
    await db
      .update(calls)
      .set({
        leadId,
        outcome: "lead_captured",
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callSession.callId));

    // Build a confirmation name string
    const displayName = [first_name, last_name].filter(Boolean).join(" ") || phone;

    return `I've captured the contact information for ${displayName}. ${existingLead ? "I've updated their existing record with the new details." : "A new lead record has been created."} Is there anything else I can help you with?`;
  } catch (error) {
    logger.error({ err: error, callId: callSession.callId }, "Error capturing lead");
    return "I've noted your information. Is there anything else I can help you with?";
  }
}
