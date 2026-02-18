"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  usePhoneNumbers,
  useBuyPhoneNumber,
  useImportPhoneNumber,
  useUpdatePhoneNumber,
  useDeletePhoneNumber,
  useScripts,
} from "@/lib/hooks";
import {
  Plus,
  Phone,
  FileText,
  X,
  Search,
  Loader2,
  Download,
  Trash2,
  AlertCircle,
  RefreshCw,
  PhoneOff,
} from "lucide-react";
import { formatPhoneNumber } from "@callo/shared";
import type { PhoneNumber, Script } from "@callo/shared";

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function PhoneNumberSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-7 w-44 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-48 animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-5 w-16 animate-pulse rounded bg-zinc-800" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-zinc-800" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Slide-in Panel
// ---------------------------------------------------------------------------

function SlidePanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-800 bg-[#0E0E13] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Buy Number Panel Content
// ---------------------------------------------------------------------------

function BuyNumberPanel({
  onClose,
  onComplete,
  scripts,
}: {
  onClose: () => void;
  onComplete: () => void;
  scripts: Script[];
}) {
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [areaCode, setAreaCode] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const buyNumber = useBuyPhoneNumber();

  const handleBuy = useCallback(async () => {
    const result = await buyNumber.mutate({
      areaCode: areaCode || undefined,
      friendlyName: friendlyName || "New Number",
      scriptId: selectedScriptId || undefined,
    });
    if (result) {
      onComplete();
      onClose();
    }
  }, [buyNumber, areaCode, friendlyName, selectedScriptId, onComplete, onClose]);

  return (
    <div className="space-y-6">
      {step === "input" && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Area Code (optional)
            </label>
            <Input
              placeholder="e.g. 415, 212, 800"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              Leave blank for any available area code
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Friendly Name
            </label>
            <Input
              placeholder="e.g. Main Business Line"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Assign Script (optional)
            </label>
            <select
              value={selectedScriptId}
              onChange={(e) => setSelectedScriptId(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">No script</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            className="w-full"
            onClick={() => setStep("confirm")}
            disabled={!friendlyName.trim()}
          >
            <Search className="mr-2 h-4 w-4" />
            Search Available Numbers
          </Button>
        </>
      )}

      {step === "confirm" && (
        <>
          <Card className="border-indigo-500/20 bg-indigo-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-zinc-300">
                Ready to purchase a phone number
                {areaCode && ` with area code ${areaCode}`}
              </p>
              <div className="mt-3 space-y-1 text-xs text-zinc-500">
                <p>Name: {friendlyName || "New Number"}</p>
                {selectedScriptId && (
                  <p>
                    Script:{" "}
                    {scripts.find((s) => s.id === selectedScriptId)?.name ?? "None"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {buyNumber.error && (
            <p className="text-sm text-red-400">{buyNumber.error}</p>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep("input")}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleBuy}
              disabled={buyNumber.loading}
            >
              {buyNumber.loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Confirm Purchase
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import Number Panel Content
// ---------------------------------------------------------------------------

function ImportNumberPanel({
  onClose,
  onComplete,
  scripts,
}: {
  onClose: () => void;
  onComplete: () => void;
  scripts: Script[];
}) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const importNumber = useImportPhoneNumber();

  const handleImport = useCallback(async () => {
    const result = await importNumber.mutate({
      phoneNumber,
      friendlyName: friendlyName || "Imported Number",
      twilioAccountSid,
      twilioAuthToken,
      scriptId: selectedScriptId || undefined,
    });
    if (result) {
      onComplete();
      onClose();
    }
  }, [
    importNumber,
    phoneNumber,
    friendlyName,
    twilioAccountSid,
    twilioAuthToken,
    selectedScriptId,
    onComplete,
    onClose,
  ]);

  const canSubmit =
    phoneNumber.trim() &&
    friendlyName.trim() &&
    twilioAccountSid.trim() &&
    twilioAuthToken.trim();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Phone Number (E.164)
        </label>
        <Input
          placeholder="+15551234567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Friendly Name
        </label>
        <Input
          placeholder="e.g. Existing Business Line"
          value={friendlyName}
          onChange={(e) => setFriendlyName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Twilio Account SID
        </label>
        <Input
          placeholder="AC..."
          value={twilioAccountSid}
          onChange={(e) => setTwilioAccountSid(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Twilio Auth Token
        </label>
        <Input
          type="password"
          placeholder="Your Twilio auth token"
          value={twilioAuthToken}
          onChange={(e) => setTwilioAuthToken(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Assign Script (optional)
        </label>
        <select
          value={selectedScriptId}
          onChange={(e) => setSelectedScriptId(e.target.value)}
          className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">No script</option>
          {scripts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {importNumber.error && (
        <p className="text-sm text-red-400">{importNumber.error}</p>
      )}

      <Button
        className="w-full"
        onClick={handleImport}
        disabled={!canSubmit || importNumber.loading}
      >
        {importNumber.loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Import Number
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone Number Card
// ---------------------------------------------------------------------------

function PhoneNumberCard({
  phoneNumber,
  scripts,
  onRefresh,
}: {
  phoneNumber: PhoneNumber;
  scripts: Script[];
  onRefresh: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const updateNumber = useUpdatePhoneNumber();
  const deleteNumber = useDeletePhoneNumber();


  const handleToggleActive = useCallback(async () => {
    await updateNumber.mutate(phoneNumber.id, {
      isActive: !phoneNumber.isActive,
    });
    onRefresh();
  }, [updateNumber, phoneNumber, onRefresh]);

  const handleScriptChange = useCallback(
    async (scriptId: string) => {
      await updateNumber.mutate(phoneNumber.id, {
        scriptId: scriptId || null,
      });
      onRefresh();
    },
    [updateNumber, phoneNumber.id, onRefresh],
  );

  const handleDelete = useCallback(async () => {
    await deleteNumber.mutate(phoneNumber.id);
    setShowDeleteConfirm(false);
    onRefresh();
  }, [deleteNumber, phoneNumber.id, onRefresh]);

  return (
    <Card className="transition-colors hover:border-zinc-700">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Number Info */}
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-indigo-500/10 p-3">
              <Phone className="h-6 w-6 text-indigo-400" />
            </div>
            <div className="space-y-2">
              <p className="font-mono text-2xl font-bold text-white">
                {formatPhoneNumber(phoneNumber.number)}
              </p>
              <p className="text-sm font-medium text-zinc-300">
                {phoneNumber.friendlyName}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {/* Script dropdown */}
                  <select
                    value={phoneNumber.scriptId ?? ""}
                    onChange={(e) => handleScriptChange(e.target.value)}
                    className="rounded border-0 bg-transparent text-xs text-zinc-400 outline-none hover:text-zinc-200 focus:text-zinc-200"
                  >
                    <option value="">No Script</option>
                    {scripts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-zinc-700">|</span>
                <Badge variant="secondary">
                  {phoneNumber.capabilities?.voice ? "Voice" : "SMS"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: Status & Actions */}
          <div className="flex items-center gap-3">
            {/* Active toggle */}
            <button
              onClick={handleToggleActive}
              disabled={updateNumber.loading}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                phoneNumber.isActive
                  ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
              }`}
            >
              {updateNumber.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div
                  className={`h-2 w-2 rounded-full ${
                    phoneNumber.isActive ? "bg-emerald-500" : "bg-zinc-600"
                  }`}
                />
              )}
              {phoneNumber.isActive ? "Active" : "Inactive"}
            </button>

            {/* Delete */}
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteNumber.loading}
                >
                  {deleteNumber.loading ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-zinc-500 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PhoneNumbersPage() {
  const [buyPanelOpen, setBuyPanelOpen] = useState(false);
  const [importPanelOpen, setImportPanelOpen] = useState(false);

  const { data: phoneNumbersRes, loading, error, refetch } = usePhoneNumbers();
  const { data: scriptsRes } = useScripts();

  // Extract data arrays from the DataResponse wrappers
  const phoneNumbers: PhoneNumber[] =
    phoneNumbersRes && "data" in phoneNumbersRes
      ? (phoneNumbersRes.data as PhoneNumber[])
      : [];
  const scripts: Script[] =
    scriptsRes && "data" in scriptsRes
      ? (scriptsRes.data as Script[])
      : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Phone Numbers</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Get a phone number for your AI agent to answer. Callers dial this number and your AI picks up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setImportPanelOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Import Number
          </Button>
          <Button onClick={() => setBuyPanelOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Buy Number
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && phoneNumbers.length === 0 && (
        <Card className="border-red-500/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-red-500/10 p-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-300">
              Failed to load phone numbers
            </p>
            <p className="mt-1 text-xs text-zinc-500">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <PhoneNumberSkeleton />
          <PhoneNumberSkeleton />
        </div>
      )}

      {/* Phone Number Cards */}
      {!loading && phoneNumbers.length > 0 && (
        <div className="space-y-4">
          {phoneNumbers.map((num) => (
            <PhoneNumberCard
              key={num.id}
              phoneNumber={num}
              scripts={scripts}
              onRefresh={() => refetch()}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && phoneNumbers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-zinc-800 p-4">
              <PhoneOff className="h-10 w-10 text-zinc-600" />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-400">
              No phone numbers yet
            </p>
            <p className="mt-1 text-center text-xs text-zinc-600">
              Buy a new number or import an existing one to get started
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setImportPanelOpen(true)}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Import
              </Button>
              <Button size="sm" onClick={() => setBuyPanelOpen(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                Buy Number
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buy Number Slide-in Panel */}
      <SlidePanel
        open={buyPanelOpen}
        onClose={() => setBuyPanelOpen(false)}
        title="Buy Phone Number"
      >
        <BuyNumberPanel
          onClose={() => setBuyPanelOpen(false)}
          onComplete={() => refetch()}
          scripts={scripts}
        />
      </SlidePanel>

      {/* Import Number Slide-in Panel */}
      <SlidePanel
        open={importPanelOpen}
        onClose={() => setImportPanelOpen(false)}
        title="Import Phone Number"
      >
        <ImportNumberPanel
          onClose={() => setImportPanelOpen(false)}
          onComplete={() => refetch()}
          scripts={scripts}
        />
      </SlidePanel>
    </div>
  );
}
