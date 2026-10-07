'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { MusicTrack } from '@/database/db';

export type MasteringPreset =
  | 'Normal'
  | 'Studio Warmth'
  | 'Club Bass'
  | 'Vocal Clarity'
  | 'Radio Pop'
  | 'Acoustic Air';

export type VocalPreset =
  | 'Normal'
  | 'Deep Baritone'
  | 'Female Soprano'
  | 'Chipmunk Cute'
  | 'Robot Vocoder'
  | 'Lo-Fi Radio'
  | 'Dreamy Reverb'
  | 'Crystal Clarity'
  | 'Karaoke Vocal Cut'
  | 'Acapella Solo';

export function getPlayableAudioUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('/api/proxy/audio')) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (
      parsed.hostname.includes('sunor.cc') ||
      parsed.hostname.includes('suno.day') ||
      parsed.hostname.includes('fal.media') ||
      parsed.hostname.includes('fal.run')
    ) {
      return `/api/proxy/audio?url=${encodeURIComponent(rawUrl)}`;
    }
  } catch {}
  return rawUrl;
}

// Distortion curve generator for Lo-Fi Radio effect
function makeDistortionCurve(amount = 25): Float32Array<ArrayBuffer> {
  const k = amount;
  const nSamples = 44100;
  const buffer = new ArrayBuffer(nSamples * 4);
  const curve = new Float32Array(buffer);
  const deg = Math.PI / 180;
  for (let i = 0; i < nSamples; ++i) {
    const x = (i * 2) / nSamples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// Web Audio Dual-Delay Pitch Shifter
class WebAudioPitchShifter {
  private ctx: AudioContext;
  public input: GainNode;
  public output: GainNode;
  private delay1: DelayNode;
  private delay2: DelayNode;
  private gain1: GainNode;
  private gain2: GainNode;
  private bypassGain: GainNode;
  private wetGain: GainNode;
  private isRunning = false;
  private modSource1: AudioBufferSourceNode | null = null;
  private modSource2: AudioBufferSourceNode | null = null;
  private fadeSource1: AudioBufferSourceNode | null = null;
  private fadeSource2: AudioBufferSourceNode | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.delay1 = ctx.createDelay(1.0);
    this.delay2 = ctx.createDelay(1.0);
    this.gain1 = ctx.createGain();
    this.gain2 = ctx.createGain();
    this.bypassGain = ctx.createGain();
    this.wetGain = ctx.createGain();

    this.bypassGain.gain.value = 1.0;
    this.wetGain.gain.value = 0.0;

    this.input.connect(this.bypassGain);
    this.bypassGain.connect(this.output);

    this.input.connect(this.delay1);
    this.input.connect(this.delay2);
    this.delay1.connect(this.gain1);
    this.delay2.connect(this.gain2);
    this.gain1.connect(this.wetGain);
    this.gain2.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  setPitchShift(semitones: number) {
    if (Math.abs(semitones) < 0.1) {
      this.bypassGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.03);
      this.wetGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.03);
      this.stopLFO();
      return;
    }
    this.bypassGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.03);
    this.wetGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.03);
    const pitchRatio = Math.pow(2, semitones / 12);
    this.startLFO(pitchRatio);
  }

  private stopLFO() {
    if (!this.isRunning) return;
    try {
      this.modSource1?.stop();
      this.modSource2?.stop();
      this.fadeSource1?.stop();
      this.fadeSource2?.stop();
      this.modSource1?.disconnect();
      this.modSource2?.disconnect();
      this.fadeSource1?.disconnect();
      this.fadeSource2?.disconnect();
    } catch {}
    this.isRunning = false;
  }

  private startLFO(pitchRatio: number) {
    this.stopLFO();
    const bufferTime = 0.1;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(bufferTime * sampleRate);
    const modBuffer1 = this.ctx.createBuffer(1, length, sampleRate);
    const modBuffer2 = this.ctx.createBuffer(1, length, sampleRate);
    const fadeBuffer1 = this.ctx.createBuffer(1, length, sampleRate);
    const fadeBuffer2 = this.ctx.createBuffer(1, length, sampleRate);

    const d1 = modBuffer1.getChannelData(0);
    const d2 = modBuffer2.getChannelData(0);
    const f1 = fadeBuffer1.getChannelData(0);
    const f2 = fadeBuffer2.getChannelData(0);
    const halfLength = Math.floor(length / 2);

    for (let i = 0; i < length; i++) {
      if (pitchRatio > 1.0) {
        d1[i] = ((length - i) / length) * bufferTime;
        d2[i] = ((length - ((i + halfLength) % length)) / length) * bufferTime;
      } else {
        d1[i] = (i / length) * bufferTime;
        d2[i] = (((i + halfLength) % length) / length) * bufferTime;
      }
      f1[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / length));
      f2[i] = 0.5 * (1 - Math.cos((2 * Math.PI * ((i + halfLength) % length)) / length));
    }

    const s1 = this.ctx.createBufferSource();
    const s2 = this.ctx.createBufferSource();
    const sf1 = this.ctx.createBufferSource();
    const sf2 = this.ctx.createBufferSource();

    s1.buffer = modBuffer1;
    s2.buffer = modBuffer2;
    sf1.buffer = fadeBuffer1;
    sf2.buffer = fadeBuffer2;
    s1.loop = true;
    s2.loop = true;
    sf1.loop = true;
    sf2.loop = true;

    const speed = Math.max(0.08, Math.min(4.0, Math.abs(1 - pitchRatio)));
    s1.playbackRate.value = speed;
    s2.playbackRate.value = speed;
    sf1.playbackRate.value = speed;
    sf2.playbackRate.value = speed;

    s1.connect(this.delay1.delayTime);
    s2.connect(this.delay2.delayTime);
    sf1.connect(this.gain1.gain);
    sf2.connect(this.gain2.gain);

    s1.start();
    s2.start();
    sf1.start();
    sf2.start();

    this.modSource1 = s1;
    this.modSource2 = s2;
    this.fadeSource1 = sf1;
    this.fadeSource2 = sf2;
    this.isRunning = true;
  }
}

