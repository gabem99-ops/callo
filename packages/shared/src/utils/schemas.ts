import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  timezone: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const createScriptSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["inbound", "outbound"]),
  voice: z.enum(["alloy", "echo", "shimmer", "ash", "ballad", "coral", "sage", "verse"]).optional(),
  greeting: z.string().min(1).max(500),
  systemPrompt: z.string().optional(),
  faqs: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      })
    )
    .optional(),
  bookingEnabled: z.boolean().optional(),
  bookingInstructions: z.string().optional(),
  transferEnabled: z.boolean().optional(),
  transferNumber: z.string().optional(),
  transferConditions: z.string().optional(),
  qualificationQuestions: z.array(z.string()).optional(),
  tone: z.enum(["professional", "friendly", "casual", "formal"]).optional(),
});

export const createLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(10),
  company: z.string().optional(),
  title: z.string().optional(),
  source: z.enum(["inbound_call", "csv_import", "manual", "api", "website"]),
  notes: z.string().optional(),
  customFields: z.record(z.string()).optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  scriptId: z.string().uuid(),
  phoneNumberId: z.string().uuid(),
  schedule: z.object({
    startDate: z.string(),
    endDate: z.string().nullable(),
    daysOfWeek: z.array(z.number().min(0).max(6)),
    startTime: z.string(),
    endTime: z.string(),
    timezone: z.string(),
  }),
  maxConcurrentCalls: z.number().int().min(1).max(10).optional(),
  retryAttempts: z.number().int().min(0).max(5).optional(),
  leadIds: z.array(z.string().uuid()),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
