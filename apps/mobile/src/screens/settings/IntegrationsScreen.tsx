// ---------------------------------------------------------------------------
// IntegrationsScreen -- Integration cards with connected status.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@clerk/clerk-expo";
import {
  ArrowLeft,
  Calendar,
  Zap,
  Users,
  CheckCircle,
  ExternalLink,
} from "lucide-react-native";

import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { Integration } from "@callo/shared";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function IntegrationsScreen() {
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connecting, setConnecting] = useState(false);

  // Fetch integrations on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getTokenRef.current();
        api.setToken(token);
        const res = await api.getIntegrations();
        setIntegrations(res.data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load integrations";
        Alert.alert("Error", message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Find Google Calendar integration
  const googleIntegration = integrations.find(
    (i) => i.provider === "google_calendar",
  );
  const isGoogleConnected = googleIntegration?.status === "connected";
  const googleEmail =
    (googleIntegration?.metadata as Record<string, unknown>)?.email as
      | string
      | undefined;

  // Connect Google Calendar
  const handleConnectGoogle = useCallback(async () => {
    try {
      setConnecting(true);
      const token = await getTokenRef.current();
      api.setToken(token);
      const res = await api.connectGoogle();
      if (res.data.authUrl) {
        await Linking.openURL(res.data.authUrl);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to start Google connection";
      Alert.alert("Error", message);
    } finally {
      setConnecting(false);
    }
  }, []);

  // Disconnect Google Calendar
  const handleDisconnectGoogle = useCallback(async () => {
    Alert.alert(
      "Disconnect Google Calendar",
      "Are you sure you want to disconnect Google Calendar?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getTokenRef.current();
              api.setToken(token);
              await api.disconnectGoogle();
              setIntegrations((prev) =>
                prev.filter((i) => i.provider !== "google_calendar"),
              );
            } catch (err: unknown) {
              const message =
                err instanceof Error
                  ? err.message
                  : "Failed to disconnect";
              Alert.alert("Error", message);
            }
          },
        },
      ],
    );
  }, []);

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Google Calendar */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.cardIcon, styles.googleIcon]}>
              <Calendar size={22} color="#4285F4" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Google Calendar</Text>
              <Text style={styles.cardSubtitle}>
                {isGoogleConnected
                  ? googleEmail ?? "Connected"
                  : "Sync appointments and availability"}
              </Text>
            </View>
            {isGoogleConnected && (
              <CheckCircle size={20} color={colors.success} />
            )}
          </View>

          <View style={styles.cardDivider} />

          {isGoogleConnected ? (
            <View style={styles.cardActions}>
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedText}>Connected</Text>
              </View>
              <TouchableOpacity
                onPress={handleDisconnectGoogle}
                activeOpacity={0.7}
              >
                <Text style={styles.disconnectText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleConnectGoogle}
              activeOpacity={0.7}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <ExternalLink size={16} color="#FFFFFF" />
                  <Text style={styles.connectButtonText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Zapier -- Coming Soon */}
        <View style={[styles.card, styles.cardDisabled]}>
          <View style={styles.cardTop}>
            <View style={[styles.cardIcon, styles.zapierIcon]}>
              <Zap size={22} color="#FF4A00" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Zapier</Text>
              <Text style={styles.cardSubtitle}>
                Connect 5,000+ apps with automation
              </Text>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>

        {/* CRM -- Coming Soon */}
        <View style={[styles.card, styles.cardDisabled]}>
          <View style={styles.cardTop}>
            <View style={[styles.cardIcon, styles.crmIcon]}>
              <Users size={22} color="#7C3AED" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>CRM</Text>
              <Text style={styles.cardSubtitle}>
                Sync leads and contacts with your CRM
              </Text>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Header bar
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
      <Text style={styles.headerTitle}>Integrations</Text>
      <View style={styles.headerSpacer} />
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

  // Card
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  googleIcon: {
    backgroundColor: "rgba(66, 133, 244, 0.12)",
  },
  zapierIcon: {
    backgroundColor: "rgba(255, 74, 0, 0.12)",
  },
  crmIcon: {
    backgroundColor: "rgba(124, 58, 237, 0.12)",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Card divider
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  // Card actions
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  connectedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.error,
  },

  // Connect button
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Coming soon
  comingSoonBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
