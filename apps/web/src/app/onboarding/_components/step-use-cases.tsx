"use client";

import {
  USE_CASE_OPTIONS,
  getTemplateById,
} from "@callo/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

interface StepUseCasesProps {
  industryId: string;
  selected: string[];
  onToggle: (id: string) => void;
}

export function StepUseCases({
  industryId,
  selected,
  onToggle,
}: StepUseCasesProps) {
  const template = getTemplateById(industryId);
  const defaults = template?.defaultUseCases ?? [];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              What should your AI handle?
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              We&apos;ve pre-selected what works best for your industry. Adjust
              as needed.
            </p>
          </div>

          <div className="space-y-3">
            {USE_CASE_OPTIONS.map((useCase) => {
              const isSelected = selected.includes(useCase.id);
              return (
                <button
                  key={useCase.id}
                  type="button"
                  onClick={() => onToggle(useCase.id)}
                  className={`flex items-center w-full gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/5"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-2 border-zinc-700 bg-transparent"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isSelected ? "text-white" : "text-zinc-300"
                      }`}
                    >
                      {useCase.label}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {useCase.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
