"use client";

import { useCallback, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Database,
  Cloud,
  Zap,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import {
  useGoogleCalendarStatus,
  useConnectGoogle,
  useDisconnectGoogle,
} from "@/lib/hooks";

interface StaticIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "available" | "coming_soon";
  category: string;
}

const staticIntegrations: StaticIntegration[] = [
  {
    id: "hubspot",
    name: "HubSpot CRM",
    description:
      "Automatically sync leads, contacts, and call logs to your HubSpot CRM. Keep your sales pipeline updated in real time.",
    icon: Database,
    status: "coming_soon",
    category: "CRM",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description:
      "Push call data, leads, and appointments to Salesforce. Map custom fields and automate your sales workflow.",
    icon: Cloud,
    status: "coming_soon",
    category: "CRM",
  },
  {
    id: "zapier",
    name: "Zapier",
    description:
      "Connect Callo to 5,000+ apps with Zapier. Trigger workflows based on call events, new leads, and appointments.",
    icon: Zap,
    status: "coming_soon",
    category: "Automation",
  },
];

function GoogleCalendarCard() {
  const { data: statusData, loading: statusLoading, refetch } = useGoogleCalendarStatus();
  const { mutate: connectGoogle, loading: connectLoading } = useConnectGoogle();
  const { mutate: disconnectGoogle, loading: disconnectLoading } = useDisconnectGoogle();
  const [error, setError] = useState<string | null>(null);

  const status = statusData?.data;
  const isConnected = status?.connected === true;
  const email = status?.email;

  const handleConnect = useCallback(async () => {
    setError(null);
    try {
      const result = await connectGoogle();
      if (result?.data?.authUrl) {
        // Redirect to Google OAuth consent screen
        window.location.href = result.data.authUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Google connection");
    }
  }, [connectGoogle]);

  const handleDisconnect = useCallback(async () => {
    setError(null);
    try {
      await disconnectGoogle();
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Google Calendar");
    }
  }, [disconnectGoogle, refetch]);

  return (
    <Card className="transition-colors hover:border-zinc-700">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="rounded-xl bg-[#1A1A22] p-3 border border-zinc-800">
            <Calendar className="h-7 w-7 text-indigo-400" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">
                Google Calendar
              </h3>
              <Badge variant="secondary">Scheduling</Badge>
              {isConnected && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <Check className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              Sync appointments booked by your AI agent directly to Google
              Calendar. Two-way sync ensures availability is always up to date.
            </p>

            {/* Connected email */}
            {isConnected && email && (
              <p className="text-xs text-zinc-500">
                Connected as <span className="text-zinc-300">{email}</span>
              </p>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action */}
            <div className="flex items-center gap-2 pt-1">
              {statusLoading ? (
                <Button size="sm" disabled>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Loading...
                </Button>
              ) : isConnected ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnectLoading}
                >
                  {disconnectLoading ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="mr-2 h-3.5 w-3.5" />
                  )}
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={connectLoading}
                >
                  {connectLoading ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  )}
                  Connect
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Connect Callo with your favorite tools and services
        </p>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Google Calendar - dynamic card with real status */}
        <GoogleCalendarCard />

        {/* Static integration cards */}
        {staticIntegrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card
              key={integration.id}
              className="transition-colors hover:border-zinc-700"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="rounded-xl bg-[#1A1A22] p-3 border border-zinc-800">
                    <Icon className="h-7 w-7 text-indigo-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">
                        {integration.name}
                      </h3>
                      <Badge variant="secondary">{integration.category}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {integration.description}
                    </p>

                    {/* Action */}
                    <div className="pt-1">
                      {integration.status === "coming_soon" && (
                        <Badge variant="outline">Coming Soon</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
