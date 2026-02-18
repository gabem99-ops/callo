import { Router, type Response } from "express";
import { db } from "../config/db.js";
import { scripts, businesses } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { type AuthRequest, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { createScriptSchema } from "@callo/shared";
import { env } from "../config/env.js";
import { buildSystemPrompt } from "../services/call-handler.service.js";
import * as vapiService from "../services/vapi.service.js";

const router = Router();

router.use(requireBusiness);

// ── GET / ─ List scripts for business ──
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    const results = await db
      .select()
      .from(scripts)
      .where(eq(scripts.businessId, businessId))
      .orderBy(desc(scripts.createdAt));

    res.json({ data: results });
  } catch (error) {
    logger.error({ err: error }, "Error listing scripts");
    throw error;
  }
});

// ── GET /:id ─ Get script by ID ──
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [script] = await db
      .select()
      .from(scripts)
      .where(and(eq(scripts.id, id), eq(scripts.businessId, businessId)))
      .limit(1);

    if (!script) {
      throw new AppError(404, "Script not found");
    }

    res.json({ data: script });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error getting script");
    throw error;
  }
});

// ── GET /:id/preview ─ Preview assembled system prompt ──
router.get("/:id/preview", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [script] = await db
      .select()
      .from(scripts)
      .where(and(eq(scripts.id, id), eq(scripts.businessId, businessId)))
      .limit(1);

    if (!script) {
      throw new AppError(404, "Script not found");
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    const systemPrompt = buildSystemPrompt(
      {
        id: script.id,
        name: script.name,
        voice: script.voice,
        greeting: script.greeting,
        systemPrompt: script.systemPrompt,
        faqs: script.faqs,
        bookingEnabled: script.bookingEnabled,
        bookingInstructions: script.bookingInstructions,
        transferEnabled: script.transferEnabled,
        transferNumber: script.transferNumber,
        transferConditions: script.transferConditions,
        escalationMessage: script.escalationMessage,
        qualificationQuestions: script.qualificationQuestions,
        tone: script.tone,
      },
      {
        id: business.id,
        name: business.name,
        industry: business.industry,
        timezone: business.timezone,
        businessHours: business.businessHours,
        phone: business.phone,
      }
    );

    res.json({ data: { systemPrompt, script } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error previewing script");
    throw error;
  }
});

// ── POST / ─ Create script + sync Vapi assistant ──
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = createScriptSchema.parse(req.body);

    // Get business for system prompt assembly
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new AppError(404, "Business not found");
    }

    // Create script in DB first
    const [script] = await db
      .insert(scripts)
      .values({
        businessId,
        name: body.name,
        type: body.type,
        voice: body.voice ?? "alloy",
        greeting: body.greeting,
        systemPrompt: body.systemPrompt,
        faqs: body.faqs ?? [],
        bookingEnabled: body.bookingEnabled ?? false,
        bookingInstructions: body.bookingInstructions,
        transferEnabled: body.transferEnabled ?? false,
        transferNumber: body.transferNumber,
        transferConditions: body.transferConditions,
        qualificationQuestions: body.qualificationQuestions ?? [],
        tone: body.tone ?? "professional",
      })
      .returning();

    // Build system prompt and create Vapi assistant
    const systemPrompt = buildSystemPrompt(
      {
        id: script.id,
        name: script.name,
        voice: script.voice,
        greeting: script.greeting,
        systemPrompt: script.systemPrompt,
        faqs: script.faqs,
        bookingEnabled: script.bookingEnabled,
        bookingInstructions: script.bookingInstructions,
        transferEnabled: script.transferEnabled,
        transferNumber: script.transferNumber,
        transferConditions: script.transferConditions,
        escalationMessage: script.escalationMessage,
        qualificationQuestions: script.qualificationQuestions,
        tone: script.tone,
      },
      {
        id: business.id,
        name: business.name,
        industry: business.industry,
        timezone: business.timezone,
        businessHours: business.businessHours,
        phone: business.phone,
      }
    );

    const serverUrl = `${env.SERVER_URL}/api/vapi/webhook`;
    try {
      const assistant = await vapiService.createAssistant({
        name: `${business.name} - ${script.name}`,
        voice: script.voice,
        firstMessage: script.greeting,
        systemPrompt,
        tools: vapiService.getAssistantTools(serverUrl),
        serverUrl,
      });

      // Update script with Vapi assistant ID
      await db
        .update(scripts)
        .set({ vapiAssistantId: assistant.id })
        .where(eq(scripts.id, script.id));

      script.vapiAssistantId = assistant.id;

      logger.info(
        { scriptId: script.id, vapiAssistantId: assistant.id },
        "Script created with Vapi assistant"
      );
    } catch (vapiError) {
      logger.error({ err: vapiError, scriptId: script.id }, "Failed to create Vapi assistant (script saved without it)");
    }

    res.status(201).json({ data: script });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error creating script");
    throw error;
  }
});

