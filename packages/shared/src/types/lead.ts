export interface Lead {
  id: string;
  businessId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string;
  company: string | null;
  title: string | null;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
  customFields: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadSource =
  | "inbound_call"
  | "csv_import"
  | "manual"
  | "api"
  | "website";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "disqualified"
  | "converted"
  | "unresponsive";

export interface CreateLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  company?: string;
  title?: string;
  source: LeadSource;
  notes?: string;
  customFields?: Record<string, string>;
}

export interface LeadListParams {
  businessId: string;
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
  page?: number;
  limit?: number;
}
