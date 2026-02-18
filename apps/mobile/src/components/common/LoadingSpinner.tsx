import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoadingSpinner({
  size = "large",
  color = colors.primary,
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
