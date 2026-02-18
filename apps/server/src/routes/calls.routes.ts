import { Router, type Response } from "express";
import { db } from "../config/db.js";
import { calls, transcriptEntries } from "../db/schema.js";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";
import { type AuthRequest, requireAuth, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { paginationSchema } from "@callo/shared";

const router = Router();

// All routes require auth and business
router.use(requireAuth);
router.use(requireBusiness);

// ── GET / ─ List calls for business (paginated, filterable) ──
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const { page, limit } = paginationSchema.parse(req.query);
    const { direction, status, outcome, startDate, endDate, phoneNumberId, campaignId } = req.query;

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(calls.businessId, businessId)];

    if (direction && typeof direction === "string") {
      conditions.push(eq(calls.direction, direction));
    }
    if (status && typeof status === "string") {
      conditions.push(eq(calls.status, status));
    }
    if (outcome && typeof outcome === "string") {
      conditions.push(eq(calls.outcome, outcome));
    }
    if (startDate && typeof startDate === "string") {
      conditions.push(gte(calls.createdAt, new Date(startDate)));
    }
    if (endDate && typeof endDate === "string") {
      conditions.push(lte(calls.createdAt, new Date(endDate)));
    }
    if (phoneNumberId && typeof phoneNumberId === "string") {
      conditions.push(eq(calls.phoneNumberId, phoneNumberId));
    }
    if (campaignId && typeof campaignId === "string") {
      conditions.push(eq(calls.campaignId, campaignId));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(calls)
      .where(whereClause);

    // Get paginated results
    const results = await db
      .select()
      .from(calls)
      .where(whereClause)
      .orderBy(desc(calls.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error listing calls");
    throw error;
  }
});

// ── GET /:id ─ Get call detail with transcript entries ──
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [call] = await db
      .select()
      .from(calls)
      .where(and(eq(calls.id, id), eq(calls.businessId, businessId)))
      .limit(1);

    if (!call) {
      throw new AppError(404, "Call not found");
    }

    // Fetch transcript entries
    const transcript = await db
      .select()
      .from(transcriptEntries)
      .where(eq(transcriptEntries.callId, id))
      .orderBy(transcriptEntries.timestamp);

    res.json({
      data: {
        ...call,
        transcript,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error getting call detail");
    throw error;
  }
});

// ── GET /:id/transcript ─ Get transcript entries for a call ──
router.get("/:id/transcript", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    // Verify call belongs to business
    const [call] = await db
      .select({ id: calls.id })
      .from(calls)
      .where(and(eq(calls.id, id), eq(calls.businessId, businessId)))
      .limit(1);

    if (!call) {
      throw new AppError(404, "Call not found");
    }

    const transcript = await db
      .select()
      .from(transcriptEntries)
      .where(eq(transcriptEntries.callId, id))
      .orderBy(transcriptEntries.timestamp);

    res.json({ data: transcript });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error getting transcript");
    throw error;
  }
});

export default router;
