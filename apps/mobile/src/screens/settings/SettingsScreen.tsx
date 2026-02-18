import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

import { useBusiness, useSubscription } from "../../lib/hooks";
import { Card } from "../../components/common/Card";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { colors, spacing, borderRadius } from "../../lib/theme";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const {
    business,
    loading: businessLoading,
    refresh: refreshBusiness,
  } = useBusiness();
  const {
    subscription,
    loading: subLoading,
    refresh: refreshSub,
  } = useSubscription();

  const loading = businessLoading && subLoading;
  const refreshing = businessLoading || subLoading;

  const onRefresh = useCallback(() => {
    refreshBusiness();
    refreshSub();
  }, [refreshBusiness, refreshSub]);

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  }, [signOut]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    "1.0.0";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <Text style={styles.title}>Settings</Text>

        {/* User card */}
        <Card style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.firstName?.[0]?.toUpperCase() ??
                  user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ??
                  "?"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.fullName ??
                  user?.emailAddresses?.[0]?.emailAddress ??
                  "User"}
              </Text>
              <Text style={styles.userEmail}>
                {user?.emailAddresses?.[0]?.emailAddress ?? ""}
              </Text>
            </View>
          </View>
        </Card>

        {/* Business info */}
        <Text style={styles.sectionTitle}>Business</Text>
        <Card style={styles.card}>
          <InfoRow
            icon="business-outline"
            label="Name"
            value={business?.name ?? "Not set"}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="briefcase-outline"
            label="Industry"
            value={business?.industry ?? "Not set"}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="time-outline"
            label="Timezone"
            value={business?.timezone ?? "Not set"}
          />
          {business?.website ? (
            <>
              <View style={styles.divider} />
              <InfoRow
                icon="globe-outline"
                label="Website"
                value={business.website}
              />
            </>
          ) : null}
        </Card>

        {/* Subscription */}
        <Text style={styles.sectionTitle}>Subscription</Text>
        <Card style={styles.card}>
          <InfoRow
            icon="card-outline"
            label="Plan"
            value={subscription?.plan ?? "Free"}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="checkmark-circle-outline"
            label="Status"
            value={subscription?.status ?? "Inactive"}
          />
        </Card>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>Callo v{appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Info row helper
// ---------------------------------------------------------------------------

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={colors.textMuted}
        />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
    paddingBottom: spacing.xl + spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    marginBottom: 0,
  },

  // User row
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    maxWidth: "50%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Sign out
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    marginTop: spacing.xl,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.error,
  },

  // Version
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
