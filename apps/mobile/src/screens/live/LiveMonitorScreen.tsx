// ---------------------------------------------------------------------------
// LiveMonitorScreen — real-time call monitoring with transcript feed,
// active call cards, and recent event history.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  Phone,
  Radio,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from "lucide-react-native";
import { useWebSocket } from "../../lib/websocket";
import { colors, spacing, borderRadius } from "../../lib/theme";
import ActiveCallCard from "./components/ActiveCallCard";
import TranscriptBubble from "./components/TranscriptBubble";
import EventCard from "./components/EventCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveCall {
  callId: string;
  direction: "inbound" | "outbound";
  fromNumber: string;
  toNumber: string;
  startTime: string;
  status: string;
}

interface TranscriptEntry {
  id: string;
  callId: string;
  speaker: "ai" | "caller";
  text: string;
  timestamp: string;
}

interface RecentEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UsageAlert {
  id: string;
  message: string;
  severity: "warning" | "error";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RECENT_EVENTS = 20;
const MAX_TRANSCRIPT_ENTRIES = 200;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LiveMonitorScreen() {
  // ---- WebSocket connection ----
  const {
    connected,
    status: connectionStatus,
    lastEvent,
    reconnect,
  } = useWebSocket("/live");

  // ---- State ----
  const [activeCalls, setActiveCalls] = useState<Map<string, ActiveCall>>(
    new Map(),
  );
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [usageAlerts, setUsageAlerts] = useState<UsageAlert[]>([]);

  // ---- Refs ----
  const transcriptScrollRef = useRef<ScrollView>(null);
  const eventIdCounter = useRef(0);

  // ---- Generate unique ID ----
  const nextId = useCallback(() => {
    eventIdCounter.current += 1;
    return `evt_${Date.now()}_${eventIdCounter.current}`;
  }, []);

  // ---- Process incoming events ----
  useEffect(() => {
    if (!lastEvent) return;

    const { type, data, timestamp } = lastEvent;

    switch (type) {
      case "call_started": {
        const call: ActiveCall = {
          callId: data.callId as string,
          direction: (data.direction as "inbound" | "outbound") ?? "outbound",
          fromNumber: (data.fromNumber as string) ?? "",
          toNumber: (data.toNumber as string) ?? "",
          startTime: timestamp,
          status: "active",
        };
        setActiveCalls((prev) => {
          const next = new Map(prev);
          next.set(call.callId, call);
          return next;
        });
        break;
      }

      case "call_ended": {
        const endedCallId = data.callId as string;
        setActiveCalls((prev) => {
          const next = new Map(prev);
          next.delete(endedCallId);
          return next;
        });
        setRecentEvents((prev) => {
          const event: RecentEvent = {
            id: nextId(),
            type: "call_ended",
            data: data as Record<string, unknown>,
            timestamp,
          };
          return [event, ...prev].slice(0, MAX_RECENT_EVENTS);
        });
        break;
      }

      case "transcript_update": {
        const entry: TranscriptEntry = {
          id: nextId(),
          callId: data.callId as string,
          speaker: (data.speaker as "ai" | "caller") ?? "ai",
          text: (data.text as string) ?? "",
          timestamp: (data.timestamp as string) ?? timestamp,
        };
        setTranscripts((prev) =>
          [...prev, entry].slice(-MAX_TRANSCRIPT_ENTRIES),
        );

        // Auto-scroll after a short delay to let the layout settle
        setTimeout(() => {
          transcriptScrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
        break;
      }

      case "campaign_update": {
        setRecentEvents((prev) => {
          const event: RecentEvent = {
            id: nextId(),
            type: "campaign_update",
            data: data as Record<string, unknown>,
            timestamp,
          };
          return [event, ...prev].slice(0, MAX_RECENT_EVENTS);
        });
        break;
      }

      case "usage_warning": {
        const pct = data.percentUsed ?? 0;
        const limit = data.minuteLimit ?? 0;
        setUsageAlerts((prev) => [
          ...prev,
          {
            id: nextId(),
            message: `Usage at ${pct}% — ${data.minutesUsed ?? 0}/${limit} minutes used`,
            severity: "warning",
          },
        ]);
        setRecentEvents((prev) => {
          const event: RecentEvent = {
            id: nextId(),
            type: "usage_warning",
            data: data as Record<string, unknown>,
            timestamp,
          };
          return [event, ...prev].slice(0, MAX_RECENT_EVENTS);
        });
        break;
      }

      case "usage_limit_reached": {
        setUsageAlerts((prev) => [
          ...prev,
          {
            id: nextId(),
            message: `Minute limit reached! ${data.minutesUsed ?? 0}/${data.minuteLimit ?? 0} minutes used`,
            severity: "error",
          },
        ]);
        setRecentEvents((prev) => {
          const event: RecentEvent = {
            id: nextId(),
            type: "usage_limit_reached",
            data: data as Record<string, unknown>,
            timestamp,
          };
          return [event, ...prev].slice(0, MAX_RECENT_EVENTS);
        });
        break;
      }
    }
  }, [lastEvent, nextId]);

  // ---- Dismiss a usage alert ----
  const dismissAlert = useCallback((alertId: string) => {
    setUsageAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // ---- Derive active calls list from the Map ----
  const activeCallsList = useMemo(
    () => Array.from(activeCalls.values()),
    [activeCalls],
  );

  // ---- Build transcript groups (grouped by callId) ----
  const transcriptGroups = useMemo(() => {
    const groups: { callId: string; entries: TranscriptEntry[] }[] = [];
    let currentCallId: string | null = null;

    for (const entry of transcripts) {
      if (entry.callId !== currentCallId) {
        currentCallId = entry.callId;
        groups.push({ callId: entry.callId, entries: [entry] });
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    }

    return groups;
  }, [transcripts]);

  // ---- Render ----
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Usage alert banners ---- */}
        {usageAlerts.map((alert) => (
          <View
            key={alert.id}
            style={[
              styles.alertBanner,
              alert.severity === "error"
                ? styles.alertError
                : styles.alertWarning,
            ]}
          >
            <Text style={styles.alertText}>{alert.message}</Text>
            <Pressable
              onPress={() => dismissAlert(alert.id)}
              hitSlop={8}
              style={styles.alertDismiss}
            >
              <X size={16} color={colors.textPrimary} />
            </Pressable>
          </View>
        ))}

        {/* ---- Connection status ---- */}
        <ConnectionStatus
          status={connectionStatus}
          connected={connected}
          onReconnect={reconnect}
        />

        {/* ---- Active calls section ---- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Phone size={16} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Active Calls</Text>
            {activeCallsList.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {activeCallsList.length}
                </Text>
              </View>
            )}
          </View>

          {activeCallsList.length === 0 ? (
            <View style={styles.emptyState}>
              <Radio size={32} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No active calls</Text>
              <Text style={styles.emptySubtitle}>
                Waiting for calls...
              </Text>
            </View>
          ) : (
            activeCallsList.map((call) => (
              <ActiveCallCard
                key={call.callId}
                callId={call.callId}
                direction={call.direction}
                phoneNumber={
                  call.direction === "inbound"
                    ? call.fromNumber
                    : call.toNumber
                }
                startTime={call.startTime}
                status={call.status}
              />
            ))
          )}
        </View>

        {/* ---- Live transcript feed ---- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={16} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Live Transcript</Text>
          </View>

          {transcripts.length === 0 ? (
            <View style={styles.emptyStateSmall}>
              <Text style={styles.emptySubtitle}>
                Transcript will appear here during calls
              </Text>
            </View>
          ) : (
            <View style={styles.transcriptContainer}>
              <ScrollView
                ref={transcriptScrollRef}
                style={styles.transcriptScroll}
                contentContainerStyle={styles.transcriptContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {transcriptGroups.map((group) => (
                  <View key={group.callId}>
                    {/* Call ID header */}
                    <View style={styles.callIdHeader}>
                      <View style={styles.callIdLine} />
                      <Text style={styles.callIdText}>
                        Call {group.callId.slice(0, 8)}
                      </Text>
                      <View style={styles.callIdLine} />
                    </View>

                    {group.entries.map((entry) => (
                      <TranscriptBubble
                        key={entry.id}
                        speaker={entry.speaker}
                        text={entry.text}
                        timestamp={entry.timestamp}
                        callId={entry.callId}
                      />
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ---- Recent events ---- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={16} color={colors.textSecondary} />
            <Text style={styles.sectionTitle}>Recent Events</Text>
          </View>

          {recentEvents.length === 0 ? (
            <View style={styles.emptyStateSmall}>
              <Text style={styles.emptySubtitle}>
                Events will appear here as they happen
              </Text>
            </View>
          ) : (
            recentEvents.map((event) => (
              <EventCard
                key={event.id}
                type={event.type}
                data={event.data}
                timestamp={event.timestamp}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// ConnectionStatus sub-component
// ---------------------------------------------------------------------------

function ConnectionStatus({
  status,
  connected,
  onReconnect,
}: {
  status: string;
  connected: boolean;
  onReconnect: () => void;
}) {
  // Pulsing animation for connecting state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === "connecting") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const dotColor =
    status === "connected"
      ? colors.success
      : status === "connecting"
        ? colors.warning
        : colors.error;

  const label =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting..."
        : "Disconnected";

  const showReconnect = status === "disconnected" || status === "error";

  return (
    <View style={styles.connectionBar}>
      <View style={styles.connectionInfo}>
        <Animated.View
          style={[
            styles.connectionDot,
            { backgroundColor: dotColor, opacity: pulseAnim },
          ]}
        />
        {connected ? (
          <Wifi size={14} color={dotColor} />
        ) : (
          <WifiOff size={14} color={dotColor} />
        )}
        <Text style={[styles.connectionLabel, { color: dotColor }]}>
          {label}
        </Text>
      </View>

      {showReconnect && (
        <Pressable
          onPress={onReconnect}
          style={styles.reconnectButton}
          hitSlop={8}
        >
          <RefreshCw size={14} color={colors.primary} />
          <Text style={styles.reconnectText}>Reconnect</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + 40,
  },

  // ---- Alert banners ----
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  alertWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  alertError: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  alertDismiss: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },

  // ---- Connection bar ----
  connectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  connectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  reconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  reconnectText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },

  // ---- Sections ----
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ---- Empty states ----
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl + spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyStateSmall: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ---- Transcript ----
  transcriptContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  transcriptScroll: {
    maxHeight: 400,
  },
  transcriptContent: {
    padding: spacing.md,
  },
  callIdHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  callIdLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  callIdText: {
    fontSize: 11,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
    fontWeight: "500",
  },
});
