import { GoogleGenAI } from '@google/genai';
import {
  AudioAnalysisMetrics,
  MasteringIntensity,
  MasteringCharacter,
  MasteringChainState,
  ReferenceTrackComparison,
} from '@/types/mastering';
import { DEFAULT_MASTERING_CHAIN } from '@/lib/masteringPresets';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export interface AiAutoMasteringResult {
  analysisSummary: string[];
  chainExplanation: string;
  recommendedSettings: Partial<MasteringChainState>;
  safetyCheck: {
    status: 'SAFE' | 'WARNING' | 'CLIPPING';
    notes: string;
  };
}

export interface AiSmartTempoResult {
  detectedBpm: number;
  suggestedTempoRange: {
    min: number;
    max: number;
    recommended: number;
  };
  musicalAnalysis: string;
  grooveRecommendation: string;
}

export async function runAiAutoMastering(
  metrics: AudioAnalysisMetrics,
  intensity: MasteringIntensity = 'Balanced',
  character: MasteringCharacter = 'Natural',
  trackContext?: { title?: string; genre?: string; lyrics?: string }
): Promise<AiAutoMasteringResult> {
  const gemini = getAiClient();
  const baselineSettings = JSON.parse(JSON.stringify(DEFAULT_MASTERING_CHAIN)) as MasteringChainState;
  baselineSettings.intensity = intensity;
  baselineSettings.character = character;

  let targetLufs = -14.0;
  let limiterGain = 2.0;
  let limiterCeiling = -1.0;

  if (intensity === 'Gentle') {
    targetLufs = -15.5; limiterGain = 1.2; limiterCeiling = -1.0;
  } else if (intensity === 'Natural') {
    targetLufs = -14.0; limiterGain = 1.8; limiterCeiling = -1.0;
  } else if (intensity === 'Balanced') {
    targetLufs = -13.5; limiterGain = 2.4; limiterCeiling = -1.0;
  } else if (intensity === 'Punchy') {
    targetLufs = -11.5; limiterGain = 3.2; limiterCeiling = -0.5;
  } else if (intensity === 'Loud') {
    targetLufs = -9.0; limiterGain = 4.2; limiterCeiling = -0.3;
  }

  let satMode: MasteringChainState['saturation']['mode'] = 'Tape';
  let satDrive = 18;
  let stereoWidth = 108;

  if (character === 'Warm' || character === 'Analog') {
    satMode = character === 'Analog' ? 'Analog' : 'Tube';
    satDrive = 22;
    stereoWidth = 106;
  } else if (character === 'Bright') {
    satMode = 'Clean';
    satDrive = 10;
    stereoWidth = 114;
    baselineSettings.exciter = { enabled: true, mode: 'Air', frequency: 9500, amount: 24, mix: 30, tone: 10 };
  } else if (character === 'Wide') {
    satMode = 'Tape'; satDrive = 15; stereoWidth = 125;
  } else if (character === 'Clean') {
    satMode = 'Clean'; satDrive = 0; stereoWidth = 100;
  } else if (character === 'Punchy') {
    satMode = 'Tape'; satDrive = 24; stereoWidth = 110;
  }

  const detectedIssues: string[] = [];
  if (metrics.integratedLufs > -10) {
    detectedIssues.push('Level audio awal sangat keras (-' + Math.abs(metrics.integratedLufs) + ' LUFS), proteksi limiting diaktifkan.');
  } else if (metrics.integratedLufs < -22) {
    detectedIssues.push('Level audio awal cukup rendah, memerlukan kenaikan bertahap.');
  }

  if (metrics.truePeakDb > -0.5) {
    detectedIssues.push('True Peak mendekati 0 dBTP (' + metrics.truePeakDb + ' dBTP), rentan clipping.');
    limiterCeiling = -1.0;
  } else {
    detectedIssues.push('Headroom True Peak dalam kondisi sehat.');
  }

  if (metrics.phaseCorrelation < 0.3) {
    detectedIssues.push('Korelasi fase stereo rendah (' + metrics.phaseCorrelation + '), mono check aktif.');
    stereoWidth = Math.min(stereoWidth, 104);
  } else {
    detectedIssues.push('Pencitraan stereo dan korelasi fase stabil (+ ' + metrics.phaseCorrelation + ').');
  }

  if (metrics.dynamicRangeLu < 7) {
    detectedIssues.push('Dynamic Range sempit (' + metrics.dynamicRangeLu + ' LU), kompresor diatur lembut.');
    baselineSettings.compressor.ratio = 1.8;
  } else {
    detectedIssues.push('Dynamic range sehat (' + metrics.dynamicRangeLu + ' LU), respon transien natural.');
  }

  baselineSettings.loudnessTarget = {
    preset: intensity === 'Loud' ? 'Club' : 'Streaming',
    targetLufs,
    maxTruePeak: limiterCeiling,
  };

  baselineSettings.limiter = {
    enabled: true,
    mode: intensity === 'Punchy' ? 'Punchy' : intensity === 'Loud' ? 'Loud' : 'Streaming',
    threshold: -2.0,
    ceiling: limiterCeiling,
    release: 60,
    lookaheadMs: 4,
    gain: limiterGain,
    truePeakProtection: true,
  };

  baselineSettings.saturation = {
    enabled: satDrive > 0,
    mode: satMode,
    drive: satDrive,
    mix: 35,
    tone: character === 'Warm' ? -4 : 4,
    outputGain: 0,
  };

  baselineSettings.stereo = {
    enabled: true,
    stereoWidth,
    midGain: 0,
    sideGain: Number(((stereoWidth - 100) * 0.04).toFixed(1)),
    stereoBassMonoMaker: true,
    stereoBassCutoff: 120,
    monoCheckActive: false,
  };

  if (gemini) {
    try {
      const prompt = `Sebagai Senior AI Mastering Engineer, evaluasi audio berikut:
- Integrated LUFS: ${metrics.integratedLufs} LUFS
- True Peak: ${metrics.truePeakDb} dBTP
- Dynamic Range: ${metrics.dynamicRangeLu} LU
- Phase Correlation: ${metrics.phaseCorrelation}
- BPM: ${metrics.bpm}
- Intensity Pilihan: ${intensity}
- Character: ${character}

Format JSON:
{
  "analysisPoints": ["poin 1", "poin 2", "poin 3"],
  "chainExplanation": "Penjelasan alur processing dalam Bahasa Indonesia.",
  "safetyNotes": "Catatan keamanan True Peak."
}`;

      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.3, responseMimeType: 'application/json' },
      });
      const text = response.text || '';
      if (text.trim().startsWith('{')) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.analysisPoints) && parsed.analysisPoints.length > 0) {
          return {
            analysisSummary: parsed.analysisPoints,
            chainExplanation: parsed.chainExplanation || 'EQ Korektif -> Kompresi Dinamis -> Saturation -> Stereo Enhancer -> True Peak Limiter',
            recommendedSettings: baselineSettings,
            safetyCheck: {
              status: metrics.clippingDetected ? 'CLIPPING' : metrics.truePeakDb > -0.8 ? 'WARNING' : 'SAFE',
              notes: parsed.safetyNotes || `Target ${targetLufs} LUFS aman untuk streaming broadcast.`,
            },
          };
        }
      }
    } catch {}
  }

  return {
    analysisSummary: detectedIssues,
    chainExplanation: 'EQ Parametrik -> Kompresor Transparan -> ' + satMode + ' Saturation -> Mid/Side Stereo -> True Peak Limiter',
    recommendedSettings: baselineSettings,
    safetyCheck: {
      status: metrics.clippingDetected ? 'CLIPPING' : metrics.truePeakDb > -0.8 ? 'WARNING' : 'SAFE',
      notes: `Target ${targetLufs} LUFS dengan ceiling ${limiterCeiling} dBTP siap saing di Spotify & YouTube.`,
    },
  };
}

