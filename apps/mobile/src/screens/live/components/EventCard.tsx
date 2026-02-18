// ---------------------------------------------------------------------------
// EventCard — compact card for recent events (calls ended, campaigns, usage).
// ---------------------------------------------------------------------------

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Phone,
  PhoneOff,
  Megaphone,
  AlertTriangle,
  CheckCircle,
} from "lucide-react-native";
import { colors, spacing, borderRadius } from "../../../lib/theme";
import { formatTimeAgo } from "../../../lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventCardProps {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIconForType(type: string) {
  switch (type) {
    case "call_started":
      return { Icon: Phone, color: colors.success };
    case "call_ended":
      return { Icon: PhoneOff, color: colors.textMuted };
    case "campaign_update":
      return { Icon: Megaphone, color: colors.primary };
    case "usage_warning":
      return { Icon: AlertTriangle, color: colors.warning };
    case "usage_limit_reached":
      return { Icon: AlertTriangle, color: colors.error };
    default:
      return { Icon: CheckCircle, color: colors.textSecondary };
  }
}

function getDescription(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case "call_ended": {
      const duration = data.duration != null ? `${data.duration}s` : "";
      const outcome = (data.outcome as string) ?? "ended";
      const summary = (data.summary as string) ?? "";
      const parts = [`Call ${outcome}`];
      if (duration) parts.push(`(${duration})`);
      if (summary) parts.push(`— ${summary}`);
      return parts.join(" ");
    }
    case "campaign_update": {
      const status = (data.status as string) ?? "updated";
      const completed = data.completedLeads ?? 0;
      const total = data.totalLeads ?? 0;
      return `Campaign ${status} — ${completed}/${total} leads`;
    }
    case "usage_warning": {
      const pct = data.percentUsed ?? 0;
      const used = data.minutesUsed ?? 0;
      const limit = data.minuteLimit ?? 0;
      return `Usage at ${pct}% — ${used}/${limit} minutes used`;
    }
    case "usage_limit_reached": {
      const used2 = data.minutesUsed ?? 0;
      const limit2 = data.minuteLimit ?? 0;
      return `Minute limit reached — ${used2}/${limit2} minutes`;
    }
    case "call_started": {
      const dir = (data.direction as string) === "inbound" ? "Inbound" : "Outbound";
      return `${dir} call started`;
    }
    default:
      return `Event: ${type}`;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventCard({ type, data, timestamp }: EventCardProps) {
  const { Icon, color } = getIconForType(type);
  const description = getDescription(type, data);
  const timeAgo = formatTimeAgo(timestamp);

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={16} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
        <Text style={styles.time}>{timeAgo}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
