export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'm4a' | 'aac' | 'ogg';

export interface AudioFileInfo {
  name: string;
  size: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  bitrate?: number;
  format: string;
}

export interface AudioAnalysisResult {
  peakDbfs: number;
  truePeakDbfs: number;
  rmsDbfs: number;
  integratedLufs: number;
  shortTermLufs: number;
  dynamicRangeDb: number;
  crestFactorDb: number;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  frequencyDistribution: {
    subBass: number;   // 20-60 Hz
    bass: number;      // 60-250 Hz
    lowMid: number;    // 250-500 Hz
    mid: number;       // 500-2000 Hz
    highMid: number;   // 2000-4000 Hz
    presence: number;  // 4000-6000 Hz
    treble: number;    // 6000-12000 Hz
    air: number;       // 12000-20000 Hz
  };
  stereoWidth: number;
  phaseCorrelation: number; // -1 to +1
  noiseFloorDb: number;
  clippingCount: number;
  recommendations: string[];
  issues: string[];
}

export interface EQBand {
  id: number;
  name: string;
  freq: number;
  gain: number; // -15dB to +15dB
  q: number;    // 0.1 to 10
  type: BiquadFilterType;
}

export interface MultibandCompBand {
  name: string;
  range: string;
  lowFreq?: number;
  highFreq?: number;
  threshold: number; // -60 to 0
  ratio: number;     // 1 to 20
  gain: number;      // -12 to +12
  attack: number;    // 0.001 to 0.1
  release: number;   // 0.02 to 1
  bypassed: boolean;
  solo: boolean;
}

export interface MasteringSettings {
  outputGain: number; // in dB
  targetLufs: number; // -14, -12, etc.
  normalizeLoudness: boolean;
  eqBypassed: boolean;
  eqBands: EQBand[];
  bassControl: {
    bypassed: boolean;
    bassAmount: number;    // -100 to +100
    subBassAmount: number; // -100 to +100
    bassBoost: number;     // 0 to 100
    bassPunch: number;     // 0 to 100
    bassTightness: number; // 0 to 100
    lowCutHz: number;      // 20 to 80 Hz
  };
  midControl: {
    bypassed: boolean;
    lowMid: number;           // -10 to +10 dB
    mid: number;              // -10 to +10 dB
    highMid: number;          // -10 to +10 dB
    vocalClarity: number;     // 0 to 100
    presence: number;         // 0 to 100
    warmth: number;           // 0 to 100
    harshnessReduction: number;// 0 to 100
  };
  trebleControl: {
    bypassed: boolean;
    treble: number;           // -10 to +10 dB
    presence: number;         // -10 to +10 dB
    brilliance: number;       // -10 to +10 dB
    air: number;              // -10 to +10 dB
    highBoost: number;        // 0 to 100
    deEsser: number;          // 0 to 100
    harshnessReduction: number;// 0 to 100
  };
  compressor: {
    bypassed: boolean;
    threshold: number; // -60 to 0 dB
    ratio: number;     // 1 to 20
    attack: number;    // 0.001 to 0.1s
    release: number;   // 0.01 to 1s
    knee: number;      // 0 to 40 dB
    makeupGain: number;// 0 to 24 dB
    mode: 'Gentle' | 'Balanced' | 'Aggressive' | 'Vocal' | 'Music' | 'Punch';
  };
  multiband: {
    bypassed: boolean;
    bands: MultibandCompBand[];
  };
  limiter: {
    bypassed: boolean;
    threshold: number; // -20 to 0 dB
    ceiling: number;   // -2.0 to -0.1 dBFS
    release: number;   // 0.01 to 0.5s
    lookaheadMs: number;// 1 to 10ms
    type: 'Soft' | 'Hard' | 'TruePeak';
  };
  stereo: {
    bypassed: boolean;
    mode: 'Mono' | 'Narrow' | 'Normal' | 'Wide' | 'Ultra Wide';
    width: number;       // 0 to 2.0 (1.0 = normal)
    balance: number;     // -1 (Left) to +1 (Right)
    bassMonoFreq: number;// 80 to 200 Hz
    highSpread: number;  // 0 to 100
  };
  saturation: {
    bypassed: boolean;
    type: 'tube' | 'tape' | 'analog' | 'exciter';
    drive: number;  // 0 to 100
    warmth: number; // 0 to 100
    mix: number;    // 0 to 100 (dry/wet)
  };
  noiseReduction: {
    bypassed: boolean;
    enabled?: boolean;
    strength: 'Light' | 'Medium' | 'Strong';
    amount: number;       // 0 to 100
    removeHum: boolean;   // 50/60Hz notch
  };
  delay: {
    enabled: boolean;
    time: number;      // 0.05 to 1.0s
    timeMs?: number;
    feedback: number;  // 0 to 0.85
    mix: number;       // 0 to 1.0 (dry/wet)
    pingPong: boolean;
    preset?: 'Short Echo' | 'Long Echo' | 'Ping Pong' | 'Slapback' | 'Vocal Echo';
  };
  reverb: {
    enabled: boolean;
    preset?: 'Room' | 'Hall' | 'Plate' | 'Studio' | 'Cathedral' | 'Small Room' | 'Large Hall';
    type?: 'room' | 'hall' | 'plate' | 'studio' | 'cathedral';
    amount: number;    // 0 to 100
    decay: number;     // 0.5 to 6.0s
    preDelay: number;  // 0 to 0.1s
    damping: number;   // 1000 to 18000 Hz
    mix: number;       // 0 to 100%
  };
  clarity: {
    vocalClarity: number;
    instrumentClarity: number;
    transientPunch: number;
  };
}

