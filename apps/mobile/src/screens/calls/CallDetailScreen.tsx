// ---------------------------------------------------------------------------
// CallDetailScreen — metadata, sentiment, summary, and chat-bubble transcript.
// ---------------------------------------------------------------------------

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import {
  ArrowLeft,
  AlertCircle,
  MessageSquare,
  Smile,
  Meh,
  Frown,
} from "lucide-react-native";

import { useCallDetail } from "@/lib/hooks";
import { colors, spacing, borderRadius } from "@/lib/theme";
import {
  formatDuration,
  formatPhoneNumber,
  formatTimestamp,
} from "@/lib/format";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { TranscriptEntry } from "@callo/shared";

// ---------------------------------------------------------------------------
// Route params
// ---------------------------------------------------------------------------

type CallsStackParamList = {
  CallList: undefined;
  CallDetail: { callId: string };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadgeVariant(
  status: string,
): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
    case "ringing":
    case "queued":
      return "warning";
    case "failed":
    case "busy":
    case "no_answer":
    case "canceled":
      return "error";
    default:
      return "default";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "no_answer":
      return "No Answer";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "--";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Sentiment indicator
// ---------------------------------------------------------------------------

interface SentimentProps {
  sentiment: "positive" | "neutral" | "negative" | null;
}

function SentimentIndicator({ sentiment }: SentimentProps) {
  if (!sentiment) return null;

  const config: Record<
    string,
    { icon: React.ReactNode; color: string; label: string }
  > = {
    positive: {
      icon: <Smile size={20} color={colors.success} />,
      color: colors.success,
      label: "Positive",
    },
    neutral: {
      icon: <Meh size={20} color={colors.warning} />,
      color: colors.warning,
      label: "Neutral",
    },
    negative: {
      icon: <Frown size={20} color={colors.error} />,
      color: colors.error,
      label: "Negative",
    },
  };

  const entry = config[sentiment] ?? config.neutral;

  return (
    <View style={styles.sentimentRow}>
      {entry.icon}
      <Text style={[styles.sentimentLabel, { color: entry.color }]}>
        {entry.label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Transcript bubble
// ---------------------------------------------------------------------------

interface BubbleProps {
  entry: TranscriptEntry;
}

function TranscriptBubble({ entry }: BubbleProps) {
  const isAI = entry.speaker === "ai";

  return (
    <View
      style={[
        styles.bubbleContainer,
        isAI ? styles.bubbleContainerLeft : styles.bubbleContainerRight,
      ]}
    >
      <View
        style={[styles.bubble, isAI ? styles.bubbleAI : styles.bubbleCaller]}
      >
        <Text
          style={[
            styles.bubbleSpeaker,
            isAI ? styles.bubbleSpeakerAI : styles.bubbleSpeakerCaller,
          ]}
        >
          {isAI ? "AI Agent" : "Caller"}
        </Text>
        <Text style={styles.bubbleText}>{entry.text}</Text>
        <Text
          style={[
            styles.bubbleTimestamp,
            !isAI && styles.bubbleTimestampCaller,
          ]}
        >
          {formatTimestamp(entry.timestamp)}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared header bar sub-component
// ---------------------------------------------------------------------------

function HeaderBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.headerBar}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <ArrowLeft size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Call Details</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function CallDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<CallsStackParamList, "CallDetail">>();
  const { callId } = route.params;

  const { call, loading, error } = useCallDetail(callId);

  // -- Loading --
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HeaderBar onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  // -- Error / not found --
  if (error || !call) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HeaderBar onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={styles.errorMessage}>
            {error ?? "Call not found"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // -- Render --
  const transcript: TranscriptEntry[] = call.transcript ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Metadata card */}
        <Card style={styles.metadataCard}>
          {/* Badges */}
          <View style={styles.badgesRow}>
            <Badge
              label={call.direction === "inbound" ? "Inbound" : "Outbound"}
              variant={call.direction === "inbound" ? "success" : "default"}
            />
            <Badge
              label={getStatusLabel(call.status)}
              variant={getStatusBadgeVariant(call.status)}
            />
            {call.outcome && (
              <Badge label={call.outcome} variant="default" />
            )}
          </View>

          {/* Detail rows */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From</Text>
            <Text style={styles.detailValue}>
              {formatPhoneNumber(call.fromNumber)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To</Text>
            <Text style={styles.detailValue}>
              {formatPhoneNumber(call.toNumber)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {call.durationSeconds != null
                ? formatDuration(call.durationSeconds)
                : "--"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date / Time</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(call.startedAt ?? call.createdAt)}
            </Text>
          </View>

          {/* Sentiment */}
          {call.sentiment && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sentiment</Text>
              <SentimentIndicator sentiment={call.sentiment} />
            </View>
          )}
        </Card>

        {/* Summary */}
        {call.summary ? (
          <Card style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{call.summary}</Text>
          </Card>
        ) : null}

        {/* Transcript */}
        <View style={styles.transcriptSection}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          {transcript.length === 0 ? (
            <View style={styles.noTranscript}>
              <MessageSquare size={32} color={colors.textMuted} />
              <Text style={styles.noTranscriptText}>
                No transcript available
              </Text>
            </View>
          ) : (
            transcript.map((entry) => (
              <TranscriptBubble key={entry.id} entry={entry} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + 40,
  },

  // Header bar
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },

  // Error
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center",
  },

  // Metadata card
  metadataCard: {
    marginBottom: spacing.md,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },

  // Sentiment
  sentimentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sentimentLabel: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Summary
  summaryCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm + 2,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  // Transcript
  transcriptSection: {
    marginTop: spacing.sm,
  },
  noTranscript: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  noTranscriptText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // Bubbles
  bubbleContainer: {
    marginBottom: spacing.sm,
    maxWidth: "85%",
  },
  bubbleContainerLeft: {
    alignSelf: "flex-start",
  },
  bubbleContainerRight: {
    alignSelf: "flex-end",
  },
  bubble: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  bubbleAI: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: borderRadius.sm,
  },
  bubbleCaller: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomRightRadius: borderRadius.sm,
  },
  bubbleSpeaker: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  bubbleSpeakerAI: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  bubbleSpeakerCaller: {
    color: colors.textMuted,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bubbleTimestamp: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: spacing.xs,
    textAlign: "right",
  },
  bubbleTimestampCaller: {
    color: colors.textMuted,
  },
});
