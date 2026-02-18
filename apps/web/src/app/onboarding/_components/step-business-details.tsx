"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TIMEZONE_LABELS: Record<string, string> = {
  "America/New_York": "Eastern Time (ET)",
  "America/Chicago": "Central Time (CT)",
  "America/Denver": "Mountain Time (MT)",
  "America/Los_Angeles": "Pacific Time (PT)",
  "America/Anchorage": "Alaska Time (AKT)",
  "America/Honolulu": "Hawaii Time (HT)",
  "America/Phoenix": "Arizona (MST, no DST)",
  "America/Indiana/Indianapolis": "Indiana (Eastern, no DST)",
  "Pacific/Auckland": "New Zealand (NZST)",
  "Australia/Sydney": "Australia Eastern (AEST)",
  "Europe/London": "United Kingdom (GMT/BST)",
  "Europe/Berlin": "Central European (CET)",
  "Asia/Tokyo": "Japan (JST)",
};

interface StepBusinessDetailsProps {
  businessName: string;
  phone: string;
  timezone: string;
  showTimezoneSelect: boolean;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeTimezone: (value: string) => void;
  onToggleTimezoneSelect: (show: boolean) => void;
}

export function StepBusinessDetails({
  businessName,
  phone,
  timezone,
  showTimezoneSelect,
  onChangeName,
  onChangePhone,
  onChangeTimezone,
  onToggleTimezoneSelect,
}: StepBusinessDetailsProps) {
  const timezoneDisplay = TIMEZONE_LABELS[timezone] || timezone;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Tell us about your business
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Your AI will use this to greet callers and handle calls properly.
            </p>
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Business name <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="e.g. Bright Smile Dental"
              value={businessName}
              onChange={(e) => onChangeName(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Business phone number
            </label>
            <Input
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => onChangePhone(e.target.value)}
              className="h-12 text-base"
            />
            <p className="text-xs text-zinc-500">
              Your existing business phone number (optional)
            </p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Timezone
            </label>
            {!showTimezoneSelect ? (
              <div className="flex items-center justify-between h-12 rounded-lg border border-zinc-800 bg-zinc-900 px-3">
                <span className="text-base text-zinc-100">
                  {timezoneDisplay}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleTimezoneSelect(true)}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <select
                value={timezone}
                onChange={(e) => {
                  onChangeTimezone(e.target.value);
                  onToggleTimezoneSelect(false);
                }}
                className="flex h-12 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
              >
                {Object.entries(TIMEZONE_LABELS).map(([tz, label]) => (
                  <option key={tz} value={tz} className="bg-zinc-900">
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
