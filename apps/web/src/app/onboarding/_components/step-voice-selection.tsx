"use client";

import { useRef, useState, useCallback } from "react";
import { VOICE_OPTIONS, type VoiceOption } from "@callo/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Volume2 } from "lucide-react";

interface StepVoiceSelectionProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function StepVoiceSelection({
  selected,
  onSelect,
}: StepVoiceSelectionProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback(
    (voice: VoiceOption, e: React.MouseEvent) => {
      e.stopPropagation();

      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (playingId === voice.id) {
        setPlayingId(null);
        return;
      }

      const audio = new Audio(voice.previewFile);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.play().catch(() => setPlayingId(null));
      audioRef.current = audio;
      setPlayingId(voice.id);
    },
    [playingId]
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Choose your AI voice
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Pick the voice that best represents your brand. Click play to
              preview.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VOICE_OPTIONS.map((voice) => {
              const isSelected = selected === voice.id;
              const isPlaying = playingId === voice.id;

              return (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => onSelect(voice.id)}
                  className={`relative flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                >
                  {/* Play button */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handlePlay(voice, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handlePlay(voice, e as unknown as React.MouseEvent);
                      }
                    }}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isPlaying
                        ? "bg-indigo-600 text-white"
                        : isSelected
                        ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-white" : "text-zinc-200"
                        }`}
                      >
                        {voice.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {voice.gender === "female" ? "F" : "M"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {voice.description}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <Volume2 className="w-4 h-4 text-indigo-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
