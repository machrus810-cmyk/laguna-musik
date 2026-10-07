'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Gauge,
  Mic,
  Play,
  Pause,
  RotateCcw,
  Download,
  Save,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { apiFetch, safeJson } from '@/lib/api';
import {
  fetchAndDecodeAudio,
  processAndRenderAudio,
  audioBufferToWavBlob,
} from '@/lib/audioProcessor';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface EditMusicModalProps {
  track: MusicTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onTrackUpdated?: () => void;
  onTrackCreated?: (track: MusicTrack) => void;
}

export type VocalPresetId =
  | 'natural'
  | 'deep_baritone'
  | 'high_soprano'
  | 'chipmunk'
  | 'slowed_screwed'
  | 'robotic'
  | 'vintage_radio'
  | 'cathedral_reverb';

interface VocalPresetConfig {
  id: VocalPresetId;
  name: string;
  desc: string;
  pitchSemitones: number;
  speed: number;
  bassGain: number;
  trebleGain: number;
  reverbLevel: number;
  filterMode?: 'normal' | 'bandpass' | 'robotic';
}

const VOCAL_PRESETS: VocalPresetConfig[] = [
  {
    id: 'natural',
    name: 'Asli / Natural',
    desc: 'Suara vokal original studio tanpa perubahan karakter',
    pitchSemitones: 0,
    speed: 1.0,
    bassGain: 0,
    trebleGain: 0,
    reverbLevel: 0.1,
    filterMode: 'normal',
  },
  {
    id: 'deep_baritone',
    name: 'Cowok Berat (Deep Baritone)',
    desc: 'Pitch diturunkan, nada rendah maskulin bertenaga',
    pitchSemitones: -4,
    speed: 0.95,
    bassGain: 6,
    trebleGain: -1,
    reverbLevel: 0.25,
    filterMode: 'normal',
  },
  {
    id: 'high_soprano',
    name: 'Cewek Melengking (High Soprano)',
    desc: 'Pitch dinaikkan, artikulasi jernih, timbre feminim tinggi',
    pitchSemitones: 4,
    speed: 1.05,
    bassGain: -3,
    trebleGain: 6,
    reverbLevel: 0.2,
    filterMode: 'normal',
  },
  {
    id: 'chipmunk',
    name: 'Chipmunk / Anime Lucu',
    desc: 'Pitch tinggi ceria, tempo sedikit dipercepat khas karakter animasi',
    pitchSemitones: 8,
    speed: 1.2,
    bassGain: -6,
    trebleGain: 8,
    reverbLevel: 0.1,
    filterMode: 'normal',
  },
  {
    id: 'slowed_screwed',
    name: 'Slowed & Screwed Vocal',
    desc: 'Tempo melambat, pitch berat mendalam dengan gema stereo luas',
    pitchSemitones: -5,
    speed: 0.85,
    bassGain: 7,
    trebleGain: -3,
    reverbLevel: 0.65,
    filterMode: 'normal',
  },
  {
    id: 'robotic',
    name: 'Robotic / Vocoder Futuristik',
    desc: 'Efek modulasi suara robotik dengan resonansi frekuensi digital',
    pitchSemitones: 0,
    speed: 1.0,
    bassGain: 2,
    trebleGain: 7,
    reverbLevel: 0.35,
    filterMode: 'robotic',
  },
  {
    id: 'vintage_radio',
    name: 'Vintage Radio / Megaphone',
    desc: 'Bandpass filter Lo-Fi khas siaran radio jadul & piringan hitam',
    pitchSemitones: 1,
    speed: 1.0,
    bassGain: -10,
    trebleGain: 4,
    reverbLevel: 0.15,
    filterMode: 'bandpass',
  },
  {
    id: 'cathedral_reverb',
    name: 'Katedral / Ambient Dream',
    desc: 'Gema vokal atmosferik yang megah dan melayang di ruangan luas',
    pitchSemitones: 0,
    speed: 0.95,
    bassGain: 1,
    trebleGain: 3,
    reverbLevel: 0.8,
    filterMode: 'normal',
  },
];

const TEMPO_QUICK_PRESETS = [
  { label: '0.75x Lambat', speed: 0.75 },
  { label: '0.85x Slowed', speed: 0.85 },
  { label: '1.0x Normal', speed: 1.0 },
  { label: '1.15x Upbeat', speed: 1.15 },
  { label: '1.25x Koplo / Fast', speed: 1.25 },
  { label: '1.40x Nightcore', speed: 1.4 },
];

