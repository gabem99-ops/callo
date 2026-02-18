import { google } from "googleapis";
import { db } from "../config/db.js";
import { integrations } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

// ── Types ──────────────────────────────────────────

export interface TimeSlot {
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
}

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: string; // ISO 8601 datetime
  endTime: string; // ISO 8601 datetime
  timezone: string;
  attendees?: Array<{
    name?: string;
    email: string;
  }>;
  location?: string;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink: string;
  status: string;
}

// ── OAuth2 Client Factory ─────────────────────────

function createOAuth2Client() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.");
  }
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

// ── Get Auth URL ──────────────────────────────────

export function getAuthUrl(businessId: string): string {
  const oauth2Client = createOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state: businessId,
  });

  return authUrl;
}

// ── Handle OAuth Callback ─────────────────────────

export async function handleCallback(
  businessId: string,
  code: string,
): Promise<{ email: string | null }> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Failed to obtain access token from Google");
  }

  // Fetch the user's email from Google
  oauth2Client.setCredentials(tokens);
  let email: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    email = userInfo.data.email ?? null;
  } catch (err) {
    logger.warn({ err }, "Could not fetch Google user email");
  }

  const tokenExpiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  // Upsert integration record
  const existingIntegrations = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.businessId, businessId),
        eq(integrations.provider, "google_calendar"),
      ),
    )
    .limit(1);

  if (existingIntegrations.length > 0) {
    await db
      .update(integrations)
      .set({
        status: "connected",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? existingIntegrations[0].refreshToken,
        tokenExpiresAt,
        metadata: { email, scope: tokens.scope },
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, existingIntegrations[0].id));
  } else {
    await db.insert(integrations).values({
      businessId,
      provider: "google_calendar",
      status: "connected",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt,
      metadata: { email, scope: tokens.scope },
    });
  }

  logger.info({ businessId, email }, "Google Calendar connected");

  return { email };
}

// ── Get Calendar Client ───────────────────────────

export async function getCalendarClient(businessId: string) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.businessId, businessId),
        eq(integrations.provider, "google_calendar"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);

  if (!integration) {
    return null;
  }

  if (!integration.accessToken) {
    logger.warn({ businessId }, "Google Calendar integration has no access token");
    return null;
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    expiry_date: integration.tokenExpiresAt?.getTime(),
  });

  // Auto-refresh if token is expired or about to expire (within 5 minutes)
  const now = Date.now();
  const expiresAt = integration.tokenExpiresAt?.getTime() ?? 0;
  if (expiresAt - now < 5 * 60 * 1000) {
    try {
      logger.info({ businessId }, "Refreshing Google Calendar access token");
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      // Persist refreshed tokens
      await db
        .update(integrations)
        .set({
          accessToken: credentials.access_token ?? integration.accessToken,
          refreshToken: credentials.refresh_token ?? integration.refreshToken,
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : integration.tokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, integration.id));
    } catch (err) {
      logger.error({ err, businessId }, "Failed to refresh Google Calendar token");
      // Mark integration as expired
      await db
        .update(integrations)
        .set({
          status: "expired",
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, integration.id));
      return null;
    }
  }

  return google.calendar({ version: "v3", auth: oauth2Client });
}

// ── Check Availability ────────────────────────────

export async function checkAvailability(
  businessId: string,
  date: string,
  durationMinutes: number = 30,
): Promise<TimeSlot[]> {
  const calendar = await getCalendarClient(businessId);
  if (!calendar) {
    logger.warn({ businessId, date }, "No Google Calendar connected, returning empty availability");
    return [];
  }

  try {
    const timeMin = `${date}T00:00:00Z`;
    const timeMax = `${date}T23:59:59Z`;

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      },
    });

    const busySlots = response.data.calendars?.primary?.busy ?? [];

    // Generate available slots from 9 AM to 5 PM, avoiding busy periods
    const availableSlots: TimeSlot[] = [];
    const slotDuration = durationMinutes * 60 * 1000;
    const dayStart = new Date(`${date}T09:00:00`);
    const dayEnd = new Date(`${date}T17:00:00`);

    let cursor = dayStart.getTime();
    while (cursor + slotDuration <= dayEnd.getTime()) {
      const slotStart = cursor;
      const slotEnd = cursor + slotDuration;

      // Check if this slot overlaps with any busy period
      const isConflict = busySlots.some((busy) => {
        const busyStart = new Date(busy.start!).getTime();
        const busyEnd = new Date(busy.end!).getTime();
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (!isConflict) {
        availableSlots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
        });
      }

      // Move cursor by 30-minute increments
      cursor += 30 * 60 * 1000;
    }

    return availableSlots;
  } catch (err) {
    logger.error({ err, businessId, date }, "Error checking Google Calendar availability");
    return [];
  }
}

