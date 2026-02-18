import React from "react";
import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { colors, spacing, borderRadius } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
});