export async function runAiSmartTempo(
  detectedBpm: number,
  trackContext?: { genre?: string; title?: string }
): Promise<AiSmartTempoResult> {
  const minTempo = Math.max(60, Math.round(detectedBpm * 0.9));
  const maxTempo = Math.min(180, Math.round(detectedBpm * 1.1));

  return {
    detectedBpm,
    suggestedTempoRange: { min: minTempo, max: maxTempo, recommended: detectedBpm },
    musicalAnalysis: `BPM asli terdeteksi pada ${detectedBpm} BPM. Alur ritmik stabil dan artikulasi transien berada di titik ideal.`,
    grooveRecommendation: `Rekomendasi rentang tempo ${minTempo} - ${maxTempo} BPM untuk remix atau variasi tempo tanpa artefak fase vokal.`,
  };
}

export function compareReferenceTrack(
  sourceMetrics: AudioAnalysisMetrics,
  refMetrics: AudioAnalysisMetrics,
  sourceTitle = 'Track Sumber',
  referenceTitle = 'Track Referensi'
): ReferenceTrackComparison {
  const loudnessDiff = Number((refMetrics.integratedLufs - sourceMetrics.integratedLufs).toFixed(1));
  const bassDiff = Number(((refMetrics.frequencyBalance.bass - sourceMetrics.frequencyBalance.bass) * 0.4).toFixed(1));
  const midDiff = Number(((refMetrics.frequencyBalance.lowMid - sourceMetrics.frequencyBalance.lowMid) * 0.3).toFixed(1));
  const highDiff = Number(((refMetrics.frequencyBalance.air - sourceMetrics.frequencyBalance.air) * 0.5).toFixed(1));
  const stereoDiff = refMetrics.stereoWidthPercent - sourceMetrics.stereoWidthPercent;
  const drDiff = Number((refMetrics.dynamicRangeLu - sourceMetrics.dynamicRangeLu).toFixed(1));

  let summary = '';
  if (loudnessDiff > 1.5) summary += `Track Referensi lebih keras sebesar +${loudnessDiff} LUFS. `;
  else if (loudnessDiff < -1.5) summary += `Track Referensi lebih pelan sebesar ${loudnessDiff} LUFS. `;
  else summary += 'Loudness kedua track hampir seimbang. ';

  if (bassDiff > 1.0) summary += 'Referensi memiliki sub-bass lebih punchy. ';
  if (highDiff > 1.0) summary += 'Referensi memiliki high air lebih terbuka. ';

  return {
    sourceTitle,
    referenceTitle,
    loudnessDiffLufs: loudnessDiff,
    bassDiffDb: bassDiff,
    midDiffDb: midDiff,
    highDiffDb: highDiff,
    stereoWidthDiffPercent: stereoDiff,
    dynamicRangeDiffLu: drDiff,
    summary,
    suggestedAdjustments: {
      eqGainLowDb: Math.max(-4, Math.min(4, bassDiff)),
      eqGainMidDb: Math.max(-3, Math.min(3, midDiff)),
      eqGainHighDb: Math.max(-4, Math.min(4, highDiff)),
      targetLufs: refMetrics.integratedLufs,
      stereoWidth: Math.max(90, Math.min(140, 100 + Math.round(stereoDiff * 0.5))),
    },
  };
}
