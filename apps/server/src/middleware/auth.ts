import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "@clerk/backend";
import { env } from "../config/env.js";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, payload.sub))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
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
