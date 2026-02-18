import { Router, type Response } from "express";
import { db } from "../config/db.js";
import { integrations } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { type AuthRequest, requireAuth, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { env } from "../config/env.js";
import * as calendarService from "../services/calendar.service.js";

const router = Router();

// All routes require auth and business
router.use(requireAuth);
router.use(requireBusiness);

// ── GET / ─ List integrations for business ──
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    const results = await db
      .select({
        id: integrations.id,
        businessId: integrations.businessId,
        provider: integrations.provider,
        status: integrations.status,
        tokenExpiresAt: integrations.tokenExpiresAt,
        metadata: integrations.metadata,
        createdAt: integrations.createdAt,
        updatedAt: integrations.updatedAt,
      })
      .from(integrations)
      .where(eq(integrations.businessId, businessId))
      .orderBy(desc(integrations.createdAt));

    // Never expose tokens in list response
    res.json({ data: results });
  } catch (error) {
    logger.error({ err: error }, "Error listing integrations");
    throw error;
  }
});

// ── GET /google/connect ─ Start Google OAuth flow ──
router.get("/google/connect", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    const authUrl = calendarService.getAuthUrl(businessId);

    logger.info({ businessId }, "Google OAuth connect initiated");

    res.json({
      data: {
        authUrl,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error starting Google OAuth");
    throw error;
  }
});

// ── GET /google/callback ─ Google OAuth callback ──
router.get("/google/callback", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      throw new AppError(400, "Missing authorization code");
    }

    const { email } = await calendarService.handleCallback(businessId, code);

    logger.info({ businessId, email }, "Google Calendar connected via callback");

    res.json({
      data: {
        provider: "google_calendar",
        status: "connected",
        email,
        message: "Google Calendar connected successfully",
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error handling Google OAuth callback");
    throw error;
  }
});

// ── GET /google/status ─ Get Google Calendar connection status ──
router.get("/google/status", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const status = await calendarService.getConnectionStatus(businessId);

    res.json({ data: status });
  } catch (error) {
    logger.error({ err: error }, "Error getting Google Calendar status");
    throw error;
  }
});

// ── GET /google/events ─ List upcoming Google Calendar events ──
router.get("/google/events", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const maxResults = req.query.maxResults
      ? parseInt(req.query.maxResults as string, 10)
      : 10;

    const events = await calendarService.getUpcomingEvents(businessId, maxResults);

    res.json({ data: events });
  } catch (error) {
    logger.error({ err: error }, "Error listing Google Calendar events");
    throw error;
  }
});

// ── DELETE /google/disconnect ─ Disconnect Google Calendar ──
router.delete("/google/disconnect", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    const success = await calendarService.disconnectCalendar(businessId);

    if (!success) {
      throw new AppError(404, "Google Calendar integration not found");
    }

    logger.info({ businessId }, "Google Calendar disconnected");

    res.json({ message: "Google Calendar disconnected successfully" });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error disconnecting Google Calendar");
    throw error;
  }
});

// ── DELETE /:id ─ Disconnect integration by ID ──
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    // Verify integration belongs to business
    const [existing] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, id), eq(integrations.businessId, businessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Integration not found");
    }

    // Update status to disconnected and clear tokens
    await db
      .update(integrations)
      .set({
        status: "disconnected",
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, id));

    logger.info({ integrationId: id, businessId, provider: existing.provider }, "Integration disconnected");

    res.json({ message: `${existing.provider} disconnected successfully` });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error disconnecting integration");
    throw error;
  }
});

export default router;
