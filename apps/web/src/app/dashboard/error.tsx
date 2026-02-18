"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="rounded-full bg-red-500/10 p-4">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-white">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-zinc-400">
        An error occurred while loading this page. Please try again or contact
        support if the issue persists.
      </p>
      {error.message && (
        <p className="mt-2 rounded-lg bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-500">
          {error.message}
        </p>
      )}
      <Button onClick={reset} className="mt-6">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
