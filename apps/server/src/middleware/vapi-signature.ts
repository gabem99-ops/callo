// Validates Vapi webhook signatures using HMAC-SHA256
// Vapi sends a x-vapi-signature header with HMAC of the request body
import crypto from "node:crypto";
import { type Request, type Response, type NextFunction } from "express";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export function validateVapiSignature(req: Request, res: Response, next: NextFunction) {
  // Skip validation in development if no secret is configured
  if (!env.VAPI_WEBHOOK_SECRET) {
    logger.warn("VAPI_WEBHOOK_SECRET not configured, skipping signature validation");
    next();
    return;
  }

  const signature = req.headers["x-vapi-signature"] as string;
  if (!signature) {
    logger.warn("Missing Vapi webhook signature");
    res.status(401).json({ error: "Missing webhook signature" });
    return;
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", env.VAPI_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    logger.warn("Invalid Vapi webhook signature");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  next();
}
