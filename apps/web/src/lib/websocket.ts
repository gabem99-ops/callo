"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Derive a WebSocket URL from the server URL env var. */
const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001").replace(
    /^http/,
    "ws",
  );

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebSocketEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseWebSocketResult {
  /** Whether the WebSocket connection is currently open. */
  connected: boolean;
  /** Fine-grained connection status. */
  status: ConnectionStatus;
  /** All messages received (in chronological order). */
  messages: WebSocketEvent[];
  /** The most recently received event, or null. */
  lastEvent: WebSocketEvent | null;
  /** Send a JSON message to the server. */
  sendMessage: (message: Record<string, unknown>) => void;
  /** Manually trigger a reconnect (resets backoff). */
  reconnect: () => void;
  /** Manually disconnect (disables auto-reconnect). */
  disconnect: () => void;
}

// ---------------------------------------------------------------------------
// Reconnection tuning
// ---------------------------------------------------------------------------

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * `useWebSocket` opens a persistent WebSocket connection to the Callo live
 * monitor endpoint, authenticating with the current Clerk session token.
 *
 * The connection automatically reconnects with exponential backoff when it
 * drops and cleans itself up when the component unmounts.
 *
 * @param path         Path on the server to connect to (default "/live").
 * @param filterTypes  Optional array of event type strings. When provided only
 *                     events whose `type` is included will be stored in
 *                     `messages` and surfaced as `lastEvent`.
 */
export function useWebSocket(
  path: string = "/live",
  filterTypes?: string[],
): UseWebSocketResult {
  const { getToken } = useAuth();

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<WebSocketEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);

  // Refs survive re-renders / reconnections without triggering renders.
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const filterTypesRef = useRef(filterTypes);
  const manualDisconnectRef = useRef(false);

  // Keep filter ref in sync without re-creating the socket.
  useEffect(() => {
    filterTypesRef.current = filterTypes;
  }, [filterTypes]);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || manualDisconnectRef.current) return;
    clearReconnectTimer();

    const delay = backoffRef.current;
    backoffRef.current = Math.min(delay * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);

    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current && !manualDisconnectRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        connect();
      }
    }, delay);
  }, [clearReconnectTimer]); // connect is added below via ref pattern

  // ------------------------------------------------------------------
  // Connect
  // ------------------------------------------------------------------

  const connect = useCallback(async () => {
    // Tear down any prior socket
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    if (!mountedRef.current) return;
    manualDisconnectRef.current = false;
    setStatus("connecting");

    try {
      const token = await getToken();
      if (!token || !mountedRef.current) {
        setStatus("disconnected");
        return;
      }

      const url = `${WS_BASE}${path}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus("connected");
        // Reset backoff on successful connection
        backoffRef.current = INITIAL_BACKOFF_MS;
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const parsed: WebSocketEvent = JSON.parse(
            typeof event.data === "string"
              ? event.data
              : new TextDecoder().decode(event.data as ArrayBuffer),
          );

          // Apply optional type filter
          const filters = filterTypesRef.current;
          if (
            filters &&
            filters.length > 0 &&
            !filters.includes(parsed.type)
          ) {
            return;
          }

          setMessages((prev) => [...prev, parsed]);
          setLastEvent(parsed);
        } catch {
          // Ignore non-JSON frames (e.g. pings)
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        wsRef.current = null;
        setStatus("disconnected");
        scheduleReconnect();
      };

      ws.onerror = () => {
        // `onerror` is always followed by `onclose` which handles
        // reconnection. We just update the status flag here.
        if (mountedRef.current) {
          setStatus("error");
        }
      };
    } catch {
      // Token retrieval or WebSocket creation failed.
      if (mountedRef.current) {
        setStatus("error");
        scheduleReconnect();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, path, scheduleReconnect]);

  // ------------------------------------------------------------------
  // Public imperative methods
  // ------------------------------------------------------------------

  const sendMessage = useCallback(
    (message: Record<string, unknown>) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    },
    [],
  );

  const reconnect = useCallback(() => {
    clearReconnectTimer();
    backoffRef.current = INITIAL_BACKOFF_MS;
    manualDisconnectRef.current = false;
    connect();
  }, [connect, clearReconnectTimer]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close(1000, "Client disconnected");
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, [clearReconnectTimer]);

  // ------------------------------------------------------------------
  // Lifecycle: connect on mount, clean up on unmount
  // ------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    manualDisconnectRef.current = false;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [connect, clearReconnectTimer]);

  // ------------------------------------------------------------------
  // Return
  // ------------------------------------------------------------------

  return {
    connected: status === "connected",
    status,
    messages,
    lastEvent,
    sendMessage,
    reconnect,
    disconnect,
  };
}
