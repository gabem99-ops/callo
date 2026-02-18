"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useDashboardStats,
  useCallVolume,
  useOutcomes,
  usePhoneNumbers,
  useScripts,
  useBusiness,
} from "@/lib/hooks";
import {
  Phone,
  Clock,
  CalendarCheck,
  UserPlus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Check,
  Sparkles,
  FileText,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-4 w-12 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-80 items-center justify-center rounded-lg border border-zinc-800 bg-[#0D0D0F]">
      <div className="flex flex-col items-center gap-3">
        <BarChart3 className="h-8 w-8 animate-pulse text-zinc-700" />
        <div className="space-y-1.5 text-center">
          <div className="h-3 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-3 w-28 animate-pulse rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

function OutcomeSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-800" />
            <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="h-4 w-8 animate-pulse rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock fallback data (shown when API is unavailable)
// ---------------------------------------------------------------------------

const MOCK_STATS = {
  totalCalls: 1247,
  totalMinutes: 3892,
  appointmentsBooked: 156,
  leadsCapured: 432,
  avgCallDuration: 187,
  successRate: 68,
  activeCampaigns: 3,
  minutesRemaining: 1108,
};

const MOCK_OUTCOMES = [
  { outcome: "appointment_booked", count: 156, percentage: 16.2 },
  { outcome: "lead_captured", count: 289, percentage: 30.0 },
  { outcome: "transferred", count: 87, percentage: 9.0 },
  { outcome: "info_provided", count: 342, percentage: 35.5 },
  { outcome: "hung_up", count: 91, percentage: 9.4 },
];

const MOCK_CALL_VOLUME = [
  { date: "Feb 1", inbound: 32, outbound: 18 },
  { date: "Feb 2", inbound: 28, outbound: 22 },
  { date: "Feb 3", inbound: 45, outbound: 30 },
  { date: "Feb 4", inbound: 52, outbound: 35 },
  { date: "Feb 5", inbound: 38, outbound: 28 },
  { date: "Feb 6", inbound: 41, outbound: 32 },
  { date: "Feb 7", inbound: 19, outbound: 12 },
  { date: "Feb 8", inbound: 35, outbound: 20 },
  { date: "Feb 9", inbound: 30, outbound: 25 },
  { date: "Feb 10", inbound: 48, outbound: 38 },
  { date: "Feb 11", inbound: 55, outbound: 42 },
  { date: "Feb 12", inbound: 43, outbound: 29 },
  { date: "Feb 13", inbound: 39, outbound: 34 },
  { date: "Feb 14", inbound: 22, outbound: 15 },
];

// Hex colors for PieChart cells, matching OUTCOME_COLORS Tailwind classes
const OUTCOME_HEX_COLORS: Record<string, string> = {
  appointment_booked: "#10B981", // emerald-500
  lead_captured: "#3B82F6",     // blue-500
  transferred: "#F59E0B",       // amber-500
  info_provided: "#71717A",     // zinc-500
  hung_up: "#F43F5E",           // rose-500
  voicemail: "#A855F7",         // purple-500
  qualified: "#06B6D4",         // cyan-500
  disqualified: "#F97316",      // orange-500
  callback_requested: "#14B8A6", // teal-500
  error: "#B91C1C",             // red-700
};

// ---------------------------------------------------------------------------
// Chart Tooltip
// ---------------------------------------------------------------------------

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function DarkTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#1A1A22] px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-medium text-zinc-400">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-300">{entry.name}:</span>
          <span className="font-mono font-medium text-white">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

interface PieTooltipPayloadEntry {
  name: string;
  value: number;
  payload: {
    outcome: string;
    count: number;
    percentage: number;
    fill: string;
  };
}

interface PieTooltipProps {
  active?: boolean;
  payload?: PieTooltipPayloadEntry[];
}

function PieDarkTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#1A1A22] px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2 text-xs">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: entry.payload.fill }}
        />
        <span className="text-zinc-300">
          {OUTCOME_LABELS[entry.payload.outcome] ?? entry.payload.outcome}
        </span>
      </div>
      <p className="mt-1 font-mono text-sm font-medium text-white">
        {entry.value}{" "}
        <span className="text-xs text-zinc-500">
          ({entry.payload.percentage}%)
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StatConfig {
  label: string;
  key: string;
  icon: LucideIcon;
  format?: (v: number) => string;
  trend?: string;
  up?: boolean;
}

const STAT_CONFIGS: StatConfig[] = [
  {
    label: "Total Calls",
    key: "totalCalls",
    icon: Phone,
    format: (v) => v.toLocaleString(),
    trend: "+12.5%",
    up: true,
  },
  {
    label: "Minutes Used",
    key: "totalMinutes",
    icon: Clock,
    format: (v) => v.toLocaleString(),
    trend: "+8.1%",
    up: true,
  },
  {
    label: "Appointments",
    key: "appointmentsBooked",
    icon: CalendarCheck,
    format: (v) => v.toLocaleString(),
    trend: "+23.4%",
    up: true,
  },
  {
    label: "Leads Captured",
    key: "leadsCapured",
    icon: UserPlus,
    format: (v) => v.toLocaleString(),
    trend: "-3.2%",
    up: false,
  },
];

const OUTCOME_COLORS: Record<string, string> = {
  appointment_booked: "bg-emerald-500",
  lead_captured: "bg-blue-500",
  transferred: "bg-amber-500",
  info_provided: "bg-zinc-500",
  hung_up: "bg-rose-500",
  voicemail: "bg-purple-500",
  qualified: "bg-cyan-500",
  disqualified: "bg-orange-500",
  callback_requested: "bg-teal-500",
  error: "bg-red-700",
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

// ---------------------------------------------------------------------------
// Get Started Checklist (shown to new users with no calls)
// ---------------------------------------------------------------------------

interface ChecklistStep {
  number: number;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  isComplete: boolean;
}

function GetStartedChecklist({ totalCalls }: { totalCalls: number }) {
  const phoneNumbers = usePhoneNumbers();
  const scripts = useScripts();

  const hasPhoneNumber =
    !phoneNumbers.loading &&
    !!phoneNumbers.data?.data &&
    phoneNumbers.data.data.length > 0;
  const hasScript =
    !scripts.loading &&
    !!scripts.data?.data &&
    scripts.data.data.length > 0;
  const hasTestCall = totalCalls > 0;
  const firstPhoneNumber = hasPhoneNumber
    ? phoneNumbers.data!.data[0]
    : null;

  const steps: ChecklistStep[] = [
    {
      number: 1,
      title: "Get a phone number",
      description:
        "Your AI needs a phone number to answer calls.",
      actionLabel: "Get a Number",
      href: "/dashboard/phone-numbers",
      isComplete: hasPhoneNumber,
    },
    {
      number: 2,
      title: "Create your AI script",
      description:
        "Tell your AI what to say and how to help callers.",
      actionLabel: "Create Script",
      href: "/dashboard/scripts/new",
      isComplete: hasScript,
    },
    {
      number: 3,
      title: "Make a test call",
      description: firstPhoneNumber
        ? `Call your new number to hear your AI in action! Your number: ${firstPhoneNumber.number}`
        : "Call your new number to hear your AI in action!",
      actionLabel: "View Your Number",
      href: "/dashboard/phone-numbers",
      isComplete: hasTestCall,
    },
    {
      number: 4,
      title: "Share with customers",
      description:
        "Add your AI number to your website, Google listing, and business cards. Your customers will never miss a call again.",
      actionLabel: "Learn More",
      href: "/dashboard/phone-numbers",
      isComplete: hasPhoneNumber && hasScript && hasTestCall,
    },
  ];

  // Determine the current (first incomplete) step
  const currentStepIndex = steps.findIndex((s) => !s.isComplete);

  const isLoading = phoneNumbers.loading || scripts.loading;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome to Callo!
        </h1>
        <p className="mt-2 text-lg text-zinc-400">
          Here&apos;s how to get your AI phone agent up and running:
        </p>
      </div>

      {/* Checklist Steps */}
      <div className="mx-auto max-w-2xl space-y-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-48 animate-pulse rounded bg-zinc-800" />
                      <div className="h-4 w-72 animate-pulse rounded bg-zinc-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : steps.map((step, index) => {
              const isCurrent = index === currentStepIndex;
              const isComplete = step.isComplete;

              return (
                <Card
                  key={step.number}
                  className={`transition-all ${
                    isCurrent
                      ? "border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                      : isComplete
                        ? "border-zinc-800/50 opacity-75"
                        : "border-zinc-800"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Step Number / Check Circle */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          isComplete
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isCurrent
                              ? "bg-indigo-500/20 text-indigo-400"
                              : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {isComplete ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          step.number
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h3
                          className={`text-base font-semibold ${
                            isComplete
                              ? "text-zinc-500 line-through"
                              : "text-white"
                          }`}
                        >
                          Step {step.number}: {step.title}
                        </h3>
                        <p
                          className={`mt-1 text-sm ${
                            isComplete ? "text-zinc-600" : "text-zinc-400"
                          }`}
                        >
                          {step.description}
                        </p>

                        {/* Action Button */}
                        {!isComplete && (
                          <Link
                            href={step.href}
                            className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                              isCurrent
                                ? "bg-indigo-600 text-white hover:bg-indigo-500"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            }`}
                          >
                            {step.actionLabel}
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* How It Works */}
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-6 text-center text-lg font-semibold text-white">
          How it works
        </h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-0">
          {/* Step 1: Customer calls */}
          <div className="flex flex-1 flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
              <Phone className="h-7 w-7 text-indigo-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              Customer calls your number
            </p>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center sm:px-2">
            <ArrowRight className="h-5 w-5 rotate-90 text-zinc-600 sm:rotate-0" />
          </div>

          {/* Step 2: AI answers */}
          <div className="flex flex-1 flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <Sparkles className="h-7 w-7 text-amber-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              AI answers and helps them
            </p>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center sm:px-2">
            <ArrowRight className="h-5 w-5 rotate-90 text-zinc-600 sm:rotate-0" />
          </div>

          {/* Step 3: You get summary */}
          <div className="flex flex-1 flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
              <FileText className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              You get a full summary
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  // Compute date range for the current month
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, []);

  const stats = useDashboardStats();
  const callVolume = useCallVolume(startDate, endDate);
  const outcomes = useOutcomes(startDate, endDate);
  const business = useBusiness();

  // Resolve stat values -- use API data if available, else mock
  const resolvedStats = stats.data?.data ?? MOCK_STATS;
  const resolvedOutcomes = outcomes.data?.data ?? MOCK_OUTCOMES;
  const maxOutcomeCount = Math.max(
    ...resolvedOutcomes.map((o) => o.count),
    1,
  );

  // Show checklist if onboarding not completed or no calls yet
  const totalCalls = resolvedStats.totalCalls ?? 0;
  const onboardingDone = business.data?.data?.onboardingCompleted ?? true;
  const isNewUser = !stats.loading && (totalCalls === 0 || !onboardingDone);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.loading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : STAT_CONFIGS.map((cfg) => {
              const Icon = cfg.icon;
              const value =
                (resolvedStats as unknown as Record<string, number>)[cfg.key] ?? 0;
              return (
                <Card key={cfg.key}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="rounded-lg bg-indigo-500/10 p-2">
                        <Icon className="h-5 w-5 text-indigo-400" />
                      </div>
                      {!isNewUser && cfg.trend && (
                        <div
                          className={`flex items-center gap-1 text-xs font-medium ${
                            cfg.up ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {cfg.up ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {cfg.trend}
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="font-mono text-3xl font-bold text-white">
                        {cfg.format ? cfg.format(value) : value}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">{cfg.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* New user: show Get Started checklist instead of charts */}
      {isNewUser ? (
        <GetStartedChecklist totalCalls={totalCalls} />
      ) : (
        /* Charts Row */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Call Volume */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Call Volume</CardTitle>
              </CardHeader>
              <CardContent>
                {callVolume.loading ? (
                  <ChartSkeleton />
                ) : callVolume.error && !callVolume.data ? (
                  <div className="flex h-80 items-center justify-center rounded-lg border border-zinc-800 bg-[#0D0D0F]">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Activity className="h-8 w-8 text-zinc-600" />
                      <p className="text-sm text-zinc-500">
                        Connect to server to see live data
                      </p>
                      <p className="text-xs text-zinc-600">
                        Call volume chart will render here when the API is
                        available
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={callVolume.data?.data ?? MOCK_CALL_VOLUME}
                        margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#71717A", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#71717A", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          content={<DarkTooltip />}
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                        />
                        <Bar
                          dataKey="inbound"
                          name="Inbound"
                          fill="#6366F1"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        />
                        <Bar
                          dataKey="outbound"
                          name="Outbound"
                          fill="#FB923C"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Call Outcomes */}
          <Card>
            <CardHeader>
              <CardTitle>Call Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              {outcomes.loading ? (
                <OutcomeSkeleton />
              ) : (
                <>
                  {/* Donut chart */}
                  <div className="mb-6 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={resolvedOutcomes}
                          dataKey="count"
                          nameKey="outcome"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {resolvedOutcomes.map((o) => (
                            <Cell
                              key={o.outcome}
                              fill={
                                OUTCOME_HEX_COLORS[o.outcome] ?? "#52525B"
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PieDarkTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    {resolvedOutcomes.map((o) => (
                      <div
                        key={o.outcome}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              OUTCOME_COLORS[o.outcome] ?? "bg-zinc-600"
                            }`}
                          />
                          <span className="text-sm text-zinc-300">
                            {OUTCOME_LABELS[o.outcome] ?? o.outcome}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-medium text-white">
                          {o.count}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bar representation */}
                  <div className="mt-6 space-y-2">
                    {resolvedOutcomes.map((o) => (
                      <div
                        key={o.outcome}
                        className="flex items-center gap-2"
                      >
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              OUTCOME_COLORS[o.outcome] ?? "bg-zinc-600"
                            }`}
                            style={{
                              width: `${(o.count / maxOutcomeCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {stats.error && (
                    <p className="mt-4 text-center text-[10px] text-zinc-600">
                      Showing cached data -- API unavailable
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
