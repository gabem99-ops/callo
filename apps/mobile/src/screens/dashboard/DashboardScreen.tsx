// ---------------------------------------------------------------------------
// DashboardScreen — overview stats, active-call indicator, quick actions.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import {
  ChevronRight,
  Clock,
  Calendar,
  Hourglass,
  List,
  Phone,
  Radio,
  TrendingUp,
  Users,
} from "lucide-react-native";

import { useStats } from "@/lib/hooks";
import { colors, spacing, borderRadius } from "@/lib/theme";
import { formatPercentage } from "@/lib/format";
import { StatCard } from "@/components/common/StatCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

// ---------------------------------------------------------------------------
// Pulsing green dot for the active-call banner
// ---------------------------------------------------------------------------

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulsingDot, { opacity }]} />;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function DashboardScreen() {
  const { user } = useUser();
  const navigation = useNavigation<any>();
  const { stats, loading, error, refresh } = useStats();

  // TODO: Wire up to WebSocket live-call state
  const hasActiveCall = false;

  const firstName = user?.firstName ?? "there";

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // -- Colour helpers for conditional stat cards --

  const getMinutesRemainingColor = (): string => {
    if (!stats) return colors.textPrimary;
    const total = stats.totalMinutes + stats.minutesRemaining;
    if (total === 0) return colors.textPrimary;
    const pct = stats.minutesRemaining / total;
    if (pct < 0.1) return colors.error;
    if (pct < 0.25) return colors.warning;
    return colors.success;
  };

  const getSuccessRateColor = (): string => {
    if (!stats) return colors.textPrimary;
    const rate = stats.successRate;
    // Normalise: if expressed as percentage (>1) divide by 100
    const normalised = rate > 1 ? rate / 100 : rate;
    if (normalised >= 0.5) return colors.success;
    if (normalised >= 0.25) return colors.warning;
    return colors.error;
  };

  // -- Loading state --

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  // -- Render --

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.greeting}>Hello, {firstName}</Text>
        </View>

        {/* Active call banner */}
        {hasActiveCall && (
          <TouchableOpacity
            style={styles.activeCallBanner}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Live")}
          >
            <PulsingDot />
            <Text style={styles.activeCallText}>Live call in progress</Text>
            <ChevronRight size={18} color={colors.success} />
          </TouchableOpacity>
        )}

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Primary stat cards — 2x2 grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Calls"
            value={stats?.totalCalls ?? 0}
            iconElement={<Phone size={16} color={colors.textMuted} />}
            style={styles.statCard}
          />
          <StatCard
            label="Minutes Used"
            value={stats?.totalMinutes ?? 0}
            iconElement={<Clock size={16} color={colors.textMuted} />}
            style={styles.statCard}
          />
          <StatCard
            label="Appointments"
            value={stats?.appointmentsBooked ?? 0}
            iconElement={<Calendar size={16} color={colors.textMuted} />}
            style={styles.statCard}
          />
          <StatCard
            label="Leads Captured"
            value={stats?.leadsCapured ?? 0}
            iconElement={<Users size={16} color={colors.textMuted} />}
            style={styles.statCard}
          />
        </View>

        {/* Secondary stat cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Success Rate"
            value={formatPercentage(stats?.successRate ?? 0)}
            iconElement={<TrendingUp size={16} color={colors.textMuted} />}
            valueColor={getSuccessRateColor()}
            style={styles.statCard}
          />
          <StatCard
            label="Min. Remaining"
            value={stats?.minutesRemaining ?? 0}
            iconElement={<Hourglass size={16} color={colors.textMuted} />}
            valueColor={getMinutesRemainingColor()}
            style={styles.statCard}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Calls")}
            >
              <List size={20} color={colors.primary} />
              <Text style={styles.quickActionLabel}>View Calls</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Live")}
            >
              <Radio size={20} color={colors.primary} />
              <Text style={styles.quickActionLabel}>Live Monitor</Text>
            </TouchableOpacity>
          </View>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + 40,
  },

  // Header
  header: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Active call banner
  activeCallBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  activeCallText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.success,
  },

  // Error
  errorBanner: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.sm,
  },
  statCard: {
    width: "50%",
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },

  // Quick actions
  quickActionsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
