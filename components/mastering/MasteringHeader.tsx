'use client';

import React from 'react';
import { Sparkles, RefreshCw, Disc3 } from 'lucide-react';
import { MasteringIntensity, MasteringCharacter } from '@/types/mastering';

interface MasteringHeaderProps {
  title: string;
  intensity: MasteringIntensity;
  character: MasteringCharacter;
  isAiProcessing: boolean;
  onIntensityChange: (intensity: MasteringIntensity) => void;
  onCharacterChange: (character: MasteringCharacter) => void;
  onRunAiAutoMaster: () => void;
  onOpenRemix?: () => void;
  isRemixing?: boolean;
  fileMeta?: {
    name: string;
    duration: number;
    sampleRate: number;
    channels: number;
    format: string;
    sizeMb: number;
  } | null;
}

export const INTENSITY_OPTIONS: MasteringIntensity[] = ['Gentle', 'Natural', 'Balanced', 'Punchy', 'Loud'];
export const CHARACTER_OPTIONS: MasteringCharacter[] = [
  'Clean',
  'Natural',
  'Warm',
  'Bright',
  'Punchy',
  'Wide',
  'Smooth',
  'Analog',
  'Modern',
  'Loud',
];

export default function MasteringHeader({
  title,
  intensity,
  character,
  isAiProcessing,
  onIntensityChange,
  onCharacterChange,
  onRunAiAutoMaster,
  onOpenRemix,
  isRemixing,
  fileMeta,
}: MasteringHeaderProps) {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              DSP 64-bit Audio Master
            </span>
            {fileMeta && (
              <span className="text-xs text-zinc-400 font-mono">
                {fileMeta.channels > 1 ? 'Stereo' : 'Mono'} • {fileMeta.sampleRate / 1000} kHz • {formatTime(fileMeta.duration)} • {fileMeta.sizeMb.toFixed(1)} MB
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            {title || 'Mastering Workstation'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenRemix && (
            <button
              onClick={onOpenRemix}
              disabled={isRemixing}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-extrabold text-sm shadow-lg shadow-purple-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-60"
              title="Kirim audio hasil editan mastering langsung ke menu Remix Lagu"
            >
              {isRemixing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Mempersiapkan Remix...</span>
                </>
              ) : (
                <>
                  <Disc3 className="w-4 h-4 text-amber-300 group-hover:rotate-180 transition-transform duration-500" />
                  <span>⚡ REMIX LAGU INI</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onRunAiAutoMaster}
            disabled={isAiProcessing}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isAiProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Menganalisis & Mastering...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black" />
                <span>⚡ AI AUTO MASTER</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-white/5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Mastering Intensity
            </span>
            <span className="text-xs text-amber-400 font-bold font-mono">{intensity}</span>
          </div>
          <div className="grid grid-cols-5 gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
            {INTENSITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => onIntensityChange(opt)}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                  intensity === opt
                    ? 'bg-amber-500 text-black shadow-sm shadow-amber-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Mastering Character
            </span>
            <span className="text-xs text-orange-400 font-bold font-mono">{character}</span>
          </div>
          <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl border border-white/5 max-h-[76px] overflow-y-auto">
            {CHARACTER_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => onCharacterChange(opt)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  character === opt
                    ? 'bg-orange-500 text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
