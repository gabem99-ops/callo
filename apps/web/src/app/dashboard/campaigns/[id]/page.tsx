"use client";

import { use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCampaign,
  useStartCampaign,
  usePauseCampaign,
  useCancelCampaign,
} from "@/lib/hooks";
import type { CampaignStatus, CampaignLeadStatus } from "@callo/shared";
import {
  ArrowLeft,
  Megaphone,
  Users,
  Phone,
  TrendingUp,
  Clock,
  Play,
  Pause,
  XCircle,
  Loader2,
  User,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const campaignStatusConfig: Record<
  CampaignStatus,
  { label: string; variant: "secondary" | "default" | "warning" | "success" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  scheduled: { label: "Scheduled", variant: "default" },
  running: { label: "Running", variant: "warning" },
  paused: { label: "Paused", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  canceled: { label: "Canceled", variant: "destructive" },
};

const leadStatusConfig: Record<
  CampaignLeadStatus,
  { label: string; variant: "secondary" | "default" | "warning" | "success" | "destructive" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  calling: { label: "Calling", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  skipped: { label: "Skipped", variant: "secondary" },
  retry: { label: "Retry", variant: "default" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-800 ${className ?? ""}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data, loading, error, refetch } = useCampaign(resolvedParams.id);
  const { mutate: startCampaign, loading: starting } = useStartCampaign();
  const { mutate: pauseCampaign, loading: pausing } = usePauseCampaign();
  const { mutate: cancelCampaign, loading: canceling } = useCancelCampaign();

  const campaign = data?.data;

  async function handleStart() {
    if (!campaign) return;
    try {
      await startCampaign(campaign.id);
      refetch();
    } catch {
      // Error handled by hook
    }
  }

  async function handlePause() {
    if (!campaign) return;
    try {
      await pauseCampaign(campaign.id);
      refetch();
    } catch {
      // Error handled by hook
    }
  }

  async function handleCancel() {
    if (!campaign) return;
    try {
      await cancelCampaign(campaign.id);
      refetch();
    } catch {
      // Error handled by hook
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Link>
          <SkeletonBlock className="mt-4 h-8 w-64" />
          <SkeletonBlock className="mt-2 h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
        <SkeletonBlock className="h-96" />
      </div>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Link>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <XCircle className="h-10 w-10 text-red-400" />
            <p className="mt-4 text-sm text-zinc-400">
              {error ?? "Campaign not found."}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCfg = campaignStatusConfig[campaign.status] ?? {
    label: campaign.status,
    variant: "secondary" as const,
  };

  const progress =
    campaign.totalLeads > 0
      ? Math.round((campaign.completedLeads / campaign.totalLeads) * 100)
      : 0;

  const successRate =
    campaign.completedLeads > 0
      ? Math.round(
          (campaign.successfulLeads / campaign.completedLeads) * 100
        )
      : 0;

  // Compute total calls and avg duration from the leads data
  const campaignLeads = campaign.leads ?? [];
  const totalCallsMade = campaignLeads.filter(
    (l) =>
      (l.campaignLead as { status?: string })?.status === "completed" ||
      (l.campaignLead as { status?: string })?.status === "failed"
  ).length;

  return (
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

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-500/10 p-2.5">
              <Megaphone className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  {campaign.name}
                </h1>
                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              </div>
              {campaign.name && (
                <p className="mt-1 text-sm text-zinc-400">
                  Created{" "}
                  {new Date(campaign.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons based on status */}
          <div className="flex items-center gap-2">
            {campaign.status === "draft" && (
              <Button onClick={handleStart} disabled={starting}>
                {starting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start Campaign
              </Button>
            )}

            {campaign.status === "scheduled" && (
              <Button
                onClick={handleCancel}
                variant="destructive"
                disabled={canceling}
              >
                {canceling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Cancel
              </Button>
            )}

            {campaign.status === "running" && (
              <>
                <Button
                  onClick={handlePause}
                  variant="secondary"
                  disabled={pausing}
                >
                  {pausing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Pause className="mr-2 h-4 w-4" />
                  )}
                  Pause
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  disabled={canceling}
                >
                  {canceling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Cancel
                </Button>
              </>
            )}

            {campaign.status === "paused" && (
              <>
                <Button onClick={handleStart} disabled={starting}>
                  {starting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Resume
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  disabled={canceling}
                >
                  {canceling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Overall Progress</span>
              <span className="font-mono text-zinc-300">
                {campaign.completedLeads} / {campaign.totalLeads} leads
                ({progress}%)
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-500/10 p-2">
                <Users className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Total Leads</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">
                  {campaign.totalLeads}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Phone className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Calls Made</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">
                  {totalCallsMade || campaign.completedLeads}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Success Rate</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">
                  {successRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Avg Duration</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">
                  {(() => {
                    const durations = campaignLeads
                      .map(
                        (l) =>
                          (l.campaignLead as { durationSeconds?: number })
                            ?.durationSeconds
                      )
                      .filter(
                        (d): d is number => typeof d === "number" && d > 0
                      );
                    if (durations.length === 0) return "--";
                    const avg = Math.round(
                      durations.reduce((a, b) => a + b, 0) / durations.length
                    );
                    return formatDuration(avg);
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-lead results table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-400" />
            Lead Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaignLeads.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-zinc-700" />
              <p className="mt-3 text-sm text-zinc-500">
                No lead results available yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="pb-3 pr-4 text-left font-medium text-zinc-400">
                      Lead
                    </th>
                    <th className="pb-3 pr-4 text-left font-medium text-zinc-400">
                      Phone
                    </th>
                    <th className="pb-3 pr-4 text-left font-medium text-zinc-400">
                      Status
                    </th>
                    <th className="pb-3 pr-4 text-left font-medium text-zinc-400">
                      Outcome
                    </th>
                    <th className="pb-3 text-left font-medium text-zinc-400">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {campaignLeads.map((entry) => {
                    const lead = entry.lead;
                    const cl = entry.campaignLead as {
                      id?: string;
                      status?: CampaignLeadStatus;
                      outcome?: string | null;
                      durationSeconds?: number | null;
                      attempts?: number;
                    };
                    const clStatus = cl.status ?? "pending";
                    const statusCfg = leadStatusConfig[clStatus] ?? {
                      label: clStatus,
                      variant: "secondary" as const,
                    };
                    const leadName = [lead.firstName, lead.lastName]
                      .filter(Boolean)
                      .join(" ") || "Unknown";

                    return (
                      <tr key={cl.id ?? lead.id} className="group">
                        <td className="py-3 pr-4">
                          <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                            {leadName}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-zinc-400">
                          {lead.phone}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusCfg.variant}>
                            {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-zinc-400">
                          {cl.outcome
                            ? cl.outcome
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (c) => c.toUpperCase())
                            : "--"}
                        </td>
                        <td className="py-3 font-mono text-xs text-zinc-400">
                          {formatDuration(cl.durationSeconds ?? null)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
