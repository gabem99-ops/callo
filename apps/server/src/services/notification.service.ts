import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

// ── Types ──────────────────────────────────────────
interface PushNotificationData {
  [key: string]: unknown;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: PushNotificationData;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

interface ExpoPushTicket {
  id?: string;
  status: "ok" | "error";
  message?: string;
  details?: Record<string, unknown>;
}

// ── Send Push Notification ─────────────────────────
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: PushNotificationData
): Promise<void> {
  // TODO: Phase 3 - Expo push notification implementation
  //
  // Implementation plan:
  // 1. Look up the user's Expo push token from the DB
  //    (Need to add push_token column to users table or a separate tokens table)
  // 2. Build the Expo push message
  // 3. Send via Expo Push API: https://exp.host/--/api/v2/push/send
  // 4. Handle ticket response for delivery tracking
  //
  // Example:
  // const pushToken = await getUserPushToken(userId);
  // if (!pushToken) return;
  //
  // const message: ExpoPushMessage = {
  //   to: pushToken,
  //   title,
  //   body,
  //   data,
  //   sound: "default",
  //   priority: "high",
  // };
  //
  // const response = await fetch("https://exp.host/--/api/v2/push/send", {
  //   method: "POST",
  //   headers: {
  //     "Accept": "application/json",
  //     "Accept-Encoding": "gzip, deflate",
  //     "Content-Type": "application/json",
  //     ...(env.EXPO_ACCESS_TOKEN
  //       ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` }
  //       : {}),
  //   },
  //   body: JSON.stringify(message),
  // });
  //
  // const ticket: ExpoPushTicket = await response.json();
  // if (ticket.status === "error") {
  //   logger.error({ userId, ticket }, "Push notification failed");
  // }

  logger.warn(
    { userId, title, body },
    "sendPushNotification called - not yet implemented"
  );
}

// ── Send Bulk Push Notifications ───────────────────
export async function sendBulkPushNotifications(
  userIds: string[],
  title: string,
  body: string,
  data?: PushNotificationData
): Promise<void> {
  // TODO: Phase 3 - Bulk push notifications
  //
  // Expo supports batching up to 100 messages per request.
  // Implementation should:
  // 1. Look up all push tokens for the given user IDs
  // 2. Batch into groups of 100
  // 3. Send each batch to Expo Push API
  // 4. Collect and log ticket results

  logger.warn(
    { userCount: userIds.length, title },
    "sendBulkPushNotifications called - not yet implemented"
  );

  // For now, send individually
  for (const userId of userIds) {
    await sendPushNotification(userId, title, body, data);
  }
}

// ── Notification Helpers ───────────────────────────

export function notifyCallCompleted(
  userId: string,
  callId: string,
  outcome: string,
  duration: number
): void {
  const minutes = Math.ceil(duration / 60);
  sendPushNotification(userId, "Call Completed", `Call finished (${minutes}min) - ${outcome}`, {
    type: "call_completed",
    callId,
    outcome,
  }).catch((error) => {
    logger.error({ error, userId, callId }, "Failed to send call completed notification");
  });
}

export function notifyCampaignCompleted(
  userId: string,
  campaignId: string,
  campaignName: string,
  stats: { total: number; successful: number; failed: number }
): void {
  sendPushNotification(
    userId,
    "Campaign Completed",
    `"${campaignName}" finished: ${stats.successful}/${stats.total} successful`,
    {
      type: "campaign_completed",
      campaignId,
      ...stats,
    }
  ).catch((error) => {
    logger.error({ error, userId, campaignId }, "Failed to send campaign notification");
  });
}

export function notifyUsageLimitWarning(
  userId: string,
  minutesRemaining: number,
  plan: string
): void {
  sendPushNotification(
    userId,
    "Usage Limit Warning",
    `You have ${minutesRemaining} minutes remaining on your ${plan} plan.`,
    {
      type: "usage_warning",
      minutesRemaining,
      plan,
    }
  ).catch((error) => {
    logger.error({ error, userId }, "Failed to send usage warning notification");
  });
}
