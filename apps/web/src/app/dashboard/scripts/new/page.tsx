"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  ArrowDownLeft,
  ArrowUpRight,
  Mic,
  MessageSquare,
  HelpCircle,
  CalendarCheck,
  PhoneForwarded,
  ClipboardList,
  Eye,
  Sparkles,
  Settings,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface QualQuestion {
  id: string;
  question: string;
}

interface ScriptFormData {
  name: string;
  type: "inbound" | "outbound";
  voice: string;
  tone: string;
  greeting: string;
  systemPrompt: string;
  faqs: FAQ[];
  appointmentEnabled: boolean;
  appointmentInstructions: string;
  transferEnabled: boolean;
  transferPhone: string;
  transferConditions: string;
  escalationMessage: string;
  qualificationQuestions: QualQuestion[];
}

interface SimpleFormData {
  name: string;
  businessDescription: string;
  greeting: string;
  commonQuestions: string;
  bookingEnabled: boolean;
  bookingInstructions: string;
  transferEnabled: boolean;
  transferConditions: string;
  transferPhone: string;
  voiceStyle: "professional" | "friendly" | "concise";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const voiceOptions = [
  "alloy",
  "echo",
  "shimmer",
  "ash",
  "ballad",
  "coral",
  "sage",
  "verse",
];

const toneOptions = ["professional", "friendly", "casual", "formal"];

const voiceStyleOptions: {
  value: SimpleFormData["voiceStyle"];
  label: string;
  description: string;
}[] = [
  { value: "professional", label: "Professional", description: "Clear and business-like" },
  { value: "friendly", label: "Friendly", description: "Warm and casual" },
  { value: "concise", label: "Concise", description: "Quick and to-the-point" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _faqCounter = 0;
function newFaqId() {
  return `faq_${++_faqCounter}`;
}

let _qualCounter = 0;
function newQualId() {
  return `qual_${++_qualCounter}`;
}

function buildPreview(data: ScriptFormData): string {
  const lines: string[] = [];

  lines.push(`# Script: ${data.name || "(untitled)"}`);
  lines.push(`Type: ${data.type} | Voice: ${data.voice} | Tone: ${data.tone}`);
  lines.push("");

  if (data.greeting) {
    lines.push("## Greeting");
    lines.push(data.greeting);
    lines.push("");
  }

  if (data.systemPrompt) {
    lines.push("## System Instructions");
    lines.push(data.systemPrompt);
    lines.push("");
  }

  if (data.faqs.length > 0) {
    lines.push("## FAQs");
    data.faqs.forEach((faq, i) => {
      if (faq.question || faq.answer) {
        lines.push(`Q${i + 1}: ${faq.question}`);
        lines.push(`A${i + 1}: ${faq.answer}`);
        lines.push("");
      }
    });
  }

  if (data.appointmentEnabled) {
    lines.push("## Appointment Booking (enabled)");
    if (data.appointmentInstructions) {
      lines.push(data.appointmentInstructions);
    }
    lines.push("");
  }

  if (data.transferEnabled) {
    lines.push("## Call Transfer (enabled)");
    if (data.transferPhone) lines.push(`Transfer to: ${data.transferPhone}`);
    if (data.transferConditions) lines.push(`Conditions: ${data.transferConditions}`);
    if (data.escalationMessage) lines.push(`Escalation msg: ${data.escalationMessage}`);
    lines.push("");
  }

  if (data.qualificationQuestions.length > 0) {
    lines.push("## Qualification Questions");
    data.qualificationQuestions.forEach((q, i) => {
      if (q.question) lines.push(`${i + 1}. ${q.question}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function simpleToScriptData(simple: SimpleFormData): ScriptFormData {
  // Parse common questions from textarea (split by newlines)
  const questionLines = simple.commonQuestions
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const faqs: FAQ[] = questionLines.map((question) => ({
    id: newFaqId(),
    question,
    answer: "Answer based on the business description provided above.",
  }));

  // Map voice style to tone
  const toneMap: Record<SimpleFormData["voiceStyle"], string> = {
    professional: "professional",
    friendly: "friendly",
    concise: "formal",
  };

  return {
    name: simple.name,
    type: "inbound",
    voice: "alloy",
    tone: toneMap[simple.voiceStyle],
    greeting: simple.greeting,
    systemPrompt: simple.businessDescription,
    faqs,
    appointmentEnabled: simple.bookingEnabled,
    appointmentInstructions: simple.bookingInstructions,
    transferEnabled: simple.transferEnabled,
    transferPhone: simple.transferPhone,
    transferConditions: simple.transferConditions,
    escalationMessage: "",
    qualificationQuestions: [],
  };
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-300">
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-zinc-500">{children}</p>;
}

function SimpleHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-sm text-zinc-500">{children}</p>;
}

function Textarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  className: extraClassName,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`flex w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none ${extraClassName ?? ""}`}
    />
  );
}

function Select({
  id,
  value,
  onChange,
  options,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 text-sm"
    >
      {enabled ? (
        <ToggleRight className="h-6 w-6 text-indigo-400" />
      ) : (
        <ToggleLeft className="h-6 w-6 text-zinc-600" />
      )}
      <span className={enabled ? "text-white" : "text-zinc-400"}>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Simple Mode Form
// ---------------------------------------------------------------------------

function SimpleForm({
  simpleForm,
  setSimpleForm,
  onSubmit,
}: {
  simpleForm: SimpleFormData;
  setSimpleForm: React.Dispatch<React.SetStateAction<SimpleFormData>>;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const updateSimple = <K extends keyof SimpleFormData>(
    key: K,
    value: SimpleFormData[K]
  ) => setSimpleForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={onSubmit}>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* 1. Name your AI agent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Name your AI agent</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={simpleForm.name}
              onChange={(e) => updateSimple("name", e.target.value)}
              placeholder="e.g., Reception Agent, Sales Assistant"
              className="h-12 text-base"
            />
          </CardContent>
        </Card>

        {/* 2. What does your business do? */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">
              What does your business do?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={simpleForm.businessDescription}
              onChange={(v) => updateSimple("businessDescription", v)}
              placeholder="We're a dental office that offers cleanings, fillings, cosmetic dentistry, and emergency dental care. We're open Monday-Friday 8am-5pm."
              rows={4}
              className="text-base px-4 py-3"
            />
            <SimpleHint>
              This helps your AI answer questions about your business
            </SimpleHint>
          </CardContent>
        </Card>

        {/* 3. How should your AI greet callers? */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">
              How should your AI greet callers?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={simpleForm.greeting}
              onChange={(e) => updateSimple("greeting", e.target.value)}
              placeholder="Hi, thanks for calling [business name]! How can I help you today?"
              className="h-12 text-base"
            />
            <SimpleHint>This is the first thing callers hear</SimpleHint>
          </CardContent>
        </Card>

        {/* 4. Common questions from callers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Common questions from callers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={simpleForm.commonQuestions}
              onChange={(v) => updateSimple("commonQuestions", v)}
              placeholder={"What are your hours?\nHow much does a consultation cost?\nDo you take insurance?\nWhere are you located?"}
              rows={5}
              className="text-base px-4 py-3"
            />
            <SimpleHint>
              Type one question per line. Your AI will learn to answer these based on
              your business description.
            </SimpleHint>
          </CardContent>
        </Card>

        {/* 5. Can your AI book appointments? */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Can your AI book appointments?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              enabled={simpleForm.bookingEnabled}
              onToggle={() =>
                updateSimple("bookingEnabled", !simpleForm.bookingEnabled)
              }
              label={simpleForm.bookingEnabled ? "Yes, enable booking" : "No, not right now"}
            />
            {simpleForm.bookingEnabled && (
              <div>
                <Label htmlFor="simpleBookingInstructions">
                  Booking instructions
                </Label>
                <div className="mt-1.5">
                  <Textarea
                    id="simpleBookingInstructions"
                    value={simpleForm.bookingInstructions}
                    onChange={(v) => updateSimple("bookingInstructions", v)}
                    placeholder="Appointments are 30 minutes. Available Mon-Fri 9am-4pm. Ask for the caller's name and preferred time."
                    rows={3}
                    className="text-base px-4 py-3"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. Transfer calls to you when needed? */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Transfer calls to you when needed?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              enabled={simpleForm.transferEnabled}
              onToggle={() =>
                updateSimple("transferEnabled", !simpleForm.transferEnabled)
              }
              label={simpleForm.transferEnabled ? "Yes, enable transfers" : "No, not right now"}
            />
            {simpleForm.transferEnabled && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="simpleTransferConditions">When to transfer</Label>
                  <div className="mt-1.5">
                    <Input
                      id="simpleTransferConditions"
                      value={simpleForm.transferConditions}
                      onChange={(e) =>
                        updateSimple("transferConditions", e.target.value)
                      }
                      placeholder="When the caller asks to speak to someone or has a billing question"
                      className="h-12 text-base"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="simpleTransferPhone">Your phone number</Label>
                  <div className="mt-1.5">
                    <Input
                      id="simpleTransferPhone"
                      value={simpleForm.transferPhone}
                      onChange={(e) =>
                        updateSimple("transferPhone", e.target.value)
                      }
                      placeholder="+1 (555) 000-0000"
                      className="h-12 text-base"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 7. Voice style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Voice style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {voiceStyleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateSimple("voiceStyle", option.value)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    simpleForm.voiceStyle === option.value
                      ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <div
                    className={`text-sm font-semibold ${
                      simpleForm.voiceStyle === option.value
                        ? "text-indigo-300"
                        : "text-zinc-200"
                    }`}
                  >
                    {option.label}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" className="w-full h-14 text-base font-semibold" size="lg">
          Create AI Agent
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewScriptPage() {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");

  // -- Advanced mode state --
  const [form, setForm] = useState<ScriptFormData>({
    name: "",
    type: "inbound",
    voice: "alloy",
    tone: "professional",
    greeting: "",
    systemPrompt: "",
    faqs: [],
    appointmentEnabled: false,
    appointmentInstructions: "",
    transferEnabled: false,
    transferPhone: "",
    transferConditions: "",
    escalationMessage: "",
    qualificationQuestions: [],
  });

  // -- Simple mode state --
  const [simpleForm, setSimpleForm] = useState<SimpleFormData>({
    name: "",
    businessDescription: "",
    greeting: "Hi, thanks for calling! How can I help you today?",
    commonQuestions: "",
    bookingEnabled: false,
    bookingInstructions: "",
    transferEnabled: false,
    transferConditions: "",
    transferPhone: "",
    voiceStyle: "professional",
  });

  const update = <K extends keyof ScriptFormData>(key: K, value: ScriptFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // FAQ helpers
  const addFaq = () => {
    if (form.faqs.length >= 20) return;
    update("faqs", [...form.faqs, { id: newFaqId(), question: "", answer: "" }]);
  };
  const updateFaq = (id: string, field: "question" | "answer", value: string) => {
    update(
      "faqs",
      form.faqs.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };
  const removeFaq = (id: string) => {
    update(
      "faqs",
      form.faqs.filter((f) => f.id !== id)
    );
  };

  // Qualification helpers
  const addQualQuestion = () => {
    update("qualificationQuestions", [
      ...form.qualificationQuestions,
      { id: newQualId(), question: "" },
    ]);
  };
  const updateQualQuestion = (id: string, value: string) => {
    update(
      "qualificationQuestions",
      form.qualificationQuestions.map((q) =>
        q.id === id ? { ...q, question: value } : q
      )
    );
  };
  const removeQualQuestion = (id: string) => {
    update(
      "qualificationQuestions",
      form.qualificationQuestions.filter((q) => q.id !== id)
    );
  };

  // Preview
  const preview = useMemo(() => buildPreview(form), [form]);

  const handleAdvancedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Create Script:", form);
  };

  const handleSimpleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scriptData = simpleToScriptData(simpleForm);
    console.log("Create Script (from Simple Mode):", scriptData);
  };

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/dashboard/scripts"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scripts
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-white">
          {mode === "simple" ? "Create AI Agent" : "Create New Script"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === "simple"
            ? "Set up your AI phone agent in just a few steps"
            : "Configure your AI voice agent\u0027s behavior and responses"}
        </p>

        {/* Mode toggle */}
        <div className="mt-4 inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          <button
            type="button"
            onClick={() => setMode("simple")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "simple"
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Simple Mode
          </button>
          <button
            type="button"
            onClick={() => setMode("advanced")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "advanced"
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Advanced Mode
          </button>
        </div>
      </div>

      {/* ---------- Simple Mode ---------- */}
      {mode === "simple" && (
        <SimpleForm
          simpleForm={simpleForm}
          setSimpleForm={setSimpleForm}
          onSubmit={handleSimpleSubmit}
        />
      )}

      {/* ---------- Advanced Mode ---------- */}
      {mode === "advanced" && (
        <form onSubmit={handleAdvancedSubmit}>
          {/* Main layout: form + sidebar */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* ---------- Form Column (2/3) ---------- */}
            <div className="space-y-6 xl:col-span-2">
              {/* 1. Basics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-indigo-400" />
                    Basics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Script Name */}
                  <div>
                    <Label htmlFor="name">Script Name</Label>
                    <div className="mt-1.5">
                      <Input
                        id="name"
                        placeholder="e.g. Inbound Receptionist"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <Label>Type</Label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => update("type", "inbound")}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                          form.type === "inbound"
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <ArrowDownLeft className="h-4 w-4" />
                        Inbound
                      </button>
                      <button
                        type="button"
                        onClick={() => update("type", "outbound")}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                          form.type === "outbound"
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        Outbound
                      </button>
                    </div>
                  </div>

                  {/* Voice + Tone */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="voice">AI Voice</Label>
                      <div className="mt-1.5">
                        <Select
                          id="voice"
                          value={form.voice}
                          onChange={(v) => update("voice", v)}
                          options={voiceOptions}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="tone">Tone</Label>
                      <div className="mt-1.5">
                        <Select
                          id="tone"
                          value={form.tone}
                          onChange={(v) => update("tone", v)}
                          options={toneOptions}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Greeting & Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-400" />
                    Greeting & Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label htmlFor="greeting">Greeting Message</Label>
                    <Hint>What should the AI say when it answers?</Hint>
                    <div className="mt-1.5">
                      <Textarea
                        id="greeting"
                        value={form.greeting}
                        onChange={(v) => update("greeting", v)}
                        placeholder="e.g. Thank you for calling Acme Corp. How can I help you today?"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="systemPrompt">Custom System Prompt</Label>
                    <Hint>Additional instructions for the AI agent</Hint>
                    <div className="mt-1.5">
                      <Textarea
                        id="systemPrompt"
                        value={form.systemPrompt}
                        onChange={(v) => update("systemPrompt", v)}
                        placeholder="e.g. You are a friendly receptionist for a dental office. Always confirm spelling of names..."
                        rows={6}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. FAQs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-indigo-400" />
                      FAQs
                    </CardTitle>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addFaq}
                      disabled={form.faqs.length >= 20}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add FAQ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {form.faqs.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      No FAQs added yet. Click &quot;Add FAQ&quot; to get started.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {form.faqs.map((faq, i) => (
                        <div
                          key={faq.id}
                          className="relative rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
                        >
                          <button
                            type="button"
                            onClick={() => removeFaq(faq.id)}
                            className="absolute right-3 top-3 rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="space-y-3 pr-8">
                            <div>
                              <Label>Question {i + 1}</Label>
                              <div className="mt-1">
                                <Input
                                  placeholder="e.g. What are your business hours?"
                                  value={faq.question}
                                  onChange={(e) =>
                                    updateFaq(faq.id, "question", e.target.value)
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Answer</Label>
                              <div className="mt-1">
                                <Textarea
                                  value={faq.answer}
                                  onChange={(v) => updateFaq(faq.id, "answer", v)}
                                  placeholder="e.g. We're open Monday through Friday, 9 AM to 5 PM."
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 4. Appointment Booking */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-indigo-400" />
                    Appointment Booking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Toggle
                    enabled={form.appointmentEnabled}
                    onToggle={() =>
                      update("appointmentEnabled", !form.appointmentEnabled)
                    }
                    label="Enable appointment booking"
                  />
                  {form.appointmentEnabled && (
                    <div>
                      <Label htmlFor="apptInstructions">Booking Instructions</Label>
                      <Hint>
                        Describe how the AI should handle appointment scheduling
                      </Hint>
                      <div className="mt-1.5">
                        <Textarea
                          id="apptInstructions"
                          value={form.appointmentInstructions}
                          onChange={(v) => update("appointmentInstructions", v)}
                          placeholder="e.g. Check available slots in the calendar and offer the caller 3 options..."
                          rows={4}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 5. Call Transfer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PhoneForwarded className="h-5 w-5 text-indigo-400" />
                    Call Transfer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Toggle
                    enabled={form.transferEnabled}
                    onToggle={() =>
                      update("transferEnabled", !form.transferEnabled)
                    }
                    label="Enable call transfer"
                  />
                  {form.transferEnabled && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="transferPhone">Transfer Phone Number</Label>
                        <div className="mt-1.5">
                          <Input
                            id="transferPhone"
                            placeholder="+1 (555) 000-0000"
                            value={form.transferPhone}
                            onChange={(e) =>
                              update("transferPhone", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="transferConditions">
                          Transfer Conditions
                        </Label>
                        <Hint>
                          When should the AI transfer the call?
                        </Hint>
                        <div className="mt-1.5">
                          <Textarea
                            id="transferConditions"
                            value={form.transferConditions}
                            onChange={(v) => update("transferConditions", v)}
                            placeholder="e.g. Transfer when the caller asks to speak with a human, or when the issue cannot be resolved..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="escalationMessage">
                          Escalation Message
                        </Label>
                        <Hint>
                          What should the AI say before transferring?
                        </Hint>
                        <div className="mt-1.5">
                          <Textarea
                            id="escalationMessage"
                            value={form.escalationMessage}
                            onChange={(v) => update("escalationMessage", v)}
                            placeholder="e.g. Let me connect you with a team member who can help..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 6. Lead Qualification (outbound) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-indigo-400" />
                      Lead Qualification
                    </CardTitle>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addQualQuestion}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Question
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Define questions your AI agent should ask to qualify leads
                    {form.type === "inbound" && " (typically used for outbound scripts)"}
                  </p>
                </CardHeader>
                <CardContent>
                  {form.qualificationQuestions.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      No qualification questions added yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {form.qualificationQuestions.map((q, i) => (
                        <div key={q.id} className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-medium text-zinc-400">
                            {i + 1}
                          </span>
                          <Input
                            placeholder="e.g. What is your current monthly budget?"
                            value={q.question}
                            onChange={(e) =>
                              updateQualQuestion(q.id, e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => removeQualQuestion(q.id)}
                            className="shrink-0 rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ---------- Right Sidebar (1/3) ---------- */}
            <div className="xl:col-span-1">
              <div className="sticky top-8 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Eye className="h-4 w-4 text-indigo-400" />
                      Live Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[600px] overflow-y-auto rounded-lg border border-zinc-800 bg-[#09090B] p-4">
                      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-400">
                        {preview}
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full" size="lg">
                  Create Script
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
