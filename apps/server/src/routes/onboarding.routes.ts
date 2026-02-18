import { Router, type Response } from "express";
import { z } from "zod";
import { db } from "../config/db.js";
import { businesses, scripts } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { type AuthRequest, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { env } from "../config/env.js";
import {
  getTemplateById,
  interpolateTemplate,
  VOICE_OPTIONS,
  USE_CASE_OPTIONS,
} from "@callo/shared";
import { buildSystemPrompt } from "../services/call-handler.service.js";
import * as vapiService from "../services/vapi.service.js";

const router = Router();

router.use(requireBusiness);

// ── Validation schema ────────────────────────────
const onboardingSchema = z.object({
  industryTemplateId: z.string().min(1),
  useCases: z.array(z.string()),
  businessName: z.string().min(1).max(200),
  phone: z.string().optional(),
  timezone: z.string().min(1),
  voiceId: z.string().min(1),
  greetingOverride: z.string().optional(),
});

// ── POST /complete — atomic onboarding setup ─────
router.post("/complete", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = onboardingSchema.parse(req.body);

    // 1. Look up industry template
    const template = getTemplateById(body.industryTemplateId);
    if (!template) {
      throw new AppError(400, `Unknown industry template: ${body.industryTemplateId}`);
    }

    // 2. Resolve voice
    const voice = VOICE_OPTIONS.find((v) => v.id === body.voiceId);
    const vapiVoiceId = voice?.vapiVoiceId ?? "alloy";

    // 3. Interpolate template content with business name
    const greeting = body.greetingOverride?.trim()
      ? body.greetingOverride.trim()
      : interpolateTemplate(template.greeting, body.businessName);

    const systemPromptBase = interpolateTemplate(template.systemPrompt, body.businessName);

    const faqs = template.faqs.map((faq) => ({
      question: interpolateTemplate(faq.question, body.businessName),
      answer: interpolateTemplate(faq.answer, body.businessName),
    }));

    // 4. Determine features from use cases
    const useCaseSet = new Set(body.useCases);
    const bookingEnabled = useCaseSet.has("schedule_appointments");
    const transferEnabled = useCaseSet.has("transfer_urgent");
    const qualificationEnabled = useCaseSet.has("qualify_prospects");

    const bookingInstructions = bookingEnabled
      ? "Ask the caller for their name, preferred date, and preferred time to schedule an appointment."
      : undefined;

    const transferConditions = transferEnabled
      ? "Transfer when the caller requests to speak with a real person, has an urgent issue, or the situation requires human judgment."
      : undefined;

    const qualificationQuestions = qualificationEnabled
      ? [
          "What is your name?",
          "What is the best way to reach you?",
          "Can you briefly describe what you need help with?",
        ]
      : [];

    // 5. Update business record
    const [business] = await db
      .update(businesses)
      .set({
        name: body.businessName,
        industry: template.label,
        phone: body.phone || undefined,
        timezone: body.timezone,
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId))
      .returning();

    if (!business) {
      throw new AppError(404, "Business not found");
    }

    // 6. Create script with generated content
    const [script] = await db
      .insert(scripts)
      .values({
        businessId,
        name: `${body.businessName} Receptionist`,
        type: "inbound",
        voice: vapiVoiceId,
        greeting,
        systemPrompt: systemPromptBase,
        faqs,
        bookingEnabled,
        bookingInstructions,
        transferEnabled,
        transferConditions,
        qualificationQuestions,
        tone: template.tone,
        isDefault: true,
      })
      .returning();

    // 7. Create Vapi assistant from script
    const fullSystemPrompt = buildSystemPrompt(
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
        systemPrompt: fullSystemPrompt,
        tools: vapiService.getAssistantTools(serverUrl),
        serverUrl,
      });

      await db
        .update(scripts)
        .set({ vapiAssistantId: assistant.id })
        .where(eq(scripts.id, script.id));

      script.vapiAssistantId = assistant.id;

      logger.info(
        { scriptId: script.id, vapiAssistantId: assistant.id },
        "Onboarding: Vapi assistant created"
      );
    } catch (vapiError) {
      logger.error(
        { err: vapiError, scriptId: script.id },
        "Onboarding: Failed to create Vapi assistant (script saved without it)"
      );
    }

    logger.info(
      { businessId, scriptId: script.id, industry: template.id },
      "Onboarding completed successfully"
    );

    res.status(201).json({ data: { business, script } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof z.ZodError) {
      throw new AppError(400, `Validation error: ${error.errors.map((e) => e.message).join(", ")}`);
    }
    logger.error({ err: error }, "Error completing onboarding");
    throw error;
  }
});

export default router;
