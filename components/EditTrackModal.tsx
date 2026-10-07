'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Edit2,
  Mic,
  Volume2,
  Tag,
  Sliders,
  Play,
  Pause,
  Disc3,
  Save,
  Loader2,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { apiFetch } from '@/lib/api';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface EditTrackModalProps {
  track: MusicTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshTracks: () => void;
  onOpenMastering?: (track: MusicTrack) => void;
  onOpenRemix?: (track: MusicTrack) => void;
  onOpenTempoEditor?: (track: MusicTrack) => void;
}

const STYLE_PRESETS = [
  'Indonesian Pop',
  'Dangdut Koplo',
  'Reggae Koplo',
  'Slow Rock 90s',
  'Acoustic Ballad',
  'EDM Festival',
  'Lo-Fi Chill',
  'R&B Soul',
];

export default function EditTrackModal(props: EditTrackModalProps) {
  if (!props.isOpen || !props.track) return null;
  return <EditTrackDialog key={props.track.id} {...props} track={props.track} />;
}

function EditTrackDialog({
  track,
  onClose,
  onRefreshTracks,
  onOpenMastering,
  onOpenRemix,
  onOpenTempoEditor,
}: {
  track: MusicTrack;
  onClose: () => void;
  onRefreshTracks: () => void;
  onOpenMastering?: (track: MusicTrack) => void;
  onOpenRemix?: (track: MusicTrack) => void;
  onOpenTempoEditor?: (track: MusicTrack) => void;
}) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const [title, setTitle] = useState(track.title || '');
  const [style, setStyle] = useState(track.style || '');
  const [lyrics, setLyrics] = useState(track.lyrics || '');
  const [instrumental, setInstrumental] = useState(Boolean(track.instrumental));
  const [vocalGender, setVocalGender] = useState<'Male' | 'Female' | 'Any'>(
    (track.vocal_gender as 'Male' | 'Female' | 'Any') || 'Female'
  );
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(track.tags) ? track.tags.join(', ') : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Judul lagu tidak boleh kosong.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        style: style.trim(),
        lyrics: lyrics.trim(),
        instrumental,
        vocal_gender: instrumental ? 'Any' : vocalGender,
        tags: parsedTags.length > 0 ? parsedTags : track.tags || [],
      };

      const res = await apiFetch(`/api/tracks/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan perubahan.');
      }

      setSaveSuccess(true);
      onRefreshTracks();
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
              <Edit2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 truncate">
                Edit Informasi Lagu
              </h3>
              <p className="text-xs text-zinc-400 truncate">
                Perbarui metadata, lirik, atau akses editor audio untuk lagu ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
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
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate max-w-[240px] sm:max-w-xs">
                  {track.title}
                </p>
                <p className="text-[11px] text-zinc-400 truncate font-mono">
                  {track.model || 'Laguna Audio Engine'} • {track.duration ? `${track.duration}s` : 'Audio Track'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (isCurrentPlaying) {
                    togglePlay();
                  } else {
                    playTrack(track);
                  }
                }}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isCurrentPlaying
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isCurrentPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Jeda</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Putar</span>
                  </>
                )}
              </button>
              {onOpenRemix && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRemix(track);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
                  title="Kirim ke Studio Remix"
                >
                  <Disc3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Remix</span>
                </button>
              )}
              {onOpenMastering && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMastering(track);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                  title="Buka di Mastering Studio"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mastering</span>
                </button>
              )}
              {onOpenTempoEditor && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTempoEditor(track);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                  title="Edit Speed / Tempo Audio"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Speed/BPM</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Judul Lagu <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan judul lagu..."
              className="w-full px-3.5 py-2.5 bg-zinc-950 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 text-xs sm:text-sm font-medium transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Gaya / Genre Musik
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Pilih preset atau ketik bebas</span>
            </div>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Contoh: Indonesian Pop 90s, Dangdut Koplo, Akustik..."
              className="w-full px-3.5 py-2.5 bg-zinc-950 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 text-xs sm:text-sm font-medium transition-colors mb-2"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {STYLE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setStyle(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    style === p
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Tipe Musik
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setInstrumental(false)}
                  className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !instrumental
                      ? 'bg-amber-400 text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Vokal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstrumental(true)}
                  className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    instrumental
                      ? 'bg-amber-400 text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Instrumen</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Karakter Vokal
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-white/10">
                {(['Male', 'Female', 'Any'] as const).map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    disabled={instrumental}
                    onClick={() => setVocalGender(gender)}
                    className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      instrumental
                        ? 'opacity-40 cursor-not-allowed text-zinc-600'
                        : vocalGender === gender
                        ? 'bg-amber-400 text-black font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Lirik Lagu
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Bisa diedit atau disesuaikan</span>
            </div>
            <textarea
              rows={6}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Tulis lirik lagu di sini (opsional)..."
              className="w-full p-3 bg-zinc-950 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 text-xs font-mono leading-relaxed transition-colors resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>Label / Tags (Pisahkan dengan koma)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Contoh: Pop, Favorit, Remix, Karya 2026..."
              className="w-full px-3.5 py-2.5 bg-zinc-950 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 text-xs font-medium transition-colors"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Perubahan lagu berhasil disimpan!</span>
            </div>
          )}
        </form>

        <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-950/60 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-black" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
