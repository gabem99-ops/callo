"use client";

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
  Building2,
  Bell,
  Users,
  Key,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useBusiness, useUpdateBusiness } from "@/lib/hooks";

function InputField({
  label,
  placeholder,
  type = "text",
  value = "",
  onChange,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 w-full rounded-lg border border-zinc-800 bg-[#0D0D0F] px-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-[#0D0D0F] px-3 text-sm text-white outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

const mockTeamMembers = [
  { name: "Gabe Montoya", email: "gabe@callo.ai", role: "Owner" },
  { name: "Alex Rivera", email: "alex@callo.ai", role: "Admin" },
];

const mockApiKeys = [
  {
    name: "Production Key",
    key: "sk_live_••••••••••••••••4f2a",
    created: "Feb 1, 2026",
  },
  {
    name: "Development Key",
    key: "sk_test_••••••••••••••••8b1c",
    created: "Jan 20, 2026",
  },
];

export default function SettingsPage() {
  const [showKey, setShowKey] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Business form state
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Fetch business data
  const { data: businessData, loading: businessLoading } = useBusiness();
  const { mutate: updateBusiness, loading: saving } = useUpdateBusiness();

  // Populate form when business data loads
  useEffect(() => {
    if (businessData?.data) {
      const biz = businessData.data;
      setName(biz.name ?? "");
      setIndustry(biz.industry ?? "");
      setTimezone(biz.timezone ?? "America/New_York");
      setPhone(biz.phone ?? "");
      setWebsite(biz.website ?? "");
    }
  }, [businessData]);

  // Handle save
  const handleSave = async () => {
    try {
      await updateBusiness({ name, industry, timezone, phone, website });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // Error is handled by the mutation hook
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your account, team, and preferences
        </p>
      </div>

      {/* Business Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/10 p-2">
              <Building2 className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Your business information used by AI agents
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {businessLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Business Name"
                  placeholder="Enter business name"
                  value={name}
                  onChange={setName}
                />
                <SelectField
                  label="Industry"
                  options={[
                    "",
                    "Technology",
                    "Healthcare",
                    "Legal",
                    "Real Estate",
                    "Finance",
                    "Retail",
                    "Other",
                  ]}
                  value={industry}
                  onChange={setIndustry}
                />
                <SelectField
                  label="Timezone"
                  options={[
                    "America/New_York",
                    "America/Chicago",
                    "America/Denver",
                    "America/Los_Angeles",
                    "America/Anchorage",
                    "Pacific/Honolulu",
                  ]}
                  value={timezone}
                  onChange={setTimezone}
                />
                <InputField
                  label="Phone"
                  placeholder="+1 (555) 000-0000"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                />
                <div className="sm:col-span-2">
                  <InputField
                    label="Website"
                    placeholder="https://example.com"
                    type="url"
                    value={website}
                    onChange={setWebsite}
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                    <Check className="h-4 w-4" />
                    Changes saved
                  </span>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/10 p-2">
              <Bell className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure how you receive alerts and updates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                title: "New call completed",
                description: "Get notified when an AI call finishes",
                enabled: true,
              },
              {
                title: "Appointment booked",
                description: "Alert when a new appointment is scheduled",
                enabled: true,
              },
              {
                title: "Lead captured",
                description:
                  "Notification when a new lead is captured from a call",
                enabled: false,
              },
              {
                title: "Weekly summary",
                description:
                  "Receive a weekly report of call activity and outcomes",
                enabled: true,
              },
            ].map((notif) => (
              <div
                key={notif.title}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#0D0D0F] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {notif.title}
                  </p>
                  <p className="text-xs text-zinc-500">{notif.description}</p>
                </div>
                <div
                  className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                    notif.enabled ? "bg-indigo-600" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      notif.enabled ? "left-6" : "left-1"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-500/10 p-2">
                <Users className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage who has access to your account
                </CardDescription>
              </div>
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Invite
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTeamMembers.map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#0D0D0F] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-medium text-indigo-400">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {member.name}
                    </p>
                    <p className="text-xs text-zinc-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      member.role === "Owner" ? "default" : "secondary"
                    }
                  >
                    {member.role}
                  </Badge>
                  {member.role !== "Owner" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-zinc-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-500/10 p-2">
                <Key className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage API keys for programmatic access
                </CardDescription>
              </div>
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockApiKeys.map((apiKey) => (
              <div
                key={apiKey.name}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#0D0D0F] px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">
                    {apiKey.name}
                  </p>
                  <p className="font-mono text-xs text-zinc-500">
                    {showKey === apiKey.name
                      ? apiKey.key.replace(/••••••••••••••••/, "a1b2c3d4e5f6g7h8")
                      : apiKey.key}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Created {apiKey.created}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setShowKey(
                        showKey === apiKey.name ? null : apiKey.name
                      )
                    }
                  >
                    {showKey === apiKey.name ? (
                      <EyeOff className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-zinc-500" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4 text-zinc-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-zinc-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
