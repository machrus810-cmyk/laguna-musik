'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Play,
  Pause,
  Copy,
  Check,
  Download,
  Video,
  PlusCircle,
  ImageIcon,
  Sliders,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface TrackDetailModalProps {
  track: MusicTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenExtend: (track: MusicTrack) => void;
  onOpenCoverGen: (track: MusicTrack) => void;
  onOpenMastering: (track: MusicTrack) => void;
  onOpenMusicVideo: (track: MusicTrack) => void;
  onOpenEdit?: (track: MusicTrack) => void;
}

const WAVEFORM_BARS = [
  35, 60, 45, 80, 65, 95, 50, 70, 85, 40, 60, 90, 75, 50, 80, 100,
  65, 85, 45, 75, 90, 60, 40, 85, 70, 95, 55, 65, 80, 45, 60, 30,
];

export default function TrackDetailModal({
  track,
  isOpen,
  onClose,
  onOpenExtend,
  onOpenCoverGen,
  onOpenMastering,
  onOpenMusicVideo,
  onOpenEdit,
}: TrackDetailModalProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    seek,
    playTrack,
    togglePlay,
    downloadTrack,
  } = useAudioPlayer();

  const [copiedLyrics, setCopiedLyrics] = useState(false);

  if (!isOpen || !track) return null;

  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;
  const effectiveDuration = isCurrent && isFinite(duration) && duration > 0 ? duration : (track.duration || 180);
  const activeCurrentTime = isCurrent ? currentTime : 0;
  const progressPercent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (activeCurrentTime / effectiveDuration) * 100)) : 0;

  const formatDuration = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleCopyLyrics = () => {
    if (!track.lyrics) return;
    navigator.clipboard.writeText(track.lyrics);
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 2500);
  };

  const handleDownloadCover = async () => {
    if (!track.cover_url) return;
    try {
      const response = await fetch(track.cover_url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}_cover.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      const link = document.createElement('a');
      link.href = track.cover_url;
      link.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}_cover.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/90">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SUCCESS
            </span>
            <span className="text-xs text-zinc-400 font-mono">ID: {track.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className={`relative w-full md:w-64 aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl shrink-0 group transition-all duration-1000 ${isThisPlaying ? 'rounded-full animate-[spin_10s_linear_infinite] shadow-amber-500/20' : ''}`}>
              <Image
                src={track.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                alt={track.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => {
                    if (isCurrent) togglePlay();
                    else playTrack(track);
                  }}
                  className="w-14 h-14 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  {isThisPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-1" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {track.title}
                </h3>
                <p className="text-sm font-semibold text-amber-400 mt-1">{track.style}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase font-semibold">Model</span>
                  <p className="font-bold text-white font-mono">{track.model}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase font-semibold">Durasi</span>
                  <p className="font-bold text-white font-mono">{formatDuration(track.duration)}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase font-semibold">Karakter</span>
                  <p className="font-bold text-white">{track.vocal_gender || (track.instrumental ? 'Instrumental' : 'Vocal')}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase font-semibold">Dibuat</span>
                  <p className="font-bold text-zinc-300 text-[11px] truncate">{formatDate(track.created_at)}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/25 shadow-lg shadow-black/40 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (isCurrent) togglePlay();
                        else playTrack(track);
                      }}
                      className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center hover:scale-105 active:scale-95 shadow-md shadow-amber-400/30 transition-transform cursor-pointer"
                      title={isThisPlaying ? 'Jeda Audio' : 'Putar Audio'}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white">
                          {isThisPlaying ? 'Sedang Diputar di Studio' : isCurrent ? 'Trek Audio Siap Diputar' : 'Putar Trek Ini'}
                        </p>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {isCurrent ? `Posisi: ${formatDuration(activeCurrentTime)} / ${formatDuration(effectiveDuration)}` : 'Audio fidelitas tinggi'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadTrack(track)}
                    className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unduh MP3</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-end gap-1 h-7 w-full px-1">
                    {WAVEFORM_BARS.map((height, i) => {
                      const barProgress = (i / WAVEFORM_BARS.length) * 100;
                      const isPlayed = barProgress <= progressPercent;
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            const targetTime = (i / WAVEFORM_BARS.length) * effectiveDuration;
                            if (!isCurrent) playTrack(track);
                            seek(targetTime);
                          }}
                          className={`flex-1 rounded-full cursor-pointer transition-all duration-150 hover:opacity-100 ${
                            isPlayed
                              ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                              : 'bg-zinc-800 hover:bg-zinc-700'
                          }`}
                          style={{
                            height: `${Math.max(15, height * 0.45)}%`,
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-amber-400/90 font-medium w-9 text-right">
                      {formatDuration(activeCurrentTime)}
                    </span>
                    <div className="relative flex-1 py-1 group cursor-pointer">
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-75"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={effectiveDuration || 180}
                        step={0.1}
                        value={activeCurrentTime}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isCurrent) playTrack(track);
                          seek(val);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="font-mono text-[11px] text-zinc-500 font-medium w-9">
                      {formatDuration(effectiveDuration)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Tag className="w-3.5 h-3.5 text-zinc-500" />
                {track.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 border border-white/5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 flex flex-wrap items-center justify-start gap-2">
            <button
              onClick={handleCopyLyrics}
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLyrics ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Lirik Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Lyrics</span>
                </>
              )}
            </button>
            <button
              onClick={() => downloadTrack(track)}
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Audio</span>
            </button>
            <button
              onClick={handleDownloadCover}
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Cover</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenMusicVideo(track);
              }}
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-amber-400/20 text-xs font-medium text-amber-300 border border-amber-400/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>Generate Music Video</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenExtend(track);
              }}
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-amber-400/20 text-xs font-medium text-amber-300 border border-amber-400/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Extend Music</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenCoverGen(track);
              }}
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Create Cover</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenMastering(track);
              }}
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Mastering</span>
            </button>
            {onOpenEdit && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEdit(track);
                }}
                className="px-3 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-xs font-semibold text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit Tempo & Vokal</span>
              </button>
            )}
          </div>

          {/* Lyrics and Prompt */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-2 flex flex-col">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Lirik Lengkap
                </h4>
                <button
                  onClick={handleCopyLyrics}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin</span>
                </button>
              </div>
              <pre className="flex-1 p-3 bg-zinc-900/80 rounded-lg text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto border border-white/5 scrollbar-thin">
                {track.lyrics || 'Trek ini berupa komposisi instrumental (tanpa vokal).'}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-2 flex flex-col">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Prompt Komposisi
              </h4>
              <pre className="flex-1 p-3 bg-zinc-900/80 rounded-lg text-xs font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto border border-white/5 scrollbar-thin">
                {track.prompt || track.style}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
