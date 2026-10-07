import {
  MasteringSettings,
  QuickMasterParams,
  ReferencePresetCategory,
  ReferencePresetItem,
} from '../types';

export const REFERENCE_CATEGORIES: ReferencePresetCategory[] = [
  'UMUM',
  'LOKAL',
  'VOKAL',
  'POP / ROCK',
  'JAZZ / SOUL',
  'ELEKTRONIK',
  'LAINNYA',
];

export const REFERENCE_PRESETS: ReferencePresetItem[] = [
  // --- UMUM (General) ---
  {
    id: 'audioku_global',
    name: 'Audioku Global',
    category: 'UMUM',
    description:
      'Top global-grade default with Vocal Crown tuning: natural center vocal weight, living mid, glerr deep bass, open sheen, velvet treble, and smarter source-aware mastering.',
    quickParams: {
      bass: 52,
      middle: 83,
      treble: 100,
      echo: 0,
      noise: 0,
      lebar: 62,
      mode: 'stereo',
    },
  },
  {
    id: 'signature',
    name: 'Signature',
    category: 'UMUM',
    description:
      'Balanced analog warmth with tight punchy dynamics, controlled low-end foundation, and an expansive stereo image.',
    quickParams: {
      bass: 58,
      middle: 75,
      treble: 88,
      echo: 0,
      noise: 0,
      lebar: 68,
      mode: 'stereo',
    },
  },
  {
    id: 'audioku_379',
    name: 'Audioku 3.79',
    category: 'UMUM',
    description:
      'Enhanced modern loudness with high clarity, controlled transients, radio presence, and harmonic cohesion.',
    quickParams: {
      bass: 60,
      middle: 80,
      treble: 94,
      echo: 0,
      noise: 0,
      lebar: 64,
      mode: 'stereo',
    },
  },
  {
    id: 'max_enhancer',
    name: 'Max Enhancer',
    category: 'UMUM',
    description:
      'Maximum loudness and harmonic excitement for energetic playback across small phones and large sound systems alike.',
    quickParams: {
      bass: 65,
      middle: 88,
      treble: 95,
      echo: 5,
      noise: 0,
      lebar: 75,
      mode: 'stereo',
    },
  },
  {
    id: 'audiophile',
    name: 'Audiophile',
    category: 'UMUM',
    description:
      'Pristine transparent dynamics, zero distortion, wide stereo field, and pure acoustic instrument preservation.',
    quickParams: {
      bass: 50,
      middle: 50,
      treble: 60,
      echo: 0,
      noise: 0,
      lebar: 55,
      mode: 'stereo',
    },
  },
  {
    id: 'punchy_music',
    name: 'Punchy Music',
    category: 'UMUM',
    description:
      'Heavy kick drum snap, enhanced 808 sub-bass, and aggressive master bus compression for modern groove tracks.',
    quickParams: {
      bass: 78,
      middle: 65,
      treble: 85,
      echo: 0,
      noise: 0,
      lebar: 60,
      mode: 'stereo',
    },
  },
  {
    id: 'youtube_loud',
    name: 'YouTube Loud',
    category: 'UMUM',
    description:
      'Calibrated for YouTube & streaming algorithms (-14 LUFS, -1.0 dBTP ceiling, transparent limiting without digital clipping).',
    quickParams: {
      bass: 55,
      middle: 78,
      treble: 82,
      echo: 0,
      noise: 0,
      lebar: 58,
      mode: 'stereo',
    },
  },
  {
    id: 'night_listening',
    name: 'Night Listening',
    category: 'UMUM',
    description:
      'Even dynamic range for comfortable late-night listening without sudden ear-piercing volume spikes.',
    quickParams: {
      bass: 45,
      middle: 60,
      treble: 45,
      echo: 0,
      noise: 10,
      lebar: 50,
      mode: 'stereo',
    },
  },

  // --- LOKAL ---
  {
    id: 'dangdut_koplo',
    name: 'Dangdut Koplo',
    category: 'LOKAL',
    description:
      'Kendang punch and kick bass boost, high vocal flute articulation, and lively energetic presence.',
    quickParams: {
      bass: 82,
      middle: 85,
      treble: 90,
      echo: 15,
      noise: 0,
      lebar: 70,
      mode: 'stereo',
    },
  },
  {
    id: 'pop_indonesia',
    name: 'Pop Indonesia',
    category: 'LOKAL',
    description:
      'Sweet acoustic guitar sheen, intimate upfront vocal tone, smooth low-end, and radio-ready presence.',
    quickParams: {
      bass: 54,
      middle: 82,
      treble: 88,
      echo: 8,
      noise: 0,
      lebar: 62,
      mode: 'stereo',
    },
  },
  {
    id: 'akustik_santai',
    name: 'Akustik Santai',
    category: 'LOKAL',
    description:
      'Organic natural warmth, subtle tape saturation, gentle room ambiance, and relaxed dynamics.',
    quickParams: {
      bass: 48,
      middle: 70,
      treble: 80,
      echo: 12,
      noise: 5,
      lebar: 65,
      mode: 'stereo',
    },
  },
  {
    id: 'campursari_tradisional',
    name: 'Campursari / Trad',
    category: 'LOKAL',
    description:
      'Harmonious gamelan & traditional instrument shimmer, vocal clarity, and balanced acoustic headroom.',
    quickParams: {
      bass: 56,
      middle: 76,
      treble: 84,
      echo: 10,
      noise: 0,
      lebar: 64,
      mode: 'stereo',
    },
  },

  // --- VOKAL ---
  {
    id: 'vocal_air_sparkle',
    name: 'Vocal Air & Sparkle',
    category: 'VOKAL',
    description:
      'Silky top-end air boost above 12kHz, surgical de-essing, centered vocal focus, and crystal breath presence.',
    quickParams: {
      bass: 40,
      middle: 90,
      treble: 100,
      echo: 10,
      noise: 5,
      lebar: 60,
      mode: 'stereo',
    },
  },
  {
    id: 'warm_broadcast_voice',
    name: 'Warm Broadcast Voice',
    category: 'VOKAL',
    description:
      'Deep radio proximity warmth, smooth leveling compression, crisp consonant intelligibility.',
    quickParams: {
      bass: 68,
      middle: 85,
      treble: 65,
      echo: 0,
      noise: 15,
      lebar: 30,
      mode: 'stereo',
    },
  },
  {
    id: 'podcast_clarity',
    name: 'Podcast Clarity',
    category: 'VOKAL',
    description:
      'Active background noise suppression, low-frequency rumble cut, and centered voice level normalization.',
    quickParams: {
      bass: 45,
      middle: 88,
      treble: 72,
      echo: 0,
      noise: 30,
      lebar: 20,
      mode: 'mono',
    },
  },
  {
    id: 'acapella_harmony',
    name: 'Acapella Harmony',
    category: 'VOKAL',
    description:
      'Spacious vocal stereophony, gentle harmonic saturation glue, and luminous vocal sheen.',
    quickParams: {
      bass: 50,
      middle: 85,
      treble: 92,
      echo: 18,
      noise: 0,
      lebar: 80,
      mode: 'stereo',
    },
  },

  // --- POP / ROCK ---
  {
    id: 'stadium_rock',
    name: 'Stadium Rock',
    category: 'POP / ROCK',
    description:
      'Roaring electric guitar mids, powerful drum wall, wide stereo separation, and sustained energy.',
    quickParams: {
      bass: 72,
      middle: 86,
      treble: 92,
      echo: 10,
      noise: 0,
      lebar: 78,
      mode: 'stereo',
    },
  },
  {
    id: 'modern_radio_pop',
    name: 'Modern Radio Pop',
    category: 'POP / ROCK',
    description:
      'Ultra-clean top end, tight punchy bass drum, upfront vocals, and radio-grade -12 LUFS presentation.',
    quickParams: {
      bass: 62,
      middle: 84,
      treble: 95,
      echo: 5,
      noise: 0,
      lebar: 65,
      mode: 'stereo',
    },
  },
  {
    id: 'indie_dream_pop',
    name: 'Indie Dream Pop',
    category: 'POP / ROCK',
    description:
      'Lush ambient delay reflections, wide stereo wash, velvety high shelf, and dreamy spaciousness.',
    quickParams: {
      bass: 55,
      middle: 75,
      treble: 88,
      echo: 25,
      noise: 0,
      lebar: 85,
      mode: 'stereo',
    },
  },
  {
    id: 'alt_rock_grunge',
    name: 'Alt-Rock Grunge',
    category: 'POP / ROCK',
    description:
      'Aggressive analog drive, punchy mid grittiness, heavy drum transient response, and raw power.',
    quickParams: {
      bass: 75,
      middle: 82,
      treble: 85,
      echo: 0,
      noise: 0,
      lebar: 70,
      mode: 'stereo',
    },
  },

  // --- JAZZ / SOUL ---
  {
    id: 'vintage_vinyl_1970',
    name: 'Vintage Vinyl 1970',
    category: 'JAZZ / SOUL',
    description:
      'Warm tube tape coloration, smooth roll-off above 15kHz, analog console feel, and pleasant retro vibe.',
    quickParams: {
      bass: 60,
      middle: 65,
      treble: 50,
      echo: 5,
      noise: 0,
      lebar: 55,
      mode: 'stereo',
    },
  },
  {
    id: 'smooth_jazz_cafe',
    name: 'Smooth Jazz Cafe',
    category: 'JAZZ / SOUL',
    description:
      'Opto-style compression, warm upright acoustic bass resonance, soft brass sheen, and intimate cafe space.',
    quickParams: {
      bass: 58,
      middle: 72,
      treble: 70,
      echo: 12,
      noise: 0,
      lebar: 65,
      mode: 'stereo',
    },
  },
  {
    id: 'modern_rnb_soul',
    name: 'Modern R&B / Neo Soul',
    category: 'JAZZ / SOUL',
    description:
      'Deep rounded sub-bass, silky lead vocal presence, delicate snare snap, and lush stereo width.',
    quickParams: {
      bass: 75,
      middle: 80,
      treble: 85,
      echo: 8,
      noise: 0,
      lebar: 68,
      mode: 'stereo',
    },
  },
  {
    id: 'acoustic_bossa',
    name: 'Acoustic Bossa',
    category: 'JAZZ / SOUL',
    description:
      'Ultra-clean dynamics, authentic nylon string harmonics, subtle percussion imaging, and open headroom.',
    quickParams: {
      bass: 50,
      middle: 68,
      treble: 75,
      echo: 10,
      noise: 0,
      lebar: 60,
      mode: 'stereo',
    },
  },

  // --- ELEKTRONIK ---
  {
    id: 'edm_club_slam',
    name: 'EDM Club Slam',
    category: 'ELEKTRONIK',
    description:
      'Maximum club loudness (-9 LUFS), brickwall true peak ceiling, massive 40Hz sub-bass, and soaring leads.',
    quickParams: {
      bass: 88,
      middle: 78,
      treble: 96,
      echo: 10,
      noise: 0,
      lebar: 82,
      mode: 'stereo',
    },
  },
  {
    id: 'deep_house_groove',
    name: 'Deep House Groove',
    category: 'ELEKTRONIK',
    description:
      'Warm rhythmic sub-punch, sidechain compression feel, shimmering hi-hats, and cozy dancefloor mood.',
    quickParams: {
      bass: 82,
      middle: 70,
      treble: 85,
      echo: 12,
      noise: 0,
      lebar: 75,
      mode: 'stereo',
    },
  },
  {
    id: 'phonk_trap_bass',
    name: 'Phonk / Trap Bass',
    category: 'ELEKTRONIK',
    description:
      'Saturated 808 harmonic distortion, clipping tolerance, piercing cowbell attack, and aggressive street low-end.',
    quickParams: {
      bass: 95,
      middle: 80,
      treble: 90,
      echo: 5,
      noise: 0,
      lebar: 70,
      mode: 'stereo',
    },
  },
  {
    id: 'synthwave_80s',
    name: 'Synthwave 80s',
    category: 'ELEKTRONIK',
    description:
      'Retro gated snare presence, chorus stereo widening, warm analog synthesis, and neon highway nostalgia.',
    quickParams: {
      bass: 70,
      middle: 75,
      treble: 90,
      echo: 22,
      noise: 0,
      lebar: 88,
      mode: 'stereo',
    },
  },

  // --- LAINNYA ---
  {
    id: 'gaming_livestream',
    name: 'Gaming & Livestream',
    category: 'LAINNYA',
    description:
      'Optimized for discord voice clarity, background game sound punch, and balanced streaming audio.',
    quickParams: {
      bass: 60,
      middle: 82,
      treble: 85,
      echo: 0,
      noise: 20,
      lebar: 60,
      mode: 'stereo',
    },
  },
  {
    id: 'bass_boost_extreme',
    name: 'Bass Boost Extreme',
    category: 'LAINNYA',
    description:
      'Maximum low-end enhancement for bass-heavy subwoofers, car audio competitions, and deep rumble lovers.',
    quickParams: {
      bass: 100,
      middle: 60,
      treble: 75,
      echo: 0,
      noise: 0,
      lebar: 60,
      mode: 'stereo',
    },
  },
  {
    id: 'flat_monitor_ref',
    name: 'Flat Monitor Reference',
    category: 'LAINNYA',
    description:
      'Completely neutral frequency response with zero coloring for critical mixing and mastering evaluation.',
    quickParams: {
      bass: 50,
      middle: 50,
      treble: 50,
      echo: 0,
      noise: 0,
      lebar: 50,
      mode: 'stereo',
    },
  },
  {
    id: 'lofi_nostalgia',
    name: 'Lo-Fi Nostalgia',
    category: 'LAINNYA',
    description:
      'Bandpass telephone warmth, vinyl saturation warmth, reduced highs, and cozy nostalgic chill vibes.',
    quickParams: {
      bass: 55,
      middle: 75,
      treble: 35,
      echo: 15,
      noise: 10,
      lebar: 40,
      mode: 'stereo',
    },
  },
];

