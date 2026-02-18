import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  /** An optional Lucide icon element to render above the title. */
  iconElement?: React.ReactNode;
  title: string;
  description?: string;
  /** Kept for API compat if callers pass icon name strings. */
  icon?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({
  iconElement,
  title,
  description,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {iconElement && <View style={styles.iconWrapper}>{iconElement}</View>}
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl + spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconWrapper: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
