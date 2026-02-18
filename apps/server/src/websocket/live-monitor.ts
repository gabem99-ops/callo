import WebSocket, { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { db } from "../config/db.js";
import * as schema from "../db/schema.js";

// ── Types ──────────────────────────────────────────
interface MonitorClient {
  ws: WebSocket;
  businessId: string;
  userId: string;
  connectedAt: number;
}

interface BroadcastEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// ── Client Registry ────────────────────────────────
// Map of businessId -> Set of connected monitor clients
const businessClients = new Map<string, Set<MonitorClient>>();
const allClients = new Set<MonitorClient>();

// ── Clerk Client ───────────────────────────────────
// Clerk token verification

// ── Initialize WebSocket Server ────────────────────
export function initLiveMonitorWss(wss: WebSocketServer): void {
  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    try {
      // Extract token from query string
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        logger.warn("Live monitor connection rejected: no token");
        ws.close(4001, "Missing authentication token");
        return;
      }

      // Authenticate the connection
      const authResult = await authenticateClient(token);
      if (!authResult) {
        logger.warn("Live monitor connection rejected: invalid token");
        ws.close(4003, "Authentication failed");
        return;
      }

      const client: MonitorClient = {
        ws,
        businessId: authResult.businessId,
        userId: authResult.userId,
        connectedAt: Date.now(),
      };

      // Register client
      allClients.add(client);
      if (!businessClients.has(client.businessId)) {
        businessClients.set(client.businessId, new Set());
      }
      businessClients.get(client.businessId)!.add(client);

      logger.info(
        {
          userId: client.userId,
          businessId: client.businessId,
          totalClients: allClients.size,
        },
        "Live monitor client connected"
      );

      // Send initial connection confirmation
      sendToClient(client, {
        type: "connected",
        data: {
          businessId: client.businessId,
          userId: client.userId,
        },
        timestamp: new Date().toISOString(),
      });

      // Handle incoming messages from client
      ws.on("message", (raw: Buffer) => {
        try {
          const message = JSON.parse(raw.toString());
          handleClientMessage(client, message);
        } catch {
          logger.warn("Invalid message from monitor client");
        }
      });

      // Handle disconnection
      ws.on("close", () => {
        removeClient(client);
        logger.info(
          {
            userId: client.userId,
            businessId: client.businessId,
            totalClients: allClients.size,
          },
          "Live monitor client disconnected"
        );
      });

      // Handle errors
      ws.on("error", (error) => {
        logger.error(
          { error, userId: client.userId },
          "Live monitor client WebSocket error"
        );
        removeClient(client);
      });

      // Heartbeat ping/pong
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on("close", () => clearInterval(pingInterval));
    } catch (error) {
      logger.error({ error }, "Error handling live monitor connection");
      ws.close(4500, "Internal server error");
    }
  });
}

// ── Authenticate Client ────────────────────────────
async function authenticateClient(
  token: string
): Promise<{ userId: string; businessId: string } | null> {
  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });

    if (!payload?.sub) {
      return null;
    }

    // Look up user and their business
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.clerkId, payload.sub))
      .limit(1);

    if (!user || !user.businessId) {
      return null;
    }

    return {
      userId: user.id,
      businessId: user.businessId,
    };
  } catch {
    return null;
  }
}

// ── Handle Client Messages ─────────────────────────
function handleClientMessage(
  client: MonitorClient,
  message: Record<string, unknown>
): void {
  switch (message.type) {
    case "ping":
      sendToClient(client, {
        type: "pong",
        data: {},
        timestamp: new Date().toISOString(),
      });
      break;

    case "subscribe":
      // Client confirms they want updates for their business
      // (already subscribed by default based on auth)
      logger.debug(
        { userId: client.userId, businessId: client.businessId },
        "Client subscribed to updates"
      );
      break;

    default:
      logger.debug(
        { type: message.type, userId: client.userId },
        "Unknown message type from monitor client"
      );
  }
}

// ── Send to Client ─────────────────────────────────
function sendToClient(client: MonitorClient, event: BroadcastEvent): void {
  if (client.ws.readyState === WebSocket.OPEN) {
    try {
      client.ws.send(JSON.stringify(event));
    } catch (error) {
      logger.error(
        { error, userId: client.userId },
        "Failed to send to monitor client"
      );
      removeClient(client);
    }
  }
}

// ── Remove Client ──────────────────────────────────
function removeClient(client: MonitorClient): void {
  allClients.delete(client);
  const clients = businessClients.get(client.businessId);
  if (clients) {
    clients.delete(client);
    if (clients.size === 0) {
      businessClients.delete(client.businessId);
    }
  }
}

// ── Broadcast to Business ──────────────────────────
// This is the primary function used by other modules to push events
// to all dashboard clients watching a specific business
export function broadcastToBusiness(
  businessId: string,
  eventType: string,
  data: Record<string, unknown>
): void {
  const clients = businessClients.get(businessId);
  if (!clients || clients.size === 0) {
    return; // No one is watching this business
  }

  const event: BroadcastEvent = {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  };

  const payload = JSON.stringify(event);
  let delivered = 0;

  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
        delivered++;
      } catch (error) {
        logger.error(
          { error, userId: client.userId },
          "Failed to broadcast to monitor client"
        );
        removeClient(client);
      }
    }
  }

  logger.debug(
    { businessId, eventType, delivered, total: clients.size },
    "Broadcast event to business clients"
  );
}

// ── Get Connected Client Count ─────────────────────
export function getConnectedClientCount(businessId?: string): number {
  if (businessId) {
    return businessClients.get(businessId)?.size || 0;
  }
  return allClients.size;
}
