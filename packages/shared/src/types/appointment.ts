export interface Appointment {
  id: string;
  businessId: string;
  callId: string | null;
  leadId: string | null;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  timezone: string;
  calendarEventId: string | null;
  calendarProvider: string | null;
  status: AppointmentStatus;
  attendeeName: string | null;
  attendeeEmail: string | null;
  attendeePhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentStatus = "scheduled" | "confirmed" | "canceled" | "completed" | "no_show";
