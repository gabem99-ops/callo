/**
 * Shared data-fetching hooks for the Callo mobile app.
 *
 * Every hook follows the same pattern:
 *  1. Acquire a fresh Clerk token via useAuth().getToken()
 *  2. Set the token on the API client with api.setToken(token)
 *  3. Call the relevant API method
 *  4. Manage loading / error / data state
 *  5. Expose a refresh() helper for pull-to-refresh
 *
 * IMPORTANT: getToken is stored in a ref (not a useCallback dep) to prevent
 * infinite re-render loops. Clerk's getToken changes reference on every render.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import type { CallDetail } from "@/lib/api";
import type {
  DashboardStats,
  Call,
  Business,
  Subscription,
} from "@callo/shared";

// ---------------------------------------------------------------------------
// useStats
// ---------------------------------------------------------------------------

interface UseStatsResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useStats(): UseStatsResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getTokenRef.current();
      api.setToken(token);
      const result = await api.getStats();
      setStats(result.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load stats";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchStats();
    }
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

// ---------------------------------------------------------------------------
// useCalls
// ---------------------------------------------------------------------------

interface UseCallsResult {
  calls: Call[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useCalls(
  direction?: "inbound" | "outbound",
): UseCallsResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);
  const fetchedRef = useRef(false);
  const directionRef = useRef(direction);

  const fetchCalls = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (!append) {
          setLoading(true);
        }
        setError(null);

        const token = await getTokenRef.current();
        api.setToken(token);

        const params: Record<string, string | number | undefined> = {
          page,
          limit: 20,
        };
        if (directionRef.current) {
          params.direction = directionRef.current;
        }

        const result = await api.getCalls(params);
        const newCalls = result.data ?? [];

        if (append) {
          setCalls((prev) => [...prev, ...newCalls]);
        } else {
          setCalls(newCalls);
        }

        const totalPages = result.pagination?.totalPages ?? 1;
        setHasMore(page < totalPages);
        pageRef.current = page;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load calls";
        setError(message);
        setHasMore(false);
      } finally {
        setLoading(false);
        loadingMoreRef.current = false;
      }
    },
    [],
  );

  // Re-fetch when direction changes
  useEffect(() => {
    directionRef.current = direction;
    fetchedRef.current = true;
    pageRef.current = 1;
    fetchCalls(1, false);
  }, [direction, fetchCalls]);

  const refresh = useCallback(() => {
    pageRef.current = 1;
    fetchCalls(1, false);
  }, [fetchCalls]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    fetchCalls(pageRef.current + 1, true);
  }, [fetchCalls, hasMore]);

  return { calls, loading, error, refresh, loadMore, hasMore };
}

// ---------------------------------------------------------------------------
// useCallDetail
// ---------------------------------------------------------------------------

interface UseCallDetailResult {
  call: CallDetail | null;
  loading: boolean;
  error: string | null;
}

export function useCallDetail(id: string): UseCallDetailResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getTokenRef.current();
        api.setToken(token);
        const result = await api.getCall(id);
        if (!cancelled) setCall(result.data);
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load call details";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { call, loading, error };
}

// ---------------------------------------------------------------------------
// useBusiness
// ---------------------------------------------------------------------------

interface UseBusinessResult {
  business: Business | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBusiness(): UseBusinessResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getTokenRef.current();
      api.setToken(token);
      const result = await api.getBusiness();
      setBusiness(result.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load business";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  return { business, loading, error, refresh: fetchBusiness };
}

// ---------------------------------------------------------------------------
// useSubscription
// ---------------------------------------------------------------------------

interface UseSubscriptionResult {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSubscription(): UseSubscriptionResult {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getTokenRef.current();
      api.setToken(token);
      const result = await api.getSubscription();
      setSubscription(result.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load subscription";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return { subscription, loading, error, refresh: fetchSubscription };
}
