// ---------------------------------------------------------------------------
// EditGreetingScreen — full-screen greeting editor with save functionality.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft } from "lucide-react-native";

import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";
import type { ScriptStackParamList } from "@/navigation/ScriptStack";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<ScriptStackParamList, "EditGreeting">;

const MAX_CHARACTERS = 500;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function EditGreetingScreen({ navigation, route }: Props) {
  const { scriptId, currentGreeting } = route.params;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [greeting, setGreeting] = useState(currentGreeting);
  const [saving, setSaving] = useState(false);

  const hasChanges = greeting !== currentGreeting;
  const characterCount = greeting.length;

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const token = await getTokenRef.current();
      api.setToken(token);
      await api.updateScript(scriptId, { greeting });
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save greeting";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }, [scriptId, greeting, hasChanges, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Greeting</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            This is what your AI says when it picks up the phone.
          </Text>

          <TextInput
            style={styles.textInput}
            value={greeting}
            onChangeText={(text) => {
              if (text.length <= MAX_CHARACTERS) {
                setGreeting(text);
              }
            }}
            multiline
            textAlignVertical="top"
            placeholder="Enter your greeting..."
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.charCount}>
            {characterCount}/{MAX_CHARACTERS}
          </Text>
        </View>

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
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
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

  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    maxHeight: 300,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: spacing.sm,
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
