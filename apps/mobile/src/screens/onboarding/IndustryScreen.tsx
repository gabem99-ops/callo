import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { INDUSTRY_TEMPLATES } from "@callo/shared";
import type { OnboardingStackParamList } from "@/navigation/OnboardingStack";
import { colors, spacing, borderRadius } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<OnboardingStackParamList, "Industry">;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function IndustryScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>What's your industry?</Text>
        <Text style={styles.subtitle}>
          We'll tailor your AI agent to your business.
        </Text>
      </View>

      {/* Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {INDUSTRY_TEMPLATES.map((template) => {
          const isSelected = selected === template.id;
          return (
            <View key={template.id} style={styles.cardWrapper}>
              <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected]}
                activeOpacity={0.7}
                onPress={() => setSelected(template.id)}
              >
                <Text style={styles.emoji}>{template.emoji}</Text>
                <Text
                  style={[
                    styles.cardLabel,
                    isSelected && styles.cardLabelSelected,
                  ]}
                  numberOfLines={2}
                >
                  {template.label}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !selected && styles.buttonDisabled]}
          activeOpacity={0.8}
          disabled={!selected}
          onPress={() => {
            if (selected) {
              navigation.navigate("UseCases", { industryId: selected });
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  cardWrapper: {
    width: "50%",
    padding: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  emoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  cardLabelSelected: {
    color: colors.primaryLight,
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
