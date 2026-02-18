// ---------------------------------------------------------------------------
// useNotifications — listens to WebSocket events and triggers local
// notifications + haptic feedback for important events.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { useWebSocket } from "../lib/websocket";
import {
  registerForPushNotifications,
  sendLocalNotification,
  getNotificationContent,
  type NotificationType,
} from "../lib/notifications";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseNotificationsResult {
  /** Whether the user has granted notification permissions. */
  permissionGranted: boolean;
  /** The Expo push token (null if not registered or denied). */
  pushToken: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotifications(): UseNotificationsResult {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const initialized = useRef(false);

  // Connect to the live WebSocket feed
  const { lastEvent } = useWebSocket("/live");

  // ---- Register for push notifications on mount ----
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const token = await registerForPushNotifications();
      if (token) {
        setPermissionGranted(true);
        setPushToken(token);
      }
    })();
  }, []);

  // ---- React to incoming events ----
  useEffect(() => {
    if (!lastEvent) return;

    const { type, data } = lastEvent;

    switch (type) {
      case "call_started": {
        const notifData = data as Record<string, unknown>;
        const { title, body } = getNotificationContent(
          "new_call" as NotificationType,
          notifData,
        );
        sendLocalNotification(title, body, notifData);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      }

      case "call_ended": {
        const outcome = (data.outcome as string) ?? "";
        if (outcome === "appointment_booked") {
          const { title, body } = getNotificationContent(
            "appointment_booked" as NotificationType,
            data as Record<string, unknown>,
          );
          sendLocalNotification(title, body, data as Record<string, unknown>);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        break;
      }

      case "campaign_update": {
        const status = (data.status as string) ?? "";
        if (status === "completed") {
          const { title, body } = getNotificationContent(
            "campaign_complete" as NotificationType,
            data as Record<string, unknown>,
          );
          sendLocalNotification(title, body, data as Record<string, unknown>);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        break;
      }

      case "usage_warning": {
        const { title, body } = getNotificationContent(
          "usage_alert" as NotificationType,
          data as Record<string, unknown>,
        );
        sendLocalNotification(title, body, data as Record<string, unknown>);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      }

      case "usage_limit_reached": {
        sendLocalNotification(
          "Usage Limit Reached",
          `You have used all ${data.minuteLimit ?? 0} minutes. Calls are paused.`,
          data as Record<string, unknown>,
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      }
    }
  }, [lastEvent]);

  return { permissionGranted, pushToken };
}
