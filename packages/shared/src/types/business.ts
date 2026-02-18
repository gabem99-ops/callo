export interface Business {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  timezone: string;
  businessHours: BusinessHours;
  address: string | null;
  phone: string | null;
  ownerId: string;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessHours {
  [day: string]: {
    open: string;   // "09:00"
    close: string;  // "17:00"
    enabled: boolean;
  };
}

export interface CreateBusinessInput {
  name: string;
  industry?: string;
  website?: string;
  timezone: string;
  businessHours?: BusinessHours;
  address?: string;
  phone?: string;
}
