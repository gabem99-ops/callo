// ---------------------------------------------------------------------------
// SettingsScreen -- Settings hub with menu rows navigating to sub-screens.
// ---------------------------------------------------------------------------

import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Building2,
  Phone,
  Bot,
  Plug,
  CreditCard,
  LogOut,
  ChevronRight,
} from "lucide-react-native";
import Constants from "expo-constants";

import { useSubscription } from "@/lib/hooks";
import { colors, spacing, borderRadius } from "@/lib/theme";
import type { SettingsStackParamList } from "@/navigation/SettingsStack";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettingsNav = NativeStackNavigationProp<SettingsStackParamList>;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const navigation = useNavigation<SettingsNav>();
  const { subscription } = useSubscription();

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

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    "1.0.0";

  const planLabel = subscription?.plan
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Settings</Text>

        {/* User card */}
        <View style={styles.userCard}>
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

        {/* Account Section */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon={<Building2 size={20} color={colors.textSecondary} />}
            label="Business Profile"
            subtitle="Name, hours, contact info"
            onPress={() => navigation.navigate("BusinessProfile")}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<Phone size={20} color={colors.textSecondary} />}
            label="Phone Numbers"
            subtitle="Manage your AI phone lines"
            onPress={() => navigation.navigate("PhoneNumbers")}
          />
        </View>

        {/* AI Agent Section */}
        <Text style={styles.sectionHeader}>AI AGENT</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon={<Bot size={20} color={colors.textSecondary} />}
            label="Manage AI Script"
            subtitle="Greeting, voice, tone, FAQs"
            onPress={() => {
              // Navigate to the Scripts tab in the main tabs
              const parent = navigation.getParent();
              if (parent) {
                parent.navigate("Agent");
              }
            }}
          />
        </View>

        {/* Connections Section */}
        <Text style={styles.sectionHeader}>CONNECTIONS</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon={<Plug size={20} color={colors.textSecondary} />}
            label="Integrations"
            subtitle="Google Calendar, Zapier, CRM"
            onPress={() => navigation.navigate("Integrations")}
          />
        </View>

        {/* Billing Section */}
        <Text style={styles.sectionHeader}>BILLING</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon={<CreditCard size={20} color={colors.textSecondary} />}
            label="Subscription & Billing"
            subtitle={planLabel ? `${planLabel} plan` : "Manage your plan"}
            onPress={() => {
              // TODO: Navigate to billing screen when implemented
              Alert.alert(
                "Billing",
                "Subscription management coming soon to mobile.",
              );
            }}
          />
        </View>

        {/* Sign Out */}
        <View style={[styles.menuGroup, { marginTop: spacing.xl }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleSignOut}
            activeOpacity={0.6}
          >
            <View style={styles.menuIconWrap}>
              <LogOut size={20} color={colors.error} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabelDanger}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Callo v{appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Menu row component
// ---------------------------------------------------------------------------

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
}

function MenuRow({ icon, label, subtitle, onPress }: MenuRowProps) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.menuIconWrap}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle ? (
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + spacing.xl,
  },

  // Header
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },

  // User card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
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

  // Section header
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  // Menu group
  menuGroup: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 56, // offset for icon
  },

  // Menu row
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: spacing.md,
  },
  menuIconWrap: {
    width: 24,
    alignItems: "center",
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  menuLabelDanger: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.error,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Version
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
