'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { apiFetch, safeJson } from '@/lib/api';

interface CoverGeneratorModalProps {
  track: MusicTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onCoverUpdated: (newCoverUrl: string) => void;
}

export default function CoverGeneratorModal({
  track,
  isOpen,
  onClose,
  onCoverUpdated,
}: CoverGeneratorModalProps) {
  const [title, setTitle] = useState(track?.title || 'Single Album');
  const [genre, setGenre] = useState(track?.style || 'Indonesian Pop');
  const [mood, setMood] = useState('Melancholic Twilight');
  const [artistConcept, setArtistConcept] = useState('Vintage Vinyl Aesthetic');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(track?.cover_url || '');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGenerateCover = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await apiFetch('/api/cover/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          genre,
          mood,
          artist_concept: artistConcept,
          track_id: track?.id,
        }),
      });
      const data = await safeJson<{ success?: boolean; message?: string; imageUrl?: string }>(res);
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Gagal membuat cover artwork.');
        return;
      }
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        onCoverUpdated(data.imageUrl);
      }
      setStatusMsg(data.message || 'Cover 1:1 berhasil digenerate dan diperbarui!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error generating cover';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                AI COVER ARTWORK STUDIO
              </h3>
              <p className="text-[11px] text-zinc-400">Desain sampul album square 1:1 kualitas resolusi tinggi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Left: Input Form */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Judul Lagu (Title)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 rounded-xl border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Genre
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 rounded-xl border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Mood
              </label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="Contoh: Cinematic Gold, Neon Sunset, Vintage Warmth"
                className="w-full px-3 py-2 bg-zinc-950 rounded-xl border border-white/10 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Artist Concept
              </label>
              <input
                type="text"
                value={artistConcept}
                onChange={(e) => setArtistConcept(e.target.value)}
                placeholder="Contoh: Modern Typography, Cyberpunk, Indonesian Heritage"
                className="w-full px-3 py-2 bg-zinc-950 rounded-xl border border-white/10 text-white text-xs"
              />
            </div>

            {errorMsg && (
              <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-500/30">
                {errorMsg}
              </p>
            )}

            {statusMsg && (
              <p className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{statusMsg}</span>
              </p>
            )}

            <button
              onClick={handleGenerateCover}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Merender Artwork...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Generate Square 1:1 Cover</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Artwork Preview */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative aspect-square w-full max-w-[240px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-zinc-950">
              {generatedImageUrl ? (
                <Image
                  src={generatedImageUrl}
                  alt="Cover Preview"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-[11px]">Pratinjau Cover 1:1</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 font-mono">
              Square Aspect 1:1 • 1080x1080px
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
