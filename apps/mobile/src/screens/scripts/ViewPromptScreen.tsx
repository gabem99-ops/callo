// ---------------------------------------------------------------------------
// ViewPromptScreen — read-only view of the full system prompt with copy.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Copy, Check } from "lucide-react-native";

import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { ScriptStackParamList } from "@/navigation/ScriptStack";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<ScriptStackParamList, "ViewPrompt">;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function ViewPromptScreen({ navigation, route }: Props) {
  const { scriptId } = route.params;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // -- Fetch system prompt ----------------------------------------------------

  const fetchPrompt = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getTokenRef.current();
      api.setToken(token);

      // Try preview endpoint first (returns generated prompt), fall back to script
      try {
        const preview = await api.previewScript(scriptId);
        setPrompt(preview.data.systemPrompt);
      } catch {
        const result = await api.getScript(scriptId);
        setPrompt(result.data.systemPrompt);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load prompt";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  // -- Copy to clipboard ------------------------------------------------------

  const handleCopy = useCallback(async () => {
    if (!prompt) return;
    try {
      // Use the Share API as a cross-platform copy/share mechanism
      const result = await Share.share({ message: prompt });
      if (result.action === Share.sharedAction) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled or share failed — ignore
    }
  }, [prompt]);

  // -- Loading ----------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>System Prompt</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  // -- Render -----------------------------------------------------------------

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
        <Text style={styles.headerTitle}>System Prompt</Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={handleCopy}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {copied ? (
            <Check size={20} color={colors.success} />
          ) : (
            <Copy size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Prompt content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.promptCard}>
          <Text style={styles.promptText} selectable>
            {prompt ?? "No system prompt available."}
          </Text>
        </View>
      </ScrollView>

      {/* Copy button at bottom */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, copied && styles.footerButtonCopied]}
          activeOpacity={0.8}
          onPress={handleCopy}
        >
          {copied ? (
            <>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.footerButtonText}>Copied!</Text>
            </>
          ) : (
            <>
              <Copy size={18} color="#FFFFFF" />
              <Text style={styles.footerButtonText}>Copy / Share Prompt</Text>
            </>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  copyButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl + 60,
  },

  // Prompt card
  promptCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  promptText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    gap: spacing.sm,
  },
  footerButtonCopied: {
    backgroundColor: colors.success,
  },
  footerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
