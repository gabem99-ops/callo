"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useScripts,
  usePhoneNumbers,
  useLeads,
  useCreateCampaign,
} from "@/lib/hooks";
import type { CreateCampaignInput, CampaignSchedule } from "@callo/shared";
import {
  ArrowLeft,
  Megaphone,
  FileText,
  Phone,
  Users,
  Clock,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function Label({
  children,
  htmlFor,
  required,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-300">
      {children}
      {required && <span className="ml-1 text-red-400">*</span>}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-zinc-500">{children}</p>;
}

function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewCampaignPage() {
  const router = useRouter();

  // Data hooks
  const { data: scriptsData, loading: scriptsLoading } = useScripts();
  const { data: phoneNumbersData, loading: phoneNumbersLoading } =
    usePhoneNumbers();
  const { data: leadsData, loading: leadsLoading } = useLeads({
    limit: 500,
  });
  const { mutate: createCampaign, loading: creating } = useCreateCampaign();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set()
  );
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState(1);
  const [callsPerMinute, setCallsPerMinute] = useState(5);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const scripts = scriptsData?.data ?? [];
  const phoneNumbers = phoneNumbersData?.data ?? [];
  const leads = leadsData?.data ?? [];

  // Lead selection helpers
  const allSelected =
    leads.length > 0 && selectedLeadIds.size === leads.length;
  const someSelected =
    selectedLeadIds.size > 0 && selectedLeadIds.size < leads.length;

  function toggleLead(id: string) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
    }
  }

  function getLeadDisplayName(lead: { firstName: string | null; lastName: string | null; phone: string }) {
    const parts = [lead.firstName, lead.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : lead.phone;
  }

  // Validation
  function validate(): string[] {
    const errors: string[] = [];
    if (!name.trim()) errors.push("Campaign name is required.");
    if (!scriptId) errors.push("A script must be selected.");
    if (selectedLeadIds.size === 0)
      errors.push("At least one lead must be selected.");
    return errors;
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    const schedule: CampaignSchedule = {
      startDate: scheduledStart || new Date().toISOString(),
      endDate: scheduledEnd || null,
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const payload: CreateCampaignInput = {
      name: name.trim(),
      scriptId,
      phoneNumberId: phoneNumberId || undefined!,
      schedule,
      maxConcurrentCalls,
      leadIds: Array.from(selectedLeadIds),
    };

    try {
      await createCampaign(payload);
      router.push("/dashboard/campaigns");
    } catch {
      // Error is captured inside the hook
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Back link + header */}
        <div>
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white">
            Create New Campaign
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Configure and launch an outbound calling campaign
          </p>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm font-medium text-red-400">
              Please fix the following errors:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-300">
              {validationErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-6">
          {/* 1. Campaign Basics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-indigo-400" />
                Campaign Basics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="campaignName" required>
                  Campaign Name
                </Label>
                <div className="mt-1.5">
                  <Input
                    id="campaignName"
                    placeholder="e.g. Q1 Product Launch Outreach"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="campaignDescription">Description</Label>
                <Hint>A brief summary of this campaign&apos;s purpose</Hint>
                <div className="mt-1.5">
                  <Textarea
                    id="campaignDescription"
                    placeholder="e.g. Outreach campaign for new product launch targeting enterprise leads."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Script Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                Script Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="scriptId" required>
                  Script
                </Label>
                <Hint>
                  Choose the AI script your agent will use for this campaign
                </Hint>
                <div className="mt-1.5">
                  {scriptsLoading ? (
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading scripts...
                    </div>
                  ) : (
                    <SelectField
                      id="scriptId"
                      value={scriptId}
                      onChange={setScriptId}
                      placeholder="Select a script..."
                      options={scripts.map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.type})`,
                      }))}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Phone Number */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-indigo-400" />
                Phone Number
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="phoneNumberId">Caller ID Number</Label>
                <Hint>
                  Select the phone number that will appear as the caller ID
                </Hint>
                <div className="mt-1.5">
                  {phoneNumbersLoading ? (
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading phone numbers...
                    </div>
                  ) : (
                    <SelectField
                      id="phoneNumberId"
                      value={phoneNumberId}
                      onChange={setPhoneNumberId}
                      placeholder="Select a phone number..."
                      options={phoneNumbers
                        .filter((p) => p.isActive)
                        .map((p) => ({
                          value: p.id,
                          label: `${p.friendlyName} (${p.number})`,
                        }))}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Lead Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-400" />
                  Lead Selection
                </CardTitle>
                <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                  {selectedLeadIds.size} selected
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading leads...
                </div>
              ) : leads.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-500">
                    No leads available. Add leads first to create a campaign.
                  </p>
                  <Link
                    href="/dashboard/leads"
                    className="mt-2 inline-block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Go to Leads
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select All toggle */}
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm transition-colors hover:border-zinc-700 w-full"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4 text-indigo-400" />
                    ) : someSelected ? (
                      <MinusSquare className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <Square className="h-4 w-4 text-zinc-600" />
                    )}
                    <span
                      className={
                        allSelected || someSelected
                          ? "text-white font-medium"
                          : "text-zinc-400"
                      }
                    >
                      Select All ({leads.length} leads)
                    </span>
                  </button>

                  {/* Lead list */}
                  <div className="max-h-80 overflow-y-auto rounded-lg border border-zinc-800 divide-y divide-zinc-800">
                    {leads.map((lead) => {
                      const isSelected = selectedLeadIds.has(lead.id);
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => toggleLead(lead.id)}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-800/50 ${
                            isSelected ? "bg-indigo-500/5" : ""
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 shrink-0 text-indigo-400" />
                          ) : (
                            <Square className="h-4 w-4 shrink-0 text-zinc-600" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate font-medium ${
                                isSelected ? "text-white" : "text-zinc-300"
                              }`}
                            >
                              {getLeadDisplayName(lead)}
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              {lead.phone}
                              {lead.company ? ` - ${lead.company}` : ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="scheduledStart">Start Date & Time</Label>
                  <div className="mt-1.5">
                    <Input
                      id="scheduledStart"
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="scheduledEnd">
                    End Date & Time{" "}
                    <span className="text-zinc-500 font-normal">(optional)</span>
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="scheduledEnd"
                      type="datetime-local"
                      value={scheduledEnd}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="maxConcurrent">Max Concurrent Calls</Label>
                  <Hint>Number of calls running at the same time (1-10)</Hint>
                  <div className="mt-1.5">
                    <Input
                      id="maxConcurrent"
                      type="number"
                      min={1}
                      max={10}
                      value={maxConcurrentCalls}
                      onChange={(e) =>
                        setMaxConcurrentCalls(
                          Math.min(10, Math.max(1, Number(e.target.value) || 1))
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="callsPerMinute">
                    Calls Per Minute Rate Limit
                  </Label>
                  <Hint>Maximum new calls initiated per minute</Hint>
                  <div className="mt-1.5">
                    <Input
                      id="callsPerMinute"
                      type="number"
                      min={1}
                      max={60}
                      value={callsPerMinute}
                      onChange={(e) =>
                        setCallsPerMinute(
                          Math.min(60, Math.max(1, Number(e.target.value) || 1))
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/dashboard/campaigns">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" size="lg" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Megaphone className="mr-2 h-4 w-4" />
                  Create Campaign
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
