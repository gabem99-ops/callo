"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Upload,
  Search,
  Users,
  ArrowUpDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useLeads } from "@/lib/hooks";
import { CsvImportModal } from "@/components/leads/csv-import-modal";

type LeadStatus = "new" | "contacted" | "qualified" | "disqualified";

const statusStyles: Record<
  LeadStatus,
  { label: string; variant: "default" | "warning" | "success" | "destructive" }
> = {
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "warning" },
  qualified: { label: "Qualified", variant: "success" },
  disqualified: { label: "Disqualified", variant: "destructive" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  // Debounced search - we pass the search param directly to the hook
  // The hook will re-fetch when the params change.
  const [searchQuery, setSearchQuery] = useState("");

  const { data, loading, error, refetch } = useLeads({
    search: searchQuery || undefined,
  });

  const leads = data?.data ?? [];

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setSearchQuery(search);
      }
    },
    [search],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      // If user clears the input, also clear the query
      if (e.target.value === "") {
        setSearchQuery("");
      }
    },
    [],
  );

  const handleImportSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Everyone who has called or been called by your AI. Import contacts to start outbound campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search leads by name, email, company, or phone... (press Enter)"
          value={search}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          className="h-10 w-full rounded-lg border border-zinc-800 bg-[#131318] pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-0">
            {/* Header Row Skeleton */}
            <div className="grid grid-cols-[1fr_140px_180px_140px_120px_110px_120px] gap-4 border-b border-zinc-800 px-6 py-3">
              {["Name", "Phone", "Email", "Company", "Source", "Status", "Date"].map(
                (header) => (
                  <div
                    key={header}
                    className="text-xs font-medium uppercase tracking-wider text-zinc-500"
                  >
                    {header}
                  </div>
                ),
              )}
            </div>
            {/* Row Skeletons */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_140px_180px_140px_120px_110px_120px] gap-4 px-6 py-4"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                  <div
                    key={j}
                    className="h-4 animate-pulse rounded bg-zinc-800"
                  />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {!loading && error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="mt-3 text-sm text-red-400">{error}</p>
            <Button variant="outline" className="mt-4" onClick={refetch}>
              <Loader2 className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && !error && (
        <Card>
          <CardContent className="p-0">
            {/* Header Row */}
            <div className="grid grid-cols-[1fr_140px_180px_140px_120px_110px_120px] gap-4 border-b border-zinc-800 px-6 py-3">
              {["Name", "Phone", "Email", "Company", "Source", "Status", "Date"].map(
                (header) => (
                  <button
                    key={header}
                    className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
                  >
                    {header}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                ),
              )}
            </div>

            {/* Rows */}
            {leads.map((lead, i) => {
              const status = statusStyles[(lead.status as LeadStatus) ?? "new"] ??
                statusStyles.new;
              const displayName = [lead.firstName, lead.lastName]
                .filter(Boolean)
                .join(" ") || "Unknown";

              return (
                <div
                  key={lead.id}
                  className={`grid grid-cols-[1fr_140px_180px_140px_120px_110px_120px] gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02] ${
                    i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
                  }`}
                >
                  <div className="text-sm font-medium text-white">
                    {displayName}
                  </div>
                  <div className="font-mono text-sm text-zinc-400">
                    {lead.phone}
                  </div>
                  <div className="truncate text-sm text-zinc-400">
                    {lead.email || "--"}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {lead.company || "--"}
                  </div>
                  <div>
                    <Badge variant="secondary">{lead.source || "manual"}</Badge>
                  </div>
                  <div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="text-sm text-zinc-500">
                    {lead.createdAt ? formatDate(lead.createdAt as unknown as string) : "--"}
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {leads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="h-10 w-10 text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-500">
                  {searchQuery ? "No leads match your search" : "No leads yet"}
                </p>
                {!searchQuery && (
                  <p className="mt-1 text-xs text-zinc-600">
                    Add leads manually or import from a CSV file.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination info */}
      {!loading && !error && data?.pagination && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Showing {leads.length} of {data.pagination.total} lead
            {data.pagination.total !== 1 ? "s" : ""}
          </span>
          {data.pagination.totalPages > 1 && (
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
          )}
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
