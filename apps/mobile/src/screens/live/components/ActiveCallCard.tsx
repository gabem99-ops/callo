// ---------------------------------------------------------------------------
// ActiveCallCard — displays a single active call with pulsing indicator
// and live duration timer.
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react-native";
import { colors, spacing, borderRadius } from "../../../lib/theme";
import { formatPhoneNumber } from "../../../lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveCallCardProps {
  callId: string;
  direction: "inbound" | "outbound";
  phoneNumber: string;
  startTime: string; // ISO timestamp
  status: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActiveCallCard({
  callId,
  direction,
  phoneNumber,
  startTime,
  status,
}: ActiveCallCardProps) {
  // ---- Pulsing animation ----
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // ---- Live duration timer ----
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();

    const tick = () => {
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    };

    tick(); // initial
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatElapsed = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // ---- Derived values ----
  const isInbound = direction === "inbound";
  const DirectionIcon = isInbound ? PhoneIncoming : PhoneOutgoing;
  const directionLabel = isInbound ? "Inbound" : "Outbound";

  const formattedStart = new Date(startTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        {/* Pulsing dot */}
        <Animated.View
          style={[styles.pulseDot, { opacity: pulseAnim }]}
        />

        {/* Direction badge */}
        <View
          style={[
            styles.directionBadge,
            isInbound ? styles.inboundBadge : styles.outboundBadge,
          ]}
        >
          <DirectionIcon
            size={12}
            color={isInbound ? colors.success : colors.primary}
          />
          <Text
            style={[
              styles.directionText,
              { color: isInbound ? colors.success : colors.primary },
            ]}
          >
            {directionLabel}
          </Text>
        </View>

        {/* Duration */}
        <Text style={styles.duration}>{formatElapsed(elapsed)}</Text>
      </View>

      {/* Phone number */}
      <Text style={styles.phoneNumber}>
        {formatPhoneNumber(phoneNumber)}
      </Text>

      {/* Footer row */}
      <View style={styles.footerRow}>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.startTime}>Started {formattedStart}</Text>
      </View>

      {/* Call ID (subtle) */}
      <Text style={styles.callId}>ID: {callId.slice(0, 8)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  directionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  inboundBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  outboundBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  directionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  duration: {
    marginLeft: "auto",
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: colors.textPrimary,
  },
  phoneNumber: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  status: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  startTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  callId: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