interface AudioPlayerContextType {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  masteringPreset: MasteringPreset;
  tempoSpeed: number;
  preservesPitch: boolean;
  vocalPreset: VocalPreset;
  vocalPitch: number;
  vocalIntensity: number;
  queue: MusicTrack[];
  analyserNode: AnalyserNode | null;
  playTrack: (track: MusicTrack) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolumeLevel: (vol: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setMasteringPreset: (preset: MasteringPreset) => void;
  setTempoSpeed: (speed: number) => void;
  setPreservesPitch: (preserve: boolean) => void;
  setVocalPreset: (preset: VocalPreset) => void;
  setVocalPitch: (pitch: number) => void;
  setVocalIntensity: (intensity: number) => void;
  resetAllEffects: () => void;
  setTrackQueue: (tracks: MusicTrack[]) => void;
  downloadTrack: (track: MusicTrack) => void;
  updateCurrentTrackCover: (coverUrl: string) => void;
  getAudioContext: () => AudioContext | null;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const [isShuffle, setIsShuffle] = useState(false);
  const [masteringPreset, setMasteringPresetState] = useState<MasteringPreset>('Studio Warmth');
  const [tempoSpeed, setTempoSpeedState] = useState<number>(1.0);
  const [preservesPitch, setPreservesPitchState] = useState<boolean>(true);
  const [vocalPreset, setVocalPresetState] = useState<VocalPreset>('Normal');
  const [vocalPitch, setVocalPitchState] = useState<number>(0);
  const [vocalIntensity, setVocalIntensityState] = useState<number>(80);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);

  const vocalDryGainRef = useRef<GainNode | null>(null);
  const vocalWetGainRef = useRef<GainNode | null>(null);
  const vocalFormant1Ref = useRef<BiquadFilterNode | null>(null);
  const vocalFormant2Ref = useRef<BiquadFilterNode | null>(null);
  const vocalAirFilterRef = useRef<BiquadFilterNode | null>(null);
  const vocalNotchFilterRef = useRef<BiquadFilterNode | null>(null);
  const vocalRobotDelayRef = useRef<DelayNode | null>(null);
  const vocalRobotGainRef = useRef<GainNode | null>(null);
  const vocalReverbDelayRef = useRef<DelayNode | null>(null);
  const vocalReverbGainRef = useRef<GainNode | null>(null);
  const vocalShaperRef = useRef<WaveShaperNode | null>(null);

