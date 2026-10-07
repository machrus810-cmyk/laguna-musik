import {
  MasteringSettings,
  Preset,
  MasteringPreset,
  EQBand,
  MultibandCompBand,
} from '../types';

export const INITIAL_EQ_BANDS: EQBand[] = [
  { id: 1, name: 'Sub Bass', freq: 32, gain: 0, q: 0.7, type: 'lowshelf' },
  { id: 2, name: 'Bass', freq: 80, gain: 0, q: 1.0, type: 'peaking' },
  { id: 3, name: 'Low Mid', freq: 200, gain: 0, q: 1.2, type: 'peaking' },
  { id: 4, name: 'Mid', freq: 500, gain: 0, q: 1.0, type: 'peaking' },
  { id: 5, name: 'High Mid', freq: 1200, gain: 0, q: 1.0, type: 'peaking' },
  { id: 6, name: 'Vocal Presence', freq: 3000, gain: 0, q: 1.2, type: 'peaking' },
  { id: 7, name: 'Presence', freq: 5000, gain: 0, q: 1.0, type: 'peaking' },
  { id: 8, name: 'Treble', freq: 8000, gain: 0, q: 1.0, type: 'peaking' },
  { id: 9, name: 'Brilliance', freq: 12000, gain: 0, q: 0.8, type: 'peaking' },
  { id: 10, name: 'Air', freq: 16000, gain: 0, q: 0.7, type: 'highshelf' },
];

export const INITIAL_MULTIBAND: MultibandCompBand[] = [
  { name: 'Low', range: '< 150 Hz', lowFreq: 20, highFreq: 150, threshold: -20, ratio: 3.0, gain: 0, attack: 0.03, release: 0.15, bypassed: false, solo: false },
  { name: 'Low Mid', range: '150 - 600 Hz', lowFreq: 150, highFreq: 600, threshold: -22, ratio: 2.5, gain: 0, attack: 0.02, release: 0.12, bypassed: false, solo: false },
  { name: 'Mid', range: '600 - 2.5 kHz', lowFreq: 600, highFreq: 2500, threshold: -24, ratio: 2.0, gain: 0, attack: 0.015, release: 0.1, bypassed: false, solo: false },
  { name: 'High Mid', range: '2.5 - 8 kHz', lowFreq: 2500, highFreq: 8000, threshold: -22, ratio: 2.5, gain: 0, attack: 0.01, release: 0.08, bypassed: false, solo: false },
  { name: 'High', range: '> 8 kHz', lowFreq: 8000, highFreq: 20000, threshold: -20, ratio: 2.0, gain: 0, attack: 0.008, release: 0.06, bypassed: false, solo: false },
];

export const DEFAULT_MASTERING_SETTINGS: MasteringSettings = {
  outputGain: 2.8,
  targetLufs: -14,
  normalizeLoudness: true,
  eqBypassed: false,
  eqBands: INITIAL_EQ_BANDS,
  bassControl: {
    bypassed: false,
    bassAmount: 0,
    subBassAmount: 0,
    bassBoost: 0,
    bassPunch: 15,
    bassTightness: 20,
    lowCutHz: 28,
  },
  midControl: {
    bypassed: false,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    vocalClarity: 15,
    presence: 12,
    warmth: 15,
    harshnessReduction: 15,
  },
  trebleControl: {
    bypassed: false,
    treble: 0,
    presence: 0,
    brilliance: 0,
    air: 0,
    highBoost: 12,
    deEsser: 20,
    harshnessReduction: 15,
  },
  compressor: {
    bypassed: false,
    threshold: -10,
    ratio: 1.5,
    attack: 0.035,
    release: 0.15,
    knee: 18,
    makeupGain: 0.8,
    mode: 'Balanced',
  },
  multiband: {
    bypassed: false,
    bands: INITIAL_MULTIBAND,
  },
  limiter: {
    bypassed: false,
    threshold: -1.2,
    ceiling: -0.2,
    release: 0.08,
    lookaheadMs: 4,
    type: 'TruePeak',
  },
  stereo: {
    bypassed: false,
    mode: 'Wide',
    width: 1.08,
    balance: 0,
    bassMonoFreq: 120,
    highSpread: 25,
  },
  saturation: {
    bypassed: false,
    type: 'tape',
    drive: 12,
    warmth: 20,
    mix: 15,
  },
  noiseReduction: {
    bypassed: true,
    enabled: false,
    strength: 'Medium',
    amount: 30,
    removeHum: false,
  },
  delay: {
    enabled: false,
    time: 0.22,
    feedback: 0.2,
    mix: 0.12,
    pingPong: true,
    preset: 'Slapback',
  },
  reverb: {
    enabled: false,
    preset: 'Studio',
    amount: 15,
    decay: 1.8,
    preDelay: 0.02,
    damping: 8000,
    mix: 12,
  },
  clarity: {
    vocalClarity: 25,
    instrumentClarity: 20,
    transientPunch: 30,
  },
};

