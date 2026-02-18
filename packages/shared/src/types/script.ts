export interface Script {
  id: string;
  businessId: string;
  name: string;
  type: ScriptType;
  voice: AIVoice;
  greeting: string;
  systemPrompt: string;
  faqs: FAQ[];
  bookingEnabled: boolean;
  bookingInstructions: string | null;
  transferEnabled: boolean;
  transferNumber: string | null;
  transferConditions: string | null;
  escalationMessage: string | null;
  qualificationQuestions: string[];
  tone: ScriptTone;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ScriptType = "inbound" | "outbound";

export type AIVoice = "alloy" | "echo" | "shimmer" | "ash" | "ballad" | "coral" | "sage" | "verse";

export type ScriptTone = "professional" | "friendly" | "casual" | "formal";

export interface FAQ {
  question: string;
  answer: string;
}

export interface CreateScriptInput {
  name: string;
  type: ScriptType;
  voice?: AIVoice;
  greeting: string;
  systemPrompt?: string;
  faqs?: FAQ[];
  bookingEnabled?: boolean;
  bookingInstructions?: string;
  transferEnabled?: boolean;
  transferNumber?: string;
  transferConditions?: string;
  qualificationQuestions?: string[];
  tone?: ScriptTone;
}
