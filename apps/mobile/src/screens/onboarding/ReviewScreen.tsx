import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "@clerk/clerk-expo";

import {
  getTemplateById,
  interpolateTemplate,
  USE_CASE_OPTIONS,
  VOICE_OPTIONS,
} from "@callo/shared";
import type { OnboardingStackParamList } from "@/navigation/OnboardingStack";
import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<OnboardingStackParamList, "Review">;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function ReviewScreen({ navigation, route }: Props) {
  const { industryId, useCases, businessName, phone, timezone, voiceId } =
    route.params;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const template = getTemplateById(industryId);
  const voice = VOICE_OPTIONS.find((v) => v.id === voiceId);

  // Pre-fill greeting from template
  const defaultGreeting = useMemo(() => {
    if (!template) return `Hi, thanks for calling ${businessName}! How can I help you?`;
    return interpolateTemplate(template.greeting, businessName);
  }, [template, businessName]);

  const [greeting, setGreeting] = useState(defaultGreeting);
  const [loading, setLoading] = useState(false);

  // Resolve use case labels
  const useCaseLabels = useMemo(
    () =>
      useCases
        .map((id) => USE_CASE_OPTIONS.find((uc) => uc.id === id)?.label)
        .filter(Boolean) as string[],
    [useCases],
  );

  const handleActivate = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getTokenRef.current();
      api.setToken(token);

      await api.completeOnboarding({
        industryTemplateId: industryId,
        useCases,
        businessName,
        phone,
        timezone,
        voiceId,
        greetingOverride:
          greeting !== defaultGreeting ? greeting : undefined,
      });

      navigation.navigate("Completion", { businessName });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, [
    industryId,
    useCases,
    businessName,
    phone,
    timezone,
    voiceId,
    greeting,
    defaultGreeting,
    navigation,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Review & Launch</Text>
            <Text style={styles.subtitle}>
              Confirm your settings before activating your AI agent.
            </Text>
          </View>

          {/* Summary cards */}
          <SummaryRow label="Business Name" value={businessName} />
          <SummaryRow
            label="Industry"
            value={template?.label ?? industryId}
          />
          <SummaryRow label="Voice" value={voice?.name ?? voiceId} />
          <SummaryRow label="Timezone" value={timezone} />
          {phone ? <SummaryRow label="Phone" value={phone} /> : null}

          {/* Use cases */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Use Cases</Text>
            <View style={styles.useCaseList}>
              {useCaseLabels.map((label) => (
                <View key={label} style={styles.useCaseTag}>
                  <Text style={styles.useCaseTagText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Greeting */}
          <View style={styles.greetingSection}>
            <Text style={styles.greetingLabel}>Greeting</Text>
            <Text style={styles.greetingHint}>
              Customize how your AI agent greets callers.
            </Text>
            <TextInput
              style={styles.greetingInput}
              value={greeting}
              onChangeText={setGreeting}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            activeOpacity={0.8}
            disabled={loading}
            onPress={handleActivate}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} size="small" />
            ) : (
              <Text style={styles.buttonText}>Activate Agent</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// SummaryRow helper
// ---------------------------------------------------------------------------

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Summary cards
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  // Use case tags
  useCaseList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  useCaseTag: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  useCaseTagText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryLight,
  },

  // Greeting
  greetingSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  greetingHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  greetingInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 100,
    lineHeight: 22,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