export default function EditMusicModal({
  track,
  isOpen,
  onClose,
  onTrackUpdated,
  onTrackCreated,
}: EditMusicModalProps) {
  const { playTrack } = useAudioPlayer();

  const [speed, setSpeed] = useState<number>(1.0);
  const [pitchSemitones, setPitchSemitones] = useState<number>(0);
  const [preservePitch, setPreservePitch] = useState<boolean>(true);
  const [selectedVocalPreset, setSelectedVocalPreset] = useState<VocalPresetId>('natural');
  const [bassGain, setBassGain] = useState<number>(0);
  const [trebleGain, setTrebleGain] = useState<number>(0);
  const [reverbLevel, setReverbLevel] = useState<number>(0.1);
  const [filterMode, setFilterMode] = useState<'normal' | 'bandpass' | 'robotic'>('normal');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBypass, setIsBypass] = useState(false);

  const [isRendering, setIsRendering] = useState(false);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);
  const [renderStage, setRenderStage] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [lastSavedTrack, setLastSavedTrack] = useState<MusicTrack | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const bandpassFilterRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !audioRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (!sourceNodeRef.current && audioRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
        const bass = ctx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 250;
        bass.gain.value = 0;

        const treble = ctx.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 3500;
        treble.gain.value = 0;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'allpass';
        bandpass.frequency.value = 1500;

        const gain = ctx.createGain();
        gain.gain.value = 1.0;

        sourceNodeRef.current.connect(bass);
        bass.connect(treble);
        treble.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(ctx.destination);

        bassFilterRef.current = bass;
        trebleFilterRef.current = treble;
        bandpassFilterRef.current = bandpass;
      }
    } catch {
      // ignore
    }
  }, [isOpen]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isBypass) {
      audio.playbackRate = 1.0;
      if (bassFilterRef.current) bassFilterRef.current.gain.value = 0;
      if (trebleFilterRef.current) trebleFilterRef.current.gain.value = 0;
      if (bandpassFilterRef.current) bandpassFilterRef.current.type = 'allpass';
      return;
    }

    let effectiveRate = speed;
    if (!preservePitch && pitchSemitones !== 0) {
      const pitchRatio = Math.pow(2, pitchSemitones / 12);
      effectiveRate = Math.max(0.25, Math.min(4.0, speed * pitchRatio));
      (audio as unknown as { preservesPitch?: boolean }).preservesPitch = false;
    } else {
      (audio as unknown as { preservesPitch?: boolean }).preservesPitch = preservePitch;
    }
    audio.playbackRate = Math.max(0.25, Math.min(4.0, effectiveRate));

    if (bassFilterRef.current) {
      bassFilterRef.current.gain.value = bassGain;
    }
    if (trebleFilterRef.current) {
      trebleFilterRef.current.gain.value = trebleGain;
    }
    if (bandpassFilterRef.current) {
      if (filterMode === 'bandpass') {
        bandpassFilterRef.current.type = 'bandpass';
        bandpassFilterRef.current.frequency.value = 1400;
        bandpassFilterRef.current.Q.value = 1.8;
      } else if (filterMode === 'robotic') {
        bandpassFilterRef.current.type = 'peaking';
        bandpassFilterRef.current.frequency.value = 2400;
        bandpassFilterRef.current.Q.value = 4.0;
        bandpassFilterRef.current.gain.value = 9;
      } else {
        bandpassFilterRef.current.type = 'allpass';
      }
    }
  }, [speed, pitchSemitones, preservePitch, bassGain, trebleGain, filterMode, isBypass]);

  if (!isOpen || !track) return null;

  const rawAudioSrc = track.audio_url || track.stream_audio_url;
  const previewAudioSrc =
    rawAudioSrc.startsWith('http') && !rawAudioSrc.startsWith(window.location.origin)
      ? `/api/proxy/audio?url=${encodeURIComponent(rawAudioSrc)}`
      : rawAudioSrc;

  const handleTogglePlay = async () => {
    if (!audioRef.current) return;
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Gagal memutar audio preview:', err);
      }
    }
  };

  const handleSelectVocalPreset = (preset: VocalPresetConfig) => {
    setSelectedVocalPreset(preset.id);
    setPitchSemitones(preset.pitchSemitones);
    setBassGain(preset.bassGain);
    setTrebleGain(preset.trebleGain);
    setReverbLevel(preset.reverbLevel);
    setFilterMode(preset.filterMode || 'normal');
    if (preset.speed !== 1.0) {
      setSpeed(preset.speed);
    }
  };

  const handleReset = () => {
    setSpeed(1.0);
    setPitchSemitones(0);
    setPreservePitch(true);
    setSelectedVocalPreset('natural');
    setBassGain(0);
    setTrebleGain(0);
    setReverbLevel(0.1);
    setFilterMode('normal');
    setIsBypass(false);
    if (audioRef.current) {
      audioRef.current.playbackRate = 1.0;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderAudioPipeline = async (): Promise<{ wavBlob: Blob; renderedDuration: number }> => {
    setRenderStage('Mengunduh berkas audio studio (bebas CORS)...');
    const originalBuffer = await fetchAndDecodeAudio(rawAudioSrc);
    setRenderStage(`Me-render DSP: Tempo ${speed.toFixed(2)}x & efek vokal...`);
    const processedBuffer = await processAndRenderAudio(originalBuffer, {
      speed,
      preservePitch,
      pitchSemitones,
      bassGain,
      trebleGain,
      filterMode,
      reverbLevel,
    });
    setRenderStage('Mengonversi ke master WAV 16-bit PCM...');
    const wavBlob = audioBufferToWavBlob(processedBuffer);
    const renderedDuration = Math.round(processedBuffer.duration);
    return { wavBlob, renderedDuration };
  };

  const handleDownloadEdited = async () => {
    try {
      setIsRendering(true);
      setStatusNotice('');
      const { wavBlob } = await renderAudioPipeline();
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = track.title.replace(/[^\w\s-]/g, '').trim();
      const presetLabel = VOCAL_PRESETS.find((p) => p.id === selectedVocalPreset)?.name || 'Custom';
      a.download = `${cleanTitle} (Edit ${speed}x - ${presetLabel}).wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusNotice('Unduhan audio hasil edit WAV berhasil disiapkan!');
      setTimeout(() => setStatusNotice(''), 5000);
    } catch (err) {
      setStatusNotice(`Gagal me-render audio: ${err instanceof Error ? err.message : 'Kesalahan jaringan'}`);
    } finally {
      setIsRendering(false);
      setRenderStage('');
    }
  };

  const uploadAudioBlob = async (blob: Blob, fileName: string): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', blob, fileName);
      const res = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await safeJson<{ success?: boolean; fullUrl?: string; url?: string; message?: string }>(res);
      if (res.ok && data.success && (data.fullUrl || data.url)) {
        return data.fullUrl || data.url!;
      }
    } catch (e) {
      console.warn('FormData upload attempt failed, falling back:', e);
    }

    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const handleSaveAsNewTrack = async () => {
    try {
      setIsSavingNew(true);
      setStatusNotice('');
      const { wavBlob, renderedDuration } = await renderAudioPipeline();
      setRenderStage('Menyimpan berkas render ke server studio...');
      const presetLabel = VOCAL_PRESETS.find((p) => p.id === selectedVocalPreset)?.name || 'Edit Vokal';
      const fileName = `${track.title.replace(/[^\w\s-]/g, '')} (Edit ${speed}x).wav`;
      
      const hostedAudioUrl = await uploadAudioBlob(wavBlob, fileName);
      setRenderStage('Menambahkan lagu ke Workspace Library...');
      const newTitle = `${track.title} (${speed}x - ${presetLabel})`;
      const trackRes = await apiFetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          audio_url: hostedAudioUrl,
          stream_audio_url: hostedAudioUrl,
          cover_url: track.cover_url,
          duration: renderedDuration || Math.round((track.duration || 180) / speed),
          lyrics: track.lyrics,
          prompt: `${track.prompt || ''} [Tempo: ${speed}x, Pitch: ${pitchSemitones}st, Vokal: ${presetLabel}]`,
          style: `${track.style || 'AI Music'} (${speed}x - ${presetLabel})`,
          model: 'Studio Audio Edit',
          tags: ['Edited', `${speed}x Tempo`, presetLabel, 'Remix'],
          vocal_gender: track.vocal_gender,
          instrumental: track.instrumental,
          is_favorite: false,
          is_remix: true,
          original_audio_url: rawAudioSrc,
        }),
      });
      const data = await safeJson<{ success?: boolean; track?: MusicTrack }>(trackRes);
      if (data.success && data.track) {
        setLastSavedTrack(data.track);
        if (onTrackCreated) onTrackCreated(data.track);
        if (onTrackUpdated) onTrackUpdated();
        try {
          playTrack(data.track);
        } catch {}
        setStatusNotice(`Lagu "${newTitle}" berhasil dibuat dan otomatis diputar dari Workspace Library!`);
      }
    } catch (err) {
      setStatusNotice(`Gagal menyimpan: ${err instanceof Error ? err.message : 'Kesalahan jaringan'}`);
    } finally {
      setIsSavingNew(false);
      setRenderStage('');
    }
  };

  const handleUpdateCurrentTrack = async () => {
    try {
      setIsUpdatingExisting(true);
      setStatusNotice('');
      const { wavBlob, renderedDuration } = await renderAudioPipeline();
      setRenderStage('Menyimpan pembaruan audio render...');
      const presetLabel = VOCAL_PRESETS.find((p) => p.id === selectedVocalPreset)?.name || 'Edit Vokal';
      const fileName = `${track.title.replace(/[^\w\s-]/g, '')} (Updated).wav`;
      const hostedAudioUrl = await uploadAudioBlob(wavBlob, fileName);
      setRenderStage('Memperbarui informasi lagu di database...');
      const res = await apiFetch(`/api/tracks/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: hostedAudioUrl,
          stream_audio_url: hostedAudioUrl,
          duration: renderedDuration || Math.round((track.duration || 180) / speed),
          style: `${track.style || 'AI Music'} (Edit ${speed}x - ${presetLabel})`,
          tags: Array.from(new Set([...(track.tags || []), `${speed}x Tempo`, presetLabel, 'Edited'])),
        }),
      });
      const data = await safeJson<{ success?: boolean; track?: MusicTrack }>(res);
      if (data.success && data.track) {
        setLastSavedTrack(data.track);
        if (onTrackUpdated) onTrackUpdated();
        try {
          playTrack(data.track);
        } catch {}
        setStatusNotice(`Lagu "${track.title}" berhasil diperbarui dengan tempo & vokal baru dan mulai diputar!`);
      }
    } catch (err) {
      setStatusNotice(`Gagal memperbarui lagu: ${err instanceof Error ? err.message : 'Kesalahan jaringan'}`);
    } finally {
      setIsUpdatingExisting(false);
      setRenderStage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <audio
          ref={audioRef}
          src={previewAudioSrc}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || track.duration || 180)}
          onEnded={() => setIsPlaying(false)}
          preload="auto"
        />

        {/* Modal Header */}
        <div className="px-6 py-4 bg-zinc-900/90 border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              <SlidersHorizontal className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Studio Edit Audio: Tempo & Vokal
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  REAL-TIME DSP ENGINE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ubah kecepatan / tempo musik (cepat/lambat) dan modifikasi warna vokal lagu secara instan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-3 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 border border-amber-500/30 shrink-0 shadow-md">
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
                  <h4 className="text-sm font-bold text-white truncate max-w-sm">
                    {track.title}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate">
                    {track.style || 'Studio Master Track'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBypass(!isBypass)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isBypass
                      ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-md font-bold'
                      : 'bg-zinc-800/80 text-zinc-300 hover:text-white border-white/10'
                  }`}
                  title="Klik untuk mendengar suara asli sebelum diedit"
                >
                  {isBypass ? 'Mode: Suara Asli (Bypass)' : 'Bandingkan dengan Asli'}
                </button>
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-400 text-zinc-950 shadow-amber-400/30 ring-2 ring-amber-400/30'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Jeda Preview</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Putar Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="text-amber-400 font-bold">{formatTime(currentTime)}</span>
                <span className="text-zinc-500">
                  Durasi Hasil Render: {formatTime((duration || 180) / speed)} (Tempo {speed}x)
                </span>
                <span>{formatTime(duration || 180)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="w-full h-1.5 rounded-lg bg-zinc-800 appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>

          {/* Section 1: Speed */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Gauge className="w-4 h-4 text-amber-400" />
                <span>1. Kecepatan & Lambat Tempo Lagu (Speed / BPM)</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                {speed.toFixed(2)}x Speed{' '}
                {speed > 1
                  ? `(+${Math.round((speed - 1) * 100)}% Cepat)`
                  : speed < 1
                  ? `(-${Math.round((1 - speed) * 100)}% Lambat)`
                  : '(Normal)'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>0.5x (Super Lambat)</span>
                <span className="text-white font-semibold">1.0x (Normal)</span>
                <span>2.0x (Super Cepat)</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg bg-zinc-800 appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {TEMPO_QUICK_PRESETS.map((p) => {
                const isActive = Math.abs(speed - p.speed) < 0.01;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setSpeed(p.speed)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-zinc-950 shadow-md font-bold'
                        : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-white/5'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <span className="text-xs font-medium text-white block">
                  Kunci Pitch Nada Vokal (Time-Stretch)
                </span>
                <span className="text-[11px] text-zinc-400 block">
                  {preservePitch
                    ? 'Pitch vokal tetap stabil tidak melengking saat dipercepat atau diperlambat.'
                    : 'Mode Tape/Vinyl: Nada vokal ikut berubah tinggi/rendah sesuai kecepatan kaset.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreservePitch(!preservePitch)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  preservePitch
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-white/10'
                }`}
              >
                {preservePitch ? 'Aktif (Pitch Terkunci)' : 'Nonaktif (Mode Vinyl)'}
              </button>
            </div>
          </div>

          {/* Section 2: Vocal Presets */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Mic className="w-4 h-4 text-cyan-400" />
                <span>2. Ubah Karakter Suara Vokal (Pitch & Timbre)</span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20">
                {pitchSemitones > 0
                  ? `+${pitchSemitones} Semitone (Lebih Tinggi)`
                  : pitchSemitones < 0
                  ? `${pitchSemitones} Semitone (Lebih Rendah)`
                  : 'Original Pitch (0)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VOCAL_PRESETS.map((preset) => {
                const isSelected = selectedVocalPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectVocalPreset(preset)}
                    className={`p-2.5 sm:p-3 rounded-2xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/60 shadow-md ring-1 ring-cyan-400/30'
                        : 'bg-zinc-950/60 border-white/10 hover:border-white/20 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div>
                      <span
                        className={`text-xs font-bold block ${
                          isSelected ? 'text-cyan-300' : 'text-white'
                        }`}
                      >
                        {preset.name}
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {preset.desc}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>
                        {preset.pitchSemitones > 0
                          ? `+${preset.pitchSemitones} st`
                          : `${preset.pitchSemitones} st`}
                      </span>
                      {isSelected && <span className="text-cyan-400 font-bold">Aktif</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
              <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-semibold">Tinggi / Rendah Nada</span>
                  <span className="font-mono text-cyan-400 font-bold">{pitchSemitones} st</span>
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={pitchSemitones}
                  onChange={(e) => {
                    setPitchSemitones(parseInt(e.target.value));
                    setSelectedVocalPreset('natural');
                  }}
                  className="w-full h-1.5 rounded-lg bg-zinc-800 appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-semibold">Bobot Bass Vokal</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {bassGain > 0 ? `+${bassGain}dB` : `${bassGain}dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  step={1}
                  value={bassGain}
                  onChange={(e) => setBassGain(parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-lg bg-zinc-800 appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-semibold">Kejernihan Artikulasi</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {trebleGain > 0 ? `+${trebleGain}dB` : `${trebleGain}dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  step={1}
                  value={trebleGain}
                  onChange={(e) => setTrebleGain(parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-lg bg-zinc-800 appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {renderStage && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2.5 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-400" />
              <span className="font-medium">{renderStage}</span>
            </div>
          )}

          {statusNotice && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <span className="font-medium text-emerald-200">{statusNotice}</span>
              </div>
              {lastSavedTrack && (
                <button
                  type="button"
                  onClick={() => playTrack(lastSavedTrack)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Putar Sekarang</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-zinc-900 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={isRendering || isSavingNew || isUpdatingExisting}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 transition-colors flex items-center gap-1.5 w-full sm:w-auto justify-center disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Asli</span>
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadEdited}
              disabled={isRendering || isSavingNew || isUpdatingExisting}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isRendering ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Download className="w-4 h-4 text-amber-400" />
              )}
              <span>Unduh WAV</span>
            </button>
            <button
              type="button"
              onClick={handleUpdateCurrentTrack}
              disabled={isRendering || isSavingNew || isUpdatingExisting}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-white/10 transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Perbarui berkas audio dan tempo lagu saat ini"
            >
              {isUpdatingExisting ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <RefreshCw className="w-4 h-4 text-cyan-400" />
              )}
              <span>Timpa Lagu Ini</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAsNewTrack}
              disabled={isRendering || isSavingNew || isUpdatingExisting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSavingNew ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
              ) : (
                <Save className="w-4 h-4 text-zinc-950" />
              )}
              <span>Simpan ke Workspace Library</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
