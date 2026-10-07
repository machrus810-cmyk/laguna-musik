// Type definitions for LAGUNA MUSIK Mastering Audio Module

export type MasteringIntensity = 'Gentle' | 'Natural' | 'Balanced' | 'Punchy' | 'Loud';
export type MasteringCharacter =
  | 'Clean'
  | 'Natural'
  | 'Warm'
  | 'Bright'
  | 'Punchy'
  | 'Wide'
  | 'Smooth'
  | 'Analog'
  | 'Modern'
  | 'Loud';

export type TempoMode = 'speed_only' | 'tempo_only' | 'pitch_and_speed' | 'preserve_pitch';
export type TimeStretchQuality = 'Draft' | 'High' | 'Ultra';
export type LoudnessTargetPreset = 'Streaming' | 'YouTube' | 'Club' | 'Podcast' | 'Music' | 'Custom';
export type NoiseReductionLevel = 'Off' | 'Light' | 'Medium' | 'Strong';
export type SaturationMode = 'Tape' | 'Tube' | 'Analog' | 'Warm' | 'Clean';
export type ExciterMode = 'Air' | 'Bright' | 'Vocal Presence' | 'Modern';
export type LimiterMode = 'Transparent' | 'Loud' | 'Punchy' | 'Streaming';
export type CompressorMode = 'Transparent' | 'Glue' | 'Punch' | 'Smooth' | 'Vocal';
export type DeEsserPreset = 'Vocal' | 'Master' | 'Soft';

export interface ParametricEqBand {
  id: string;
  type: 'lowcut' | 'lowshelf' | 'bell' | 'highshelf' | 'highcut' | 'notch';
  frequency: number; // Hz (20 - 20000)
  gain: number; // dB (-15 to +15)
  q: number; // Q factor (0.1 to 18)
  enabled: boolean;
}

export interface MultibandBandConfig {
  name: 'Sub' | 'Low' | 'Mid' | 'High';
  freqRange: string;
  threshold: number; // dB
  ratio: number;
  attack: number; // ms
  release: number; // ms
  gain: number; // dB
  enabled: boolean;
  solo: boolean;
  mute: boolean;
}

export interface AudioAnalysisMetrics {
  bpm: number;
  detectedBpmConfidence: number;
  integratedLufs: number;
  shortTermLufs: number;
  momentaryLufs: number;
  rmsDb: number;
  peakDb: number;
  truePeakDb: number;
  dynamicRangeLu: number;
  stereoWidthPercent: number;
  phaseCorrelation: number; // -1 to +1
  clippingDetected: boolean;
  clipCount: number;
  silenceHeadSec: number;
  silenceTailSec: number;
  noiseFloorDb: number;
  frequencyBalance: {
    sub: number;
    bass: number;
    lowMid: number;
    highMid: number;
    air: number;
  };
  safetyStatus: 'SAFE' | 'WARNING' | 'CLIPPING';
  safetyRecommendations: string[];
}

export interface ReferenceTrackComparison {
  sourceTitle: string;
  referenceTitle: string;
  loudnessDiffLufs: number;
  bassDiffDb: number;
  midDiffDb: number;
  highDiffDb: number;
  stereoWidthDiffPercent: number;
  dynamicRangeDiffLu: number;
  summary: string;
  suggestedAdjustments: {
    eqGainLowDb: number;
    eqGainMidDb: number;
    eqGainHighDb: number;
    targetLufs: number;
    stereoWidth: number;
  };
}

export interface MasteringChainState {
  intensity: MasteringIntensity;
  character: MasteringCharacter;
  tempo: {
    enabled: boolean;
    speedPercent: number;
    originalBpm: number;
    targetBpm: number;
    preservePitch: boolean;
    mode: TempoMode;
    quality: TimeStretchQuality;
    pitchSemitones: number;
    transientPreservation: boolean;
    vocalPreservation: boolean;
    formantPreservation: boolean;
  };
  repair: {
    enabled: boolean;
    noiseReduction: NoiseReductionLevel;
    hissReduction: boolean;
    humRemoval: 'Off' | '50Hz' | '60Hz';
    roomNoiseReduction: boolean;
    deClip: boolean;
    clickRemoval: boolean;
    deReverb: boolean;
  };
  eq: {
    enabled: boolean;
    bands: ParametricEqBand[];
  };
  compressor: {
    enabled: boolean;
    mode: CompressorMode;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    knee: number;
    makeupGain: number;
    mixPercent: number;
  };
  multiband: {
    enabled: boolean;
    preset: 'Smooth' | 'Balanced' | 'Punchy' | 'Loud';
    bands: MultibandBandConfig[];
  };
  deEsser: {
    enabled: boolean;
    preset: DeEsserPreset;
    frequency: number;
    threshold: number;
    reduction: number;
    range: number;
  };
  saturation: {
    enabled: boolean;
    mode: SaturationMode;
    drive: number;
    mix: number;
    tone: number;
    outputGain: number;
  };
  exciter: {
    enabled: boolean;
    mode: ExciterMode;
    frequency: number;
    amount: number;
    mix: number;
    tone: number;
  };
  stereo: {
    enabled: boolean;
    stereoWidth: number;
    midGain: number;
    sideGain: number;
    stereoBassMonoMaker: boolean;
    stereoBassCutoff: number;
    monoCheckActive: boolean;
  };
  limiter: {
    enabled: boolean;
    mode: LimiterMode;
    threshold: number;
    ceiling: number;
    release: number;
    lookaheadMs: number;
    gain: number;
    truePeakProtection: boolean;
  };
  loudnessTarget: {
    preset: LoudnessTargetPreset;
    targetLufs: number;
    maxTruePeak: number;
  };
}

export interface MasteringPresetDefinition {
  id: string;
  name: string;
  category: 'music' | 'vocal' | 'character' | 'custom';
  description: string;
  settings: Partial<MasteringChainState>;
}

export interface MasterVersionSnapshot {
  id: string;
  name: string;
  createdAt: string;
  settings: MasteringChainState;
  metrics?: Partial<AudioAnalysisMetrics>;
}

export interface MasterQualityCheckResult {
  overallScore: number;
  verdict: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical Issues';
  checks: {
    title: string;
    passed: boolean;
    status: 'pass' | 'warn' | 'fail';
    detail: string;
    metric: string;
  }[];
}
