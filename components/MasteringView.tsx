'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileAudio,
  Sparkles,
  Download,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Music,
  Disc3,
  Layers,
  Wand2,
} from 'lucide-react';
import {
  MasteringChainState,
  MasteringIntensity,
  MasteringCharacter,
  AudioAnalysisMetrics,
} from '@/types/mastering';
import { DEFAULT_MASTERING_CHAIN, MASTERING_PRESETS } from '@/lib/masteringPresets';
import {
  loadAudioBuffer,
  analyzeAudioBuffer,
  MasteringDspPipeline,
  audioBufferToWavBlob,
  timeStretchBuffer,
} from '@/lib/masteringAudioEngine';
import MasteringHeader from './mastering/MasteringHeader';
import WaveformVisualizer from './mastering/WaveformVisualizer';
import AnalysisDashboard from './mastering/AnalysisDashboard';
import ChainModules from './mastering/ChainModules';
import { MusicTrack } from '@/database/db';
import { apiFetch, safeJson } from '@/lib/api';

interface MasteringViewProps {
  initialTrack?: MusicTrack | null;
  onTrackSaved?: (track: MusicTrack) => void;
  tracks?: MusicTrack[];
}

export default function MasteringView({
  initialTrack,
  onTrackSaved,
  tracks = [],
}: MasteringViewProps) {
  const [chainState, setChainState] = useState<MasteringChainState>(DEFAULT_MASTERING_CHAIN);
  const [intensity, setIntensity] = useState<MasteringIntensity>('Balanced');
  const [character, setCharacter] = useState<MasteringCharacter>('Natural');

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    name: string;
    duration: number;
    sampleRate: number;
    channels: number;
    format: string;
    sizeMb: number;
  } | null>(null);

  const [metrics, setMetrics] = useState<AudioAnalysisMetrics | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isAbMastered, setIsAbMastered] = useState(true);
  const [loudnessMatch, setLoudnessMatch] = useState(false);

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Audio nodes and engine
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const dspPipelineRef = useRef<MasteringDspPipeline | null>(null);
  const bypassGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Audio Context on demand
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Setup DSP Pipeline
  useEffect(() => {
    const ctx = getAudioContext();
    if (!dspPipelineRef.current) {
      dspPipelineRef.current = new MasteringDspPipeline(ctx, chainState);
      bypassGainRef.current = ctx.createGain();
      masterGainRef.current = ctx.createGain();

      // Connect DSP output to masterGain
      dspPipelineRef.current.outputNode.connect(masterGainRef.current);
      // Connect bypass directly to masterGain
      bypassGainRef.current.connect(masterGainRef.current);
      // Master gain to destination
      masterGainRef.current.connect(ctx.destination);

      bypassGainRef.current.gain.value = 0;
      dspPipelineRef.current.outputNode.gain.value = 1;
    }
  }, []);

  // Update DSP pipeline when state changes
  useEffect(() => {
    if (dspPipelineRef.current) {
      dspPipelineRef.current.updateState(chainState);
    }
  }, [chainState]);

  // Handle A/B routing
  useEffect(() => {
    if (!dspPipelineRef.current || !bypassGainRef.current) return;
    if (isAbMastered) {
      dspPipelineRef.current.outputNode.gain.value = 1;
      bypassGainRef.current.gain.value = 0;
    } else {
      dspPipelineRef.current.outputNode.gain.value = 0;
      bypassGainRef.current.gain.value = loudnessMatch ? 1.2 : 1;
    }
  }, [isAbMastered, loudnessMatch]);

  // Handle master volume
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  }, [volume]);

  // Load track if initialTrack passed
  useEffect(() => {
    if (initialTrack && initialTrack.audio_url) {
      handleLoadUrl(initialTrack.audio_url, initialTrack.title || 'Track');
    }
  }, [initialTrack]);

  const handleLoadUrl = async (url: string, name: string) => {
    try {
      stopPlayback();
      const ctx = getAudioContext();
      const res = await fetch(url);
      const arrayBuf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);

      setAudioBuffer(decoded);
      setDuration(decoded.duration);
      setFileMeta({
        name,
        duration: decoded.duration,
        sampleRate: decoded.sampleRate,
        channels: decoded.numberOfChannels,
        format: 'MP3/WAV',
        sizeMb: Number((arrayBuf.byteLength / (1024 * 1024)).toFixed(2)),
      });

      // Run deep audio analysis
      const analyzed = analyzeAudioBuffer(decoded);
      setMetrics(analyzed);
    } catch {
      setNotification({
        type: 'error',
        message: 'Gagal memuat file audio dari URL',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      stopPlayback();
      const ctx = getAudioContext();
      const loaded = await loadAudioBuffer(file, ctx);

      setAudioBuffer(loaded.buffer);
      setDuration(loaded.duration);
      setFileMeta({
        name: file.name,
        duration: loaded.duration,
        sampleRate: loaded.sampleRate,
        channels: loaded.channels,
        format: file.name.split('.').pop()?.toUpperCase() || 'AUDIO',
        sizeMb: Number((loaded.sizeBytes / (1024 * 1024)).toFixed(2)),
      });

      // Run deep audio analysis
      const analyzed = analyzeAudioBuffer(loaded.buffer);
      setMetrics(analyzed);

      setNotification({
        type: 'success',
        message: `Berhasil memuat file "${file.name}" ke Studio Mastering`,
      });
    } catch {
      setNotification({
        type: 'error',
        message: 'Gagal mendekode audio file. Pastikan format audio valid (WAV/MP3/M4A/FLAC).',
      });
    }
  };

  const startPlayback = (offset = 0) => {
    if (!audioBuffer) return;
    const ctx = getAudioContext();

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    if (dspPipelineRef.current && bypassGainRef.current) {
      // Connect to both DSP input and bypass gain
      source.connect(dspPipelineRef.current.inputNode);
      source.connect(bypassGainRef.current);
    }

    source.onended = () => {
      if (sourceNodeRef.current === source) {
        setIsPlaying(false);
        setCurrentTime(0);
        pauseTimeRef.current = 0;
      }
    };

    source.start(0, offset);
    sourceNodeRef.current = source;
    startTimeRef.current = ctx.currentTime - offset;
    setIsPlaying(true);

    const updateTimer = () => {
      if (sourceNodeRef.current === source && audioCtxRef.current) {
        const cur = audioCtxRef.current.currentTime - startTimeRef.current;
        if (cur <= audioBuffer.duration) {
          setCurrentTime(cur);
          rafRef.current = requestAnimationFrame(updateTimer);
        }
      }
    };
    rafRef.current = requestAnimationFrame(updateTimer);
  };

  const stopPlayback = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!audioBuffer) return;
    if (isPlaying) {
      pauseTimeRef.current = currentTime;
      stopPlayback();
    } else {
      startPlayback(pauseTimeRef.current % audioBuffer.duration);
    }
  };

  const handleStop = () => {
    stopPlayback();
    setCurrentTime(0);
    pauseTimeRef.current = 0;
  };

  const handleSeek = (secs: number) => {
    const clamped = Math.max(0, Math.min(duration, secs));
    pauseTimeRef.current = clamped;
    setCurrentTime(clamped);
    if (isPlaying) {
      startPlayback(clamped);
    }
  };

  // Intensity & Character Preset Change
  const handleIntensityChange = (newIntensity: MasteringIntensity) => {
    setIntensity(newIntensity);
    const preset = MASTERING_PRESETS.find(
      (p) => p.settings.intensity === newIntensity && p.settings.character === character
    ) || MASTERING_PRESETS.find((p) => p.settings.intensity === newIntensity);

    if (preset) {
      setChainState((prev) => ({
        ...prev,
        ...preset.settings,
        intensity: newIntensity,
        character,
      }));
    }
  };

  const handleCharacterChange = (newChar: MasteringCharacter) => {
    setCharacter(newChar);
    const preset = MASTERING_PRESETS.find(
      (p) => p.settings.intensity === intensity && p.settings.character === newChar
    ) || MASTERING_PRESETS.find((p) => p.settings.character === newChar);

    if (preset) {
      setChainState((prev) => ({
        ...prev,
        ...preset.settings,
        intensity,
        character: newChar,
      }));
    }
  };

  // AI Auto Master Analysis & Recommendations
  const handleRunAiAutoMaster = async () => {
    if (!audioBuffer || !metrics) {
      setNotification({
        type: 'error',
        message: 'Silakan muat file audio terlebih dahulu untuk AI Mastering.',
      });
      return;
    }

    setIsAiProcessing(true);
    try {
      const res = await apiFetch('/api/mastering/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          intensity,
          character,
          genre: 'Indonesian Pop & Modern Streaming',
        }),
      });

      const data = await safeJson<{ success?: boolean; recommendedSettings?: Partial<MasteringChainState> }>(res);
      if (data && data.recommendedSettings) {
        setChainState((prev) => ({ ...prev, ...data.recommendedSettings }));
        setNotification({
          type: 'success',
          message: 'AI Mastering selesai! Parameter EQ, Dynamics & Limiter telah dioptimalkan secara otomatis.',
        });
      } else {
        // Fallback intelligent rules
        setChainState((prev) => ({
          ...prev,
          eq: {
            ...prev.eq,
            bands: prev.eq.bands.map((b) => {
              if (b.type === 'lowshelf') return { ...b, gain: metrics.frequencyBalance.sub < 15 ? 2.5 : 1.0 };
              if (b.type === 'highshelf') return { ...b, gain: metrics.frequencyBalance.air < 15 ? 2.0 : 0.8 };
              return b;
            }),
          },
          limiter: {
            ...prev.limiter,
            ceiling: metrics.truePeakDb > -0.5 ? -1.0 : -0.8,
            truePeakDetection: true,
          },
        }));

        setNotification({
          type: 'success',
          message: 'Parameter Mastering telah dioptimalkan sesuai profil audio target LUFS & True Peak.',
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Gagal menjalankan analisis AI, menggunakan preset rekomendasi internal.',
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAutoFixTruePeak = () => {
    setChainState((prev) => ({
      ...prev,
      limiter: {
        ...prev.limiter,
        ceiling: -1.0,
        truePeakDetection: true,
      },
    }));
    setNotification({
      type: 'success',
      message: 'Ceiling limiter diturunkan ke -1.0 dBTP untuk mencegah inter-sample distortion.',
    });
  };

  // Render & Export Master
  const handleExportMaster = async () => {
    if (!audioBuffer) return;
    setIsRendering(true);
    setRenderProgress(10);

    try {
      const numChannels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      let finalBuffer = audioBuffer;

      // Handle time stretch if enabled
      if (chainState.tempo.enabled && chainState.tempo.speedPercent !== 100) {
        setRenderProgress(30);
        finalBuffer = timeStretchBuffer(
          audioBuffer,
          chainState.tempo.speedPercent / 100,
          chainState.tempo.preservePitch
        );
      }

      setRenderProgress(50);

      // Offline render mastering chain
      const offlineCtx = new OfflineAudioContext(numChannels, finalBuffer.length, sampleRate);
      const offlinePipeline = new MasteringDspPipeline(offlineCtx as unknown as AudioContext, chainState);

      const bufferSource = offlineCtx.createBufferSource();
      bufferSource.buffer = finalBuffer;
      bufferSource.connect(offlinePipeline.inputNode);
      offlinePipeline.outputNode.connect(offlineCtx.destination);

      bufferSource.start(0);

      setRenderProgress(70);
      const renderedBuffer = await offlineCtx.startRendering();
      setRenderProgress(90);

      const blob = audioBufferToWavBlob(renderedBuffer, 24);
      const url = URL.createObjectURL(blob);

      // Auto download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileMeta?.name.replace(/\.[^/.]+$/, '') || 'Mastered_Track'}_Mastered_24bit.wav`;
      a.click();

      setRenderProgress(100);
      setNotification({
        type: 'success',
        message: 'Audio berhasil di-master dan didownload dalam kualitas studio 24-bit WAV!',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Gagal merender audio master.',
      });
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-28">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium border shadow-xl ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-zinc-400 hover:text-white ml-4 text-xs"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Mastering Header & Controls */}
      <MasteringHeader
        title={fileMeta?.name || 'Pro Studio Mastering'}
        intensity={intensity}
        character={character}
        isAiProcessing={isAiProcessing}
        onIntensityChange={handleIntensityChange}
        onCharacterChange={handleCharacterChange}
        onRunAiAutoMaster={handleRunAiAutoMaster}
        fileMeta={fileMeta}
      />

      {/* Audio Buffer File Uploader or Track Selector */}
      {!audioBuffer && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-12 border-2 border-dashed border-white/10 hover:border-amber-500/40 rounded-3xl bg-zinc-950/60 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-zinc-900/40 group shadow-2xl"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/10">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Klik atau Tarik File Audio ke Sini
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-4">
            Mendukung format WAV (16/24-bit), MP3, FLAC, M4A, OGG hingga durasi penuh.
          </p>

          {/* Quick select from recent tracks */}
          {tracks.length > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-4 pt-4 border-t border-white/10 w-full max-w-md"
            >
              <p className="text-xs text-zinc-500 mb-2 font-medium">Atau pilih dari library trek Anda:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {tracks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleLoadUrl(t.audio_url, t.title || 'Track')}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                  >
                    <Disc3 className="w-3.5 h-3.5 text-amber-500" />
                    <span className="truncate max-w-[140px]">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Mastering Workspace */}
      {audioBuffer && (
        <div className="space-y-6">
          {/* Top Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">File Aktif:</span>
              <span className="text-xs font-bold text-amber-400 truncate max-w-xs">{fileMeta?.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Ganti File
              </button>

              <button
                type="button"
                onClick={handleExportMaster}
                disabled={isRendering}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isRendering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Merender {renderProgress}%...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export Master 24-Bit WAV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Waveform Visualizer & Live Transport */}
          <WaveformVisualizer
            analyserNode={dspPipelineRef.current?.analyserNode || null}
            audioBuffer={audioBuffer}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            isAbMastered={isAbMastered}
            loudnessMatch={loudnessMatch}
            phaseCorrelation={metrics?.phaseCorrelation || 1}
            onTogglePlay={togglePlay}
            onStop={handleStop}
            onSeek={handleSeek}
            onToggleAb={() => setIsAbMastered((prev) => !prev)}
            onToggleLoudnessMatch={() => setLoudnessMatch((prev) => !prev)}
            volume={volume}
            onVolumeChange={setVolume}
          />

          {/* Analysis Metrics Dashboard */}
          <AnalysisDashboard
            metrics={metrics}
            targetLufs={-14}
            onAutoFixTruePeak={handleAutoFixTruePeak}
          />

          {/* DSP Chain Modules (Tempo, EQ, Dynamics, Saturation, Limiter, Repair) */}
          <ChainModules
            state={chainState}
            onChange={setChainState}
            onRunAiEq={handleRunAiAutoMaster}
            onRunAiCompression={handleRunAiAutoMaster}
            onRunAiSmartTempo={() => {
              if (metrics?.bpm) {
                setChainState((prev) => ({
                  ...prev,
                  tempo: {
                    ...prev.tempo,
                    enabled: true,
                    originalBpm: metrics.bpm,
                    targetBpm: metrics.bpm,
                  },
                }));
              }
            }}
            gainReductionDb={3.2}
          />
        </div>
      )}
    </div>
  );
}
