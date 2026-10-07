'use client';

import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { apiFetch, safeJson } from '@/lib/api';

interface ExtendMusicModalProps {
  track: MusicTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onExtendSubmitted: (taskId: string) => void;
}

export default function ExtendMusicModal({
  track,
  isOpen,
  onClose,
  onExtendSubmitted,
}: ExtendMusicModalProps) {
  const [continueAt, setContinueAt] = useState(60);
  const [newStyle, setNewStyle] = useState('');
  const [newLyrics, setNewLyrics] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !track) return null;

  const handleExtend = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch('/api/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_id: track.id,
          continue_at: continueAt,
          new_style: newStyle.trim() || track.style,
          new_lyrics: newLyrics.trim() || undefined,
        }),
      });
      const data = await safeJson<{ success?: boolean; message?: string; taskId?: string }>(res);
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Gagal memperpanjang lagu.');
        return;
      }
      setSuccessMsg(data.message || 'Tugas perpanjangan lagu berhasil dikirim!');
      if (data.taskId) {
        onExtendSubmitted(data.taskId);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Koneksi gagal';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                EXTEND CURRENT SONG
              </h3>
              <p className="text-[11px] text-zinc-400">Perpanjang lagu {track.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-zinc-400 mb-1.5">
              <span>Lanjutkan dari (Continue from):</span>
              <span className="font-mono text-amber-400">{continueAt} detik</span>
            </div>
            <input
              type="range"
              min="10"
              max={Math.max(track.duration - 5, 30)}
              step="5"
              value={continueAt}
              onChange={(e) => setContinueAt(parseInt(e.target.value))}
              className="w-full accent-amber-400"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Kie.ai akan mengambil potongan audio hingga detik ke-{continueAt} dan menyambungkannya dengan frase musik baru.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              New Style (Gaya Lanjutan)
            </label>
            <input
              type="text"
              value={newStyle}
              onChange={(e) => setNewStyle(e.target.value)}
              placeholder={`Bawaan: ${track.style}`}
              className="w-full px-3.5 py-2.5 bg-zinc-950 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              New Lyrics / Prompt (Lirik Baru Bagian 2)
            </label>
            <textarea
              rows={4}
              value={newLyrics}
              onChange={(e) => setNewLyrics(e.target.value)}
              placeholder="[Verse 3] atau [Outro] lanjutan perjalanan..."
              className="w-full px-3.5 py-2.5 bg-zinc-950 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 text-xs font-mono"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </p>
          )}

          <button
            onClick={handleExtend}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Memproses Perpanjangan Lagu...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-current" />
                <span>EXTEND</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
