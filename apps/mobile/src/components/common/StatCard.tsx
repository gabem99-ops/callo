import React from "react";
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { colors, spacing, borderRadius } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  /** Override colour of the value text. Defaults to textPrimary. */
  valueColor?: string;
  /** An optional Lucide icon element rendered in the top-right. */
  iconElement?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  valueColor,
  iconElement,
  style,
}: StatCardProps) {
  return (
    <View style={style}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {iconElement && <View style={styles.iconWrapper}>{iconElement}</View>}
        </View>
        <Text
          style={[styles.value, valueColor ? { color: valueColor } : undefined]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    flex: 1,
  },
  iconWrapper: {
    marginLeft: spacing.xs,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
