import { db } from "../config/db.js";
import { appointments, calls, scripts } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../config/logger.js";
import type { CallSessionContext } from "./index.js";
import * as calendarService from "../services/calendar.service.js";

interface BookAppointmentArgs {
  attendee_name: string;
  attendee_phone: string;
  attendee_email?: string;
  preferred_date: string; // YYYY-MM-DD
  preferred_time: string; // HH:MM (24h format)
  reason?: string;
}

export async function handleBookAppointment(
  args: BookAppointmentArgs,
  callSession: CallSessionContext
): Promise<string> {
  try {
    const { attendee_name, attendee_phone, attendee_email, preferred_date, preferred_time, reason } = args;

    logger.info(
      { callId: callSession.callId, attendee_name, preferred_date, preferred_time },
      "Booking appointment via tool call"
    );

    // Look up the business timezone from the call's script or default to America/New_York
    let timezone = "America/New_York";
    if (callSession.scriptId) {
      const [script] = await db
        .select()
        .from(scripts)
        .where(eq(scripts.id, callSession.scriptId))
        .limit(1);

      if (script) {
        // Scripts don't have timezone directly; we could look up the business.
        // For now, use the default.
      }
    }

    // Parse the preferred date and time into start/end timestamps
    // Default appointment duration: 30 minutes
    const durationMinutes = 30;
    const startTime = new Date(`${preferred_date}T${preferred_time}:00`);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    if (isNaN(startTime.getTime())) {
      return `I wasn't able to parse the date and time "${preferred_date} ${preferred_time}". Could you please provide the date in YYYY-MM-DD format and time in HH:MM format?`;
    }

    // Check Google Calendar availability if connected
    const availableSlots = await calendarService.checkAvailability(
      callSession.businessId,
      preferred_date,
      durationMinutes,
    );

    // If we got availability data back (calendar is connected), verify the slot is free
    if (availableSlots.length > 0) {
      const requestedStart = startTime.getTime();
      const requestedEnd = endTime.getTime();

      const slotAvailable = availableSlots.some((slot) => {
        const slotStart = new Date(slot.start).getTime();
        const slotEnd = new Date(slot.end).getTime();
        return requestedStart >= slotStart && requestedEnd <= slotEnd;
      });

      if (!slotAvailable) {
        // Suggest up to 3 alternative times
        const suggestions = availableSlots.slice(0, 3).map((slot) => {
          const slotDate = new Date(slot.start);
          return slotDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
        });

        const suggestionsText = suggestions.length > 0
          ? ` Some available times on that day are: ${suggestions.join(", ")}.`
          : "";

        return `I'm sorry, but the requested time of ${preferred_time} on ${preferred_date} is not available.${suggestionsText} Would you like to pick a different time?`;
      }
    }

    // Build the appointment title
    const title = reason
      ? `Appointment: ${reason}`
      : `Appointment with ${attendee_name}`;

    // Create the appointment record in the database
    const [appointment] = await db
      .insert(appointments)
      .values({
        businessId: callSession.businessId,
        callId: callSession.callId,
        title,
        description: reason ?? null,
        startTime,
        endTime,
        timezone,
        status: "scheduled",
        attendeeName: attendee_name,
        attendeeEmail: attendee_email ?? null,
        attendeePhone: attendee_phone,
      })
      .returning();

    logger.info(
      { appointmentId: appointment.id, callId: callSession.callId },
      "Appointment created successfully"
    );

    // Create Google Calendar event if connected
    const calendarEvent = await calendarService.createEvent(callSession.businessId, {
      summary: title,
      description: [
        reason ? `Reason: ${reason}` : null,
        `Attendee: ${attendee_name}`,
        attendee_phone ? `Phone: ${attendee_phone}` : null,
        attendee_email ? `Email: ${attendee_email}` : null,
        `Booked via Callo AI phone call`,
      ]
        .filter(Boolean)
        .join("\n"),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendeeEmail: attendee_email,
      timezone,
    });

    // Update appointment with calendar event info if successfully created
    if (calendarEvent) {
      await db
        .update(appointments)
        .set({
          calendarEventId: calendarEvent.eventId,
          calendarProvider: "google_calendar",
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointment.id));

      logger.info(
        {
          appointmentId: appointment.id,
          calendarEventId: calendarEvent.eventId,
        },
        "Appointment linked to Google Calendar event"
      );
    }

    // Update the call outcome to appointment_booked
    await db
      .update(calls)
      .set({
        outcome: "appointment_booked",
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callSession.callId));

    // Format the confirmation message for the AI to speak back to the caller
    const dateFormatted = startTime.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeFormatted = startTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const calendarNote = calendarEvent
      ? " A calendar invitation has been sent."
      : "";

    return `Great, I've booked your appointment for ${dateFormatted} at ${timeFormatted}. The appointment is confirmed for ${attendee_name}.${calendarNote} Is there anything else I can help you with?`;
  } catch (error) {
    logger.error({ err: error, callId: callSession.callId }, "Error booking appointment");
    return "I'm sorry, I encountered an issue while trying to book your appointment. Could you please try again or I can transfer you to someone who can help?";
  }
}
