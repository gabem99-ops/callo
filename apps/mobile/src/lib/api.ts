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
  UsageRecord,
  PlanConfig,
  Integration,
  Business,
} from "@callo/shared";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = "http://localhost:3001";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Response envelope types (match server response shapes)
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DataResponse<T> {
  data: T;
}

export interface MessageResponse {
  message: string;
}

// ---------------------------------------------------------------------------
// Specific response shapes for composite endpoints
// ---------------------------------------------------------------------------

export interface CallDetail extends Call {
  transcript: TranscriptEntry[];
}

export interface ScriptPreview {
  systemPrompt: string;
  script: Script;
}

export interface CampaignDetail extends Campaign {
  leadStats: { status: string; count: number }[];
  leads: { campaignLead: Record<string, unknown>; lead: Lead }[];
}

export interface UsageData {
  period: { start: string; end: string };
  plan: string;
  minutesIncluded: number;
  minutesUsed: number;
  minutesRemaining: number;
  percentUsed: number;
  phoneNumbersUsed: number;
  phoneNumbersIncluded: number;
  totals: {
    totalCalls: number;
    inboundCalls: number;
    outboundCalls: number;
    totalMinutes: number;
    appointmentsBooked: number;
    leadsCaptured: number;
    totalCostCents: number;
  };
  daily: UsageRecord[];
}

export interface CheckoutResponse {
  url: string;
  sessionId: string;
}

export interface PortalResponse {
  url: string;
}

export interface GoogleConnectResponse {
  authUrl: string;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
  status: string;
  connectedAt?: string;
  tokenExpiresAt?: string;
}

export interface GoogleCallbackResponse {
  provider: string;
  status: string;
  email: string | null;
  message: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  start: string;
  end: string;
  htmlLink: string;
  status: string;
  attendees?: Array<{
    email: string;
    name: string | null;
    responseStatus: string;
  }>;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

export class ApiClient {
  private token: string | null = null;

  /** Call this before every request batch with a fresh Clerk token. */
  setToken(token: string | null): void {
    this.token = token;
  }

  // -- Generic request helper ------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorBody = await res
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new ApiError(
        res.status,
        errorBody.error || errorBody.message || "Request failed",
      );
    }

    // Some DELETE endpoints return 204 with no body
    const text = await res.text();
    if (!text) return undefined as T;