  const pitchShifterRef = useRef<WebAudioPitchShifter | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const setupWebAudio = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      setAnalyserNode(analyser);

      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 250;
      bassFilterRef.current = bass;

      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1500;
      mid.Q.value = 1.0;
      midFilterRef.current = mid;

      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 4000;
      trebleFilterRef.current = treble;

      const vocalDryGain = ctx.createGain();
      const vocalWetGain = ctx.createGain();
      vocalDryGain.gain.value = 1.0;
      vocalWetGain.gain.value = 0.0;
      vocalDryGainRef.current = vocalDryGain;
      vocalWetGainRef.current = vocalWetGain;

      const formant1 = ctx.createBiquadFilter();
      formant1.type = 'peaking';
      formant1.frequency.value = 1000;
      formant1.gain.value = 0;
      formant1.Q.value = 1.0;
      vocalFormant1Ref.current = formant1;

      const formant2 = ctx.createBiquadFilter();
      formant2.type = 'peaking';
      formant2.frequency.value = 3000;
      formant2.gain.value = 0;
      formant2.Q.value = 1.2;
      vocalFormant2Ref.current = formant2;

      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'highshelf';
      airFilter.frequency.value = 6000;
      airFilter.gain.value = 0;
      vocalAirFilterRef.current = airFilter;

      const notchFilter = ctx.createBiquadFilter();
      notchFilter.type = 'peaking';
      notchFilter.frequency.value = 1200;
      notchFilter.gain.value = 0;
      notchFilter.Q.value = 0.8;
      vocalNotchFilterRef.current = notchFilter;

      const robotDelay = ctx.createDelay(0.1);
      robotDelay.delayTime.value = 0.009;
      const robotGain = ctx.createGain();
      robotGain.gain.value = 0.0;
      robotDelay.connect(robotGain);
      robotGain.connect(robotDelay);
      vocalRobotDelayRef.current = robotDelay;
      vocalRobotGainRef.current = robotGain;

      const reverbDelay = ctx.createDelay(1.0);
      reverbDelay.delayTime.value = 0.22;
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.0;
      reverbDelay.connect(reverbGain);
      reverbGain.connect(reverbDelay);
      vocalReverbDelayRef.current = reverbDelay;
      vocalReverbGainRef.current = reverbGain;

      const shaper = ctx.createWaveShaper();
      shaper.curve = makeDistortionCurve(0);
      shaper.oversample = '4x';
      vocalShaperRef.current = shaper;

      const pitchShifter = new WebAudioPitchShifter(ctx);
      pitchShifterRef.current = pitchShifter;

