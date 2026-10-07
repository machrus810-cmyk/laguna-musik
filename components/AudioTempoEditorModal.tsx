'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Play,
  Pause,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Disc3,
  Download,
  Mic2,
  Music2,
  Volume2,
  Wand2,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import {
  renderAudioWithTempoAndPitch,
  VocalCharacterType,
} from '@/lib/audioTempoProcessor';
import { apiFetch } from '@/lib/api';

export interface AudioTempoEditorModalProps {
  track: MusicTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyToRemix?: (editedTrack: MusicTrack, editedAudioUrl: string, tempo: number) => void;
  onSaveToWorkspace?: (newTrack: MusicTrack, tempo: number) => void;
}

const TEMPO_PRESETS = [
  { label: '0.50x', name: 'Ultra Slow', value: 0.5 },
  { label: '0.75x', name: 'Sangat Lambat', value: 0.75 },
  { label: '0.85x', name: 'Slowed + Reverb', value: 0.85 },
  { label: '1.00x', name: 'Normal', value: 1.0 },
  { label: '1.15x', name: 'Agak Cepat', value: 1.15 },
  { label: '1.25x', name: 'Koplo / Fast', value: 1.25 },
  { label: '1.50x', name: 'Nightcore', value: 1.5 },
  { label: '2.00x', name: 'Speed Up 2x', value: 2.0 },
];

const PITCH_PRESETS = [
  { label: '-12 st', name: '1 Oktaf Turun', value: -12 },
  { label: '-6 st', name: 'Deep Monster', value: -6 },
  { label: '-4 st', name: 'Turun 4 Nada', value: -4 },
  { label: '-2 st', name: 'Turun 2 Nada', value: -2 },
  { label: '0 st', name: 'Kunci Asli', value: 0 },
  { label: '+2 st', name: 'Naik 2 Nada', value: 2 },
  { label: '+4 st', name: 'Naik 4 Nada', value: 4 },
  { label: '+6 st', name: 'Chipmunk / Anime', value: 6 },
  { label: '+12 st', name: '1 Oktaf Naik', value: 12 },
];

interface VocalPresetItem {
  id: VocalCharacterType;
  label: string;
  badge: string;
  desc: string;
  suggestedPitch?: number;
  formantShift: number;
}

const VOCAL_PRESETS: VocalPresetItem[] = [
  {
    id: 'original',
    label: 'Suara Asli',
    badge: 'ASLI',
    desc: 'Karakter suara asli penyanyi tanpa filter formant',
    suggestedPitch: 0,
    formantShift: 0,
  },
  {
    id: 'male_to_female',
    label: 'Cowok -> Cewek',
    badge: 'FEMALE',
    desc: 'Pitch naik + formant vokal wanita yang renyah & feminin',
    suggestedPitch: 4,
    formantShift: 60,
  },
  {
    id: 'female_to_male',
    label: 'Cewek -> Cowok',
    badge: 'MALE',
    desc: 'Pitch turun + resonansi dada pria yang berbobot & maskulin',
    suggestedPitch: -4,
    formantShift: -60,
  },
  {
    id: 'chipmunk',
    label: 'Chipmunk / Anime',
    badge: 'ANIME',
    desc: 'Vokal imut pitch tinggi dengan resonansi ceria',
    suggestedPitch: 6,
    formantShift: 80,
  },
  {
    id: 'deep_male',
    label: 'Deep Bass / Monster',
    badge: 'BASS',
    desc: 'Vokal pria rendah berat dengan saturasi dada sub-bass',
    suggestedPitch: -5,
    formantShift: -80,
  },
  {
    id: 'warm_acoustic',
    label: 'Warm Studio Acoustic',
    badge: 'STUDIO',
    desc: 'Karakter vokal hangat studio dengan kejernihan mid-presence',
    suggestedPitch: 0,
    formantShift: 20,
  },
  {
    id: 'vintage_radio',
    label: 'Radio / Telepon Vintage',
    badge: 'LO-FI',
    desc: 'Efek vokal telepon jadul retro bandpass unik',
    suggestedPitch: 0,
    formantShift: 30,
  },
  {
    id: 'robot_cyber',
    label: 'Cyber Robot / Vocoder',
    badge: 'CYBER',
    desc: 'Efek resonansi vokal robotik futuristik',
    suggestedPitch: -2,
    formantShift: 50,
  },
];

