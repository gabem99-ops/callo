"use client";

import { useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCall } from "@/lib/hooks";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  DollarSign,
  SmilePlus,
  Meh,
  Frown,
  Bot,
  User,
  Play,
  FileText,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sentimentConfig = {
  positive: {
    label: "Positive",
    icon: SmilePlus,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  neutral: {
    label: "Neutral",
    icon: Meh,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  negative: {
    label: "Negative",
    icon: Frown,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
};

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  completed: "success",
  in_progress: "warning",
  failed: "destructive",
  busy: "destructive",
  no_answer: "destructive",
  canceled: "destructive",
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
  callback_requested: "Callback Requested",
  error: "Error",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCost(cents: number | null): string {
  if (!cents) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CallDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-800 mb-3" />
              <div className="h-5 w-24 animate-pulse rounded bg-zinc-800" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <div className="h-16 w-3/4 animate-pulse rounded-2xl bg-zinc-800" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-800" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CallDetailPage() {
  const params = useParams();
  const callId = params.id as string;
  const { data, loading, error } = useCall(callId);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const call = data?.data;
  const transcript = call?.transcript ?? [];

  useEffect(() => {
    if (transcript.length > 0) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript.length]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/calls"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calls
        </Link>
        <CallDetailSkeleton />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/calls"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calls
        </Link>
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">
            {error || "Call not found"}
          </p>
        </div>
      </div>
    );
  }

  const sentiment = call.sentiment
    ? sentimentConfig[call.sentiment]
    : null;
  const SentimentIcon = sentiment?.icon ?? Meh;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/calls"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Calls
      </Link>

      {/* ----------------------------------------------------------------- */}
      {/* Top Section -- Metadata Cards                                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {/* Direction */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Direction
            </p>
            <div className="mt-2">
              {call.direction === "inbound" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
                  <ArrowDownLeft className="h-3 w-3" />
                  Inbound
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 border border-orange-500/20">
                  <ArrowUpRight className="h-3 w-3" />
                  Outbound
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Status
            </p>
            <div className="mt-2">
              <Badge variant={statusVariant[call.status] ?? "secondary"}>
                {call.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* From -> To */}
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              From &rarr; To
            </p>
            <p className="mt-2 font-mono text-sm text-white">
              {call.fromNumber}
            </p>
            <p className="font-mono text-xs text-zinc-500">
              &rarr; {call.toNumber}
            </p>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Duration
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              <span className="font-mono text-sm text-white">
                {formatDuration(call.durationSeconds)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cost */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Cost
            </p>
            <div className="mt-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-zinc-500" />
              <span className="font-mono text-sm text-white">
                {formatCost(call.costCents)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Outcome */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Outcome
            </p>
            <div className="mt-2">
              {call.outcome ? (
                <Badge variant="success">
                  {OUTCOME_LABELS[call.outcome] ?? call.outcome}
                </Badge>
              ) : (
                <span className="text-sm text-zinc-500">—</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sentiment */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Sentiment
            </p>
            <div className="mt-2">
              {sentiment ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${sentiment.color} ${sentiment.bg}`}
                >
                  <SentimentIcon className="h-3 w-3" />
                  {sentiment.label}
                </span>
              ) : (
                <span className="text-sm text-zinc-500">—</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Started At */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Started At
            </p>
            <p className="mt-2 font-mono text-sm text-white">
              {formatDate(call.startedAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Middle Section -- Transcript + Summary                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left -- Transcript (2/3) */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                Transcript
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-10 w-10 text-zinc-600" />
                  <p className="mt-3 text-sm text-zinc-500">
                    No transcript available
                  </p>
                </div>
              ) : (
                <div className="max-h-[520px] space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
                  {transcript.map((entry) => {
                    const isAi = entry.speaker === "ai";
                    return (
                      <div
                        key={entry.id}
                        className={`flex ${isAi ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            isAi
                              ? "rounded-tl-sm bg-zinc-800/80"
                              : "rounded-tr-sm bg-indigo-600/20 border border-indigo-500/10"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            {isAi ? (
                              <Bot className="h-3.5 w-3.5 text-indigo-400" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-zinc-400" />
                            )}
                            <span className="text-xs font-medium text-zinc-400">
                              {isAi ? "AI Agent" : "Caller"}
                            </span>
                            <span className="font-mono text-xs text-zinc-600">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-zinc-200">
                            {entry.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right -- Summary + Recording (1/3) */}
        <div className="space-y-6">
          {/* Call Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                Call Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {call.summary ? (
                <p className="text-sm leading-relaxed text-zinc-300">
                  {call.summary}
                </p>
              ) : (
                <p className="text-sm text-zinc-500">
                  No summary available for this call.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recording */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="h-4 w-4 text-indigo-400" />
                Recording
              </CardTitle>
            </CardHeader>
            <CardContent>
              {call.recordingUrl ? (
                <audio
                  controls
                  className="w-full [&::-webkit-media-controls-panel]:bg-zinc-900 [&::-webkit-media-controls-current-time-display]:text-zinc-300 [&::-webkit-media-controls-time-remaining-display]:text-zinc-300"
                  src={call.recordingUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <p className="text-sm text-zinc-500">
                  No recording available for this call.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
