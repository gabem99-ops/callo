"use client";

import { INDUSTRY_TEMPLATES, type IndustryTemplate } from "@callo/shared";
import { Card, CardContent } from "@/components/ui/card";

interface StepIndustryProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function StepIndustry({ selected, onSelect }: StepIndustryProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              What industry are you in?
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              We&apos;ll tailor your AI agent with scripts, FAQs, and a greeting
              designed for your industry.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INDUSTRY_TEMPLATES.map((template: IndustryTemplate) => {
              const isSelected = selected === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelect(template.id)}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-200 ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <span className="text-2xl">{template.emoji}</span>
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-white" : "text-zinc-300"
                    }`}
                  >
                    {template.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
