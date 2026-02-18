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
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Mic,
  Pencil,
  FileText,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

const mockScripts = [
  {
    id: "script_001",
    name: "Inbound Receptionist",
    type: "inbound" as const,
    voice: "Aria",
    tone: "Professional & Friendly",
    active: true,
    description:
      "Handles incoming calls, schedules appointments, and provides business information.",
    lastEdited: "Feb 14, 2026",
  },
  {
    id: "script_002",
    name: "Outbound Sales Qualifier",
    type: "outbound" as const,
    voice: "Marcus",
    tone: "Confident & Persuasive",
    active: true,
    description:
      "Qualifies leads through targeted questions and books sales demos.",
    lastEdited: "Feb 12, 2026",
  },
  {
    id: "script_003",
    name: "After Hours Support",
    type: "inbound" as const,
    voice: "Luna",
    tone: "Calm & Helpful",
    active: false,
    description:
      "Handles after-hours calls, takes messages, and routes emergencies.",
    lastEdited: "Feb 8, 2026",
  },
];

export default function ScriptsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Agents</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create and manage your AI phone agents. Each agent can handle different types of calls.
          </p>
        </div>
        <Link href="/dashboard/scripts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create AI Agent
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      {mockScripts.length === 0 && (
        <Card className="border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-zinc-800 p-4">
              <FileText className="h-10 w-10 text-zinc-600" />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-400">
              You haven&apos;t created any AI agents yet
            </p>
            <p className="mt-1 text-center text-xs text-zinc-600">
              Create your first one to start handling calls automatically.
            </p>
            <Link href="/dashboard/scripts/new" className="mt-6">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create AI Agent
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Scripts Grid */}
      {mockScripts.length > 0 && (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockScripts.map((script) => (
          <Link key={script.id} href={`/dashboard/scripts/${script.id}`}>
            <Card className="group cursor-pointer transition-colors hover:border-zinc-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="text-base">{script.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {script.type === "inbound" ? (
                        <Badge variant="default">
                          <ArrowDownLeft className="mr-1 h-3 w-3" />
                          Inbound
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <ArrowUpRight className="mr-1 h-3 w-3" />
                          Outbound
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {script.active ? (
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <ToggleRight className="h-5 w-5" />
                        <span className="text-xs font-medium">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <ToggleLeft className="h-5 w-5" />
                        <span className="text-xs font-medium">Inactive</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 line-clamp-2">
                  {script.description}
                </p>

                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5" />
                    <span>{script.voice}</span>
                  </div>
                  <span className="text-zinc-700">|</span>
                  <span>{script.tone}</span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
                  <span className="text-xs text-zinc-500">
                    Edited {script.lastEdited}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100">
                    <Pencil className="h-3 w-3" />
                    Edit
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