export type SaturationType = 'tube' | 'tape' | 'analog' | 'exciter';
export type StereoMode = 'mono' | 'narrow' | 'normal' | 'wide' | 'ultra_wide';
export type ReverbType = 'room' | 'hall' | 'plate' | 'studio' | 'cathedral';
export type AICharacter = 'commercial' | 'warm' | 'clean' | 'bright' | 'powerful' | 'smooth';
export type AIStrength = 'light' | 'medium' | 'strong';

export interface Preset {
  id: string;
  name: string;
  category: 'MUSIC' | 'VOCAL' | 'MASTERING CHARACTER' | 'PLATFORM' | 'USER' | string;
  description: string;
  targetLufs?: number;
  settings: Partial<MasteringSettings>;
}

export interface MasteringPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  targetLufs?: number;
  settings: MasteringSettings;
}

export interface ExportConfig {
  format: 'wav' | 'mp3' | 'flac' | 'aac' | 'ogg';
  bitDepth: 16 | 24 | 32;
  mp3Bitrate?: 128 | 192 | 256 | 320;
  sampleRate: 44100 | 48000 | 88200 | 96000;
  dither?: 'none' | 'triangular' | 'shaped';
  normalizeTargetLufs?: number;
  truePeakCeiling?: number;
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    year?: string;
  };
}

export interface QuickMasterParams {
  bass: number;    // 0 to 100, default ~52
  middle: number;  // 0 to 100, default ~83
  treble: number;  // 0 to 100, default ~100
  echo: number;    // 0 to 100, default ~0
  noise: number;   // 0 to 100, default ~0
  lebar: number;   // 0 to 100, default ~62 (stereo width)
  mode: 'stereo' | 'mono';
}

export type ReferencePresetCategory =
  | 'UMUM'
  | 'LOKAL'
  | 'VOKAL'
  | 'POP / ROCK'
  | 'JAZZ / SOUL'
  | 'ELEKTRONIK'
  | 'LAINNYA';

export interface ReferencePresetItem {
  id: string;
  name: string;
  category: ReferencePresetCategory;
  description: string;
  quickParams: QuickMasterParams;
  settings?: Partial<MasteringSettings>;
}
