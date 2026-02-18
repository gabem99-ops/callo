// ---------------------------------------------------------------------------
// CallListScreen — paginated call history list with direction filters.
// ---------------------------------------------------------------------------

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Phone,
} from "lucide-react-native";

import { useCalls } from "@/lib/hooks";
import { colors, spacing, borderRadius } from "@/lib/theme";
import {
  formatDuration,
  formatTimeAgo,
  formatPhoneNumber,
} from "@/lib/format";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import type { Call } from "@callo/shared";

// ---------------------------------------------------------------------------
// Filter chip values
// ---------------------------------------------------------------------------

type DirectionFilter = "all" | "inbound" | "outbound";

const FILTER_OPTIONS: { label: string; value: DirectionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
];

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

function getStatusBadgeVariant(
  status: Call["status"],
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

function getStatusLabel(status: Call["status"]): string {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "no_answer":
      return "No Answer";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

// ---------------------------------------------------------------------------
// Call row
// ---------------------------------------------------------------------------

interface CallRowProps {
  call: Call;
  onPress: () => void;
}

function CallRow({ call, onPress }: CallRowProps) {
  const isInbound = call.direction === "inbound";
  const displayNumber = isInbound ? call.fromNumber : call.toNumber;

  const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;
  const iconColor = isInbound ? colors.success : colors.primary;
  const iconBg = isInbound
    ? "rgba(16, 185, 129, 0.1)"
    : "rgba(99, 102, 241, 0.1)";

  return (
    <TouchableOpacity
      style={styles.callRow}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Direction icon */}
      <View style={[styles.directionIcon, { backgroundColor: iconBg }]}>
        <DirectionIcon size={18} color={iconColor} />
      </View>

      {/* Main content */}
      <View style={styles.callContent}>
        <View style={styles.callTopRow}>
          <Text style={styles.phoneNumber} numberOfLines={1}>
            {formatPhoneNumber(displayNumber)}
          </Text>
          <Text style={styles.timeAgo}>{formatTimeAgo(call.createdAt)}</Text>
        </View>

        <View style={styles.callMiddleRow}>
          <Badge
            label={getStatusLabel(call.status)}
            variant={getStatusBadgeVariant(call.status)}
          />
          {call.durationSeconds != null && (
            <Text style={styles.duration}>
              {formatDuration(call.durationSeconds)}
            </Text>
          )}
          {call.outcome && <Badge label={call.outcome} variant="default" />}
        </View>

        {call.summary ? (
          <Text style={styles.summary} numberOfLines={1}>
            {call.summary}
          </Text>
        ) : null}
      </View>

      {/* Chevron */}
      <ChevronRight
        size={18}
        color={colors.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonCircle} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonLine, { width: "60%" }]} />
            <View
              style={[styles.skeletonLine, { width: "40%", marginTop: 8 }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function CallListScreen() {
  const navigation = useNavigation<any>();
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>("all");

  const direction =
    directionFilter === "all" ? undefined : directionFilter;

  const { calls, loading, error, refresh, loadMore, hasMore } =
    useCalls(direction);

  const handleCallPress = useCallback(
    (call: Call) => {
      navigation.navigate("CallDetail", { callId: call.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Call }) => (
      <CallRow call={item} onPress={() => handleCallPress(item)} />
    ),
    [handleCallPress],
  );

  const renderFooter = useCallback(() => {
    if (!hasMore || calls.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }, [hasMore, calls.length]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <EmptyState
        iconElement={<Phone size={32} color={colors.textMuted} />}
        title="No calls yet"
        description="When calls come in or are made, they will appear here."
      />
    );
  }, [loading]);

  const keyExtractor = useCallback((item: Call) => item.id, []);

  // -- Render --

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Call History</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => {
          const isActive = opt.value === directionFilter;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
              ]}
              activeOpacity={0.7}
              onPress={() => setDirectionFilter(opt.value)}
            >
              <Text
                style={[
                  styles.filterChipLabel,
                  isActive && styles.filterChipLabelActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Content */}
      {loading && calls.length === 0 ? (
        <LoadingSkeleton />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading && calls.length > 0}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
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

  // Header
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // Filter chips
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  filterChipLabelActive: {
    color: colors.textPrimary,
  },

  // Error
  errorBanner: {
    marginHorizontal: spacing.md,
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + 40,
    flexGrow: 1,
  },

  // Call row
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  directionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm + 2,
  },
  callContent: {
    flex: 1,
  },
  callTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  phoneNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  timeAgo: {
    fontSize: 13,
    color: colors.textMuted,
  },
  callMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  duration: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summary: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  chevron: {
    marginLeft: spacing.xs,
  },

  // Footer
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },

  // Skeleton
  skeletonContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceHover,
    marginRight: spacing.sm + 2,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceHover,
  },
});
