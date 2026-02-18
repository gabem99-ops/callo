import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "@clerk/backend";
import { env } from "../config/env.js";
import { db } from "../config/db.js";
import { users, businesses } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../config/logger.js";

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    clerkId: string;
    businessId: string | null;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing authorization token" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });

    if (!payload?.sub) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Look up user in our DB
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, payload.sub))
      .limit(1);

    // Auto-create user + business if they have a valid Clerk token but no DB record
    // (handles cases where Clerk webhook hasn't fired, e.g. local dev)
    if (!user) {
      const email =
        (payload as Record<string, unknown>).email as string ??
        (payload as Record<string, unknown>).primary_email_address as string ??
        `${payload.sub}@unknown.com`;

      const [business] = await db
        .insert(businesses)
        .values({
          name: "My Business",
          ownerId: payload.sub,
        })
        .returning();

      [user] = await db
        .insert(users)
        .values({
          clerkId: payload.sub,
          email,
          firstName: (payload as Record<string, unknown>).first_name as string ?? null,
          lastName: (payload as Record<string, unknown>).last_name as string ?? null,
          businessId: business.id,
        })
        .returning();

      logger.info({ clerkId: payload.sub, userId: user.id, businessId: business.id }, "Auto-created user and business from auth");
    }

    req.auth = {
      userId: user.id,
      clerkId: user.clerkId,
      businessId: user.businessId,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
}

export function requireBusiness(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.auth?.businessId) {
    res.status(403).json({ error: "No business associated with this account" });
    return;
  }
  next();
}
