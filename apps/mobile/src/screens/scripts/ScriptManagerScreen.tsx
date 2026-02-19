// ---------------------------------------------------------------------------
// ScriptManagerScreen — main bot management screen showing the default script
// with voice, greeting, FAQs, settings, and advanced sections.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ChevronRight,
  Mic,
  MessageSquare,
  HelpCircle,
  Settings,
  Code,
} from "lucide-react-native";

import type { Script } from "@callo/shared";
import { getVoiceById, getVoiceByVapiId } from "@callo/shared";
import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";
import { Card } from "@/components/common/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { ScriptStackParamList } from "@/navigation/ScriptStack";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<ScriptStackParamList, "ScriptManager">;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveVoice(script: Script) {
  // Try internal ID first, then vapiVoiceId fallback
  return getVoiceById(script.voice) ?? getVoiceByVapiId(script.voice) ?? null;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function ScriptManagerScreen({ navigation }: Props) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // -- Fetch default script --------------------------------------------------

  const fetchScript = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = await getTokenRef.current();
      api.setToken(token);

      const result = await api.getScripts();
      const scripts = result.data ?? [];
      const defaultScript =
        scripts.find((s) => s.isDefault) ?? scripts[0] ?? null;

      setScript(defaultScript);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load script";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchScript();
    }
  }, [fetchScript]);

  // Re-fetch when coming back from sub-screens
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (fetchedRef.current) {
        fetchScript(true);
      }
    });
    return unsubscribe;
  }, [navigation, fetchScript]);

  // -- Toggle handlers -------------------------------------------------------

  const handleToggle = useCallback(
    async (field: "bookingEnabled" | "transferEnabled", value: boolean) => {
      if (!script) return;
      try {
        const token = await getTokenRef.current();
        api.setToken(token);
        const result = await api.updateScript(script.id, { [field]: value });
        setScript(result.data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update setting";
        Alert.alert("Error", message);
      }
    },
    [script],
  );

  // -- Loading state ----------------------------------------------------------

  if (loading && !script) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  // -- Error state ------------------------------------------------------------

  if (error && !script) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchScript()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!script) return null;

  const voice = resolveVoice(script);
  const faqCount = script.faqs?.length ?? 0;

  // -- Render -----------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchScript(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your AI Agent</Text>
          <Text style={styles.subtitle}>{script.name}</Text>
        </View>

        {/* Section 1: Voice */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Mic size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Voice</Text>
          </View>
          {voice ? (
            <View style={styles.voiceInfo}>
              <View style={styles.voiceNameRow}>
                <Text style={styles.voiceName}>{voice.name}</Text>
                <View
                  style={[
                    styles.genderBadge,
                    voice.gender === "female"
                      ? styles.genderFemale
                      : styles.genderMale,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderBadgeText,
                      voice.gender === "female"
                        ? styles.genderTextFemale
                        : styles.genderTextMale,
                    ]}
                  >
                    {voice.gender === "female" ? "Female" : "Male"}
                  </Text>
                </View>
              </View>
              <Text style={styles.voiceDescription}>{voice.description}</Text>
            </View>
          ) : (
            <Text style={styles.voiceDescription}>
              Voice: {script.voice}
            </Text>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("ChangeVoice", {
                scriptId: script.id,
                currentVoiceId: script.voice,
              })
            }
          >
            <Text style={styles.actionButtonText}>Change Voice</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* Section 2: Greeting */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Greeting</Text>
          </View>
          <Text style={styles.greetingText} numberOfLines={2}>
            {script.greeting}
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("EditGreeting", {
                scriptId: script.id,
                currentGreeting: script.greeting,
              })
            }
          >
            <Text style={styles.actionButtonText}>Edit</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* Section 3: FAQs */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <HelpCircle size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>FAQs</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{faqCount}</Text>
            </View>
          </View>
          {script.faqs && script.faqs.length > 0 ? (
            <View style={styles.faqPreviewList}>
              {script.faqs.slice(0, 3).map((faq, index) => (
                <View
                  key={index}
                  style={[
                    styles.faqPreviewRow,
                    index < Math.min(script.faqs.length, 3) - 1 &&
                      styles.faqPreviewRowBorder,
                  ]}
                >
                  <Text style={styles.faqPreviewQuestion} numberOfLines={1}>
                    {faq.question}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No FAQs added yet</Text>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("ManageFAQs", { scriptId: script.id })
            }
          >
            <Text style={styles.actionButtonText}>Manage FAQs</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* Section 4: Settings */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Settings size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>

          {/* Booking toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Booking Enabled</Text>
            <Switch
              value={script.bookingEnabled}
              onValueChange={(value) => handleToggle("bookingEnabled", value)}
              trackColor={{
                false: colors.border,
                true: "rgba(99, 102, 241, 0.4)",
              }}
              thumbColor={
                script.bookingEnabled ? colors.primary : colors.textMuted
              }
            />
          </View>

          <View style={styles.divider} />

          {/* Transfer toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Call Transfer</Text>
            <Switch
              value={script.transferEnabled}
              onValueChange={(value) => handleToggle("transferEnabled", value)}
              trackColor={{
                false: colors.border,
                true: "rgba(99, 102, 241, 0.4)",
              }}
              thumbColor={
                script.transferEnabled ? colors.primary : colors.textMuted
              }
            />
          </View>

          <View style={styles.divider} />

          {/* Lead Qualification toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Lead Qualification</Text>
            <Switch
              value={
                script.qualificationQuestions != null &&
                script.qualificationQuestions.length > 0
              }
              disabled
              trackColor={{
                false: colors.border,
                true: "rgba(99, 102, 241, 0.4)",
              }}
              thumbColor={
                script.qualificationQuestions?.length
                  ? colors.primary
                  : colors.textMuted
              }
            />
          </View>

          <View style={styles.divider} />

          {/* Tone row */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("ChangeTone", {
                scriptId: script.id,
                currentTone: script.tone,
              })
            }
          >
            <Text style={styles.toggleLabel}>Tone</Text>
            <View style={styles.settingValueRow}>
              <Text style={styles.settingValue}>
                {script.tone.charAt(0).toUpperCase() + script.tone.slice(1)}
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Section 5: Advanced */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Code size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Advanced</Text>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("ViewPrompt", { scriptId: script.id })
            }
          >
            <Text style={styles.actionButtonText}>View Full System Prompt</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>
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
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Cards
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },

  // Voice section
  voiceInfo: {
    marginBottom: spacing.md,
  },
  voiceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  genderBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  genderFemale: {
    backgroundColor: "rgba(236, 72, 153, 0.15)",
  },
  genderMale: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  genderBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  genderTextFemale: {
    color: "#EC4899",
  },
  genderTextMale: {
    color: "#3B82F6",
  },
  voiceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Greeting section
  greetingText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  // FAQ section
  faqPreviewList: {
    marginBottom: spacing.md,
  },
  faqPreviewRow: {
    paddingVertical: spacing.sm + 2,
  },
  faqPreviewRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqPreviewQuestion: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  countBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: "center",
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryLight,
  },

  // Settings section
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  settingValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Action button (inline row-style)
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },

  // Error
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