// ── Create Event ──────────────────────────────────

export async function createEvent(
  businessId: string,
  event: {
    summary: string;
    description?: string;
    startTime: string;
    endTime: string;
    attendeeEmail?: string;
    timezone?: string;
  },
): Promise<CalendarEventResult | null> {
  const calendar = await getCalendarClient(businessId);
  if (!calendar) {
    logger.warn({ businessId }, "No Google Calendar connected, skipping event creation");
    return null;
  }

  try {
    const attendees = event.attendeeEmail
      ? [{ email: event.attendeeEmail }]
      : undefined;

    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.startTime,
          timeZone: event.timezone ?? "America/New_York",
        },
        end: {
          dateTime: event.endTime,
          timeZone: event.timezone ?? "America/New_York",
        },
        attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 60 },
            { method: "popup", minutes: 15 },
          ],
        },
      },
    });

    logger.info(
      { businessId, eventId: result.data.id, summary: event.summary },
      "Google Calendar event created",
    );

    return {
      eventId: result.data.id ?? "",
      htmlLink: result.data.htmlLink ?? "",
      status: result.data.status ?? "confirmed",
    };
  } catch (err) {
    logger.error({ err, businessId, summary: event.summary }, "Error creating Google Calendar event");
    return null;
  }
}

// ── Cancel Event ──────────────────────────────────

export async function cancelEvent(
  businessId: string,
  eventId: string,
): Promise<boolean> {
  const calendar = await getCalendarClient(businessId);
  if (!calendar) {
    logger.warn({ businessId, eventId }, "No Google Calendar connected, skipping event cancellation");
    return false;
  }

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });

    logger.info({ businessId, eventId }, "Google Calendar event cancelled");
    return true;
  } catch (err) {
    logger.error({ err, businessId, eventId }, "Error cancelling Google Calendar event");
    return false;
  }
}

// ── Get Upcoming Events ───────────────────────────

export async function getUpcomingEvents(
  businessId: string,
  maxResults: number = 10,
) {
  const calendar = await getCalendarClient(businessId);
  if (!calendar) {
    logger.warn({ businessId }, "No Google Calendar connected");
    return [];
  }

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    return (response.data.items ?? []).map((event) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start?.dateTime ?? event.start?.date,
      end: event.end?.dateTime ?? event.end?.date,
      htmlLink: event.htmlLink,
      status: event.status,
      attendees: event.attendees?.map((a) => ({
        email: a.email,
        name: a.displayName,
        responseStatus: a.responseStatus,
      })),
    }));
  } catch (err) {
    logger.error({ err, businessId }, "Error listing upcoming Google Calendar events");
    return [];
  }
}

// ── Disconnect Calendar ───────────────────────────

export async function disconnectCalendar(businessId: string): Promise<boolean> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.businessId, businessId),
        eq(integrations.provider, "google_calendar"),
      ),
    )
    .limit(1);

  if (!integration) {
    return false;
  }

  // Attempt to revoke the token with Google
  if (integration.accessToken) {
    try {
      const oauth2Client = createOAuth2Client();
      await oauth2Client.revokeToken(integration.accessToken);
    } catch (err) {
      logger.warn({ err, businessId }, "Failed to revoke Google token (continuing with disconnect)");
    }
  }

  // Clear tokens and mark as disconnected
  await db
    .update(integrations)
    .set({
      status: "disconnected",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      metadata: {},
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integration.id));

  logger.info({ businessId }, "Google Calendar disconnected");
  return true;
}

// ── Get Connection Status ─────────────────────────

export async function getConnectionStatus(businessId: string) {
  const [integration] = await db
    .select({
      id: integrations.id,
      status: integrations.status,
      metadata: integrations.metadata,
      tokenExpiresAt: integrations.tokenExpiresAt,
      createdAt: integrations.createdAt,
      updatedAt: integrations.updatedAt,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.businessId, businessId),
        eq(integrations.provider, "google_calendar"),
      ),
    )
    .limit(1);

  if (!integration) {
    return {
      connected: false,
      email: null,
      status: "disconnected" as const,
    };
  }

  const metadata = integration.metadata as Record<string, unknown> | null;

  return {
    connected: integration.status === "connected",
    email: (metadata?.email as string) ?? null,
    status: integration.status,
    connectedAt: integration.createdAt,
    tokenExpiresAt: integration.tokenExpiresAt,
  };
}
