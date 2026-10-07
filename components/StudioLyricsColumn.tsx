'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Copy,
  Check,
  ThumbsUp,
  Edit2,
  FileText,
  ArrowUpRight,
  Disc3,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { apiFetch } from '@/lib/api';

interface StudioLyricsColumnProps {
  track: MusicTrack | null;
  onApplyStyle?: (style: string) => void;
  onApplyLyrics?: (lyrics: string) => void;
  onOpenRemix?: (track: MusicTrack) => void;
  onCoverToRemix?: (track: MusicTrack) => void;
  onRefreshTracks?: () => void;
  onRegenerate?: (track: MusicTrack) => void;
  className?: string;
}

export default function StudioLyricsColumn({
  track,
  onApplyStyle,
  onApplyLyrics,
  onOpenRemix,
  onRefreshTracks,
  className = '',
}: StudioLyricsColumnProps) {
  const [copiedStyle, setCopiedStyle] = useState(false);
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  if (!track) {
    return (
      <div
        id="studio-lyrics-column-empty"
        className={`flex flex-col items-center justify-center p-8 bg-zinc-950/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl text-center min-h-[420px] ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-600 mb-3 shadow-inner">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-zinc-300">Belum Ada Trek Dipilih</h3>
        <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">
          Pilih salah satu lagu di panel Library untuk menampilkan detail gaya musik dan lirik lagu lengkap di sini.
        </p>
      </div>
    );
  }

  const handleCopyStyle = () => {
    const textToCopy = track.style || track.prompt || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedStyle(true);
    setTimeout(() => setCopiedStyle(false), 2000);
  };

  const handleCopyLyrics = () => {
    const textToCopy = track.lyrics || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 2000);
  };

  const handleToggleFavorite = async () => {
    try {
      await apiFetch(`/api/tracks/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !track.is_favorite }),
      });
      if (onRefreshTracks) onRefreshTracks();
    } catch {}
  };

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await apiFetch(`/api/tracks/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleValue.trim() }),
      });
      setIsEditingTitle(false);
      if (onRefreshTracks) onRefreshTracks();
    } catch {
      setIsEditingTitle(false);
    }
  };

  const renderLyricsFormatted = (lyricsText: string) => {
    if (!lyricsText || !lyricsText.trim()) {
      return (
        <p className="text-xs text-zinc-500 italic">
          (Trek ini adalah musik instrumental tanpa lirik)
        </p>
      );
    }
    const lines = lyricsText.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return (
          <div key={idx} className="font-mono text-amber-400 font-bold text-xs pt-2 pb-0.5">
            {trimmed}
          </div>
        );
      }
      return (
        <div key={idx} className="text-zinc-200 text-xs sm:text-sm leading-relaxed">
          {line || <span className="inline-block h-2" />}
        </div>
      );
    });
  };

  return (
    <div
      id="studio-lyrics-column"
      className={`flex flex-col bg-zinc-950/90 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl ${className}`}
    >
      <div className="flex items-start gap-3 p-3 bg-zinc-900/80 rounded-2xl border border-white/10 mb-4 shadow-md">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-amber-500/30 shrink-0 shadow-md">
          <Image
            src={
              track.cover_url ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
            }
            alt={track.title}
            fill
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-1 w-full">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="w-full px-2 py-0.5 bg-zinc-950 border border-amber-400 rounded-lg text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-base font-black text-white truncate tracking-tight">
                  {track.title}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTitle(true);
                    setTitleValue(track.title);
                  }}
                  className="text-zinc-500 hover:text-amber-400 p-0.5 transition-colors shrink-0 cursor-pointer"
                  title="Ubah judul"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                track.is_favorite
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={track.is_favorite ? 'Hapus dari disukai' : 'Sukai lagu'}
            >
              <ThumbsUp className={`w-4 h-4 ${track.is_favorite ? 'fill-current' : ''}`} />
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
                SUCCESS
              </span>
              <span className="text-zinc-600 text-xs">•</span>
              <span className="text-zinc-400 text-[11px] font-mono">
                {track.model || 'v6'}
              </span>
            </div>
            {onOpenRemix && (
              <button
                type="button"
                onClick={() => onOpenRemix(track)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 flex items-center gap-1.5 transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
                title="Remix & Aransemen Audio Lagu Ini di Form"
              >
                <Disc3 className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                <span>Remix Audio</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[580px] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {/* STYLE SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
              STYLE
            </span>
            <div className="flex items-center gap-1.5">
              {onApplyStyle && track.style && (
                <button
                  type="button"
                  onClick={() => onApplyStyle(track.style)}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer"
                  title="Gunakan gaya ini pada formulir pembuatan"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Ke Form</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyStyle}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
              >
                {copiedStyle ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            {track.style || track.prompt || 'Tidak ada deskripsi gaya spesifik.'}
          </div>
        </div>

        {/* LIRIK SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
              LIRIK
            </span>
            <div className="flex items-center gap-1.5">
              {onApplyLyrics && track.lyrics && (
                <button
                  type="button"
                  onClick={() => onApplyLyrics(track.lyrics)}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer"
                  title="Gunakan lirik ini pada formulir pembuatan"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Ke Form</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyLyrics}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
              >
                {copiedLyrics ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1">
            {renderLyricsFormatted(track.lyrics)}
          </div>
        </div>
      </div>
    </div>
  );
}
