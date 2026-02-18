import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Audio } from "expo-av";
import { Play, Square } from "lucide-react-native";

import { VOICE_OPTIONS, type VoiceOption } from "@callo/shared";
import type { OnboardingStackParamList } from "@/navigation/OnboardingStack";
import { colors, spacing, borderRadius } from "@/lib/theme";

const PREVIEW_BASE_URL = "http://localhost:3000/audio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<
  OnboardingStackParamList,
  "VoiceSelection"
>;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function VoiceSelectionScreen({ navigation, route }: Props) {
  const { industryId, useCases, businessName, phone, timezone } = route.params;
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setPlayingId(null);
  };

  const playPreview = async (voice: VoiceOption) => {
    await stopAudio();
    if (playingId === voice.id) return; // was playing, now stopped

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: `${PREVIEW_BASE_URL}/voice-preview-${voice.id}.mp3` },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setPlayingId(voice.id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch {
      setPlayingId(null);
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const canContinue = selectedVoice !== null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose a voice</Text>
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
          const isSelected = selectedVoice === voice.id;
          const isPlaying = playingId === voice.id;
          return (
            <TouchableOpacity
              key={voice.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              activeOpacity={0.7}
              onPress={() => setSelectedVoice(voice.id)}
            >
              <View style={styles.cardRow}>
                {/* Play/Stop button */}
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    isPlaying && styles.playButtonActive,
                    isSelected && !isPlaying && styles.playButtonSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => playPreview(voice)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isPlaying ? (
                    <Square
                      size={12}
                      color="#FFFFFF"
                      fill="#FFFFFF"
                    />
                  ) : (
                    <Play
                      size={14}
                      color={isSelected ? colors.primaryLight : colors.textSecondary}
                      fill={isSelected ? colors.primaryLight : colors.textSecondary}
                    />
                  )}
                </TouchableOpacity>

                {/* Voice info */}
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          activeOpacity={0.8}
          disabled={!canContinue}
          onPress={() => {
            if (selectedVoice) {
              navigation.navigate("Review", {
                industryId,
                useCases,
                businessName,
                phone,
                timezone,
                voiceId: selectedVoice,
              });
            }
          }}
        >
          <Text style={styles.buttonText}>Continue</Text>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
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
    gap: 12,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
  playButtonSelected: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
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
    opacity: 0.5,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
