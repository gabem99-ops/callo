export interface VoiceOption {
  id: string;
  vapiVoiceId: string;
  vapiProvider: "11labs" | "openai";
  name: string;
  gender: "female" | "male";
  description: string;
  previewFile: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "rachel",
    vapiVoiceId: "21m00Tcm4TlvDq8ikWAM",
    vapiProvider: "11labs",
    name: "Rachel",
    gender: "female",
    description: "Calm and professional — perfect for business calls",
    previewFile: "/audio/voice-preview-rachel.mp3",
  },
  {
    id: "josh",
    vapiVoiceId: "TxGEqnHWrfWFTfGW9XjX",
    vapiProvider: "11labs",
    name: "Josh",
    gender: "male",
    description: "Deep and warm — builds trust and confidence",
    previewFile: "/audio/voice-preview-josh.mp3",
  },
  {
    id: "bella",
    vapiVoiceId: "EXAVITQu4vr4xnSDxMaL",
    vapiProvider: "11labs",
    name: "Bella",
    gender: "female",
    description: "Warm and friendly — callers feel right at home",
    previewFile: "/audio/voice-preview-bella.mp3",
  },
  {
    id: "antoni",
    vapiVoiceId: "ErXwobaYiN019PkySvjV",
    vapiProvider: "11labs",
    name: "Antoni",
    gender: "male",
    description: "Casual and approachable — natural conversation style",
    previewFile: "/audio/voice-preview-antoni.mp3",
  },
  {
    id: "domi",
    vapiVoiceId: "AZnzlk1XvdvUeBnXmlld",
    vapiProvider: "11labs",
    name: "Domi",
    gender: "female",
    description: "Bright and energetic — keeps things moving",
    previewFile: "/audio/voice-preview-domi.mp3",
  },
  {
    id: "adam",
    vapiVoiceId: "pNInz6obpgDQGcFmaJgB",
    vapiProvider: "11labs",
    name: "Adam",
    gender: "male",
    description: "Calm and measured — reassuring and confident",
    previewFile: "/audio/voice-preview-adam.mp3",
  },
];

export function getVoiceById(id: string): VoiceOption | undefined {
  return VOICE_OPTIONS.find((v) => v.id === id);
}

export function getVoiceByVapiId(vapiVoiceId: string): VoiceOption | undefined {
  return VOICE_OPTIONS.find((v) => v.vapiVoiceId === vapiVoiceId);
}
