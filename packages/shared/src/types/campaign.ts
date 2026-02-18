export interface Campaign {
  id: string;
  businessId: string;
  name: string;
  scriptId: string;
  phoneNumberId: string;
  status: CampaignStatus;
  schedule: CampaignSchedule;
  maxConcurrentCalls: number;
  retryAttempts: number;
  totalLeads: number;
  completedLeads: number;
  successfulLeads: number;
  failedLeads: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "canceled";

export interface CampaignSchedule {
  startDate: string;
  endDate: string | null;
  daysOfWeek: number[]; // 0=Sun, 6=Sat
  startTime: string;    // "09:00"
  endTime: string;      // "17:00"
  timezone: string;
}

export interface CampaignLead {
  id: string;
  campaignId: string;
  leadId: string;
  status: CampaignLeadStatus;
  callId: string | null;
  attempts: number;
  lastAttemptAt: Date | null;
  outcome: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignLeadStatus =
  | "pending"
  | "calling"
  | "completed"
  | "failed"
  | "skipped"
  | "retry";

export interface CreateCampaignInput {
  name: string;
  scriptId: string;
  phoneNumberId: string;
  schedule: CampaignSchedule;
  maxConcurrentCalls?: number;
  retryAttempts?: number;
  leadIds: string[];
}
