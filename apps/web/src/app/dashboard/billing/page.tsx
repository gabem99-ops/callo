"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Check,
  Sparkles,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Phone,
  Clock,
} from "lucide-react";
import {
  useSubscription,
  useUsage,
  usePlans,
  useCreateCheckout,
  useCreatePortal,
} from "@/lib/hooks";
import { PLAN_CONFIGS } from "@callo/shared";

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BillingPage() {
  const { data: subData, loading: subLoading, error: subError } = useSubscription();
  const { data: usageData, loading: usageLoading } = useUsage();
  const { data: plansData, loading: plansLoading } = usePlans();
  const { mutate: checkout, loading: checkoutLoading } = useCreateCheckout();
  const { mutate: openPortal, loading: portalLoading } = useCreatePortal();
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const subscription = subData?.data ?? null;
  const usage = usageData?.data ?? null;
  const plans = plansData?.data ?? Object.values(PLAN_CONFIGS);

  const isLoading = subLoading || usageLoading || plansLoading;

  const handleCheckout = async (plan: string) => {
    try {
      setCheckoutPlan(plan);
      const result = await checkout(plan);
      if (result?.data?.url) {
        window.location.href = result.data.url;
      }
    } catch {
      // Error is handled by the hook
    } finally {
      setCheckoutPlan(null);
    }
  };

  const handlePortal = async () => {
    try {
      const result = await openPortal();
      if (result?.data?.url) {
        window.location.href = result.data.url;
      }
    } catch {
      // Error is handled by the hook
    }
  };

  // Derive usage metrics
  const minutesUsed = usage?.minutesUsed ?? subscription?.minutesUsed ?? 0;
  const minutesIncluded = usage?.minutesIncluded ?? subscription?.minutesIncluded ?? 0;
  const minutesRemaining = Math.max(0, minutesIncluded - minutesUsed);
  const minutesPercent = minutesIncluded > 0 ? Math.round((minutesUsed / minutesIncluded) * 100) : 0;

  const phoneNumbersUsed = usage?.phoneNumbersUsed ?? 0;
  const phoneNumbersIncluded = usage?.phoneNumbersIncluded ??
    subscription?.phoneNumbersIncluded ?? 0;
  const phonePercent = phoneNumbersIncluded > 0 ? Math.round((phoneNumbersUsed / phoneNumbersIncluded) * 100) : 0;

  const currentPlan = subscription?.plan ?? null;
  const planConfig = currentPlan ? PLAN_CONFIGS[currentPlan] : null;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-sm text-zinc-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (subError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-400">Failed to load billing information</p>
          <p className="text-xs text-zinc-500">{subError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Current Plan Card */}
      {subscription ? (
        <Card className="border-indigo-500/20">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Plan Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-500/10 p-2">
                    <CreditCard className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">
                        {planConfig?.name ?? subscription.plan} Plan
                      </h2>
                      <Badge
                        variant={
                          subscription.status === "active"
                            ? "success"
                            : subscription.status === "past_due"
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {subscription.status === "active"
                          ? "Active"
                          : subscription.status === "past_due"
                          ? "Past Due"
                          : subscription.status === "canceled"
                          ? "Canceled"
                          : subscription.status}
                      </Badge>
                      {subscription.cancelAtPeriodEnd && (
                        <Badge variant="warning">Cancels at period end</Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">
                      <span className="font-mono text-xl font-bold text-white">
                        ${planConfig?.priceMonthly ?? "---"}
                      </span>
                      <span className="text-zinc-500"> / month</span>
                    </p>
                  </div>
                </div>

                {/* Usage Bars */}
                <div className="space-y-4">
                  {/* Minutes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <Clock className="h-3.5 w-3.5" />
                        Minutes Used
                      </span>
                      <span className="font-mono text-zinc-300">
                        {formatNumber(Math.round(minutesUsed))} / {formatNumber(minutesIncluded)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          minutesPercent >= 90
                            ? "bg-gradient-to-r from-red-600 to-red-400"
                            : minutesPercent >= 75
                            ? "bg-gradient-to-r from-amber-600 to-amber-400"
                            : "bg-gradient-to-r from-indigo-600 to-indigo-400"
                        }`}
                        style={{ width: `${Math.min(100, minutesPercent)}%` }}
                      />
                    </div>
                    {minutesPercent >= 90 && (
                      <p className="text-xs text-amber-400">
                        {minutesPercent}% used &mdash; consider upgrading
                      </p>
                    )}
                  </div>

                  {/* Phone Numbers */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <Phone className="h-3.5 w-3.5" />
                        Phone Numbers
                      </span>
                      <span className="font-mono text-zinc-300">
                        {phoneNumbersUsed} / {phoneNumbersIncluded}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          phonePercent >= 100
                            ? "bg-gradient-to-r from-amber-600 to-amber-400"
                            : "bg-gradient-to-r from-indigo-600 to-indigo-400"
                        }`}
                        style={{ width: `${Math.min(100, phonePercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span>
                    Minutes remaining:{" "}
                    <span className="font-medium text-zinc-300">
                      {formatNumber(Math.round(minutesRemaining))}
                    </span>
                  </span>
                  {subscription.currentPeriodEnd && (
                    <span>
                      Next billing date:{" "}
                      <span className="font-medium text-zinc-300">
                        {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handlePortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Manage Subscription
                </Button>
                {currentPlan === "starter" && (
                  <Button
                    onClick={() => handleCheckout("professional")}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading && checkoutPlan === "professional" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                    )}
                    Upgrade to Professional
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-700">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-lg bg-zinc-800 p-3">
                <CreditCard className="h-6 w-6 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">No Active Subscription</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Choose a plan below to get started with Callo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage History */}
      {usage && usage.totals && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Period</CardTitle>
            <CardDescription>
              {usage.period
                ? `${formatDate(usage.period.start)} - ${formatDate(usage.period.end)}`
                : "Current billing period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Total Calls</p>
                <p className="font-mono text-xl font-bold text-white">
                  {formatNumber(usage.totals.totalCalls)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Total Minutes</p>
                <p className="font-mono text-xl font-bold text-white">
                  {formatNumber(Math.round(usage.totals.totalMinutes))}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Appointments Booked</p>
                <p className="font-mono text-xl font-bold text-white">
                  {formatNumber(usage.totals.appointmentsBooked)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Leads Captured</p>
                <p className="font-mono text-xl font-bold text-white">
                  {formatNumber(usage.totals.leadsCaptured)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <div>
        <h2 className="text-lg font-semibold text-white">Compare Plans</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Choose the plan that best fits your business
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.tier;
          const isPopular = plan.tier === "professional";
          const isEnterprise = plan.tier === "enterprise";
          const isUpgrade =
            !isCurrentPlan &&
            !isEnterprise &&
            (currentPlan === null || (currentPlan === "starter" && plan.tier === "professional"));
          const isDowngrade =
            !isCurrentPlan &&
            !isEnterprise &&
            currentPlan === "professional" &&
            plan.tier === "starter";

          return (
            <Card
              key={plan.tier}
              className={`relative ${
                isPopular
                  ? "border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                  : ""
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="border-0 bg-indigo-600 text-white">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  {plan.tier === "starter"
                    ? "Perfect for small businesses getting started with AI calling."
                    : plan.tier === "professional"
                    ? "For growing businesses that need more power and flexibility."
                    : "Tailored solutions for large organizations with custom needs."}
                </CardDescription>
                <div className="pt-2">
                  <span className="font-mono text-3xl font-bold text-white">
                    {isEnterprise ? "Custom" : `$${plan.priceMonthly}`}
                  </span>
                  {!isEnterprise && (
                    <span className="text-zinc-500">/mo</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                      <span className="text-sm text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrentPlan ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isEnterprise ? (
                    <Button variant="outline" className="w-full" asChild>
                      <a href="mailto:sales@callo.ai">Contact Sales</a>
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(plan.tier)}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading && checkoutPlan === plan.tier ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {subscription ? `Upgrade to ${plan.name}` : `Get Started with ${plan.name}`}
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handlePortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Change Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(plan.tier)}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading && checkoutPlan === plan.tier ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Get Started
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
