export interface DashboardStats {
  totalCalls: number;
  totalMinutes: number;
  appointmentsBooked: number;
  leadsCapured: number;
  avgCallDuration: number;
  successRate: number;
  activeCampaigns: number;
  minutesRemaining: number;
}

export interface CallVolumeData {
  date: string;
  inbound: number;
  outbound: number;
}

export interface OutcomeBreakdown {
  outcome: string;
  count: number;
  percentage: number;
}

export interface AnalyticsParams {
  businessId: string;
  startDate: string;
  endDate: string;
  granularity?: "hour" | "day" | "week" | "month";
}
