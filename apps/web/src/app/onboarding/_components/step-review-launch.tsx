"use client";

import { useState } from "react";
import {
  getTemplateById,
  interpolateTemplate,
  VOICE_OPTIONS,
  USE_CASE_OPTIONS,
} from "@callo/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, Globe, Mic, Pencil, Check } from "lucide-react";

interface StepReviewLaunchProps {
  industryId: string;
  useCases: string[];
  businessName: string;
  phone: string;
  timezone: string;
  voiceId: string;
  greetingOverride: string;
  onChangeGreeting: (value: string) => void;
}

export function StepReviewLaunch({
  industryId,
  useCases,
  businessName,
  phone,
  timezone,
  voiceId,
  greetingOverride,
  onChangeGreeting,
}: StepReviewLaunchProps) {
  const [editingGreeting, setEditingGreeting] = useState(false);

  const template = getTemplateById(industryId);
  const voice = VOICE_OPTIONS.find((v) => v.id === voiceId);
  const defaultGreeting = template
    ? interpolateTemplate(template.greeting, businessName)
    : "";
  const currentGreeting = greetingOverride.trim() || defaultGreeting;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Review &amp; Launch
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Everything looks good? Hit Activate to bring your AI agent to
              life.
            </p>
          </div>

          {/* Business Info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Business
            </h3>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="text-sm text-white">{businessName}</span>
            </div>
            {phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="text-sm text-zinc-300">{phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="text-sm text-zinc-300">{timezone}</span>
            </div>
          </div>

          {/* Industry & Voice */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Industry
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-lg">{template?.emoji}</span>
                <span className="text-sm text-white">{template?.label}</span>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Voice
              </h3>
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-white">{voice?.name}</span>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
              AI Capabilities
            </h3>
            <div className="flex flex-wrap gap-2">
              {useCases.map((ucId) => {
                const uc = USE_CASE_OPTIONS.find((u) => u.id === ucId);
                return uc ? (
                  <Badge key={ucId} variant="secondary">
                    <Check className="w-3 h-3 mr-1" />
                    {uc.label}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>

          {/* Greeting Preview */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                AI Greeting
              </h3>
              <button
                type="button"
                onClick={() => setEditingGreeting(!editingGreeting)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                {editingGreeting ? "Done" : "Edit"}
              </button>
            </div>
            {editingGreeting ? (
              <Textarea
                value={greetingOverride || currentGreeting}
                onChange={(e) => onChangeGreeting(e.target.value)}
                rows={3}
                className="text-sm"
                placeholder={defaultGreeting}
              />
            ) : (
              <p className="text-sm text-zinc-200 leading-relaxed italic">
                &ldquo;{currentGreeting}&rdquo;
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
