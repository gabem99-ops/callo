// ---------------------------------------------------------------------------
// PhoneNumbersScreen -- List of phone numbers with toggle and pull-to-refresh.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@clerk/clerk-expo";
import { ArrowLeft, Phone, PhoneOff } from "lucide-react-native";

import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { PhoneNumber } from "@callo/shared";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function PhoneNumbersScreen() {
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);

  // Fetch phone numbers
  const fetchNumbers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const token = await getTokenRef.current();
      api.setToken(token);
      const res = await api.getPhoneNumbers();
      setPhoneNumbers(res.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load phone numbers";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  // Toggle active/inactive
  const handleToggleActive = useCallback(
    async (id: string, currentActive: boolean) => {
      try {
        const token = await getTokenRef.current();
        api.setToken(token);
        await api.updatePhoneNumber(id, { isActive: !currentActive });
        // Optimistic update
        setPhoneNumbers((prev) =>
          prev.map((pn) =>
            pn.id === id ? { ...pn, isActive: !currentActive } : pn,
          ),
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update number";
        Alert.alert("Error", message);
        // Revert on error
        fetchNumbers();
      }
    },
    [fetchNumbers],
  );

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNumbers(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {phoneNumbers.length === 0 ? (
          <View style={styles.emptyState}>
            <PhoneOff size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Phone Numbers</Text>
            <Text style={styles.emptySubtitle}>
              Phone numbers will appear here once you add them from the
              dashboard.
            </Text>
          </View>
        ) : (
          phoneNumbers.map((pn) => (
            <PhoneNumberCard
              key={pn.id}
              phoneNumber={pn}
              onToggle={() => handleToggleActive(pn.id, pn.isActive)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Phone number card
// ---------------------------------------------------------------------------

function PhoneNumberCard({
  phoneNumber,
  onToggle,
}: {
  phoneNumber: PhoneNumber;
  onToggle: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Phone size={20} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardNumber}>{phoneNumber.number}</Text>
          {phoneNumber.friendlyName ? (
            <Text style={styles.cardFriendlyName}>
              {phoneNumber.friendlyName}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.statusBadge,
            phoneNumber.isActive
              ? styles.statusBadgeActive
              : styles.statusBadgeInactive,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              phoneNumber.isActive
                ? styles.statusTextActive
                : styles.statusTextInactive,
            ]}
          >
            {phoneNumber.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardBottom}>
        <Text style={styles.cardDetail}>
          Script:{" "}
          <Text style={styles.cardDetailValue}>
            {phoneNumber.scriptId ? "Assigned" : "None"}
          </Text>
        </Text>
        <Switch
          value={phoneNumber.isActive}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={
            phoneNumber.isActive ? colors.primaryLight : colors.textMuted
          }
        />
      </View>
    </View>
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
      <Text style={styles.headerTitle}>Phone Numbers</Text>
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

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
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
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHover,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardFriendlyName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusBadgeInactive: {
    backgroundColor: "rgba(113, 113, 122, 0.15)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textMuted,
  },

  // Card divider & bottom
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDetail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  cardDetailValue: {
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
