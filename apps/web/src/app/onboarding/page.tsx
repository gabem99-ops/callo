"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { getTemplateById } from "@callo/shared";
import { useCompleteOnboarding } from "@/lib/hooks";

import { OnboardingShell } from "./_components/onboarding-shell";
import { StepWelcome } from "./_components/step-welcome";
import { StepIndustry } from "./_components/step-industry";
import { StepUseCases } from "./_components/step-use-cases";
import { StepBusinessDetails } from "./_components/step-business-details";
import { StepVoiceSelection } from "./_components/step-voice-selection";
import { StepReviewLaunch } from "./_components/step-review-launch";
import { CompletionScreen } from "./_components/completion-screen";

/* ── Animation ───────────────────────────────────────── */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

/* ── Form State ──────────────────────────────────────── */

interface OnboardingState {
  industryId: string;
  useCases: string[];
  businessName: string;
  phone: string;
  timezone: string;
  showTimezoneSelect: boolean;
  voiceId: string;
  greetingOverride: string;
}

/* ── Page ─────────────────────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter();
  const { mutate: completeOnboarding } = useCompleteOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detectedTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/New_York";
    }
  });

  const [state, setState] = useState<OnboardingState>({
    industryId: "",
    useCases: [],
    businessName: "",
    phone: "",
    timezone: detectedTimezone,
    showTimezoneSelect: false,
    voiceId: "aria",
    greetingOverride: "",
  });

  /* ── State updaters ─────────────────────────────── */

  const updateState = useCallback(
    <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const selectIndustry = useCallback(
    (id: string) => {
      const template = getTemplateById(id);
      setState((prev) => ({
        ...prev,
        industryId: id,
        useCases: template?.defaultUseCases ?? prev.useCases,
      }));
    },
    []
  );

  const toggleUseCase = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      useCases: prev.useCases.includes(id)
        ? prev.useCases.filter((uc) => uc !== id)
        : [...prev.useCases, id],
    }));
  }, []);

  /* ── Navigation ─────────────────────────────────── */

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return state.industryId.length > 0;
      case 2:
        return state.useCases.length > 0;
      case 3:
        return state.businessName.trim().length > 0;
      case 4:
        return state.voiceId.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        industryTemplateId: state.industryId,
        useCases: state.useCases,
        businessName: state.businessName,
        phone: state.phone || undefined,
        timezone: state.timezone,
        voiceId: state.voiceId,
        greetingOverride: state.greetingOverride || undefined,
      });
      setCompleted(true);
    } catch (err) {
      console.error("Onboarding error:", err);
      // Still show completion — may have been partially created
      setCompleted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (currentStep === 5) {
      handleComplete();
      return;
    }
    setDirection(1);
    setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setCurrentStep((s) => s - 1);
  };

  /* ── Render ─────────────────────────────────────── */

  if (completed) {
    return (
      <CompletionScreen
        businessName={state.businessName}
        onDashboard={() => router.push("/dashboard")}
      />
    );
  }

  // Step 0: Welcome — full-screen, no shell
  if (currentStep === 0) {
    return <StepWelcome onStart={() => { setDirection(1); setCurrentStep(1); }} />;
  }

  return (
    <OnboardingShell
      currentStep={currentStep}
      totalSteps={5}
      onNext={goNext}
      onBack={goBack}
      canProceed={canProceed()}
      isSubmitting={isSubmitting}
      nextLabel={currentStep === 5 ? "Activate Agent" : undefined}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {currentStep === 1 && (
            <StepIndustry
              selected={state.industryId}
              onSelect={selectIndustry}
            />
          )}
          {currentStep === 2 && (
            <StepUseCases
              industryId={state.industryId}
              selected={state.useCases}
              onToggle={toggleUseCase}
            />
          )}
          {currentStep === 3 && (
            <StepBusinessDetails
              businessName={state.businessName}
              phone={state.phone}
              timezone={state.timezone}
              showTimezoneSelect={state.showTimezoneSelect}
              onChangeName={(v) => updateState("businessName", v)}
              onChangePhone={(v) => updateState("phone", v)}
              onChangeTimezone={(v) => updateState("timezone", v)}
              onToggleTimezoneSelect={(v) => updateState("showTimezoneSelect", v)}
            />
          )}
          {currentStep === 4 && (
            <StepVoiceSelection
              selected={state.voiceId}
              onSelect={(v) => updateState("voiceId", v)}
            />
          )}
          {currentStep === 5 && (
            <StepReviewLaunch
              industryId={state.industryId}
              useCases={state.useCases}
              businessName={state.businessName}
              phone={state.phone}
              timezone={state.timezone}
              voiceId={state.voiceId}
              greetingOverride={state.greetingOverride}
              onChangeGreeting={(v) => updateState("greetingOverride", v)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </OnboardingShell>
  );
}
