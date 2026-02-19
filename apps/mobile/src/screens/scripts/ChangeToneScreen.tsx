// ---------------------------------------------------------------------------
// ChangeToneScreen — select a tone for the AI agent's conversation style.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft } from "lucide-react-native";

import type { ScriptTone } from "@callo/shared";
import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";
import type { ScriptStackParamList } from "@/navigation/ScriptStack";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<ScriptStackParamList, "ChangeTone">;

interface ToneOption {
  id: ScriptTone;
  label: string;
  emoji: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Tone options
// ---------------------------------------------------------------------------

const TONE_OPTIONS: ToneOption[] = [
  {
    id: "professional",
    label: "Professional",
    emoji: "💼",
    description:
      "Polished and corporate. Best for B2B, law firms, and enterprise services.",
  },
  {
    id: "friendly",
    label: "Friendly",
    emoji: "😊",
    description:
      "Warm and approachable. Great for retail, healthcare, and service businesses.",
  },
  {
    id: "casual",
    label: "Casual",
    emoji: "🤙",
    description:
      "Relaxed and conversational. Ideal for small businesses and startups.",
  },
  {
    id: "formal",
    label: "Formal",
    emoji: "🎩",
    description:
      "Structured and courteous. Suited for government, finance, and luxury brands.",
  },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function ChangeToneScreen({ navigation, route }: Props) {
  const { scriptId, currentTone } = route.params;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [selectedTone, setSelectedTone] = useState<ScriptTone>(
    currentTone as ScriptTone,
  );
  const [saving, setSaving] = useState(false);

  const hasChanges = selectedTone !== currentTone;

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const token = await getTokenRef.current();
      api.setToken(token);
      await api.updateScript(scriptId, { tone: selectedTone });
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update tone";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }, [scriptId, selectedTone, hasChanges, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Tone</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>
          Choose the conversational tone for your AI agent.
        </Text>
      </View>

      {/* Tone cards */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {TONE_OPTIONS.map((tone) => {
          const isSelected = selectedTone === tone.id;
          return (
            <TouchableOpacity
              key={tone.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              activeOpacity={0.7}
              onPress={() => setSelectedTone(tone.id)}
            >
              <View style={styles.cardRow}>
                <Text style={styles.emoji}>{tone.emoji}</Text>
                <View style={styles.cardInfo}>
                  <Text
                    style={[
                      styles.toneLabel,
                      isSelected && styles.toneLabelSelected,
                    ]}
                  >
                    {tone.label}
                  </Text>
                  <Text style={styles.toneDescription}>
                    {tone.description}
                  </Text>
                </View>

                {/* Radio indicator */}
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges || saving) && styles.saveButtonDisabled,
          ]}
          activeOpacity={0.8}
          disabled={!hasChanges || saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color={colors.textPrimary} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
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

  // Subtitle
  subtitleContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // List
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  emoji: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  toneLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  toneLabelSelected: {
    color: colors.primaryLight,
  },
  toneDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Radio
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
