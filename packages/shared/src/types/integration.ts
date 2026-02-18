export interface Integration {
  id: string;
  businessId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type IntegrationProvider = "google_calendar" | "outlook" | "hubspot" | "salesforce";

export type IntegrationStatus = "connected" | "disconnected" | "expired";

export interface PhoneNumber {
  id: string;
  businessId: string;
  twilioSid: string;
  number: string;         // E.164 format
  friendlyName: string;
  scriptId: string | null;
  isActive: boolean;
  capabilities: PhoneNumberCapabilities;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhoneNumberCapabilities {
  voice: boolean;
  sms: boolean;
  mms: boolean;
}

export interface AvailableNumber {
  number: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
  country: string;
  capabilities: PhoneNumberCapabilities;
}
