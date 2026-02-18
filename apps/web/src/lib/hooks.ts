"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type PaginatedResponse,
  type DataResponse,
} from "./api";
import type {
  Call,
  TranscriptEntry,
  Script,
  CreateScriptInput,
  Lead,
  CreateLeadInput,
  Campaign,
  CreateCampaignInput,
  PhoneNumber,
  DashboardStats,
  CallVolumeData,
  OutcomeBreakdown,
  Subscription,
  PlanConfig,
  Integration,
  Business,
} from "@callo/shared";
import type {
  CallDetail,
  CampaignDetail,
  UsageData,
  GoogleCalendarStatus,
  GoogleCalendarEvent,
} from "./api";

// ---------------------------------------------------------------------------
// Generic fetching hook
// ---------------------------------------------------------------------------

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseApiResult<T> {
  const { getToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track whether the component is still mounted to avoid state updates
  // after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      api.setToken(token);
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch",
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, ...deps]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// ---------------------------------------------------------------------------
// Generic mutation hook
// ---------------------------------------------------------------------------

interface UseMutationResult<T, A extends unknown[]> {
  mutate: (...args: A) => Promise<T>;
  loading: boolean;
  error: string | null;
}

export function useMutation<T, A extends unknown[]>(
  mutationFn: (...args: A) => Promise<T>,
): UseMutationResult<T, A> {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (...args: A): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        api.setToken(token);
        const result = await mutationFn(...args);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Operation failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getToken, mutationFn],
  );

  return { mutate, loading, error };
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export function useCalls(
  params?: Record<string, string | number | undefined>,
) {
  return useApi<PaginatedResponse<Call>>(
    () => api.getCalls(params),
    [JSON.stringify(params)],
  );
}

export function useCall(id: string) {
  return useApi<DataResponse<CallDetail>>(
    () => api.getCall(id),
    [id],
  );
}

export function useCallTranscript(id: string) {
  return useApi<DataResponse<TranscriptEntry[]>>(
    () => api.getCallTranscript(id),
    [id],
  );
}

// ---------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------

export function useScripts() {
  return useApi<DataResponse<Script[]>>(() => api.getScripts(), []);
}

export function useScript(id: string) {
  return useApi<DataResponse<Script>>(
    () => api.getScript(id),
    [id],
  );
}

export function useCreateScript() {
  return useMutation((data: CreateScriptInput) =>
    api.createScript(data),
  );
}

export function useUpdateScript() {
  return useMutation(
    (id: string, data: Partial<CreateScriptInput>) =>
      api.updateScript(id, data),
  );
}

