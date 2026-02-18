"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCalls } from "@/lib/hooks";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Inbox,
} from "lucide-react";
import {
  formatPhoneNumber,
  formatDurationClock,
} from "@callo/shared";
import type { Call } from "@callo/shared";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type FilterDirection = "all" | "inbound" | "outbound";
type FilterStatus = "all" | "completed" | "in_progress" | "failed" | "no_answer";

const STATUS_STYLES: Record<
  string,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  completed: { label: "Completed", variant: "success" },
  in_progress: { label: "In Progress", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
  no_answer: { label: "No Answer", variant: "secondary" },
  queued: { label: "Queued", variant: "secondary" },
  ringing: { label: "Ringing", variant: "warning" },
  busy: { label: "Busy", variant: "destructive" },
  canceled: { label: "Canceled", variant: "secondary" },
};

const OUTCOME_LABELS: Record<string, string> = {
  appointment_booked: "Appointment Booked",
  lead_captured: "Lead Captured",
  transferred: "Transferred",
  info_provided: "Info Provided",
  hung_up: "Hung Up",
  voicemail: "Voicemail",
  qualified: "Qualified",
  disqualified: "Disqualified",
  callback_requested: "Callback",
  error: "Error",
};

// ---------------------------------------------------------------------------
// Skeleton Row
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[120px_1fr_100px_160px_180px_120px] gap-4 px-6 py-4">
      <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-800" />
      <div className="space-y-1.5">
        <div className="h-4 w-36 animate-pulse rounded bg-zinc-800" />
        <div className="h-3 w-28 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="h-4 w-12 animate-pulse rounded bg-zinc-800" />
      <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
      <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
      <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-800" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CallsPage() {
  const [filterDirection, setFilterDirection] = useState<FilterDirection>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: callsResponse, loading, error, refetch } = useCalls({
    page,
    limit,
    direction: filterDirection !== "all" ? filterDirection : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  // Extract call array from response -- the hook returns PaginatedResponse<Call>
  // which has { data: Call[], pagination: {...} }
  const calls: Call[] = useMemo(() => {
    if (!callsResponse) return [];
    if ("data" in callsResponse && Array.isArray(callsResponse.data)) {
      return callsResponse.data;
    }
    if (Array.isArray(callsResponse)) return callsResponse;
    return [];
  }, [callsResponse]);

  const paginationInfo = useMemo(() => {
    if (
      callsResponse &&
      "pagination" in callsResponse &&
      callsResponse.pagination
    ) {
      return callsResponse.pagination;
    }
    return { page, limit, total: calls.length, totalPages: Math.ceil(calls.length / limit) || 1 };
  }, [callsResponse, calls.length, page, limit]);

  // Client-side search filter
  const filteredCalls = useMemo(() => {
    if (!searchQuery.trim()) return calls;
    const q = searchQuery.toLowerCase();
    return calls.filter(
      (c) =>
        c.fromNumber.toLowerCase().includes(q) ||
        c.toNumber.toLowerCase().includes(q) ||
        (c.outcome && c.outcome.toLowerCase().includes(q)) ||
        (c.summary && c.summary.toLowerCase().includes(q)) ||
        formatPhoneNumber(c.fromNumber).toLowerCase().includes(q) ||
        formatPhoneNumber(c.toNumber).toLowerCase().includes(q),
    );
  }, [calls, searchQuery]);

  const totalPages = paginationInfo.totalPages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Call History</h1>
          <p className="mt-1 text-sm text-zinc-400">
            See every call your AI has handled, with full transcripts and outcomes
          </p>
        </div>

        {/* Direction Filters */}
        <div className="flex items-center gap-2">
          {(["all", "inbound", "outbound"] as const).map((type) => (
            <Button
              key={type}
              variant={filterDirection === type ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setFilterDirection(type);
                setPage(1);
              }}
            >
              {type === "all" && <Filter className="mr-1.5 h-3.5 w-3.5" />}
              {type === "inbound" && (
                <ArrowDownLeft className="mr-1.5 h-3.5 w-3.5" />
              )}
              {type === "outbound" && (
                <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
              )}
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Search + Status Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search calls by phone, outcome, or summary..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as FilterStatus);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="failed">Failed</option>
          <option value="no_answer">No Answer</option>
        </select>
      </div>

      {/* Error State */}
      {error && !callsResponse && (
        <Card className="border-red-500/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-red-500/10 p-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-300">
              Failed to load calls
            </p>
            <p className="mt-1 text-xs text-zinc-500">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {(!error || callsResponse) && (
        <Card>
          <CardContent className="p-0">
            {/* Header Row */}
            <div className="grid grid-cols-[120px_1fr_100px_160px_180px_120px] gap-4 border-b border-zinc-800 px-6 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Direction
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                From / To
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Duration
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Outcome
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Date
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Status
              </span>
            </div>

            {/* Loading State */}
            {loading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}

            {/* Data Rows */}
            {!loading &&
              filteredCalls.map((call, i) => {
                const status = STATUS_STYLES[call.status] ?? {
                  label: call.status,
                  variant: "secondary" as const,
                };
                const displayNumber =
                  call.direction === "inbound"
                    ? call.fromNumber
                    : call.toNumber;
                const date = call.createdAt
                  ? new Date(call.createdAt as unknown as string).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "--";

                return (
                  <Link
                    key={call.id}
                    href={`/dashboard/calls/${call.id}`}
                    className={`grid grid-cols-[120px_1fr_100px_160px_180px_120px] gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02] ${
                      i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
                    }`}
                  >
                    {/* Direction */}
                    <div>
                      {call.direction === "inbound" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                          <ArrowDownLeft className="h-3 w-3" />
                          Inbound
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400">
                          <ArrowUpRight className="h-3 w-3" />
                          Outbound
                        </span>
                      )}
                    </div>

                    {/* Contact */}
                    <div>
                      <p className="font-mono text-sm text-white">
                        {formatPhoneNumber(displayNumber)}
                      </p>
                      {call.summary && (
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {call.summary}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="font-mono text-sm text-zinc-300">
                      {call.durationSeconds != null
                        ? formatDurationClock(call.durationSeconds)
                        : "--"}
                    </div>

                    {/* Outcome */}
                    <div className="text-sm text-zinc-300">
                      {call.outcome
                        ? OUTCOME_LABELS[call.outcome] ?? call.outcome
                        : "--"}
                    </div>

                    {/* Date */}
                    <div className="text-sm text-zinc-400">{date}</div>

                    {/* Status */}
                    <div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </Link>
                );
              })}

            {/* Empty State */}
            {!loading && filteredCalls.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-zinc-800 p-4">
                  <Inbox className="h-10 w-10 text-zinc-600" />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-400">
                  {searchQuery ? "No calls match your search" : "No calls yet"}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  {searchQuery
                    ? "Try adjusting your search or filters"
                    : "Calls will appear here once your AI agent takes its first call"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && filteredCalls.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {page} of {totalPages}
            {paginationInfo.total != null && (
              <span className="ml-2 text-zinc-600">
                ({paginationInfo.total} total)
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