      const gain = ctx.createGain();
      gainNodeRef.current = gain;

      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);

      treble.connect(vocalDryGain);
      vocalDryGain.connect(pitchShifter.input);

      treble.connect(formant1);
      formant1.connect(formant2);
      formant2.connect(airFilter);
      airFilter.connect(notchFilter);
      notchFilter.connect(shaper);

      notchFilter.connect(robotDelay);
      robotDelay.connect(vocalWetGain);

      notchFilter.connect(reverbDelay);
      reverbDelay.connect(vocalWetGain);

      shaper.connect(vocalWetGain);
      vocalWetGain.connect(pitchShifter.input);

      pitchShifter.output.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio API setup notice:', e);
    }
  }, []);

  const applyMastering = useCallback((preset: MasteringPreset) => {
    setMasteringPresetState(preset);
    if (!bassFilterRef.current || !midFilterRef.current || !trebleFilterRef.current) return;
    switch (preset) {
      case 'Studio Warmth':
        bassFilterRef.current.gain.value = 3.5;
        midFilterRef.current.gain.value = 1.0;
        trebleFilterRef.current.gain.value = 2.0;
        break;
      case 'Club Bass':
        bassFilterRef.current.gain.value = 6.0;
        midFilterRef.current.gain.value = -1.0;
        trebleFilterRef.current.gain.value = 1.5;
        break;
      case 'Vocal Clarity':
        bassFilterRef.current.gain.value = -2.0;
        midFilterRef.current.gain.value = 4.5;
        trebleFilterRef.current.gain.value = 3.0;
        break;
      case 'Radio Pop':
        bassFilterRef.current.gain.value = 2.5;
        midFilterRef.current.gain.value = 2.0;
        trebleFilterRef.current.gain.value = 4.0;
        break;
      case 'Acoustic Air':
        bassFilterRef.current.gain.value = 1.0;
        midFilterRef.current.gain.value = 0.5;
        trebleFilterRef.current.gain.value = 5.0;
        break;
      case 'Normal':
      default:
        bassFilterRef.current.gain.value = 0;
        midFilterRef.current.gain.value = 0;
        trebleFilterRef.current.gain.value = 0;
        break;
    }
  }, []);

  const applyVocalTransform = useCallback(
    (preset: VocalPreset, pitch: number, intensity: number) => {
      const ctx = audioContextRef.current;
      if (
        !ctx ||
        !vocalDryGainRef.current ||
        !vocalWetGainRef.current ||
        !vocalFormant1Ref.current ||
        !vocalFormant2Ref.current ||
        !vocalAirFilterRef.current ||
        !vocalNotchFilterRef.current ||
        !vocalRobotGainRef.current ||
        !vocalReverbGainRef.current ||
        !vocalShaperRef.current
      ) {
        return;
      }
      const now = ctx.currentTime;
      const normalizedIntensity = Math.max(0, Math.min(100, intensity)) / 100;

      vocalFormant1Ref.current.type = 'peaking';
      vocalFormant1Ref.current.gain.setValueAtTime(0, now);
      vocalFormant2Ref.current.type = 'peaking';
      vocalFormant2Ref.current.gain.setValueAtTime(0, now);
      vocalAirFilterRef.current.type = 'highshelf';
      vocalAirFilterRef.current.gain.setValueAtTime(0, now);
      vocalNotchFilterRef.current.type = 'peaking';
      vocalNotchFilterRef.current.gain.setValueAtTime(0, now);
      vocalRobotGainRef.current.gain.setValueAtTime(0, now);
      vocalReverbGainRef.current.gain.setValueAtTime(0, now);
      vocalShaperRef.current.curve = null;

      switch (preset) {
        case 'Deep Baritone':
          vocalFormant1Ref.current.type = 'peaking';
          vocalFormant1Ref.current.frequency.setValueAtTime(160, now);
          vocalFormant1Ref.current.Q.setValueAtTime(1.2, now);
          vocalFormant1Ref.current.gain.setValueAtTime(6.0 * normalizedIntensity, now);
          vocalFormant2Ref.current.type = 'peaking';
          vocalFormant2Ref.current.frequency.setValueAtTime(450, now);
          vocalFormant2Ref.current.gain.setValueAtTime(4.0 * normalizedIntensity, now);
          vocalAirFilterRef.current.type = 'highshelf';
          vocalAirFilterRef.current.frequency.setValueAtTime(3500, now);
          vocalAirFilterRef.current.gain.setValueAtTime(-3.5 * normalizedIntensity, now);
          vocalDryGainRef.current.gain.setValueAtTime(1 - 0.7 * normalizedIntensity, now);
          vocalWetGainRef.current.gain.setValueAtTime(0.85 * normalizedIntensity, now);
          break;
        case 'Female Soprano':
          vocalFormant1Ref.current.type = 'highpass';
          vocalFormant1Ref.current.frequency.setValueAtTime(240, now);
          vocalFormant2Ref.current.type = 'peaking';
          vocalFormant2Ref.current.frequency.setValueAtTime(3200, now);
          vocalFormant2Ref.current.Q.setValueAtTime(1.5, now);
          vocalFormant2Ref.current.gain.setValueAtTime(6.5 * normalizedIntensity, now);
          vocalAirFilterRef.current.type = 'highshelf';
          vocalAirFilterRef.current.frequency.setValueAtTime(7500, now);
          vocalAirFilterRef.current.gain.setValueAtTime(4.5 * normalizedIntensity, now);
          vocalDryGainRef.current.gain.setValueAtTime(1 - 0.65 * normalizedIntensity, now);
          vocalWetGainRef.current.gain.setValueAtTime(0.85 * normalizedIntensity, now);
          break;
        case 'Chipmunk Cute':
          vocalFormant1Ref.current.type = 'highpass';
          vocalFormant1Ref.current.frequency.setValueAtTime(350, now);
          vocalFormant2Ref.current.type = 'peaking';
          vocalFormant2Ref.current.frequency.setValueAtTime(4200, now);
          vocalFormant2Ref.current.Q.setValueAtTime(2.2, now);
          vocalFormant2Ref.current.gain.setValueAtTime(7.5 * normalizedIntensity, now);
          vocalAirFilterRef.current.type = 'highshelf';
          vocalAirFilterRef.current.frequency.setValueAtTime(8000, now);
          vocalAirFilterRef.current.gain.setValueAtTime(5.0 * normalizedIntensity, now);
          vocalDryGainRef.current.gain.setValueAtTime(1 - 0.85 * normalizedIntensity, now);
          vocalWetGainRef.current.gain.setValueAtTime(0.95 * normalizedIntensity, now);
          break;
        case 'Robot Vocoder':
          vocalFormant1Ref.current.type = 'bandpass';
          vocalFormant1Ref.current.frequency.setValueAtTime(1200, now);
          vocalFormant1Ref.current.Q.setValueAtTime(2.8, now);
          vocalFormant2Ref.current.type = 'peaking';
          vocalFormant2Ref.current.frequency.setValueAtTime(2400, now);
          vocalFormant2Ref.current.gain.setValueAtTime(5.0 * normalizedIntensity, now);
          vocalRobotGainRef.current.gain.setValueAtTime(0.7 * normalizedIntensity, now);
          vocalDryGainRef.current.gain.setValueAtTime(1 - 0.75 * normalizedIntensity, now);
          vocalWetGainRef.current.gain.setValueAtTime(0.85 * normalizedIntensity, now);
          break;
        case 'Lo-Fi Radio':
          vocalFormant1Ref.current.type = 'highpass';
          vocalFormant1Ref.current.frequency.setValueAtTime(450, now);
          vocalFormant1Ref.current.Q.setValueAtTime(1.8, now);
          vocalFormant2Ref.current.type = 'peaking';
          vocalFormant2Ref.current.frequency.setValueAtTime(1800, now);
          vocalFormant2Ref.current.Q.setValueAtTime(2.5, now);
          vocalFormant2Ref.current.gain.setValueAtTime(8.0 * normalizedIntensity, now);
          vocalAirFilterRef.current.type = 'lowpass';
          vocalAirFilterRef.current.frequency.setValueAtTime(3200, now);
          vocalAirFilterRef.current.Q.setValueAtTime(1.8, now);
          vocalShaperRef.current.curve = makeDistortionCurve(25 * normalizedIntensity);
          vocalDryGainRef.current.gain.setValueAtTime(1 - 0.8 * normalizedIntensity, now);
          vocalWetGainRef.current.gain.setValueAtTime(0.9 * normalizedIntensity, now);
          break;
        case 'Dreamy Reverb':
          vocalFormant2Ref.current.type = 'peaking';
          vocalFormant2Ref.current.frequency.setValueAtTime(3500, now);
          vocalFormant2Ref.current.gain.setValueAtTime(3.0 * normalizedIntensity, now);
          vocalAirFilterRef.current.type = 'highshelf';
          vocalAirFilterRef.current.frequency.setValueAtTime(6000, now);
          vocalAirFilterRef.current.gain.setValueAtTime(3.0 * normalizedIntensity, now);
          vocalReverbGainRef.current.gain.setValueAtTime(0.48 * normalizedIntensity, now);
          vocalDryGainRef.current.gain.setValueAtTime(1.0, now);
          vocalWetGainRef.current.gain.setValueAtTime(0.6 * normalizedIntensity, now);
          break;
        case 'Crystal Clarity':
          vocalFormant1Ref.current.type = 'highpass';
          vocalFormant1Ref.current.frequency.setValueAtTime(90, now);
          vocalFormant2Ref.current.type = 'peaking';
          vocalFormant2Ref.current.frequency.setValueAtTime(3400, now);
          vocalFormant2Ref.current.Q.setValueAtTime(1.4, now);
          vocalFormant2Ref.current.gain.setValueAtTime(5.0 * normalizedIntensity, now);
          vocalAirFilterRef.current.type = 'highshelf';
          vocalAirFilterRef.current.frequency.setValueAtTime(9500, now);
          vocalAirFilterRef.current.gain.setValueAtTime(4.0 * normalizedIntensity, now);
          vocalDryGainRef.current.gain.setValueAtTime(1 - 0.5 * normalizedIntensity, now);
          vocalWetGainRef.current.gain.setValueAtTime(0.75 * normalizedIntensity, now);
          break;
        case 'Normal':
        default:
          vocalDryGainRef.current.gain.setValueAtTime(1.0, now);
          vocalWetGainRef.current.gain.setValueAtTime(0.0, now);
          break;
      }
    },
    []
  );

  const applyPlaybackSettings = useCallback(
    (speed: number, preserve: boolean, pitch: number) => {
      if (!audioRef.current) return;
      const audio = audioRef.current;
      if ('preservesPitch' in audio) {
        audio.preservesPitch = preserve;
      } else if ('mozPreservesPitch' in audio) {
        (audio as unknown as { mozPreservesPitch: boolean }).mozPreservesPitch = preserve;
      } else if ('webkitPreservesPitch' in audio) {
        (audio as unknown as { webkitPreservesPitch: boolean }).webkitPreservesPitch = preserve;
      }

      if (!preserve) {
        const pitchMultiplier = Math.pow(2, pitch / 12);
        audio.playbackRate = Math.max(0.25, Math.min(4.0, speed * pitchMultiplier));
        pitchShifterRef.current?.setPitchShift(0);
      } else {
        audio.playbackRate = Math.max(0.25, Math.min(4.0, speed));
        pitchShifterRef.current?.setPitchShift(pitch);
      }
    },
    []
  );

  const setTempoSpeed = useCallback(
    (speed: number) => {
      const clamped = Math.max(0.5, Math.min(2.0, Math.round(speed * 100) / 100));
      setTempoSpeedState(clamped);
      applyPlaybackSettings(clamped, preservesPitch, vocalPitch);
    },
    [applyPlaybackSettings, preservesPitch, vocalPitch]
  );

  const setPreservesPitch = useCallback(
    (preserve: boolean) => {
      setPreservesPitchState(preserve);
      applyPlaybackSettings(tempoSpeed, preserve, vocalPitch);
    },
    [applyPlaybackSettings, tempoSpeed, vocalPitch]
  );

  const setVocalPitch = useCallback(
    (pitch: number) => {
      const clamped = Math.max(-12, Math.min(12, Math.round(pitch)));
      setVocalPitchState(clamped);
      applyPlaybackSettings(tempoSpeed, preservesPitch, clamped);
    },
    [applyPlaybackSettings, preservesPitch, tempoSpeed]
  );

  const setVocalPreset = useCallback(
    (preset: VocalPreset) => {
      setVocalPresetState(preset);
      let targetPitch = vocalPitch;
      if (preset === 'Deep Baritone' && vocalPitch === 0) {
        targetPitch = -3;
        setVocalPitchState(-3);
      } else if (preset === 'Female Soprano' && vocalPitch === 0) {
        targetPitch = 3;
        setVocalPitchState(3);
      } else if (preset === 'Chipmunk Cute' && vocalPitch === 0) {
        targetPitch = 10;
        setVocalPitchState(10);
      } else if (preset === 'Normal' && (vocalPitch === -3 || vocalPitch === 3 || vocalPitch === 10)) {
        targetPitch = 0;
        setVocalPitchState(0);
      }
      applyPlaybackSettings(tempoSpeed, preservesPitch, targetPitch);
      applyVocalTransform(preset, targetPitch, vocalIntensity);
    },
    [applyPlaybackSettings, applyVocalTransform, preservesPitch, tempoSpeed, vocalIntensity, vocalPitch]
  );

  const setVocalIntensity = useCallback(
    (intensity: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(intensity)));
      setVocalIntensityState(clamped);
      applyVocalTransform(vocalPreset, vocalPitch, clamped);
    },
    [applyVocalTransform, vocalPitch, vocalPreset]
  );

  const resetAllEffects = useCallback(() => {
    applyMastering('Normal');
    setTempoSpeedState(1.0);
    setPreservesPitchState(true);
    setVocalPresetState('Normal');
    setVocalPitchState(0);
    setVocalIntensityState(80);
    applyPlaybackSettings(1.0, true, 0);
    applyVocalTransform('Normal', 0, 80);
  }, [applyMastering, applyPlaybackSettings, applyVocalTransform]);

  const playTrack = useCallback(
    (track: MusicTrack) => {
      if (!audioRef.current) return;
      setupWebAudio();
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      const rawAudioUrl = track.stream_audio_url || track.audio_url;
      const audioUrl = getPlayableAudioUrl(rawAudioUrl);
      if (audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
      setCurrentTrack(track);
      setIsPlaying(true);

      const trackPreset = (track.mastering_preset as MasteringPreset) || 'Studio Warmth';
      applyMastering(trackPreset);

      const trackTempo = typeof track.tempo_speed === 'number' && track.tempo_speed > 0 ? track.tempo_speed : 1.0;
      setTempoSpeedState(trackTempo);

      const trackPreservesPitch = typeof track.preserves_pitch === 'boolean' ? track.preserves_pitch : true;
      setPreservesPitchState(trackPreservesPitch);

      const trackVocalPreset = (track.vocal_preset as VocalPreset) || 'Normal';
      setVocalPresetState(trackVocalPreset);

      const trackVocalPitch = typeof track.vocal_pitch === 'number' ? track.vocal_pitch : 0;
      setVocalPitchState(trackVocalPitch);

      const trackVocalIntensity = typeof track.vocal_intensity === 'number' ? track.vocal_intensity : 80;
      setVocalIntensityState(trackVocalIntensity);

      applyPlaybackSettings(trackTempo, trackPreservesPitch, trackVocalPitch);
      applyVocalTransform(trackVocalPreset, trackVocalPitch, trackVocalIntensity);

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          if (audioRef.current && rawAudioUrl && !audioRef.current.src.includes('/api/proxy/audio')) {
            const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(rawAudioUrl)}`;
            audioRef.current.src = proxyUrl;
            audioRef.current.load();
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          } else {
            setIsPlaying(false);
          }
        });
    },
    [applyMastering, applyPlaybackSettings, applyVocalTransform, setupWebAudio]
  );

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    setupWebAudio();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying, setupWebAudio]);

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const setVolumeLevel = useCallback(
    (vol: number) => {
      if (!audioRef.current) return;
      const clamped = Math.max(0, Math.min(1, vol));
      audioRef.current.volume = isMuted ? 0 : clamped;
      setVolume(clamped);
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.volume = nextMute ? 0 : volume;
  }, [isMuted, volume]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0 || !currentTrack) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    let nextIndex = 0;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (currentIndex !== -1 && currentIndex < queue.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (repeatMode === 'all') {
      nextIndex = 0;
    } else {
      setIsPlaying(false);
      return;
    }
    playTrack(queue[nextIndex]);
  }, [currentTrack, isShuffle, playTrack, queue, repeatMode]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0 || !currentTrack) return;
    if (currentTime > 4) {
      seek(0);
      return;
    }
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    let prevIndex = queue.length - 1;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    }
    playTrack(queue[prevIndex]);
  }, [currentTime, currentTrack, playTrack, queue, seek]);

  const nextTrackRef = useRef(nextTrack);
  const repeatModeRef = useRef(repeatMode);
  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const handleEnded = () => {
      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        nextTrackRef.current();
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const setTrackQueue = useCallback((tracks: MusicTrack[]) => {
    setQueue(tracks);
  }, []);

  const downloadTrack = useCallback(async (track: MusicTrack) => {
    const rawUrl = track.audio_url || track.stream_audio_url;
    if (!rawUrl) return;
    fetch(`/api/tracks/${track.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ download_count: (track.download_count || 0) + 1 }),
    }).catch(() => {});

    try {
      const safeFilename = `${track.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
      const proxyDownloadUrl = `/api/proxy/audio?url=${encodeURIComponent(rawUrl)}&download=1&filename=${encodeURIComponent(safeFilename)}`;
      const link = document.createElement('a');
      link.href = proxyDownloadUrl;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      const link = document.createElement('a');
      link.href = rawUrl;
      link.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  const updateCurrentTrackCover = useCallback(
    (coverUrl: string) => {
      setCurrentTrack((prev) => (prev ? { ...prev, cover_url: coverUrl } : null));
    },
    []
  );

  const getAudioContext = useCallback(() => {
    return audioContextRef.current;
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
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
        preservesPitch,
        vocalPreset,
        vocalPitch,
        vocalIntensity,
        queue,
        analyserNode,
        playTrack,
        togglePlay,
        seek,
        setVolumeLevel,
        toggleMute,
        nextTrack,
        prevTrack,
        toggleRepeat,
        toggleShuffle,
        setMasteringPreset: applyMastering,
        setTempoSpeed,
        setPreservesPitch,
        setVocalPreset,
        setVocalPitch,
        setVocalIntensity,
        resetAllEffects,
        setTrackQueue,
        downloadTrack,
        updateCurrentTrackCover,
        getAudioContext,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
