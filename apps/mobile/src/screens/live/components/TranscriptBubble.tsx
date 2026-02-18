// ---------------------------------------------------------------------------
// TranscriptBubble — chat-style bubble for live transcript messages.
// AI = left / indigo, Caller = right / surface with border.
// ---------------------------------------------------------------------------

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors, spacing, borderRadius } from "../../../lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptBubbleProps {
  speaker: "ai" | "caller";
  text: string;
  timestamp: string; // ISO or display string
  callId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TranscriptBubble({
  speaker,
  text,
  timestamp,
}: TranscriptBubbleProps) {
  const isAI = speaker === "ai";

  // ---- Fade-in on mount ----
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim]);

  // ---- Format timestamp for display ----
  const displayTime = (() => {
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return timestamp;
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp;
    }
  })();

  return (
    <Animated.View
      style={[
        styles.container,
        isAI ? styles.containerLeft : styles.containerRight,
        {
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        },
      ]}
    >
      {/* Speaker label */}
      <Text style={[styles.speaker, isAI ? styles.speakerAI : styles.speakerCaller]}>
        {isAI ? "AI Agent" : "Caller"}
      </Text>

      {/* Bubble */}
      <View
        style={[
          styles.bubble,
          isAI ? styles.bubbleAI : styles.bubbleCaller,
        ]}
      >
        <Text style={styles.text}>{text}</Text>
      </View>

      {/* Timestamp */}
      <Text
        style={[
          styles.timestamp,
          isAI ? styles.timestampLeft : styles.timestampRight,
        ]}
      >
        {displayTime}
      </Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    maxWidth: "80%",
  },
  containerLeft: {
    alignSelf: "flex-start",
  },
  containerRight: {
    alignSelf: "flex-end",
  },
  speaker: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  speakerAI: {
    color: colors.primaryLight,
    marginLeft: spacing.xs,
  },
  speakerCaller: {
    color: colors.textMuted,
    marginRight: spacing.xs,
    textAlign: "right",
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bubbleAI: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    borderTopLeftRadius: borderRadius.sm,
  },
  bubbleCaller: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  timestampLeft: {
    marginLeft: spacing.xs,
  },
  timestampRight: {
    marginRight: spacing.xs,
    textAlign: "right",
  },
});