export function applyQuickParamsToSettings(
  currentSettings: MasteringSettings,
  params: QuickMasterParams
): MasteringSettings {
  const next: MasteringSettings = JSON.parse(JSON.stringify(currentSettings));

  next.outputGain = 2.8;
  next.compressor.makeupGain = 1.6;
  next.compressor.ratio = 2.0;
  next.compressor.threshold = -14;
  next.normalizeLoudness = true;

  const bassNorm = (params.bass - 50) / 50;
  next.bassControl.bassPunch = params.bass;
  next.bassControl.subBassAmount = Math.max(0, Math.round(params.bass * 0.7));
  next.bassControl.bassBoost = Math.max(0, params.bass - 50);
  next.bassControl.bassTightness = Math.max(10, Math.round(params.bass * 0.4));

  if (next.eqBands[0]) next.eqBands[0].gain = Number((bassNorm * 3.2).toFixed(1));
  if (next.eqBands[1]) next.eqBands[1].gain = Number((bassNorm * 4.0).toFixed(1));
  if (next.eqBands[2]) next.eqBands[2].gain = Number((bassNorm * 2.2).toFixed(1));

  const midNorm = (params.middle - 50) / 50;
  next.midControl.vocalClarity = params.middle;
  next.midControl.warmth = Math.max(10, Math.round((100 - params.middle) * 0.5));
  next.midControl.harshnessReduction = params.middle > 70 ? 25 : 15;
  next.midControl.mid = Number((midNorm * 2.5).toFixed(1));

  if (next.eqBands[3]) next.eqBands[3].gain = Number((midNorm * 1.2).toFixed(1));
  if (next.eqBands[4]) next.eqBands[4].gain = Number((midNorm * 2.2).toFixed(1));
  if (next.eqBands[5]) next.eqBands[5].gain = Number((midNorm * 3.0).toFixed(1));
  if (next.eqBands[6]) next.eqBands[6].gain = Number((midNorm * 2.2).toFixed(1));

  const trebleNorm = (params.treble - 50) / 50;
  next.trebleControl.highBoost = params.treble;
  next.trebleControl.air = Number((trebleNorm * 3.6).toFixed(1));
  next.trebleControl.brilliance = Number((trebleNorm * 2.8).toFixed(1));
  next.trebleControl.deEsser = Math.max(15, Math.round(params.treble * 0.4));

  if (next.eqBands[7]) next.eqBands[7].gain = Number((trebleNorm * 2.4).toFixed(1));
  if (next.eqBands[8]) next.eqBands[8].gain = Number((trebleNorm * 3.4).toFixed(1));
  if (next.eqBands[9]) next.eqBands[9].gain = Number((trebleNorm * 4.2).toFixed(1));

  if (params.echo > 0) {
    next.delay.enabled = true;
    next.delay.mix = Number((0.08 + (params.echo / 100) * 0.28).toFixed(2));
    next.delay.feedback = Number((0.15 + (params.echo / 100) * 0.30).toFixed(2));
    next.delay.time = 0.22;
  } else {
    next.delay.enabled = false;
    next.delay.mix = 0;
  }

  if (params.noise > 0) {
    next.noiseReduction.bypassed = false;
    next.noiseReduction.amount = params.noise;
    next.noiseReduction.removeHum = params.noise > 25;
    next.noiseReduction.strength = params.noise > 60 ? 'Strong' : params.noise > 30 ? 'Medium' : 'Light';
  } else {
    next.noiseReduction.bypassed = true;
    next.noiseReduction.amount = 0;
  }

  if (params.mode === 'mono') {
    next.stereo.mode = 'Mono';
    next.stereo.width = 0;
  } else {
    const widthFactor = Number((0.75 + (params.lebar / 100) * 0.75).toFixed(2));
    next.stereo.width = widthFactor;
    next.stereo.mode = widthFactor > 1.2 ? 'Wide' : widthFactor < 0.85 ? 'Narrow' : 'Normal';
  }

  return next;
}
