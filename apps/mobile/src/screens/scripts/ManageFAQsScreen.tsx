// ---------------------------------------------------------------------------
// ManageFAQsScreen — list, add, edit, and delete FAQs for a script.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit3,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";

import type { FAQ } from "@callo/shared";
import { api } from "@/lib/api";
import { colors, spacing, borderRadius } from "@/lib/theme";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { ScriptStackParamList } from "@/navigation/ScriptStack";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<ScriptStackParamList, "ManageFAQs">;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function ManageFAQsScreen({ navigation, route }: Props) {
  const { scriptId } = route.params;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // -- Fetch FAQs -------------------------------------------------------------

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getTokenRef.current();
      api.setToken(token);
      const result = await api.getScript(scriptId);
      setFaqs(result.data.faqs ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load FAQs";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // -- Save FAQs to server ----------------------------------------------------

  const saveFaqs = useCallback(
    async (updatedFaqs: FAQ[]) => {
      setSaving(true);
      try {
        const token = await getTokenRef.current();
        api.setToken(token);
        const result = await api.updateScript(scriptId, { faqs: updatedFaqs });
        setFaqs(result.data.faqs ?? []);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to save FAQs";
        Alert.alert("Error", message);
      } finally {
        setSaving(false);
      }
    },
    [scriptId],
  );

  // -- Toggle expand -----------------------------------------------------------

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  // -- Delete FAQ --------------------------------------------------------------

  const handleDelete = useCallback(
    (index: number) => {
      Alert.alert("Delete FAQ", "Are you sure you want to delete this FAQ?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updated = faqs.filter((_, i) => i !== index);
            setFaqs(updated);
            setExpandedIndex(null);
            saveFaqs(updated);
          },
        },
      ]);
    },
    [faqs, saveFaqs],
  );

  // -- Open modal for add/edit -------------------------------------------------

  const openAddModal = () => {
    setEditIndex(null);
    setQuestion("");
    setAnswer("");
    setModalVisible(true);
  };

  const openEditModal = (index: number) => {
    setEditIndex(index);
    setQuestion(faqs[index].question);
    setAnswer(faqs[index].answer);
    setModalVisible(true);
  };

  const handleModalSave = () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert("Missing Fields", "Both question and answer are required.");
      return;
    }

    let updated: FAQ[];
    if (editIndex !== null) {
      updated = faqs.map((faq, i) =>
        i === editIndex
          ? { question: question.trim(), answer: answer.trim() }
          : faq,
      );
    } else {
      updated = [...faqs, { question: question.trim(), answer: answer.trim() }];
    }

    setFaqs(updated);
    setModalVisible(false);
    saveFaqs(updated);
  };

  // -- Loading state -----------------------------------------------------------

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
          <Text style={styles.headerTitle}>Manage FAQs</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  // -- Render ------------------------------------------------------------------

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
        <Text style={styles.headerTitle}>Manage FAQs</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* FAQ list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {faqs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No FAQs yet</Text>
            <Text style={styles.emptySubtitle}>
              Add frequently asked questions so your AI agent can answer them
              automatically.
            </Text>
          </View>
        ) : (
          faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={index} style={styles.faqCard}>
                {/* Question row (tap to expand) */}
                <TouchableOpacity
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleExpand(index)}
                >
                  <Text style={styles.faqQuestion} numberOfLines={isExpanded ? undefined : 2}>
                    {faq.question}
                  </Text>
                  {isExpanded ? (
                    <ChevronUp size={18} color={colors.textMuted} />
                  ) : (
                    <ChevronDown size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {/* Expanded answer + actions */}
                {isExpanded && (
                  <View style={styles.faqExpanded}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    <View style={styles.faqActions}>
                      <TouchableOpacity
                        style={styles.faqActionButton}
                        activeOpacity={0.7}
                        onPress={() => openEditModal(index)}
                      >
                        <Edit3 size={14} color={colors.primary} />
                        <Text style={styles.faqActionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.faqActionButton}
                        activeOpacity={0.7}
                        onPress={() => handleDelete(index)}
                      >
                        <Trash2 size={14} color={colors.error} />
                        <Text style={[styles.faqActionText, { color: colors.error }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Saving indicator */}
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      {/* Add FAQ floating button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={openAddModal}
        >
          <Plus size={22} color="#FFFFFF" />
          <Text style={styles.fabText}>Add FAQ</Text>
        </TouchableOpacity>
      </View>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editIndex !== null ? "Edit FAQ" : "Add FAQ"}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Modal form */}
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentInner}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>Question</Text>
              <TextInput
                style={styles.input}
                value={question}
                onChangeText={setQuestion}
                placeholder="e.g. What are your hours?"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>
                Answer
              </Text>
              <TextInput
                style={[styles.input, styles.inputLarge]}
                value={answer}
                onChangeText={setAnswer}
                placeholder="e.g. We're open Monday through Friday, 9am to 5pm."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>

            {/* Modal footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!question.trim() || !answer.trim()) &&
                    styles.saveButtonDisabled,
                ]}
                activeOpacity={0.8}
                disabled={!question.trim() || !answer.trim()}
                onPress={handleModalSave}
              >
                <Text style={styles.saveButtonText}>
                  {editIndex !== null ? "Save Changes" : "Add FAQ"}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingTop: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // FAQ card
  faqCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 22,
  },
  faqExpanded: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  faqActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  faqActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  faqActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },

  // Saving overlay
  savingOverlay: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  savingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // FAB
  fabContainer: {
    position: "absolute",
    bottom: spacing.xl + 40,
    left: spacing.md,
    right: spacing.md,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    gap: spacing.sm,
  },
  fabText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    minHeight: 56,
  },
  inputLarge: {
    minHeight: 120,
  },
  modalFooter: {
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