export const MASTERING_PRESETS: Preset[] = [
  {
    id: 'music-pop',
    name: 'Modern Pop',
    category: 'MUSIC',
    description: 'Crisp vocal presence, punchy low-end, and radio-ready gloss.',
    settings: {
      targetLufs: -12,
      bassControl: { bypassed: false, bassAmount: 15, subBassAmount: 10, bassBoost: 20, bassPunch: 45, bassTightness: 40, lowCutHz: 30 },
      midControl: { bypassed: false, lowMid: -1, mid: 0.5, highMid: 1.5, vocalClarity: 55, presence: 40, warmth: 20, harshnessReduction: 30 },
      trebleControl: { bypassed: false, treble: 1.8, presence: 1.5, brilliance: 2.0, air: 2.5, highBoost: 45, deEsser: 35, harshnessReduction: 25 },
      saturation: { bypassed: false, type: 'tape', drive: 22, warmth: 30, mix: 35 },
      stereo: { bypassed: false, mode: 'Wide', width: 1.25, balance: 0, bassMonoFreq: 130, highSpread: 45 },
      compressor: { bypassed: false, threshold: -18, ratio: 3.0, attack: 0.025, release: 0.12, knee: 14, makeupGain: 3.5, mode: 'Balanced' },
    },
  },
  {
    id: 'music-edm',
    name: 'EDM & Dance Floor',
    category: 'MUSIC',
    description: 'Sub-heavy kick response, aggressive dynamics, maximum energy & clarity.',
    settings: {
      targetLufs: -9,
      bassControl: { bypassed: false, bassAmount: 35, subBassAmount: 40, bassBoost: 45, bassPunch: 75, bassTightness: 60, lowCutHz: 28 },
      midControl: { bypassed: false, lowMid: -2, mid: 0, highMid: 1.2, vocalClarity: 40, presence: 35, warmth: 15, harshnessReduction: 40 },
      trebleControl: { bypassed: false, treble: 2.5, presence: 1.5, brilliance: 3.0, air: 3.5, highBoost: 60, deEsser: 40, harshnessReduction: 35 },
      saturation: { bypassed: false, type: 'tube', drive: 35, warmth: 25, mix: 40 },
      stereo: { bypassed: false, mode: 'Ultra Wide', width: 1.4, balance: 0, bassMonoFreq: 140, highSpread: 65 },
      compressor: { bypassed: false, threshold: -16, ratio: 4.0, attack: 0.015, release: 0.09, knee: 16, makeupGain: 5.0, mode: 'Punch' },
    },
  },
  {
    id: 'music-dangdut',
    name: 'Dangdut Modern',
    category: 'MUSIC',
    description: 'Kendang punch definition, crisp suling presence, and lively warm bassline.',
    settings: {
      targetLufs: -12,
      bassControl: { bypassed: false, bassAmount: 28, subBassAmount: 25, bassBoost: 35, bassPunch: 60, bassTightness: 55, lowCutHz: 32 },
      midControl: { bypassed: false, lowMid: 0.5, mid: 1.8, highMid: 2.2, vocalClarity: 65, presence: 55, warmth: 45, harshnessReduction: 30 },
      trebleControl: { bypassed: false, treble: 2.0, presence: 2.2, brilliance: 2.5, air: 2.0, highBoost: 45, deEsser: 40, harshnessReduction: 25 },
      saturation: { bypassed: false, type: 'tape', drive: 24, warmth: 40, mix: 35 },
      stereo: { bypassed: false, mode: 'Wide', width: 1.25, balance: 0, bassMonoFreq: 125, highSpread: 50 },
      compressor: { bypassed: false, threshold: -19, ratio: 2.8, attack: 0.02, release: 0.13, knee: 14, makeupGain: 3.6, mode: 'Balanced' },
    },
  },
  {
    id: 'char-commercial',
    name: 'Commercial Loudness',
    category: 'MASTERING CHARACTER',
    description: 'Competitive streaming loudness (-10 LUFS), controlled True Peak, zero clipping.',
    settings: {
      targetLufs: -10,
      bassControl: { bypassed: false, bassAmount: 20, subBassAmount: 15, bassBoost: 25, bassPunch: 55, bassTightness: 55, lowCutHz: 30 },
      midControl: { bypassed: false, lowMid: -1.0, mid: 1.0, highMid: 2.0, vocalClarity: 60, presence: 50, warmth: 30, harshnessReduction: 35 },
      trebleControl: { bypassed: false, treble: 2.0, presence: 1.8, brilliance: 2.5, air: 2.8, highBoost: 50, deEsser: 40, harshnessReduction: 30 },
      saturation: { bypassed: false, type: 'tape', drive: 30, warmth: 40, mix: 40 },
      stereo: { bypassed: false, mode: 'Wide', width: 1.25, balance: 0, bassMonoFreq: 130, highSpread: 50 },
      compressor: { bypassed: false, threshold: -17, ratio: 3.5, attack: 0.02, release: 0.11, knee: 14, makeupGain: 4.5, mode: 'Balanced' },
      limiter: { bypassed: false, threshold: -3.0, ceiling: -0.2, release: 0.08, lookaheadMs: 5, type: 'TruePeak' },
    },
  },
];

export const PRESETS: MasteringPreset[] = MASTERING_PRESETS.map((p) => ({
  id: p.id,
  name: p.name,
  category: p.category.toLowerCase().includes('vocal')
    ? 'vocal'
    : p.category.toLowerCase().includes('character')
    ? 'character'
    : p.category.toLowerCase().includes('platform')
    ? 'platform'
    : 'genre',
  description: p.description,
  targetLufs: p.targetLufs || (p.settings as any)?.targetLufs,
  settings: {
    ...DEFAULT_MASTERING_SETTINGS,
    ...p.settings,
  } as MasteringSettings,
}));