// ── PUT /:id ─ Update script + sync Vapi assistant ──
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;
    const body = createScriptSchema.partial().parse(req.body);

    const [existing] = await db
      .select()
      .from(scripts)
      .where(and(eq(scripts.id, id), eq(scripts.businessId, businessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Script not found");
    }

    const [updated] = await db
      .update(scripts)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(scripts.id, id))
      .returning();

    // Sync updates to Vapi assistant if one exists
    if (updated.vapiAssistantId) {
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (business) {
        const systemPrompt = buildSystemPrompt(
          {
            id: updated.id,
            name: updated.name,
            voice: updated.voice,
            greeting: updated.greeting,
            systemPrompt: updated.systemPrompt,
            faqs: updated.faqs,
            bookingEnabled: updated.bookingEnabled,
            bookingInstructions: updated.bookingInstructions,
            transferEnabled: updated.transferEnabled,
            transferNumber: updated.transferNumber,
            transferConditions: updated.transferConditions,
            escalationMessage: updated.escalationMessage,
            qualificationQuestions: updated.qualificationQuestions,
            tone: updated.tone,
          },
          {
            id: business.id,
            name: business.name,
            industry: business.industry,
            timezone: business.timezone,
            businessHours: business.businessHours,
            phone: business.phone,
          }
        );

        const serverUrl = `${env.SERVER_URL}/api/vapi/webhook`;
        try {
          await vapiService.updateAssistant(updated.vapiAssistantId, {
            name: `${business.name} - ${updated.name}`,
            voice: { provider: "openai", voiceId: updated.voice },
            firstMessage: updated.greeting,
            model: {
              provider: "openai",
              model: "gpt-4o",
              messages: [{ role: "system", content: systemPrompt }],
              tools: vapiService.getAssistantTools(serverUrl),
            },
            serverUrl,
          });
          logger.info({ scriptId: id, vapiAssistantId: updated.vapiAssistantId }, "Vapi assistant synced");
        } catch (vapiError) {
          logger.error({ err: vapiError, scriptId: id }, "Failed to sync Vapi assistant");
        }
      }
    }

    logger.info({ scriptId: id, businessId }, "Script updated");
    res.json({ data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error updating script");
    throw error;
  }
});

// ── DELETE /:id ─ Delete script + Vapi assistant ──
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [existing] = await db
      .select()
      .from(scripts)
      .where(and(eq(scripts.id, id), eq(scripts.businessId, businessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Script not found");
    }

    // Delete Vapi assistant if one exists
    if (existing.vapiAssistantId) {
      try {
        await vapiService.deleteAssistant(existing.vapiAssistantId);
        logger.info({ vapiAssistantId: existing.vapiAssistantId }, "Vapi assistant deleted");
      } catch (vapiError) {
        logger.warn({ err: vapiError }, "Failed to delete Vapi assistant (may not exist)");
      }
    }

    await db.delete(scripts).where(eq(scripts.id, id));

    logger.info({ scriptId: id, businessId }, "Script deleted");
    res.json({ message: "Script deleted successfully" });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error deleting script");
    throw error;
  }
});

export default router;