export function useDeleteScript() {
  return useMutation((id: string) => api.deleteScript(id));
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export function useLeads(
  params?: Record<string, string | number | undefined>,
) {
  return useApi<PaginatedResponse<Lead>>(
    () => api.getLeads(params),
    [JSON.stringify(params)],
  );
}

export function useLead(id: string) {
  return useApi<DataResponse<Lead>>(() => api.getLead(id), [id]);
}

export function useCreateLead() {
  return useMutation((data: CreateLeadInput) =>
    api.createLead(data),
  );
}

export function useUpdateLead() {
  return useMutation(
    (id: string, data: Partial<CreateLeadInput>) =>
      api.updateLead(id, data),
  );
}

export function useDeleteLead() {
  return useMutation((id: string) => api.deleteLead(id));
}

export function useImportLeads() {
  return useMutation(
    (data: {
      csvData: string;
      columnMapping: Record<string, string>;
      skipFirstRow: boolean;
    }) => api.importLeads(data),
  );
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export function useCampaigns() {
  return useApi<DataResponse<Campaign[]>>(
    () => api.getCampaigns(),
    [],
  );
}

export function useCampaign(id: string) {
  return useApi<DataResponse<CampaignDetail>>(
    () => api.getCampaign(id),
    [id],
  );
}

export function useCreateCampaign() {
  return useMutation((data: CreateCampaignInput) =>
    api.createCampaign(data),
  );
}

export function useUpdateCampaign() {
  return useMutation(
    (
      id: string,
      data: Partial<Omit<CreateCampaignInput, "leadIds">>,
    ) => api.updateCampaign(id, data),
  );
}

export function useStartCampaign() {
  return useMutation((id: string) => api.startCampaign(id));
}

export function usePauseCampaign() {
  return useMutation((id: string) => api.pauseCampaign(id));
}

export function useCancelCampaign() {
  return useMutation((id: string) => api.cancelCampaign(id));
}

// ---------------------------------------------------------------------------
// Phone Numbers
// ---------------------------------------------------------------------------

export function usePhoneNumbers() {
  return useApi<DataResponse<PhoneNumber[]>>(
    () => api.getPhoneNumbers(),
    [],
  );
}

export function useAvailableNumbers() {
  return useApi(() => api.getAvailableNumbers(), []);
}

export function useBuyPhoneNumber() {
  return useMutation(
    (data: {
      areaCode?: string;
      friendlyName: string;
      scriptId?: string;
    }) => api.buyPhoneNumber(data),
  );
}

export function useImportPhoneNumber() {
  return useMutation(
    (data: {
      phoneNumber: string;
      friendlyName: string;
      twilioAccountSid: string;
      twilioAuthToken: string;
      scriptId?: string;
    }) => api.importPhoneNumber(data),
  );
}

export function useUpdatePhoneNumber() {
  return useMutation(
    (
      id: string,
      data: {
        friendlyName?: string;
        scriptId?: string | null;
        isActive?: boolean;
      },
    ) => api.updatePhoneNumber(id, data),
  );
}

export function useDeletePhoneNumber() {
  return useMutation((id: string) => api.deletePhoneNumber(id));
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function useDashboardStats() {
  return useApi<DataResponse<DashboardStats>>(
    () => api.getStats(),
    [],
  );
}

export function useCallVolume(startDate: string, endDate: string) {
  return useApi<DataResponse<CallVolumeData[]>>(
    () => api.getCallVolume(startDate, endDate),
    [startDate, endDate],
  );
}

export function useOutcomes(startDate: string, endDate: string) {
  return useApi<DataResponse<OutcomeBreakdown[]>>(
    () => api.getOutcomes(startDate, endDate),
    [startDate, endDate],
  );
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export function useSubscription() {
  return useApi<DataResponse<Subscription | null>>(
    () => api.getSubscription(),
    [],
  );
}

export function useUsage() {
  return useApi<DataResponse<UsageData | null>>(
    () => api.getUsage(),
    [],
  );
}

export function usePlans() {
  return useApi<DataResponse<PlanConfig[]>>(
    () => api.getPlans(),
    [],
  );
}

export function useCreateCheckout() {
  return useMutation((plan: string) => api.createCheckout(plan));
}

export function useCreatePortal() {
  return useMutation(() => api.createPortal());
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export function useIntegrations() {
  return useApi<DataResponse<Integration[]>>(
    () => api.getIntegrations(),
    [],
  );
}

export function useConnectGoogle() {
  return useMutation(() => api.connectGoogle());
}

export function useGoogleCalendarStatus() {
  return useApi<DataResponse<GoogleCalendarStatus>>(
    () => api.getGoogleCalendarStatus(),
    [],
  );
}

export function useGoogleCalendarEvents(maxResults?: number) {
  return useApi<DataResponse<GoogleCalendarEvent[]>>(
    () => api.getGoogleCalendarEvents(maxResults),
    [maxResults],
  );
}

export function useDisconnectGoogle() {
  return useMutation(() => api.disconnectGoogle());
}

export function useDisconnectIntegration() {
  return useMutation((id: string) =>
    api.disconnectIntegration(id),
  );
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export function useCompleteOnboarding() {
  return useMutation(
    (data: {
      industryTemplateId: string;
      useCases: string[];
      businessName: string;
      phone?: string;
      timezone: string;
      voiceId: string;
      greetingOverride?: string;
    }) => api.completeOnboarding(data),
  );
}

// ---------------------------------------------------------------------------
// Business
// ---------------------------------------------------------------------------

export function useBusiness() {
  return useApi<DataResponse<Business>>(() => api.getBusiness(), []);
}

export function useUpdateBusiness() {
  return useMutation(
    (
      data: Partial<{
        name: string;
        industry: string;
        timezone: string;
        phone: string;
        website: string;
      }>,
    ) => api.updateBusiness(data),
  );
}
