import { Router, type Response } from "express";
import { db } from "../config/db.js";
import { phoneNumbers } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { type AuthRequest, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { z } from "zod";
import * as vapiService from "../services/vapi.service.js";

const router = Router();

// All routes require business
router.use(requireBusiness);

const updatePhoneNumberSchema = z.object({
  friendlyName: z.string().min(1).max(100).optional(),
  scriptId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const buyNumberSchema = z.object({
  areaCode: z.string().optional(),
  friendlyName: z.string().min(1).max(100),
  scriptId: z.string().uuid().optional(),
});

// ── GET / ─ List phone numbers for business ──
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    const results = await db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.businessId, businessId))
      .orderBy(desc(phoneNumbers.createdAt));

    res.json({ data: results });
  } catch (error) {
    logger.error({ err: error }, "Error listing phone numbers");
    throw error;
  }
});

// ── GET /available ─ Search available numbers via Vapi ──
router.get("/available", async (req: AuthRequest, res: Response) => {
  try {
    // Vapi handles number provisioning directly — list what's available
    // For now, we return the numbers already in Vapi
    const vapiNumbers = await vapiService.listPhoneNumbers();

    res.json({
      data: vapiNumbers.map((n) => ({
        number: n.number,
        friendlyName: n.number,
        provider: n.provider,
        vapiId: n.id,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "Error listing available numbers");
    throw error;
  }
});

// ── POST /buy ─ Buy a phone number via Vapi ──
router.post("/buy", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = buyNumberSchema.parse(req.body);

    // Buy number through Vapi
    const vapiNumber = await vapiService.buyPhoneNumber({
      areaCode: body.areaCode,
    });

    // Store in our DB
    const [phoneNumber] = await db
      .insert(phoneNumbers)
      .values({
        businessId,
        twilioSid: vapiNumber.id, // Store Vapi phone number ID
        number: vapiNumber.number,
        friendlyName: body.friendlyName,
        scriptId: body.scriptId ?? null,
        isActive: true,
        capabilities: { voice: true, sms: false, mms: false },
      })
      .returning();

    logger.info(
      { phoneNumberId: phoneNumber.id, vapiPhoneId: vapiNumber.id, number: vapiNumber.number },
      "Phone number purchased via Vapi"
    );

    res.status(201).json({ data: phoneNumber });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error buying phone number");
    throw error;
  }
});

// ── POST /import ─ Import existing Twilio number into Vapi ──
router.post("/import", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = z
      .object({
        phoneNumber: z.string().min(10),
        friendlyName: z.string().min(1).max(100),
        twilioAccountSid: z.string().min(1),
        twilioAuthToken: z.string().min(1),
        scriptId: z.string().uuid().optional(),
      })
      .parse(req.body);

    // Import into Vapi with Twilio credentials
    const vapiNumber = await vapiService.importPhoneNumber({
      provider: "twilio",
      number: body.phoneNumber,
      twilioAccountSid: body.twilioAccountSid,
      twilioAuthToken: body.twilioAuthToken,
    });

    // Store in our DB
    const [phoneNumber] = await db
      .insert(phoneNumbers)
      .values({
        businessId,
        twilioSid: vapiNumber.id,
        number: vapiNumber.number,
        friendlyName: body.friendlyName,
        scriptId: body.scriptId ?? null,
        isActive: true,
        capabilities: { voice: true, sms: false, mms: false },
      })
      .returning();

    logger.info(
      { phoneNumberId: phoneNumber.id, vapiPhoneId: vapiNumber.id },
      "Twilio number imported via Vapi"
    );

    res.status(201).json({ data: phoneNumber });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error importing phone number");
    throw error;
  }
});

// ── PUT /:id ─ Update phone number (assign script, rename) ──
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;
    const body = updatePhoneNumberSchema.parse(req.body);

    // Verify phone number belongs to business
    const [existing] = await db
      .select()
      .from(phoneNumbers)
      .where(and(eq(phoneNumbers.id, id), eq(phoneNumbers.businessId, businessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Phone number not found");
    }

    const [updated] = await db
      .update(phoneNumbers)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(phoneNumbers.id, id))
      .returning();

    logger.info({ phoneNumberId: id, businessId }, "Phone number updated");
    res.json({ data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error updating phone number");
    throw error;
  }
});

// ── DELETE /:id ─ Release phone number ──
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const id = req.params.id as string;

    const [existing] = await db
      .select()
      .from(phoneNumbers)
      .where(and(eq(phoneNumbers.id, id), eq(phoneNumbers.businessId, businessId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Phone number not found");
    }

    // Release from Vapi
    try {
      await vapiService.deletePhoneNumber(existing.twilioSid);
    } catch (error) {
      logger.warn({ err: error, vapiPhoneId: existing.twilioSid }, "Failed to delete from Vapi (may not exist)");
    }

    await db.delete(phoneNumbers).where(eq(phoneNumbers.id, id));

    logger.info({ phoneNumberId: id, number: existing.number }, "Phone number released");
    res.json({ message: "Phone number released successfully" });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error releasing phone number");
    throw error;
  }
});

export default router;
