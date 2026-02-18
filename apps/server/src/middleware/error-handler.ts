import { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import * as Sentry from "@sentry/node";
import { logger } from "../config/logger.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.headers["x-request-id"] as string | undefined;

  if (err instanceof AppError) {
    logger.warn({ err, requestId, path: req.path }, "Application error");
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ requestId, path: req.path, details: err.errors }, "Validation error");
    res.status(400).json({
      error: "Validation error",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Handle malformed JSON bodies
  if (err instanceof SyntaxError && "body" in err) {
    logger.warn({ requestId, path: req.path }, "Malformed JSON in request body");
    res.status(400).json({ error: "Malformed JSON in request body" });
    return;
  }

  // Handle Stripe errors
  const errWithType = err as Error & { type?: string; statusCode?: number };
  if (errWithType.type?.startsWith("Stripe") || errWithType.statusCode) {
    const statusCode = errWithType.statusCode || 400;
    logger.error({ err, requestId, path: req.path, stripeErrorType: errWithType.type }, "Stripe error");
    res.status(statusCode).json({ error: err.message || "Payment processing error" });
    return;
  }

  Sentry.captureException(err);
  logger.error({ err, requestId, path: req.path }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
