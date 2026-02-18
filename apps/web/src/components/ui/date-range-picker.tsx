"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  className?: string;
}

function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className,
}: DateRangePickerProps) {
  const today = new Date().toISOString().split("T")[0];

  function setPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    onChange(
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0]
    );
  }

  function setThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    onChange(
      start.toISOString().split("T")[0],
      now.toISOString().split("T")[0]
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">From</label>
          <Input
            type="date"
            value={startDate}
            max={endDate || today}
            onChange={(e) => onChange(e.target.value, endDate)}
            className="w-auto [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">To</label>
          <Input
            type="date"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => onChange(startDate, e.target.value)}
            className="w-auto [color-scheme:dark]"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPreset(7)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          Last 7 days
        </button>
        <button
          type="button"
          onClick={() => setPreset(30)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          Last 30 days
        </button>
        <button
          type="button"
          onClick={setThisMonth}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          This month
        </button>
      </div>
    </div>
  );
}

export { DateRangePicker };
export type { DateRangePickerProps };
