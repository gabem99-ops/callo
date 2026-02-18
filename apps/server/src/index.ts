import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { WebSocketServer } from "ws";
import { Webhook } from "svix";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initSentry, Sentry } from "./config/sentry.js";
import { db } from "./config/db.js";
import { users, businesses } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { requestId } from "./middleware/request-id.js";

// ── Route imports ──────────────────────────────────
import vapiRoutes from "./routes/vapi.routes.js";
import callsRoutes from "./routes/calls.routes.js";
import scriptsRoutes from "./routes/scripts.routes.js";
import leadsRoutes from "./routes/leads.routes.js";
import campaignsRoutes from "./routes/campaigns.routes.js";
import phoneNumbersRoutes from "./routes/phone-numbers.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import integrationsRoutes from "./routes/integrations.routes.js";
import businessRoutes from "./routes/business.routes.js";
import onboardingRoutes from "./routes/onboarding.routes.js";

// ── WebSocket handler imports ──────────────────────
import { initLiveMonitorWss } from "./websocket/live-monitor.js";

// ── Initialize Sentry (must be before Express app) ──
initSentry();

// ── Create Express app ─────────────────────────────
const app = express();

// ── Global middleware ──────────────────────────────
app.use(requestId);
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map(s => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
  })
);
app.use(helmet());
app.use(morgan("combined", {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));
// Parse JSON for all routes EXCEPT the Stripe webhook (which needs raw body)
app.use((req, res, next) => {
  if (req.path === "/api/billing/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// ── Health check ───────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.0.1",
    uptime: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
  });
});

// ── API Routes ─────────────────────────────────────
// Vapi webhooks (no auth - Vapi sends events directly)
app.use("/api/vapi", rateLimit(200, 60000), vapiRoutes);

// Authenticated routes
app.use("/api/calls", rateLimit(100, 60000), requireAuth, callsRoutes);
app.use("/api/scripts", rateLimit(100, 60000), requireAuth, scriptsRoutes);
app.use("/api/leads", rateLimit(100, 60000), requireAuth, leadsRoutes);
app.use("/api/campaigns", rateLimit(100, 60000), requireAuth, campaignsRoutes);
app.use("/api/phone-numbers", rateLimit(100, 60000), requireAuth, phoneNumbersRoutes);
app.use("/api/billing", rateLimit(20, 60000), billingRoutes); // Mixed auth (has Stripe webhooks + authenticated endpoints)
app.use("/api/analytics", rateLimit(100, 60000), requireAuth, analyticsRoutes);
app.use("/api/integrations", rateLimit(100, 60000), requireAuth, integrationsRoutes);
app.use("/api/business", rateLimit(100, 60000), requireAuth, businessRoutes);
app.use("/api/onboarding", rateLimit(10, 60000), requireAuth, onboardingRoutes);

// ── Clerk Webhook ──────────────────────────────────
app.post("/api/webhooks/clerk", rateLimit(5, 60000), express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const webhookSecret = env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn("CLERK_WEBHOOK_SECRET not configured, skipping webhook verification");
      res.status(400).json({ error: "Webhook secret not configured" });
      return;
    }

    // Verify the webhook signature using Svix
    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      res.status(400).json({ error: "Missing Svix headers" });
      return;
    }

    const wh = new Webhook(webhookSecret);
    const payload = wh.verify(
      typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }
    ) as Record<string, unknown>;

    const eventType = payload.type as string;
    const data = payload.data as Record<string, unknown>;

    logger.info({ eventType }, "Clerk webhook received");

    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const clerkId = data.id as string;
        const email =
          ((data.email_addresses as Array<Record<string, unknown>>)?.[0]
            ?.email_address as string) ?? "";
        const firstName = (data.first_name as string) ?? null;
        const lastName = (data.last_name as string) ?? null;
        const imageUrl = (data.image_url as string) ?? null;

        // Check if user already exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, clerkId))
          .limit(1);

        if (existingUser) {
          // Update existing user
          await db
            .update(users)
            .set({
              email,
              firstName,
              lastName,
              imageUrl,
              updatedAt: new Date(),
            })
            .where(eq(users.clerkId, clerkId));

          logger.info({ clerkId }, "User updated from Clerk webhook");
        } else {
          // Create new user and a default business
          const [business] = await db
            .insert(businesses)
            .values({
              name: `${firstName ?? "My"}'s Business`,
              ownerId: clerkId,
            })
            .returning();

          await db
            .insert(users)
            .values({
              clerkId,
              email,
              firstName,
              lastName,
              imageUrl,
              businessId: business.id,
              role: "owner",
            });

          logger.info(
            { clerkId, businessId: business.id },
            "New user and business created from Clerk webhook"
          );
        }
        break;
      }

      case "user.deleted": {
        const clerkId = data.id as string;
        logger.info({ clerkId }, "User deleted event from Clerk webhook");
        break;
      }

      default:
        logger.info({ eventType }, "Unhandled Clerk webhook event type");
    }

    res.json({ received: true });
  } catch (error) {
    logger.error({ err: error }, "Error processing Clerk webhook");
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

// ── Sentry error handler (must be before app error handler) ──
Sentry.setupExpressErrorHandler(app);

// ── Error handler (must be last middleware) ─────────
app.use(errorHandler);

// ── Create HTTP server ─────────────────────────────
const server = http.createServer(app);

// ── WebSocket server setup ─────────────────────────
// Only the live monitor WebSocket remains — Vapi handles all voice audio
const liveWss = new WebSocketServer({ noServer: true });
initLiveMonitorWss(liveWss);

server.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (pathname === "/live") {
    liveWss.handleUpgrade(request, socket, head, (ws) => {
      liveWss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ── Start server ───────────────────────────────────
const PORT = env.SERVER_PORT;

server.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      env: env.NODE_ENV,
      url: env.SERVER_URL,
    },
    `Callo server listening on port ${PORT}`
  );
});

// ── Graceful shutdown ────────────────────────────────
function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal, closing gracefully...");

  server.close(() => {
    logger.info("HTTP server closed");

    // Close WebSocket connections
    liveWss.clients.forEach((client) => {
      client.close(1001, "Server shutting down");
    });

    logger.info("WebSocket connections closed");
    logger.info("Shutdown complete");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled rejection");
  gracefulShutdown("unhandledRejection");
});

export { app, server };
