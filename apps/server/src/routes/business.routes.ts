import { Router, type Response } from "express";
import { db } from "../config/db.js";
import { businesses } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { type AuthRequest, requireBusiness } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { AppError } from "../middleware/error-handler.js";
import { createBusinessSchema } from "@callo/shared";

const router = Router();

router.use(requireBusiness);

// ── GET / ─ Get current business profile ──
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new AppError(404, "Business not found");
    }

    res.json({ data: business });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error getting business");
    throw error;
  }
});

// ── PUT / ─ Update business profile ──
router.put("/", async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = createBusinessSchema.partial().parse(req.body);

    const [existing] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Business not found");
    }

    const [updated] = await db
      .update(businesses)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId))
      .returning();

    logger.info({ businessId }, "Business profile updated");
    res.json({ data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, "Error updating business");
    throw error;
  }
});

export default router;
