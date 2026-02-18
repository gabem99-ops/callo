"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { label: "Industry", number: 1 },
  { label: "Use Cases", number: 2 },
  { label: "Details", number: 3 },
  { label: "Voice", number: 4 },
  { label: "Launch", number: 5 },
] as const;

interface OnboardingShellProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
  isSubmitting?: boolean;
  nextLabel?: string;
  children: React.ReactNode;
}

export function OnboardingShell({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  canProceed,
  isSubmitting = false,
  nextLabel,
  children,
}: OnboardingShellProps) {
  // Step 0 is welcome — no progress bar
  const showProgress = currentStep > 0 && currentStep <= STEPS.length;

  return (
    <div className="relative min-h-screen flex flex-col items-center bg-[#09090B]">
      {/* Background grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Radial glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-400">
            Callo
          </h1>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
              {STEPS.map((step, index) => {
                const stepNum = index + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                return (
                  <div key={step.label} className="flex items-center gap-2">
                    <div
                      className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
                        ${
                          isCompleted
                            ? "bg-indigo-600 text-white"
                            : isActive
                            ? "bg-indigo-600/20 border-2 border-indigo-500 text-indigo-400"
                            : "bg-zinc-800 text-zinc-500"
                        }
                      `}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`text-sm transition-colors duration-300 hidden sm:inline ${
                        isActive || isCompleted
                          ? "text-zinc-300 font-medium"
                          : "text-zinc-600"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                initial={false}
                animate={{
                  width: `${(currentStep / STEPS.length) * 100}%`,
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>
          </div>
        )}

        {/* Step Content */}
        {children}

        {/* Navigation Buttons */}
        {currentStep > 0 && currentStep <= STEPS.length && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={currentStep <= 1}
              className={currentStep <= 1 ? "invisible" : ""}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={onNext}
              disabled={!canProceed || isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </span>
              ) : (
                <>
                  {nextLabel || "Continue"}
                  {!nextLabel && <ArrowRight className="w-4 h-4 ml-2" />}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