    return JSON.parse(text) as T;
  }

  // Convenience wrappers
  private get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  private del<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  // -- Query-string helper ---------------------------------------------------

  private qs(params?: Record<string, string | number | undefined>): string {
    if (!params) return "";
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== "",
    );
    if (entries.length === 0) return "";
    const search = new URLSearchParams(
      entries.map(([k, v]) => [k, String(v)]),
    );
    return `?${search.toString()}`;
  }

  // ── Calls ─────────────────────────────────────────────────────────────────

  getCalls(
    params?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<Call>> {
    return this.get(`/api/calls${this.qs(params)}`);
  }

  getCall(id: string): Promise<DataResponse<CallDetail>> {
    return this.get(`/api/calls/${id}`);
  }

  getCallTranscript(id: string): Promise<DataResponse<TranscriptEntry[]>> {
    return this.get(`/api/calls/${id}/transcript`);
  }

  // ── Scripts ───────────────────────────────────────────────────────────────

  getScripts(): Promise<DataResponse<Script[]>> {
    return this.get("/api/scripts");
  }

  getScript(id: string): Promise<DataResponse<Script>> {
    return this.get(`/api/scripts/${id}`);
  }

  previewScript(id: string): Promise<DataResponse<ScriptPreview>> {
    return this.get(`/api/scripts/${id}/preview`);
  }

  createScript(data: CreateScriptInput): Promise<DataResponse<Script>> {
    return this.post("/api/scripts", data);
  }

  updateScript(
    id: string,
    data: Partial<CreateScriptInput>,
  ): Promise<DataResponse<Script>> {
    return this.put(`/api/scripts/${id}`, data);
  }

  deleteScript(id: string): Promise<MessageResponse> {
    return this.del(`/api/scripts/${id}`);
  }

  // ── Leads ─────────────────────────────────────────────────────────────────

  getLeads(
    params?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<Lead>> {
    return this.get(`/api/leads${this.qs(params)}`);
  }

  getLead(id: string): Promise<DataResponse<Lead>> {
    return this.get(`/api/leads/${id}`);
  }

  createLead(data: CreateLeadInput): Promise<DataResponse<Lead>> {
    return this.post("/api/leads", data);
  }

  updateLead(
    id: string,
    data: Partial<CreateLeadInput>,
  ): Promise<DataResponse<Lead>> {
    return this.put(`/api/leads/${id}`, data);
  }

  deleteLead(id: string): Promise<MessageResponse> {
    return this.del(`/api/leads/${id}`);
  }

  importLeads(data: {
    csvData: string;
    columnMapping: Record<string, string>;
    skipFirstRow: boolean;
  }): Promise<DataResponse<{ imported: number; skipped: number; errors: string[] }>> {
    return this.post("/api/leads/import", data);
  }

  // ── Campaigns ─────────────────────────────────────────────────────────────

  getCampaigns(): Promise<DataResponse<Campaign[]>> {
    return this.get("/api/campaigns");
  }

  getCampaign(id: string): Promise<DataResponse<CampaignDetail>> {
    return this.get(`/api/campaigns/${id}`);
  }

  createCampaign(data: CreateCampaignInput): Promise<DataResponse<Campaign>> {
    return this.post("/api/campaigns", data);
  }

  updateCampaign(
    id: string,
    data: Partial<Omit<CreateCampaignInput, "leadIds">>,
  ): Promise<DataResponse<Campaign>> {
    return this.put(`/api/campaigns/${id}`, data);
  }

  startCampaign(id: string): Promise<DataResponse<Campaign>> {
    return this.post(`/api/campaigns/${id}/start`);
  }

  pauseCampaign(id: string): Promise<DataResponse<Campaign>> {
    return this.post(`/api/campaigns/${id}/pause`);
  }

  cancelCampaign(id: string): Promise<DataResponse<Campaign>> {
    return this.post(`/api/campaigns/${id}/cancel`);
  }

  // ── Phone Numbers ─────────────────────────────────────────────────────────

  getPhoneNumbers(): Promise<DataResponse<PhoneNumber[]>> {
    return this.get("/api/phone-numbers");
  }

  getAvailableNumbers(): Promise<
    DataResponse<
      { number: string; friendlyName: string; provider: string; vapiId: string }[]
    >
  > {
    return this.get("/api/phone-numbers/available");
  }

  buyPhoneNumber(data: {
    areaCode?: string;
    friendlyName: string;
    scriptId?: string;
  }): Promise<DataResponse<PhoneNumber>> {
    return this.post("/api/phone-numbers/buy", data);
  }

  importPhoneNumber(data: {
    phoneNumber: string;
    friendlyName: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
    scriptId?: string;
  }): Promise<DataResponse<PhoneNumber>> {
    return this.post("/api/phone-numbers/import", data);
  }

  updatePhoneNumber(
    id: string,
    data: {
      friendlyName?: string;
      scriptId?: string | null;
      isActive?: boolean;
    },
  ): Promise<DataResponse<PhoneNumber>> {
    return this.put(`/api/phone-numbers/${id}`, data);
  }

  deletePhoneNumber(id: string): Promise<MessageResponse> {
    return this.del(`/api/phone-numbers/${id}`);
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  getStats(): Promise<DataResponse<DashboardStats>> {
    return this.get("/api/analytics/stats");
  }

  getCallVolume(
    startDate: string,
    endDate: string,
  ): Promise<DataResponse<CallVolumeData[]>> {
    return this.get(
      `/api/analytics/call-volume${this.qs({ startDate, endDate })}`,
    );
  }

  getOutcomes(
    startDate: string,
    endDate: string,
  ): Promise<DataResponse<OutcomeBreakdown[]>> {
    return this.get(
      `/api/analytics/outcomes${this.qs({ startDate, endDate })}`,
    );
  }

  // ── Billing ───────────────────────────────────────────────────────────────

  getSubscription(): Promise<DataResponse<Subscription | null>> {
    return this.get("/api/billing/subscription");
  }

  getUsage(): Promise<DataResponse<UsageData | null>> {
    return this.get("/api/billing/usage");
  }

  getPlans(): Promise<DataResponse<PlanConfig[]>> {
    return this.get("/api/billing/plans");
  }

  createCheckout(plan: string): Promise<DataResponse<CheckoutResponse>> {
    return this.post("/api/billing/checkout", { plan });
  }

  createPortal(): Promise<DataResponse<PortalResponse>> {
    return this.post("/api/billing/portal");
  }

  // ── Integrations ──────────────────────────────────────────────────────────

  getIntegrations(): Promise<DataResponse<Integration[]>> {
    return this.get("/api/integrations");
  }

  connectGoogle(): Promise<DataResponse<GoogleConnectResponse>> {
    return this.get("/api/integrations/google/connect");
  }

  handleGoogleCallback(
    code: string,
  ): Promise<DataResponse<GoogleCallbackResponse>> {
    return this.get(
      `/api/integrations/google/callback?code=${encodeURIComponent(code)}`,
    );
  }

  getGoogleCalendarStatus(): Promise<DataResponse<GoogleCalendarStatus>> {
    return this.get("/api/integrations/google/status");
  }

  getGoogleCalendarEvents(
    maxResults?: number,
  ): Promise<DataResponse<GoogleCalendarEvent[]>> {
    return this.get(
      `/api/integrations/google/events${this.qs({ maxResults })}`,
    );
  }

  disconnectGoogle(): Promise<MessageResponse> {
    return this.del("/api/integrations/google/disconnect");
  }

  disconnectIntegration(id: string): Promise<MessageResponse> {
    return this.del(`/api/integrations/${id}`);
  }

  // ── Business ──────────────────────────────────────────────────────────────

  getBusiness(): Promise<DataResponse<Business>> {
    return this.get("/api/business");
  }

  updateBusiness(
    data: Partial<{
      name: string;
      industry: string;
      timezone: string;
      phone: string;
      website: string;
      businessHours: Record<string, unknown>;
    }>,
  ): Promise<DataResponse<Business>> {
    return this.put("/api/business", data);
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

export const api = new ApiClient();
