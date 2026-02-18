export interface VoiceOption {
  id: string;
  vapiVoiceId: string;
  name: string;
  gender: "female" | "male";
  description: string;
  previewFile: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "aria",
    vapiVoiceId: "alloy",
    name: "Aria",
    gender: "female",
    description: "Professional and clear — great for business calls",
    previewFile: "/audio/voice-preview-aria.m4a",
  },
  {
    id: "marcus",
    vapiVoiceId: "echo",
    name: "Marcus",
    gender: "male",
    description: "Deep and authoritative — builds trust instantly",
    previewFile: "/audio/voice-preview-marcus.m4a",
  },
  {
    id: "luna",
    vapiVoiceId: "shimmer",
    name: "Luna",
    gender: "female",
    description: "Warm and friendly — callers feel at ease",
    previewFile: "/audio/voice-preview-luna.m4a",
  },
  {
    id: "ethan",
    vapiVoiceId: "ash",
    name: "Ethan",
    gender: "male",
    description: "Casual and approachable — perfect for relaxed vibes",
    previewFile: "/audio/voice-preview-ethan.m4a",
  },
  {
    id: "sophie",
    vapiVoiceId: "coral",
    name: "Sophie",
    gender: "female",
    description: "Bright and energetic — keeps conversations lively",
    previewFile: "/audio/voice-preview-sophie.m4a",
  },
  {
    id: "daniel",
    vapiVoiceId: "sage",
    name: "Daniel",
    gender: "male",
    description: "Calm and measured — reassuring and confident",
    previewFile: "/audio/voice-preview-daniel.m4a",
  },
];

export function getVoiceById(id: string): VoiceOption | undefined {
  return VOICE_OPTIONS.find((v) => v.id === id);
}

export function getVoiceByVapiId(vapiVoiceId: string): VoiceOption | undefined {
  return VOICE_OPTIONS.find((v) => v.vapiVoiceId === vapiVoiceId);
}
