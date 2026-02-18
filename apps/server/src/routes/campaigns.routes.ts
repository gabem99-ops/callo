import { Router, type Response } from "express";
import { db } from "../config/db.js";
import { campaigns, campaignLeads, leads } from "../db/schema.js";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { type AuthRequest, requireAuth, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { createCampaignSchema } from "@callo/shared";
import * as outboundService from "../services/outbound.service.js";

const router = Router();

// All routes require auth and business
router.use(requireAuth);
router.use(requireBusiness);

// ── GET / ─ List campaigns for business ──
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    const results = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.businessId, businessId))
      .orderBy(desc(campaigns.createdAt));

    res.json({ data: results });
  } catch (error) {
    logger.error({ err: error }, "Error listing campaigns");
    throw error;
  }
});

// ── GET /:id ─ Get campaign with lead stats ──
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.businessId, businessId)))
      .limit(1);

    if (!campaign) {
      throw new AppError(404, "Campaign not found");
    }

    // Get lead status breakdown
    const leadStats = await db
      .select({
        status: campaignLeads.status,
        count: count(),
      })
      .from(campaignLeads)
      .where(eq(campaignLeads.campaignId, id))
      .groupBy(campaignLeads.status);

    // Get campaign leads with lead details
    const campaignLeadsList = await db
      .select({
        campaignLead: campaignLeads,
        lead: leads,
      })
      .from(campaignLeads)
      .innerJoin(leads, eq(campaignLeads.leadId, leads.id))
      .where(eq(campaignLeads.campaignId, id))
      .orderBy(desc(campaignLeads.createdAt));

    res.json({
      data: {
        ...campaign,
        leadStats,
        leads: campaignLeadsList,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error getting campaign");
    throw error;
  }
});

// ── POST / ─ Create campaign ──
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = createCampaignSchema.parse(req.body);

    // Create the campaign
    const [campaign] = await db
      .insert(campaigns)
      .values({
        businessId,
        name: body.name,
        scriptId: body.scriptId,
        phoneNumberId: body.phoneNumberId,
        schedule: body.schedule,
        maxConcurrentCalls: body.maxConcurrentCalls ?? 1,
        retryAttempts: body.retryAttempts ?? 2,
        totalLeads: body.leadIds.length,
        status: "draft",
      })
      .returning();

    // Create campaign lead entries
    if (body.leadIds.length > 0) {
      await db.insert(campaignLeads).values(
        body.leadIds.map((leadId) => ({
          campaignId: campaign.id,
          leadId,
          status: "pending" as const,
        }))
      );
    }

    logger.info({ campaignId: campaign.id, businessId, leadCount: body.leadIds.length }, "Campaign created");
    res.status(201).json({ data: campaign });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error creating campaign");
    throw error;
  }
});

// ── PUT /:id ─ Update campaign ──
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;
    const body = createCampaignSchema.partial().omit({ leadIds: true }).parse(req.body);

    // Verify campaign belongs to business and is in editable state
    const [existing] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.businessId, businessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Campaign not found");
    }

    if (existing.status === "running") {
      throw new AppError(400, "Cannot update a running campaign. Pause it first.");
    }

    if (existing.status === "completed" || existing.status === "canceled") {
      throw new AppError(400, "Cannot update a completed or canceled campaign");
    }

    const [updated] = await db
      .update(campaigns)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();

    logger.info({ campaignId: id, businessId }, "Campaign updated");
    res.json({ data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error updating campaign");
    throw error;
  }
});

// ── POST /:id/start ─ Start campaign ──
router.post("/:id/start", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.businessId, businessId)))
      .limit(1);

    if (!campaign) {
      throw new AppError(404, "Campaign not found");
    }

    if (campaign.status !== "draft" && campaign.status !== "paused") {
      throw new AppError(400, `Cannot start a campaign with status "${campaign.status}"`);
    }

    // Verify there are pending leads
    const [{ pendingCount }] = await db
      .select({ pendingCount: count() })
      .from(campaignLeads)
      .where(
        and(
          eq(campaignLeads.campaignId, id),
          eq(campaignLeads.status, "pending")
        )
      );

    if (pendingCount === 0) {
      throw new AppError(400, "Campaign has no pending leads to call");
    }

    const [updated] = await db
      .update(campaigns)
      .set({
        status: "running",
        startedAt: campaign.startedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();

    // Start the outbound dialer engine for this campaign
    // Fire and forget — the dialer runs in the background
    outboundService.startCampaign(id).catch((err) => {
      logger.error({ err, campaignId: id }, "Failed to start outbound dialer engine");
    });

    logger.info({ campaignId: id, businessId, pendingLeads: pendingCount }, "Campaign started");
    res.json({ data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error starting campaign");
    throw error;
  }
});

// ── POST /:id/pause ─ Pause campaign ──
router.post("/:id/pause", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.businessId, businessId)))
      .limit(1);

    if (!campaign) {
      throw new AppError(404, "Campaign not found");
    }

    if (campaign.status !== "running") {
      throw new AppError(400, `Cannot pause a campaign with status "${campaign.status}"`);
    }

    // Stop the outbound dialer engine first
    await outboundService.pauseCampaign(id);

    // Re-fetch the updated campaign (outbound service already set status to "paused")
    const [updated] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    logger.info({ campaignId: id, businessId }, "Campaign paused");
    res.json({ data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error pausing campaign");
    throw error;
  }
});

// ── POST /:id/cancel ─ Cancel campaign ──
router.post("/:id/cancel", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.businessId, businessId)))
      .limit(1);

    if (!campaign) {
      throw new AppError(404, "Campaign not found");
    }

    if (campaign.status === "completed" || campaign.status === "canceled") {
      throw new AppError(400, `Campaign is already ${campaign.status}`);
    }

    // Stop the outbound dialer engine and mark leads as skipped
    await outboundService.cancelCampaign(id);

    // Re-fetch the updated campaign (outbound service already set status to "canceled")
    const [updated] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    logger.info({ campaignId: id, businessId }, "Campaign canceled");
    res.json({ data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error canceling campaign");
    throw error;
  }
});

export default router;
