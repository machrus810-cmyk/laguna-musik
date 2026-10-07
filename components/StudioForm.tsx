'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Music,
  PenTool,
  Upload,
  Sliders,
  Volume2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wand2,
  HelpCircle,
  FileAudio,
  X,
  ChevronDown,
  Layers,
  Zap,
} from 'lucide-react';
import { apiFetch, safeJson } from '@/lib/api';
import { MusicProvider } from '@/database/db';

interface StudioFormProps {
  onMusicCreated: () => void;
  onOpenAutoLyrics: () => void;
  lyricsInputValue?: string;
  styleInputValue?: string;
  titleInputValue?: string;
  onClearPrefilled?: () => void;
  activeProvider: MusicProvider;
  credits: number;
}

const STYLE_PRESETS = [
  'Indonesian Pop, Catchy Melodic, Acoustic Guitar, Heartfelt',
  'Dangdut Koplo Modern, Kendang Beat, Synth Brass, Energetic',
  'Lo-Fi Chillhop, Warm Rhodes Piano, Soft Beats, Relaxing',
  'Modern Melodic Rock, Electric Guitar Solo, Driving Drums',
  'R&B Soul, Smooth Vocal Harmonies, Groovy Bassline',
  'EDM Future Bass, Euphoric Synth Drop, 128 BPM',
  'Acoustic Folk Balada, Fingerpicking Guitar, Intimate',
  'Cinematic Epic Trailer, Orchestral Strings, Dramatic',
  'Synthwave 80s Retro, Neon Synth, Retro Drum Machine',
  'Jazz Cafe, Upright Bass, Soft Brushed Snare, Saxophone',
];

