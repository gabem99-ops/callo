import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type BadgeVariant = "default" | "success" | "warning" | "error";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

// ---------------------------------------------------------------------------
// Variant colour mapping
// ---------------------------------------------------------------------------

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: {
    bg: "rgba(161, 161, 170, 0.15)",
    text: colors.textSecondary,
  },
  success: {
    bg: "rgba(16, 185, 129, 0.15)",
    text: colors.success,
  },
  warning: {
    bg: "rgba(245, 158, 11, 0.15)",
    text: colors.warning,
  },
  error: {
    bg: "rgba(244, 63, 94, 0.15)",
    text: colors.error,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Badge({ label, variant = "default" }: BadgeProps) {
  const { bg, text } = variantColors[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
