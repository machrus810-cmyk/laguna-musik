'use client';

import React from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Wand2,
} from 'lucide-react';
import { AudioAnalysisMetrics } from '@/types/mastering';

interface AnalysisDashboardProps {
  metrics: AudioAnalysisMetrics | null;
  targetLufs: number;
  onAutoFixTruePeak: () => void;
}

export default function AnalysisDashboard({
  metrics,
  targetLufs,
  onAutoFixTruePeak,
}: AnalysisDashboardProps) {
  if (!metrics) {
    return (
      <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 text-center text-zinc-500">
        <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse text-zinc-600" />
        <p className="text-sm">Silakan upload audio untuk menjalankan analisis metrik mendalam.</p>
      </div>
    );
  }

  const isSafe = metrics.safetyStatus === 'SAFE';
  const isWarning = metrics.safetyStatus === 'WARNING';
  const isClipping = metrics.safetyStatus === 'CLIPPING';

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-3 h-3 rounded-full animate-ping ${
              isClipping ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-400">
            Audio Status:
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
              isClipping
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : isWarning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {isClipping ? (
              <AlertOctagon className="w-3.5 h-3.5" />
            ) : isWarning ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{metrics.safetyStatus}</span>
          </span>
        </div>

        {(isClipping || isWarning || metrics.truePeakDb > -0.8) && (
          <button
            onClick={onAutoFixTruePeak}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Wand2 className="w-3.5 h-3.5 text-rose-400" />
            <span>AUTO FIX TRUE PEAK</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Integrated LUFS</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
              {metrics.integratedLufs}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">LUFS</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Target: {targetLufs} LUFS</span>
        </div>

        <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">True Peak</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl sm:text-2xl font-black font-mono ${
                metrics.truePeakDb > -0.5
                  ? 'text-rose-400'
                  : metrics.truePeakDb > -1.0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {metrics.truePeakDb > 0 ? `+${metrics.truePeakDb}` : metrics.truePeakDb}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">dBTP</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Limit: -1.0 dBTP</span>
        </div>

        <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Detected BPM</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-orange-400">
              {metrics.bpm}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">BPM</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Conf: {Math.round(metrics.detectedBpmConfidence * 100)}%</span>
        </div>

        <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Dynamic Range</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-teal-400">
              {metrics.dynamicRangeLu}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">LU</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">
            {metrics.dynamicRangeLu >= 8 ? 'Healthy Dynamics' : 'Compressed'}
          </span>
        </div>

        <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Short-Term LUFS</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-zinc-200">
              {metrics.shortTermLufs}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">LUFS</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Peak: {metrics.peakDb} dBFS</span>
        </div>

        <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Clipping & Noise</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl sm:text-2xl font-black font-mono ${
                metrics.clipCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {metrics.clipCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Clips</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Floor: {metrics.noiseFloorDb} dB</span>
        </div>
      </div>

      {metrics.safetyRecommendations && metrics.safetyRecommendations.length > 0 && (
        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[11px] font-mono font-bold text-amber-400/90 uppercase tracking-wider">
            DSP Diagnostic Report:
          </span>
          <ul className="text-xs text-zinc-300 space-y-1 pl-4 list-disc marker:text-amber-500">
            {metrics.safetyRecommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