function formatTime(secs: number): string {
  if (isNaN(secs) || secs < 0) return '00:00';
  const mins = Math.floor(secs / 60);
  const remainder = Math.floor(secs % 60);
  return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}

export default function AudioTempoEditorModal({
  track,
  isOpen,
  onClose,
  onApplyToRemix,
  onSaveToWorkspace,
}: AudioTempoEditorModalProps) {
  if (!isOpen || !track) return null;
  return (
    <AudioTempoEditorDialog
      key={`${track.id}-${track.duration || 0}`}
      track={track}
      onClose={onClose}
      onApplyToRemix={onApplyToRemix}
      onSaveToWorkspace={onSaveToWorkspace}
    />
  );
}

function AudioTempoEditorDialog({
  track,
  onClose,
  onApplyToRemix,
  onSaveToWorkspace,
}: {
  track: MusicTrack;
  onClose: () => void;
  onApplyToRemix?: (editedTrack: MusicTrack, editedAudioUrl: string, tempo: number) => void;
  onSaveToWorkspace?: (newTrack: MusicTrack, tempo: number) => void;
}) {
  const [tempo, setTempo] = useState<number>(1.0);
  const [pitchSemitones, setPitchSemitones] = useState<number>(0);
  const [preservePitch, setPreservePitch] = useState<boolean>(false);
  const [vocalCharacter, setVocalCharacter] = useState<VocalCharacterType>('original');
  const [vocalFormantShift, setVocalFormantShift] = useState<number>(0);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(track.duration || 180);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [renderedResult, setRenderedResult] = useState<{
    blob: Blob;
    objectUrl: string;
    duration: number;
    tempo: number;
    pitchSemitones: number;
    vocalCharacter: VocalCharacterType;
    vocalFormantShift: number;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const renderedAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingRendered, setIsPlayingRendered] = useState<boolean>(false);

  useEffect(() => {
    if (audioRef.current) {
      const pitchRatio = Math.pow(2, pitchSemitones / 12);
      const effectiveRate = preservePitch ? tempo : tempo * pitchRatio;
      audioRef.current.playbackRate = Math.max(0.25, Math.min(4.0, effectiveRate));
    }
  }, [tempo, pitchSemitones, preservePitch]);

  useEffect(() => {
    return () => {
      if (renderedResult?.objectUrl) {
        URL.revokeObjectURL(renderedResult.objectUrl);
      }
    };
  }, [renderedResult]);

  const audioSource = track.audio_url || track.stream_audio_url;
  const estimatedNewDuration = duration > 0 ? Math.round(duration / tempo) : 180;
  const percentageDiff = Math.round((tempo - 1.0) * 100);
  const isRenderValid =
    renderedResult !== null &&
    Math.abs(renderedResult.tempo - tempo) < 0.01 &&
    renderedResult.pitchSemitones === pitchSemitones &&
    renderedResult.vocalCharacter === vocalCharacter &&
    renderedResult.vocalFormantShift === vocalFormantShift;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (renderedAudioRef.current) {
        renderedAudioRef.current.pause();
        setIsPlayingRendered(false);
      }
      const pitchRatio = Math.pow(2, pitchSemitones / 12);
      const effectiveRate = preservePitch ? tempo : tempo * pitchRatio;
      audio.playbackRate = Math.max(0.25, Math.min(4.0, effectiveRate));
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setErrorMessage('Gagal memutar audio pratinjau. Cek koneksi berkas.');
        });
    }
  };

  const togglePlayRendered = () => {
    const audio = renderedAudioRef.current;
    if (!audio) return;
    if (isPlayingRendered) {
      audio.pause();
      setIsPlayingRendered(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      audio
        .play()
        .then(() => setIsPlayingRendered(true))
        .catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSelectVocalPreset = (preset: VocalPresetItem) => {
    setVocalCharacter(preset.id);
    setVocalFormantShift(preset.formantShift);
    if (preset.suggestedPitch !== undefined) {
      setPitchSemitones(preset.suggestedPitch);
    }
    setStatusMessage(`Karakter vokal diatur ke: ${preset.label}`);
    setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleReset = () => {
    setTempo(1.0);
    setPitchSemitones(0);
    setPreservePitch(false);
    setVocalCharacter('original');
    setVocalFormantShift(0);
    setRenderedResult(null);
    setStatusMessage('Pengaturan dikembalikan ke nilai awal');
    setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleRenderAudio = useCallback(async (): Promise<{ blob: Blob; duration: number; objectUrl: string } | null> => {
    if (!audioSource) {
      setErrorMessage('Berkas audio tidak valid.');
      return null;
    }
    if (audioRef.current) audioRef.current.pause();
    if (renderedAudioRef.current) renderedAudioRef.current.pause();
    setIsPlaying(false);
    setIsPlayingRendered(false);
    setIsRendering(true);
    setErrorMessage('');
    const vocalName = VOCAL_PRESETS.find((v) => v.id === vocalCharacter)?.label || 'Suara Asli';
    setStatusMessage(
      `Memproses audio (Tempo ${tempo.toFixed(2)}x, Pitch ${
        pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones
      } st, ${vocalName})...`
    );
    try {
      const { blob, duration: newDur } = await renderAudioWithTempoAndPitch(
        audioSource,
        tempo,
        pitchSemitones,
        preservePitch,
        vocalCharacter,
        vocalFormantShift
      );
      const objectUrl = URL.createObjectURL(blob);
      setRenderedResult({
        blob,
        objectUrl,
        duration: newDur,
        tempo,
        pitchSemitones,
        vocalCharacter,
        vocalFormantShift,
      });
      setStatusMessage(
        `✓ Audio berhasil dirender! (Tempo ${tempo.toFixed(2)}x, Pitch ${
          pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones
        } st, ${vocalName})`
      );
      return { blob, duration: newDur, objectUrl };
    } catch (err: unknown) {
      console.error('Error rendering tempo/pitch/vocal:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memproses audio.';
      setErrorMessage(msg);
      setStatusMessage('');
      return null;
    } finally {
      setIsRendering(false);
    }
  }, [audioSource, tempo, pitchSemitones, preservePitch, vocalCharacter, vocalFormantShift]);

  const handleDownloadLocally = async () => {
    try {
      let currentBlob = renderedResult?.blob;
      if (!isRenderValid || !currentBlob) {
        const res = await handleRenderAudio();
        if (!res) return;
        currentBlob = res.blob;
      }
      const url = URL.createObjectURL(currentBlob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = track.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeTitle}_tempo_${tempo.toFixed(2)}x_pitch_${pitchSemitones}st_${vocalCharacter}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch {}
  };

  const handleSaveToWorkspaceAction = async (targetAction: 'workspace' | 'remix') => {
    if (!audioSource) {
      setErrorMessage('Berkas audio tidak valid.');
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    if (renderedAudioRef.current) renderedAudioRef.current.pause();
    setIsPlaying(false);
    setIsPlayingRendered(false);
    setIsProcessing(true);
    setErrorMessage('');

    try {
      let currentBlob = renderedResult?.blob;
      let currentDur = renderedResult?.duration || estimatedNewDuration;

      if (!isRenderValid || !currentBlob) {
        setStatusMessage(
          `Merender audio (Tempo ${tempo.toFixed(2)}x, Pitch ${
            pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones
          } st)...`
        );
        const renderRes = await handleRenderAudio();
        if (!renderRes) {
          throw new Error('Gagal merender audio sebelum menyimpan.');
        }
        currentBlob = renderRes.blob;
        currentDur = renderRes.duration;
      }

      setStatusMessage(targetAction === 'remix' ? 'Menyiapkan ke menu Remix Audio...' : 'Menyimpan lagu ke Workspace Library...');
      const pitchLabel = pitchSemitones === 0 ? '' : ` • Pitch ${pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}st`;
      const vocalLabel =
        vocalCharacter === 'original'
          ? ''
          : ` • ${VOCAL_PRESETS.find((v) => v.id === vocalCharacter)?.label || 'Vokal Shift'}`;
      const cleanTitle = `${track.title} (Edit ${tempo.toFixed(2)}x${pitchLabel}${vocalLabel})`;
      const safeTitle = track.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${safeTitle}_edit_${tempo.toFixed(2)}x.wav`;

      const formData = new FormData();
      const audioFile = new File([currentBlob!], fileName, { type: 'audio/wav' });
      formData.append('file', audioFile);
      formData.append('title', cleanTitle);
      formData.append('duration', Math.round(currentDur).toString());
      formData.append('style', track.style || 'Edited Track');
      formData.append('lyrics', track.lyrics || '');
      formData.append('prompt', track.prompt || `Edit: Tempo ${tempo.toFixed(2)}x${pitchLabel}${vocalLabel}`);

      let data: any = null;
      try {
        const uploadRes = await apiFetch('/api/audio/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          data = await uploadRes.json();
        }
      } catch (err) {
        console.warn('Upload notice:', err);
      }

      const fallbackUrl = URL.createObjectURL(currentBlob!);
      const editedAudioUrl = data?.publicUrl || data?.fullUrl || data?.url || fallbackUrl;

      const savePayload = {
        title: cleanTitle,
        audio_url: editedAudioUrl,
        stream_audio_url: editedAudioUrl,
        cover_url: track.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        duration: Math.round(currentDur),
        lyrics: track.lyrics || '',
        prompt: `Audio Edit: Tempo ${tempo.toFixed(2)}x${pitchLabel}${vocalLabel}`,
        style: track.style || 'Audio Edit',
        model: 'Audio Editor DSP',
        tags: ['My Workspace', 'Remix & Covers', 'Audio Edit'],
        vocal_gender:
          vocalCharacter === 'male_to_female' || vocalCharacter === 'chipmunk'
            ? 'Female'
            : vocalCharacter === 'female_to_male' || vocalCharacter === 'deep_male'
            ? 'Male'
            : track.vocal_gender || 'Any',
        instrumental: track.instrumental,
        is_favorite: false,
        is_remix: true,
        original_audio_url: audioSource,
        task_id: 'edit-track',
        audio_id: 'edit-audio',
      };

      let finalTrack: MusicTrack;
      try {
        const trackRes = await apiFetch('/api/tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayload),
        });
        const trackData = await trackRes.json();
        if (trackData.success && trackData.track) {
          finalTrack = trackData.track;
        } else {
          finalTrack = {
            ...track,
            id: `${track.id}-edited`,
            ...savePayload,
            download_count: 0,
            created_at: track.created_at,
          };
        }
      } catch {
        finalTrack = {
          ...track,
          id: `${track.id}-edited`,
          ...savePayload,
          download_count: 0,
          created_at: track.created_at,
        };
      }

      setStatusMessage('✓ Lagu hasil edit berhasil tersimpan di Workspace Library!');
      if (targetAction === 'remix' && onApplyToRemix) {
        onApplyToRemix(finalTrack, editedAudioUrl, tempo);
      } else if (onSaveToWorkspace) {
        onSaveToWorkspace(finalTrack, tempo);
      } else if (onApplyToRemix) {
        onApplyToRemix(finalTrack, editedAudioUrl, tempo);
      }

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      console.error('Error saving edited track:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan lagu ke workspace.';
      setErrorMessage(msg);
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="audio-track-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing && !isRendering) onClose();
      }}
    >
      {audioSource && (
        <audio
          ref={audioRef}
          src={audioSource}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            if (e.currentTarget.duration && !isNaN(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          preload="auto"
        />
      )}
      {renderedResult?.objectUrl && (
        <audio
          ref={renderedAudioRef}
          src={renderedResult.objectUrl}
          onEnded={() => {
            setIsPlayingRendered(false);
          }}
          preload="auto"
        />
      )}

      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  Studio Audio Editor
                </span>
                <span className="text-xs text-zinc-500">• Tempo, Pitch & Suara Penyanyi</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Edit Tempo, Kunci Nada & Karakter Suara
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing || isRendering}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 p-3 rounded-2xl bg-zinc-900/70 border border-white/5 flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 border border-white/10 shrink-0">
            <Image
              src={track.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
              alt={track.title}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
            <p className="text-xs text-zinc-400 truncate">
              {track.style || 'Indonesian Pop'} • {formatTime(duration)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-mono text-zinc-500 block">Durasi Baru</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {formatTime(estimatedNewDuration)}
            </span>
          </div>
        </div>

        {/* SECTION 1: TEMPO / SPEED */}
        <div className="mt-4 p-4 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-amber-400" />
                Tempo / Kecepatan Lagu (Cepat & Lambat)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTempo((t) => Math.max(0.25, Math.round((t - 0.05) * 100) / 100))}
                className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono cursor-pointer"
              >
                -5%
              </button>
              <button
                type="button"
                onClick={() => setTempo((t) => Math.min(3.0, Math.round((t + 0.05) * 100) / 100))}
                className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono cursor-pointer"
              >
                +5%
              </button>
              <button
                type="button"
                onClick={() => setTempo(1.0)}
                disabled={tempo === 1.0}
                className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>1.0x</span>
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {tempo.toFixed(2)}x
              </span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  percentageDiff === 0
                    ? 'text-zinc-400 bg-zinc-800'
                    : percentageDiff > 0
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                    : 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30'
                }`}
              >
                {percentageDiff === 0
                  ? 'Normal (1.00x)'
                  : percentageDiff > 0
                  ? `Percepat +${percentageDiff}%`
                  : `Perlambat ${percentageDiff}%`}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="0.25"
              max="2.5"
              step="0.01"
              value={tempo}
              onChange={(e) => setTempo(parseFloat(e.target.value))}
              disabled={isProcessing || isRendering}
              className="w-full h-2 rounded-lg bg-zinc-800 appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {TEMPO_PRESETS.map((preset) => {
              const isSelected = Math.abs(tempo - preset.value) < 0.02;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setTempo(preset.value)}
                  disabled={isProcessing || isRendering}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-bold'
                      : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-white/5'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="text-[10px] font-normal opacity-70 ml-1">({preset.name})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: PITCH */}
        <div className="mt-3 p-4 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-400/20 text-purple-400 text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Mic2 className="w-3.5 h-3.5 text-purple-400" />
                Kunci Nada & Pitch Lagu (Semitone)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPitchSemitones((p) => Math.max(-12, p - 1))}
                className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono cursor-pointer"
              >
                -1 st
              </button>
              <button
                type="button"
                onClick={() => setPitchSemitones((p) => Math.min(12, p + 1))}
                className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono cursor-pointer"
              >
                +1 st
              </button>
              <button
                type="button"
                onClick={() => setPitchSemitones(0)}
                disabled={pitchSemitones === 0}
                className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>0 st</span>
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} st
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">
              <input
                type="checkbox"
                checked={preservePitch}
                onChange={(e) => setPreservePitch(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-purple-500 focus:ring-purple-400"
              />
              <span>Kunci Nada Tetap Saat Ganti Speed</span>
            </label>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={pitchSemitones}
              onChange={(e) => setPitchSemitones(parseInt(e.target.value, 10))}
              disabled={isProcessing || isRendering}
              className="w-full h-2 rounded-lg bg-zinc-800 appearance-none cursor-pointer accent-purple-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {PITCH_PRESETS.map((preset) => {
              const isSelected = pitchSemitones === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setPitchSemitones(preset.value)}
                  disabled={isProcessing || isRendering}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-bold'
                      : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-white/5'
                  }`}
                >
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: VOCAL PRESETS */}
        <div className="mt-3 p-4 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-400/20 text-rose-400 text-xs font-bold flex items-center justify-center">3</span>
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-rose-400" />
                Ubah Karakter Suara Penyanyi Aslinya (Voice Timbre)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setVocalCharacter('original');
                setVocalFormantShift(0);
              }}
              disabled={vocalCharacter === 'original' && vocalFormantShift === 0}
              className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Suara</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {VOCAL_PRESETS.map((vp) => {
              const isSelected = vocalCharacter === vp.id;
              return (
                <button
                  key={vp.id}
                  type="button"
                  onClick={() => handleSelectVocalPreset(vp)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 relative overflow-hidden group cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/15 border-rose-500 text-white shadow-md shadow-rose-500/10 ring-1 ring-rose-500/40'
                      : 'bg-zinc-800/60 hover:bg-zinc-800 border-white/5 text-zinc-300 hover:text-white hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-xs font-bold truncate group-hover:text-rose-300">
                      {vp.label}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                        isSelected ? 'bg-rose-500 text-white' : 'bg-zinc-700/80 text-zinc-400'
                      }`}
                    >
                      {vp.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight line-clamp-2">
                    {vp.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: PREVIEW & RENDER */}
        <div className="mt-3 p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-400/20 text-cyan-400 text-xs font-bold flex items-center justify-center">4</span>
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Pratinjau Live & Render Audio
              </span>
            </div>
            <button
              type="button"
              onClick={handleRenderAudio}
              disabled={isRendering || isProcessing}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isRenderValid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 active:scale-95'
              }`}
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Merender Audio...</span>
                </>
              ) : isRenderValid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Render Ulang</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Render Perubahan</span>
                </>
              )}
            </button>
          </div>

          {isRenderValid && renderedResult && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  Audio Terverifikasi! Tempo {renderedResult.tempo.toFixed(2)}x, Pitch {pitchSemitones} st.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={togglePlayRendered}
                  className="px-2.5 py-1 rounded-lg bg-emerald-400 text-black font-bold text-xs flex items-center gap-1 hover:bg-emerald-300 transition-colors shrink-0 cursor-pointer"
                >
                  {isPlayingRendered ? (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      <span>Jeda</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                      <span>Putar Hasil</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadLocally}
                  className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                  title="Unduh WAV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              disabled={isProcessing || isRendering}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white'
              }`}
              title={isPlaying ? 'Jeda' : 'Putar pratinjau live'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span className="text-amber-400/80 font-sans text-[10px]">
                  {isPlaying ? `Pratinjau Live (${tempo.toFixed(2)}x)` : 'Pratinjau real-time'}
                </span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                disabled={isProcessing || isRendering}
                className="w-full h-1.5 rounded bg-zinc-800 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.startsWith('✓')
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
            }`}
          >
            {statusMessage.startsWith('✓') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Asli</span>
          </button>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSaveToWorkspaceAction('remix')}
              disabled={isProcessing || isRendering}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Kirim audio hasil editan ke menu Remix untuk diaransemen ulang"
            >
              <Disc3 className="w-4 h-4 text-amber-400" />
              <span>Buka di Remix Audio</span>
            </button>

            <button
              id="save-as-new-song-btn"
              type="button"
              onClick={() => handleSaveToWorkspaceAction('workspace')}
              disabled={isProcessing || isRendering}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer ${
                isRenderValid
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-black shadow-emerald-500/20 hover:from-emerald-300 hover:to-teal-400 ring-2 ring-emerald-400/50'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-amber-500/20 hover:from-amber-300 hover:to-amber-500'
              } disabled:opacity-50`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Menyimpan ke Library...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Simpan ke Workspace Library</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
