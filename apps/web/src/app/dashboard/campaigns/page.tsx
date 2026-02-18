"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCampaigns } from "@/lib/hooks";
import type { CampaignStatus } from "@callo/shared";
import {
  Plus,
  Megaphone,
  Users,
  Phone,
  TrendingUp,
  Calendar,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data fallback
// ---------------------------------------------------------------------------

interface MockCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  totalLeads: number;
  callsMade: number;
  successRate: number;
  completedLeads: number;
  createdDate: string;
  description: string;
}

const mockCampaigns: MockCampaign[] = [
  {
    id: "camp_001",
    name: "Q1 Product Launch Outreach",
    status: "running",
    totalLeads: 250,
    callsMade: 142,
    successRate: 34,
    completedLeads: 142,
    createdDate: "Feb 1, 2026",
    description:
      "Outreach campaign for new product launch targeting enterprise leads.",
  },
  {
    id: "camp_002",
    name: "Re-engagement: Dormant Accounts",
    status: "completed",
    totalLeads: 180,
    callsMade: 180,
    successRate: 22,
    completedLeads: 180,
    createdDate: "Jan 15, 2026",
    description:
      "Re-engage customers who haven't interacted in the last 90 days.",
  },
  {
    id: "camp_003",
    name: "Spring Promotion Follow-Up",
    status: "draft",
    totalLeads: 320,
    callsMade: 0,
    successRate: 0,
    completedLeads: 0,
    createdDate: "Feb 14, 2026",
    description:
      "Follow-up calls for leads who showed interest in the spring promo.",
  },
];

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  { label: string; variant: "warning" | "success" | "secondary" | "default" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  scheduled: { label: "Scheduled", variant: "default" },
  running: { label: "Running", variant: "warning" },
  paused: { label: "Paused", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  canceled: { label: "Canceled", variant: "destructive" },
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function CampaignCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-800" />
              <div className="space-y-2">
                <div className="h-5 w-48 animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-72 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-zinc-800" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-800" />
            <div className="flex items-center gap-6">
              <div className="h-12 w-14 animate-pulse rounded bg-zinc-800" />
              <div className="h-12 w-14 animate-pulse rounded bg-zinc-800" />
              <div className="h-12 w-14 animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const { data, loading, error } = useCampaigns();

  // Map real API data into display format, falling back to mock data
  const campaigns: MockCampaign[] =
    data?.data?.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      totalLeads: c.totalLeads,
      callsMade: c.completedLeads + c.failedLeads,
      successRate:
        c.completedLeads > 0
          ? Math.round((c.successfulLeads / c.completedLeads) * 100)
          : 0,
      completedLeads: c.completedLeads,
      createdDate: new Date(c.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      description: c.name,
    })) ?? (loading ? [] : mockCampaigns);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Run automated calling campaigns to reach your leads at scale
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load campaigns. Showing sample data.</span>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && campaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-zinc-800 p-4">
              <Megaphone className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              No campaigns yet
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Create your first outbound calling campaign to get started.
            </p>
            <Link href="/dashboard/campaigns/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Campaign Cards */}
      {!loading && campaigns.length > 0 && (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const status = statusConfig[campaign.status] ?? {
              label: campaign.status,
              variant: "secondary" as const,
            };
            const progress =
              campaign.totalLeads > 0
                ? (campaign.completedLeads / campaign.totalLeads) * 100
                : 0;

            return (
              <Link
                key={campaign.id}
                href={`/dashboard/campaigns/${campaign.id}`}
                className="block"
              >
                <Card className="transition-colors hover:border-zinc-700 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      {/* Left: Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-indigo-500/10 p-2">
                            <Megaphone className="h-5 w-5 text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {campaign.name}
                            </h3>
                            <p className="text-sm text-zinc-400">
                              {campaign.description}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Progress</span>
                            <span className="font-mono text-zinc-300">
                              {campaign.completedLeads} / {campaign.totalLeads}{" "}
                              leads
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Stats & Status */}
                      <div className="flex flex-col items-end gap-3">
                        <Badge variant={status.variant}>{status.label}</Badge>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <Users className="h-3.5 w-3.5" />
                              <span className="text-xs">Leads</span>
                            </div>
                            <p className="mt-1 font-mono text-lg font-bold text-white">
                              {campaign.totalLeads}
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <Phone className="h-3.5 w-3.5" />
                              <span className="text-xs">Calls Made</span>
                            </div>
                            <p className="mt-1 font-mono text-lg font-bold text-white">
                              {campaign.callsMade}
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <TrendingUp className="h-3.5 w-3.5" />
                              <span className="text-xs">Success Rate</span>
                            </div>
                            <p className="mt-1 font-mono text-lg font-bold text-white">
                              {campaign.successRate}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Calendar className="h-3 w-3" />
                          Created {campaign.createdDate}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
