// ---------------------------------------------------------------------------
// Push notification setup and helpers for the Callo mobile app.
// ---------------------------------------------------------------------------

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Configure foreground notification handler
// ---------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Request notification permissions and return the Expo push token.
 * Returns null if permissions are denied or token retrieval fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check existing permissions first
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // Request if not already granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    // Android needs a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6366F1",
      });
    }

    // Retrieve the Expo push token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? undefined;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.warn("[notifications] Failed to register:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Local notifications
// ---------------------------------------------------------------------------

/**
 * Schedule an immediate local notification.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: true,
    },
    trigger: null, // immediate
  });
}

// ---------------------------------------------------------------------------
// Notification content helpers
// ---------------------------------------------------------------------------

export type NotificationType =
  | "new_call"
  | "appointment_booked"
  | "campaign_complete"
  | "usage_alert";

/**
 * Return a user-friendly title + body for a given notification type.
 */
export function getNotificationContent(
  type: NotificationType,
  data: Record<string, unknown>,
): { title: string; body: string } {
  switch (type) {
    case "new_call": {
      const direction =
        (data.direction as string) === "inbound" ? "Incoming" : "Outbound";
      const number = (data.fromNumber as string) ?? "Unknown";
      return {
        title: `${direction} Call`,
        body: `${direction} call from ${number}`,
      };
    }

    case "appointment_booked":
      return {
        title: "Appointment Booked!",
        body: "A new appointment was booked during a call.",
      };

    case "campaign_complete": {
      const completed = data.completedLeads ?? 0;
      const total = data.totalLeads ?? 0;
      return {
        title: "Campaign Complete",
        body: `Campaign finished — ${completed}/${total} leads contacted.`,
      };
    }

    case "usage_alert": {
      const percent = data.percentUsed ?? data.percent ?? 0;
      const limit = data.minuteLimit ?? 0;
      return {
        title: "Usage Alert",
        body: `You have used ${percent}% of your ${limit} minute limit.`,
      };
    }

    default:
      return { title: "Callo", body: "You have a new notification." };
  }
}
