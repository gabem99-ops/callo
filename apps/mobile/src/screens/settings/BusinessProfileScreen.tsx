// ---------------------------------------------------------------------------
// BusinessProfileScreen -- Editable business profile with save functionality.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@clerk/clerk-expo";
import { ArrowLeft, Save } from "lucide-react-native";

import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { Business, BusinessHours } from "@callo/shared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: "09:00", close: "17:00", enabled: true },
  tuesday: { open: "09:00", close: "17:00", enabled: true },
  wednesday: { open: "09:00", close: "17:00", enabled: true },
  thursday: { open: "09:00", close: "17:00", enabled: true },
  friday: { open: "09:00", close: "17:00", enabled: true },
  saturday: { open: "10:00", close: "14:00", enabled: false },
  sunday: { open: "10:00", close: "14:00", enabled: false },
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function BusinessProfileScreen() {
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("");
  const [businessHours, setBusinessHours] =
    useState<BusinessHours>(DEFAULT_HOURS);

  // Fetch business data on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getTokenRef.current();
        api.setToken(token);
        const res = await api.getBusiness();
        const biz = res.data;
        setName(biz.name ?? "");
        setIndustry(biz.industry ?? "");
        setPhone(biz.phone ?? "");
        setWebsite(biz.website ?? "");
        setTimezone(biz.timezone ?? "");
        if (biz.businessHours && Object.keys(biz.businessHours).length > 0) {
          setBusinessHours({ ...DEFAULT_HOURS, ...biz.businessHours });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load business";
        Alert.alert("Error", message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Business name is required.");
      return;
    }

    try {
      setSaving(true);
      const token = await getTokenRef.current();
      api.setToken(token);
      await api.updateBusiness({
        name: name.trim(),
        industry: industry.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        timezone: timezone.trim() || undefined,
        businessHours,
      });
      Alert.alert("Success", "Business profile updated.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save changes";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }, [name, industry, phone, website, timezone, businessHours]);

  // Update a day's hours
  const updateDayHours = useCallback(
    (
      day: string,
      field: "open" | "close" | "enabled",
      value: string | boolean,
    ) => {
      setBusinessHours((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          [field]: value,
        },
      }));
    },
    [],
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Business Name */}
          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter business name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          {/* Industry */}
          <Text style={styles.label}>Industry</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>
              {industry || "Not set"}
            </Text>
          </View>

          {/* Phone Number */}
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 123-4567"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />

          {/* Website */}
          <Text style={styles.label}>Website</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />

          {/* Timezone */}
          <Text style={styles.label}>Timezone</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>
              {timezone || "Not set"}
            </Text>
          </View>

          {/* Business Hours */}
          <Text style={styles.sectionHeader}>BUSINESS HOURS</Text>

          {DAYS_OF_WEEK.map(({ key, label }) => {
            const dayHours = businessHours[key] ?? {
              open: "09:00",
              close: "17:00",
              enabled: false,
            };

            return (
              <View key={key} style={styles.dayRow}>
                <View style={styles.dayLabelRow}>
                  <Text
                    style={[
                      styles.dayLabel,
                      !dayHours.enabled && styles.dayLabelDisabled,
                    ]}
                  >
                    {label}
                  </Text>
                  <Switch
                    value={dayHours.enabled}
                    onValueChange={(val) =>
                      updateDayHours(key, "enabled", val)
                    }
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                    thumbColor={
                      dayHours.enabled ? colors.primaryLight : colors.textMuted
                    }
                  />
                </View>

                {dayHours.enabled && (
                  <View style={styles.timeRow}>
                    <TextInput
                      style={styles.timeInput}
                      value={dayHours.open}
                      onChangeText={(val) =>
                        updateDayHours(key, "open", val)
                      }
                      placeholder="09:00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numbers-and-punctuation"
                    />
                    <Text style={styles.timeSeparator}>to</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={dayHours.close}
                      onChangeText={(val) =>
                        updateDayHours(key, "close", val)
                      }
                      placeholder="17:00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                )}
              </View>
            );
          })}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.7}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
      <Text style={styles.headerTitle}>Business Profile</Text>
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
  flex: {
    flex: 1,
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

  // Labels & inputs
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
  },
  readOnlyField: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  readOnlyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Section header
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },

  // Day row
  dayRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dayLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  dayLabelDisabled: {
    color: colors.textMuted,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  timeInput: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: 14,
    textAlign: "center",
  },
  timeSeparator: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // Save button
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
