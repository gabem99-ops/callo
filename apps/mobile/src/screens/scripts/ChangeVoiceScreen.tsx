// ---------------------------------------------------------------------------
// ChangeVoiceScreen — select a new voice for the AI agent.
// Uses the same card style as the onboarding VoiceSelectionScreen.
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

import {
  VOICE_OPTIONS,
  getVoiceById,
  getVoiceByVapiId,
  type VoiceOption,
} from "@callo/shared";
import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";
import type { ScriptStackParamList } from "@/navigation/ScriptStack";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<ScriptStackParamList, "ChangeVoice">;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function ChangeVoiceScreen({ navigation, route }: Props) {
  const { scriptId, currentVoiceId } = route.params;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // Resolve current voice — try by id first, then by vapiVoiceId
  const currentVoice =
    getVoiceById(currentVoiceId) ?? getVoiceByVapiId(currentVoiceId);

  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(
    currentVoice ?? null,
  );
  const [saving, setSaving] = useState(false);

  const hasChanges =
    selectedVoice !== null && selectedVoice.id !== (currentVoice?.id ?? null);

  const handleSave = useCallback(async () => {
    if (!selectedVoice || !hasChanges) return;
    setSaving(true);
    try {
      const token = await getTokenRef.current();
      api.setToken(token);
      await api.updateScript(scriptId, {
        voice: selectedVoice.vapiVoiceId as any,
      });
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update voice";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }, [scriptId, selectedVoice, hasChanges, navigation]);

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
        <Text style={styles.headerTitle}>Change Voice</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>
          Pick the voice your AI agent will use on calls.
        </Text>
      </View>

      {/* Voice cards */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {VOICE_OPTIONS.map((voice) => {
          const isSelected = selectedVoice?.id === voice.id;
          return (
            <TouchableOpacity
              key={voice.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              activeOpacity={0.7}
              onPress={() => setSelectedVoice(voice)}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTop}>
                    <Text
                      style={[
                        styles.voiceName,
                        isSelected && styles.voiceNameSelected,
                      ]}
                    >
                      {voice.name}
                    </Text>
                    <View
                      style={[
                        styles.genderTag,
                        voice.gender === "female"
                          ? styles.genderFemale
                          : styles.genderMale,
                      ]}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          voice.gender === "female"
                            ? styles.genderTextFemale
                            : styles.genderTextMale,
                        ]}
                      >
                        {voice.gender === "female" ? "Female" : "Male"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.voiceDescription}>
                    {voice.description}
                  </Text>
                </View>
              </View>

              {/* Selection indicator */}
              <View
                style={[
                  styles.radioOuter,
                  isSelected && styles.radioOuterSelected,
                ]}
              >
                {isSelected && <View style={styles.radioInner} />}
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

  // Voice card
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  cardRow: {
    flex: 1,
  },
  cardInfo: {
    flex: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  voiceNameSelected: {
    color: colors.primaryLight,
  },
  genderTag: {
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
  genderText: {
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

  // Radio indicator
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
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
