'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Download,
  Sliders,
  Maximize2,
  Music2,
} from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { MusicTrack } from '@/database/db';

interface PersistentMusicPlayerProps {
  onOpenTrackDetail?: (track: MusicTrack) => void;
  onOpenMastering?: (track: MusicTrack) => void;
}

export default function PersistentMusicPlayer({
  onOpenTrackDetail,
  onOpenMastering,
}: PersistentMusicPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    masteringPreset,
    tempoSpeed,
    vocalPreset,
    togglePlay,
    seek,
    setVolumeLevel,
    toggleMute,
    nextTrack,
    prevTrack,
    toggleRepeat,
    toggleShuffle,
    downloadTrack,
  } = useAudioPlayer();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const effectiveDuration = isFinite(duration) && duration > 0 ? duration : (currentTrack?.duration || 0);
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  if (!currentTrack) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 lg:pl-[280px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600">
              <Music2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-zinc-400">Belum ada lagu yang diputar</p>
              <p className="text-[11px] text-zinc-600">Pilih lagu dari Library atau buat lagu baru dengan AI</p>
            </div>
          </div>
          <span className="hidden sm:inline-block font-mono text-[11px] text-amber-500/80">
            LAGUNA MUSIK - STUDIO ENGINE READY
          </span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/95 backdrop-blur-2xl border-t border-amber-500/20 px-3 sm:px-6 py-2.5 lg:pl-[275px] shadow-2xl shadow-black/80 transition-all">
      {/* Interactive Track Scrubber Bar */}
      <div className="max-w-7xl mx-auto mb-2">
        <div
          className="relative w-full h-2 group cursor-pointer flex items-center"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickRatio = (e.clientX - rect.left) / rect.width;
            seek(clickRatio * effectiveDuration);
          }}
        >
          {/* Background rail */}
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden transition-all group-hover:h-1.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full relative"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Draggable thumb dot */}
          <div
            className="absolute w-3 h-3 bg-amber-300 rounded-full border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md shadow-amber-400/50"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
        {/* Left: Track Cover & Metadata */}
        <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial sm:w-[280px]">
          <div
            className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 cursor-pointer group shadow-md"
            onClick={() => onOpenTrackDetail && onOpenTrackDetail(currentTrack)}
            title="Buka detail lagu"
          >
            <Image
              src={currentTrack.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
              alt={currentTrack.title}
              fill
              className={`object-cover transition-transform duration-[3000ms] ease-linear ${isPlaying ? 'animate-[spin_8s_linear_infinite] rounded-full scale-100' : 'scale-110'}`}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
            {isPlaying && (
              <div className="absolute bottom-1 right-1 flex items-end gap-0.5 h-3 bg-black/60 px-1 py-0.5 rounded">
                <span className="w-0.5 h-full bg-amber-400 animate-pulse" />
                <span className="w-0.5 h-2 bg-amber-300 animate-bounce" />
                <span className="w-0.5 h-1.5 bg-amber-400 animate-pulse" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h4
              className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:text-amber-400 transition-colors"
              onClick={() => onOpenTrackDetail && onOpenTrackDetail(currentTrack)}
            >
              {currentTrack.title}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 truncate">
              <span className="text-amber-400/90 font-medium truncate">{currentTrack.style}</span>
              <span>•</span>
              <span className="font-mono text-zinc-500">{currentTrack.model}</span>
            </div>
          </div>
        </div>

        {/* Center: Playback Controls & Timers */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg transition-colors hidden sm:block cursor-pointer ${
                isShuffle ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-400 hover:text-white'
              }`}
              title={isShuffle ? 'Acak Aktif' : 'Acak Nonaktif'}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={prevTrack}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
              title="Lagu Sebelumnya"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={togglePlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center hover:scale-105 active:scale-95 shadow-md shadow-amber-500/30 transition-transform cursor-pointer"
              title={isPlaying ? 'Jeda' : 'Putar'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={nextTrack}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
              title="Lagu Berikutnya"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={toggleRepeat}
              className={`p-1.5 rounded-lg transition-colors hidden sm:block cursor-pointer ${
                repeatMode !== 'off' ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Ulang: ${repeatMode}`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>

        {/* Right: Audio Volume, Mastering Preset, Download, Details */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenMastering && (
            <button
              onClick={() => onOpenMastering(currentTrack)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-amber-400/25 text-amber-300 text-[11px] font-medium transition-colors cursor-pointer"
              title="Buka Rak Mastering, Tempo & Vokal"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>{masteringPreset}</span>
              {tempoSpeed !== 1.0 && (
                <span className="font-mono text-[10px] px-1 rounded bg-amber-400/20 text-amber-300 font-bold">
                  {tempoSpeed}x
                </span>
              )}
              {vocalPreset !== 'Normal' && (
                <span className="text-[10px] px-1 rounded bg-purple-500/20 text-purple-300 font-medium">
                  {vocalPreset}
                </span>
              )}
            </button>
          )}

          {/* Volume Control */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={toggleMute}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title={isMuted ? 'Batal Bisukan' : 'Bisukan'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 bg-zinc-900 border border-white/10 rounded-xl shadow-xl flex flex-col items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                  className="w-20 accent-amber-400 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-zinc-400 mt-1">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Download Audio */}
          <button
            onClick={() => downloadTrack(currentTrack)}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-amber-400/20 text-zinc-300 hover:text-amber-300 border border-white/10 hover:border-amber-400/30 transition-all cursor-pointer"
            title="Unduh File Audio MP3"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
