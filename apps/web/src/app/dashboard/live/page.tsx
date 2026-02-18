"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useWebSocket,
} from "@/lib/websocket";
import {
  Radio,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Bot,
  User,
  PhoneOff,
  Wifi,
  WifiOff,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from "lucide-react";
import { formatPhoneNumber } from "@callo/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveCall {
  callId: string;
  direction: "inbound" | "outbound";
  fromNumber: string;
  toNumber: string;
  scriptName: string;
  startedAt: number; // epoch ms
  sentiment?: "positive" | "neutral" | "negative";
}

interface TranscriptMessage {
  id: string;
  callId: string;
  speaker: "ai" | "caller";
  text: string;
  timestamp: string; // display timestamp like "0:12"
}

interface RecentCall {
  callId: string;
  direction: "inbound" | "outbound";
  fromNumber: string;
  toNumber: string;
  durationSeconds: number;
  outcome: string;
  endedAt: string;
}

// ---------------------------------------------------------------------------
// Demo Mode Mock Data & Engine
// ---------------------------------------------------------------------------

const DEMO_SCRIPTS = ["Inbound Receptionist", "Outbound Sales Qualifier", "Support Agent"];

const DEMO_CONVERSATIONS: string[][] = [
  [
    "Thank you for calling Acme Services. My name is Aria. How can I help you today?",
    "Hi, I'd like to schedule an appointment for a consultation next week.",
    "I'd be happy to help you schedule a consultation. Could you tell me your preferred day and time? We have availability on Tuesday, Wednesday, and Thursday.",
    "Wednesday afternoon would work great, maybe around 2 PM?",
    "Perfect, let me check availability for Wednesday at 2 PM. Could I get your name and phone number to book that for you?",
    "Sure, it's Sarah Johnson, and my number is 555-234-5678.",
    "Wonderful, Sarah. I've booked you for Wednesday at 2 PM. You'll receive a confirmation text shortly. Is there anything else I can help with?",
    "No, that's everything. Thank you so much!",
    "You're welcome, Sarah! Have a great day. Goodbye!",
  ],
  [
    "Hello, this is Aria from Apex Digital. Am I speaking with the business owner?",
    "Yes, this is Mike. What's this about?",
    "Hi Mike, I'm reaching out because we help local businesses get more customers through digital advertising. Do you have a moment?",
    "I'm pretty busy right now, can you make it quick?",
    "Absolutely. In 30 seconds -- we've helped businesses like yours increase leads by 40%. Could I send you a quick case study?",
    "Alright, sure. Send it to mike@mikescoffee.com.",
    "Perfect, I'll send that right over. Would next Tuesday work for a brief 10-minute follow-up call?",
    "Yeah, Tuesday afternoon works.",
    "Great, I'll call you at 2 PM on Tuesday. Thanks for your time, Mike!",
  ],
];

function randomPhone(): string {
  const area = Math.floor(Math.random() * 900 + 100);
  const prefix = Math.floor(Math.random() * 900 + 100);
  const line = Math.floor(Math.random() * 9000 + 1000);
  return `+1${area}${prefix}${line}`;
}