export default function StudioForm({
  onMusicCreated,
  onOpenAutoLyrics,
  lyricsInputValue = '',
  styleInputValue = '',
  titleInputValue = '',
  onClearPrefilled,
  activeProvider,
  credits,
}: StudioFormProps) {
  const [isCustomMode, setIsCustomMode] = useState(true);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState(lyricsInputValue);
  const [style, setStyle] = useState(styleInputValue);
  const [title, setTitle] = useState(titleInputValue);
  const [description, setDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState('V3_5');
  const [referenceAudioFile, setReferenceAudioFile] = useState<File | null>(null);
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string>('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync external prefilled props
  React.useEffect(() => {
    if (lyricsInputValue) {
      setLyrics(lyricsInputValue);
      setIsCustomMode(true);
    }
  }, [lyricsInputValue]);

  React.useEffect(() => {
    if (styleInputValue) {
      setStyle(styleInputValue);
      setIsCustomMode(true);
    }
  }, [styleInputValue]);

  React.useEffect(() => {
    if (titleInputValue) {
      setTitle(titleInputValue);
      setIsCustomMode(true);
    }
  }, [titleInputValue]);

  const handleInsertTag = (tag: string) => {
    setLyrics((prev) => (prev ? `${prev}\n\n${tag}\n` : `${tag}\n`));
  };

  const handleRandomStyle = () => {
    const random = STYLE_PRESETS[Math.floor(Math.random() * STYLE_PRESETS.length)];
    setStyle(random);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio') && !file.name.match(/\.(mp3|wav|m4a|ogg|aac)$/i)) {
      setErrorMessage('Format audio tidak didukung. Silakan gunakan MP3, WAV, atau M4A.');
      return;
    }

    setReferenceAudioFile(file);
    setIsUploadingAudio(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const res = await apiFetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await safeJson<{ url?: string; error?: string; message?: string }>(res);
      if (data && data.url) {
        setReferenceAudioUrl(data.url);
      } else {
        // Fallback local object URL
        setReferenceAudioUrl(URL.createObjectURL(file));
      }
    } catch {
      // In case upload route fails, fallback to local object URL
      setReferenceAudioUrl(URL.createObjectURL(file));
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isCustomMode && !isInstrumental && !lyrics.trim() && !style.trim()) {
      setErrorMessage('Silakan isi Lirik atau Gaya Musik untuk memulai pembuatan lagu.');
      return;
    }

    if (!isCustomMode && !description.trim()) {
      setErrorMessage('Silakan tuliskan deskripsi lagu yang ingin Anda buat.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        custom_mode: isCustomMode,
        instrumental: isInstrumental,
        prompt: isCustomMode ? lyrics : description,
        style: isCustomMode ? style : undefined,
        title: isCustomMode ? title : undefined,
        model: selectedModel,
        audio_url: referenceAudioUrl || undefined,
        provider: activeProvider,
      };

      const res = await apiFetch('/api/music/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJson<{ error?: string; message?: string }>(res);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Gagal memulai proses pembuatan lagu');
      }

      setSuccessMessage('Tugas pembuatan musik berhasil dikirim! Lagu sedang diproses di antrean studio...');
      if (onClearPrefilled) onClearPrefilled();
      onMusicCreated();

      // Reset prompt fields if appropriate
      if (!isCustomMode) setDescription('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-950/90 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-black font-bold shadow-lg shadow-amber-500/20">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Studio AI Creator
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PRO ENGINE
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Buat lagu profesional berkualitas studio dengan AI tercanggih
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 bg-zinc-900/90 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isCustomMode
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Deskripsi Simpel
          </button>
          <button
            type="button"
            onClick={() => setIsCustomMode(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isCustomMode
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Custom Pro
          </button>
        </div>
      </div>

      {/* Error & Success Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">Perhatian</p>
            <p>{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          <div className="flex-1">
            <p className="font-semibold">Berhasil!</p>
            <p>{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Form Form */}
      <form onSubmit={handleGenerate} className="flex flex-col gap-5">
        {/* Instrumental Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isInstrumental ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-200">Instrumen Saja (Tanpa Vokal)</p>
              <p className="text-[11px] text-zinc-500">Hanya aransemen musik dan instrumen tanpa nyanyian</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isInstrumental}
              onChange={(e) => setIsInstrumental(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Custom Mode Fields */}
        {isCustomMode ? (
          <div className="space-y-4">
            {/* Lyrics Section */}
            {!isInstrumental && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-amber-400" />
                    Lirik Lagu
                  </label>
                  <button
                    type="button"
                    onClick={onOpenAutoLyrics}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                  >
                    <Wand2 className="w-3 h-3" />
                    Generator Lirik AI
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="[Verse 1]&#10;Di bawah temaram lampu kota...&#10;&#10;[Chorus]&#10;Ku bernyanyi untukmu selamanya..."
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 resize-y transition-all font-mono leading-relaxed"
                />

                {/* Quick Song Structure Tags */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mr-1">
                    Struktur:
                  </span>
                  {[
                    '[Verse]',
                    '[Chorus]',
                    '[Bridge]',
                    '[Outro]',
                    '[Intro]',
                    '[Guitar Solo]',
                    '[Drop]',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/10 text-[11px] text-zinc-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Style of Music */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Gaya Musik & Genre (Style)
                </label>
                <button
                  type="button"
                  onClick={handleRandomStyle}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Acak Gaya
                </button>
              </div>

              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Contoh: Pop Melayu, Akustik Santai, Piano Melodi, Harmoni Hangat"
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
              />

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Pop Indo', 'Dangdut Koplo', 'Akustik Santai', 'Rock Melayu', 'R&B Soul', 'Lo-Fi Chill', 'EDM Jedag Jedug'].map(
                  (chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setStyle((prev) => (prev ? `${prev}, ${chip}` : chip))}
                      className="px-2 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[10px] text-zinc-400 hover:text-amber-300 hover:border-amber-500/40 transition-colors"
                    >
                      +{chip}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                Judul Lagu (Opsional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Senandung Di Ujung Hari"
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
              />
            </div>
          </div>
        ) : (
          /* Simple Mode Description */
          <div>
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Ceritakan Lagu Yang Anda Inginkan
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Buat lagu pop akustik Indonesia yang penuh perasaan tentang rindu pada kampung halaman, diiringi petikan gitar akustik lembut dan vokal hangat pria..."
              className="w-full bg-zinc-900/90 border border-white/10 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 resize-y transition-all leading-relaxed"
            />
          </div>
        )}

        {/* Audio Reference Upload */}
        <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              Audio Referensi / Vokal Panduan (Opsional)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAudio}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-white/10 transition-colors inline-flex items-center gap-1"
            >
              {isUploadingAudio ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                  Mengunggah...
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3" />
                  Pilih File Audio
                </>
              )}
            </button>
          </div>

          {referenceAudioFile && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-white/10 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileAudio className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate text-zinc-300 font-medium">{referenceAudioFile.name}</span>
                <span className="text-[10px] text-zinc-500 shrink-0">
                  ({(referenceAudioFile.size / (1024 * 1024)).toFixed(1)} MB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReferenceAudioFile(null);
                  setReferenceAudioUrl('');
                }}
                className="text-zinc-500 hover:text-rose-400 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Engine Model Version */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-xs font-bold text-zinc-300">Model Engine:</span>
              <span className="text-[11px] text-zinc-500 ml-1.5">Versi algoritma AI</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'V3_5', label: 'Suno V3.5 (Default)' },
              { id: 'V4', label: 'Suno V4.0 (HQ)' },
            ].map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => setSelectedModel(model.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedModel === model.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-zinc-900 text-zinc-400 border border-white/5 hover:text-zinc-200'
                }`}
              >
                {model.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="submit"
          disabled={isSubmitting || isUploadingAudio}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-black font-extrabold text-sm tracking-wide shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses Musik di Studio AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Buat Lagu Sekarang</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/20 text-black ml-1">
                (5 Kredit)
              </span>
            </>
          )}
        </button>

        {/* Engine & Balance Badge */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
          <span>Provider Aktif: <strong className="text-zinc-400 capitalize">{activeProvider}</strong></span>
          <span>Sisa Kredit Akun: <strong className="text-amber-400">{credits} Kredit</strong></span>
        </div>
      </form>
    </div>
  );
}