function useDemoMode(enabled: boolean) {
  const [activeCalls, setActiveCalls] = useState<Map<string, ActiveCall>>(new Map());
  const [transcripts, setTranscripts] = useState<Map<string, TranscriptMessage[]>>(new Map());
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<Map<string, boolean>>(new Map());

  const callCounterRef = useRef(0);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const startDemoCall = useCallback(() => {
    const id = `demo_call_${++callCounterRef.current}`;
    const direction = Math.random() > 0.4 ? "inbound" : "outbound";
    const convo = DEMO_CONVERSATIONS[Math.floor(Math.random() * DEMO_CONVERSATIONS.length)];
    const fromNum = direction === "inbound" ? randomPhone() : "+15551002000";
    const toNum = direction === "inbound" ? "+15551002000" : randomPhone();

    const call: ActiveCall = {
      callId: id,
      direction,
      fromNumber: fromNum,
      toNumber: toNum,
      scriptName: DEMO_SCRIPTS[Math.floor(Math.random() * DEMO_SCRIPTS.length)],
      startedAt: Date.now(),
      sentiment: "neutral",
    };

    setActiveCalls((prev) => new Map(prev).set(id, call));
    setTranscripts((prev) => new Map(prev).set(id, []));

    // Drip transcript messages
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      if (msgIndex >= convo.length) {
        clearInterval(msgInterval);
        // End call after a short delay
        setTimeout(() => {
          setActiveCalls((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
          setIsSpeaking((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
          const dur = Math.floor((Date.now() - call.startedAt) / 1000);
          const outcomes = ["appointment_booked", "lead_captured", "info_provided", "transferred"];
          setRecentCalls((prev) =>
            [
              {
                callId: id,
                direction: direction as "inbound" | "outbound",
                fromNumber: fromNum,
                toNumber: toNum,
                durationSeconds: dur,
                outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
                endedAt: new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 5),
          );
        }, 2000);
        return;
      }

      const speaker: "ai" | "caller" = msgIndex % 2 === 0 ? "ai" : "caller";
      const elapsed = Math.floor((Date.now() - call.startedAt) / 1000);
      const mm = Math.floor(elapsed / 60);
      const ss = String(elapsed % 60).padStart(2, "0");

      // Show typing indicator before AI speaks
      if (speaker === "ai") {
        setIsSpeaking((prev) => new Map(prev).set(id, true));
      }

      const deliverMsg = () => {
        setIsSpeaking((prev) => new Map(prev).set(id, false));
        const msg: TranscriptMessage = {
          id: `msg_${id}_${msgIndex}`,
          callId: id,
          speaker,
          text: convo[msgIndex],
          timestamp: `${mm}:${ss}`,
        };
        setTranscripts((prev) => {
          const next = new Map(prev);
          const existing = next.get(id) ?? [];
          next.set(id, [...existing, msg]);
          return next;
        });

        // Update sentiment mid-call
        if (msgIndex > 2) {
          setActiveCalls((prev) => {
            const next = new Map(prev);
            const c = next.get(id);
            if (c) {
              next.set(id, { ...c, sentiment: "positive" });
            }
            return next;
          });
        }

        msgIndex++;
      };

      if (speaker === "ai") {
        setTimeout(deliverMsg, 1200);
      } else {
        deliverMsg();
      }
    }, 3500);

    intervalsRef.current.push(msgInterval);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Start first demo call immediately
    const t1 = setTimeout(() => startDemoCall(), 500);
    // Start another after a few seconds
    const t2 = setTimeout(() => startDemoCall(), 6000);
    // Keep spawning new calls periodically
    const spawnInterval = setInterval(() => {
      if (activeCalls.size < 3) {
        startDemoCall();
      }
    }, 18000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(spawnInterval);
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { activeCalls, transcripts, recentCalls, isSpeaking };
}

// ---------------------------------------------------------------------------
// Duration timer component
// ---------------------------------------------------------------------------

function DurationTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, "0");
  return <span className="font-mono text-emerald-400">{mm}:{ss}</span>;
}

// ---------------------------------------------------------------------------
// Outcome label helper
// ---------------------------------------------------------------------------

function outcomeLabel(outcome: string): string {
  const map: Record<string, string> = {
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
  return map[outcome] ?? outcome;
}

function formatDurationClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function LiveMonitorPage() {
  const [demoMode, setDemoMode] = useState(true);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Real WebSocket (connects when demoMode is off)
  const {
    connected: wsConnected,
    status: wsStatus,
    lastEvent,
  } = useWebSocket("/live", [
    "call_started",
    "call_ended",
    "transcript_update",
    "speech_update",
    "connected",
  ]);

  // Real state (for live WebSocket mode)
  const [wsActiveCalls, setWsActiveCalls] = useState<Map<string, ActiveCall>>(new Map());
  const [wsTranscripts, setWsTranscripts] = useState<Map<string, TranscriptMessage[]>>(new Map());
  const [wsRecentCalls, setWsRecentCalls] = useState<RecentCall[]>([]);
  const [wsIsSpeaking, setWsIsSpeaking] = useState<Map<string, boolean>>(new Map());

  // Demo mode engine
  const demo = useDemoMode(demoMode);

  // Choose which data source to use
  const activeCalls = demoMode ? demo.activeCalls : wsActiveCalls;
  const transcripts = demoMode ? demo.transcripts : wsTranscripts;
  const recentCalls = demoMode ? demo.recentCalls : wsRecentCalls;
  const isSpeaking = demoMode ? demo.isSpeaking : wsIsSpeaking;

  // Handle real WebSocket events
  useEffect(() => {
    if (demoMode || !lastEvent) return;

    const { type, data } = lastEvent;

    switch (type) {
      case "call_started": {
        const call: ActiveCall = {
          callId: data.callId as string,
          direction: data.direction as "inbound" | "outbound",
          fromNumber: data.fromNumber as string,
          toNumber: data.toNumber as string,
          scriptName: (data.scriptName as string) ?? "Unknown Script",
          startedAt: Date.now(),
          sentiment: "neutral",
        };
        setWsActiveCalls((prev) => new Map(prev).set(call.callId, call));
        setWsTranscripts((prev) => new Map(prev).set(call.callId, []));
        break;
      }

      case "call_ended": {
        const callId = data.callId as string;
        const ended = wsActiveCalls.get(callId);
        setWsActiveCalls((prev) => {
          const next = new Map(prev);
          next.delete(callId);
          return next;
        });
        setWsIsSpeaking((prev) => {
          const next = new Map(prev);
          next.delete(callId);
          return next;
        });
        if (ended) {
          setWsRecentCalls((prev) =>
            [
              {
                callId,
                direction: ended.direction,
                fromNumber: ended.fromNumber,
                toNumber: ended.toNumber,
                durationSeconds: (data.durationSeconds as number) ?? Math.floor((Date.now() - ended.startedAt) / 1000),
                outcome: (data.outcome as string) ?? "unknown",
                endedAt: new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 5),
          );
        }
        break;
      }

      case "transcript_update": {
        const callId = data.callId as string;
        const msg: TranscriptMessage = {
          id: data.id as string ?? `ws_${Date.now()}`,
          callId,
          speaker: data.speaker as "ai" | "caller",
          text: data.text as string,
          timestamp: (data.displayTimestamp as string) ?? "",
        };
        setWsTranscripts((prev) => {
          const next = new Map(prev);
          const existing = next.get(callId) ?? [];
          next.set(callId, [...existing, msg]);
          return next;
        });
        setWsIsSpeaking((prev) => new Map(prev).set(callId, false));
        break;
      }

      case "speech_update": {
        const callId = data.callId as string;
        const speaking = data.isSpeaking as boolean;
        setWsIsSpeaking((prev) => new Map(prev).set(callId, speaking));
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent, demoMode]);

  // Auto-select the first active call when none is selected
  useEffect(() => {
    if (selectedCallId && activeCalls.has(selectedCallId)) return;
    const first = activeCalls.keys().next().value;
    setSelectedCallId((first as string) ?? null);
  }, [activeCalls, selectedCallId]);

  const activeCallsList = Array.from(activeCalls.values());
  const selectedTranscript = selectedCallId
    ? transcripts.get(selectedCallId) ?? []
    : [];
  const selectedCall = selectedCallId
    ? activeCalls.get(selectedCallId) ?? null
    : null;
  const isSelectedSpeaking = selectedCallId
    ? isSpeaking.get(selectedCallId) ?? false
    : false;

  // Auto-scroll transcript
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTranscript.length, isSelectedSpeaking]);

  const isConnected = demoMode || wsConnected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Live Calls</h1>
            <span className="relative flex h-3 w-3">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  isConnected ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </span>
            <span className="text-sm text-zinc-400">
              {activeCallsList.length} active call{activeCallsList.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Watch your AI handle calls in real-time. See the conversation as it happens.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            <span className={isConnected ? "text-emerald-400" : "text-red-400"}>
              {demoMode ? "Demo" : wsStatus === "connected" ? "Connected" : wsStatus === "connecting" ? "Connecting..." : "Disconnected"}
            </span>
          </div>

          {/* Demo mode toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700/50"
          >
            {demoMode ? (
              <ToggleRight className="h-4 w-4 text-indigo-400" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-zinc-500" />
            )}
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Demo Mode
          </button>
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Panel -- Active Calls List */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Active Calls
          </h2>

          {activeCallsList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="rounded-full bg-zinc-800 p-5">
                    <PhoneOff className="h-8 w-8 text-zinc-600" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-600 opacity-40" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-zinc-700" />
                  </span>
                </div>
                <p className="mt-5 text-sm font-medium text-zinc-400">
                  No active calls
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Waiting for calls...
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeCallsList.map((call) => {
                const isSelected = selectedCallId === call.callId;
                return (
                  <button
                    key={call.callId}
                    onClick={() => setSelectedCallId(call.callId)}
                    className="w-full text-left"
                  >
                    <Card
                      className={`transition-all ${
                        isSelected
                          ? "border-indigo-500/40 bg-indigo-500/[0.05] ring-1 ring-indigo-500/20"
                          : "border-emerald-500/20 bg-emerald-500/[0.03] hover:border-zinc-600"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div
                                className={`rounded-lg p-2 ${
                                  isSelected ? "bg-indigo-500/10" : "bg-emerald-500/10"
                                }`}
                              >
                                {call.direction === "inbound" ? (
                                  <PhoneIncoming
                                    className={`h-5 w-5 ${
                                      isSelected ? "text-indigo-400" : "text-emerald-400"
                                    }`}
                                  />
                                ) : (
                                  <PhoneOutgoing
                                    className={`h-5 w-5 ${
                                      isSelected ? "text-indigo-400" : "text-emerald-400"
                                    }`}
                                  />
                                )}
                              </div>
                              {/* Animated pulse ring */}
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={call.direction === "inbound" ? "default" : "warning"}
                                  className="text-[10px]"
                                >
                                  {call.direction === "inbound" ? "Inbound" : "Outbound"}
                                </Badge>
                              </div>
                              <p className="mt-1 font-mono text-sm text-zinc-300">
                                {formatPhoneNumber(
                                  call.direction === "inbound" ? call.fromNumber : call.toNumber,
                                )}
                              </p>
                            </div>
                          </div>
                          <Badge variant="success">
                            <Radio className="mr-1 h-3 w-3" />
                            Live
                          </Badge>
                        </div>

                        <div className="mt-3 flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <Clock className="h-3.5 w-3.5" />
                            <DurationTimer startedAt={call.startedAt} />
                          </div>
                          <div className="text-zinc-500 text-xs">
                            Script: {call.scriptName}
                          </div>
                        </div>

                        {call.sentiment && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  call.sentiment === "positive"
                                    ? "w-[80%] bg-emerald-500"
                                    : call.sentiment === "neutral"
                                      ? "w-[50%] bg-amber-500"
                                      : "w-[25%] bg-red-500"
                                }`}
                              />
                            </div>
                            <span className="text-[10px] text-zinc-500 capitalize">
                              {call.sentiment}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}

          {/* Recent Calls */}
          {recentCalls.length > 0 && (
            <div className="mt-6 space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
                Recent Calls
              </h2>
              {recentCalls.map((call) => (
                <Card key={call.callId} className="border-zinc-800">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-zinc-800 p-1.5">
                          {call.direction === "inbound" ? (
                            <PhoneIncoming className="h-4 w-4 text-zinc-500" />
                          ) : (
                            <PhoneOutgoing className="h-4 w-4 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-mono text-xs text-zinc-400">
                            {formatPhoneNumber(
                              call.direction === "inbound" ? call.fromNumber : call.toNumber,
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-600">
                            {formatDurationClock(call.durationSeconds)} --{" "}
                            {outcomeLabel(call.outcome)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        Ended
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel -- Live Transcript */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Live Transcript
          </h2>

          <Card className="flex h-[600px] flex-col">
            {selectedCall ? (
              <>
                <CardHeader className="shrink-0 border-b border-zinc-800 py-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-sm">
                        {selectedCall.direction === "inbound" ? "Inbound" : "Outbound"} Call
                      </CardTitle>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="font-mono">
                          {formatPhoneNumber(selectedCall.fromNumber)}
                        </span>
                        <span className="text-zinc-700">&rarr;</span>
                        <span className="font-mono">
                          {formatPhoneNumber(selectedCall.toNumber)}
                        </span>
                        <span className="text-zinc-700">|</span>
                        <DurationTimer startedAt={selectedCall.startedAt} />
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 font-mono text-xs text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      LIVE
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {selectedTranscript.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${
                          msg.speaker === "ai" ? "justify-start" : "justify-end"
                        }`}
                      >
                        {msg.speaker === "ai" && (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                            <Bot className="h-4 w-4 text-zinc-400" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                            msg.speaker === "ai"
                              ? "bg-zinc-800 text-zinc-200"
                              : "border border-indigo-500/20 bg-indigo-600/20 text-indigo-100"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <p
                            className={`mt-1 text-right font-mono text-[10px] ${
                              msg.speaker === "ai"
                                ? "text-zinc-500"
                                : "text-indigo-400/60"
                            }`}
                          >
                            {msg.timestamp}
                          </p>
                        </div>
                        {msg.speaker === "caller" && (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                            <User className="h-4 w-4 text-indigo-400" />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {isSelectedSpeaking && (
                      <div className="flex gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                          <Bot className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="rounded-xl bg-zinc-800 px-4 py-3">
                          <div className="flex gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:0ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={transcriptEndRef} />
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-1 flex-col items-center justify-center">
                <div className="rounded-full bg-zinc-800 p-4">
                  <Phone className="h-8 w-8 text-zinc-600" />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-400">
                  No call selected
                </p>
                <p className="mt-1 text-center text-xs text-zinc-600">
                  Select an active call from the left panel<br />
                  to view the live transcript
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
