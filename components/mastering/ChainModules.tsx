'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Gauge,
  Music,
  Flame,
  Zap,
  Shield,
  Wand2,
  RotateCcw,
} from 'lucide-react';
import {
  MasteringChainState,
  TempoMode,
} from '@/types/mastering';

interface ChainModulesProps {
  state: MasteringChainState;
  onChange: (newState: MasteringChainState) => void;
  onRunAiEq: () => void;
  onRunAiCompression: () => void;
  onRunAiSmartTempo: () => void;
  gainReductionDb: number;
}

export default function ChainModules({
  state,
  onChange,
  onRunAiEq,
  onRunAiCompression,
  onRunAiSmartTempo,
  gainReductionDb,
}: ChainModulesProps) {
  const [activeTab, setActiveTab] = useState<'tempo' | 'eq' | 'dynamics' | 'color' | 'stereo_limiter' | 'repair'>('tempo');

  const updateSubState = <K extends keyof MasteringChainState>(key: K, val: MasteringChainState[K]) => {
    onChange({ ...state, [key]: val });
  };

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5 p-1 bg-black/50 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab('tempo')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'tempo' ? 'bg-amber-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Speed & Tempo</span>
          {state.tempo.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
        <button
          onClick={() => setActiveTab('eq')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'eq' ? 'bg-amber-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Parametric EQ</span>
          {state.eq.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
        <button
          onClick={() => setActiveTab('dynamics')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'dynamics' ? 'bg-amber-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>Dynamics & Multiband</span>
          {state.compressor.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
        <button
          onClick={() => setActiveTab('color')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'color' ? 'bg-amber-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Saturation & Exciter</span>
          {state.saturation.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
        <button
          onClick={() => setActiveTab('stereo_limiter')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'stereo_limiter' ? 'bg-amber-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Stereo & Limiter</span>
          {state.limiter.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
        <button
          onClick={() => setActiveTab('repair')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'repair' ? 'bg-amber-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Noise & Repair</span>
          {state.repair.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
      </div>

      <div className="pt-2">
        {/* TEMPO */}
        {activeTab === 'tempo' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">⚡ SPEED / TEMPO CONTROL</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">Wajib</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onRunAiSmartTempo}
                  className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>⚡ AI SMART TEMPO</span>
                </button>
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.tempo.enabled}
                    onChange={(e) => updateSubState('tempo', { ...state.tempo, enabled: e.target.checked })}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Aktif</span>
                </label>
              </div>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-mono">Kecepatan Audio (Speed)</span>
                <span className="text-lg font-black font-mono text-amber-400">{state.tempo.speedPercent}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={200}
                step={1}
                value={state.tempo.speedPercent}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const newTargetBpm = Math.round((state.tempo.originalBpm * val) / 100);
                  updateSubState('tempo', { ...state.tempo, enabled: true, speedPercent: val, targetBpm: newTargetBpm });
                }}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
              />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                {[
                  { label: '50% (Sangat Lambat)', val: 50 },
                  { label: '75% (Lambat)', val: 75 },
                  { label: '100% (Normal)', val: 100 },
                  { label: '125% (Cepat)', val: 125 },
                  { label: '150% (Sangat Cepat)', val: 150 },
                  { label: '200% (Ultra Cepat)', val: 200 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => {
                      const newTargetBpm = Math.round((state.tempo.originalBpm * item.val) / 100);
                      updateSubState('tempo', { ...state.tempo, enabled: true, speedPercent: item.val, targetBpm: newTargetBpm });
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-mono font-bold cursor-pointer ${
                      state.tempo.speedPercent === item.val ? 'bg-amber-500 text-black shadow-sm' : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {item.val}%
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                <span className="text-xs text-zinc-400 font-mono">BPM Asli (Detected)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={state.tempo.originalBpm}
                    onChange={(e) => updateSubState('tempo', { ...state.tempo, originalBpm: parseInt(e.target.value, 10) || 120 })}
                    className="w-24 bg-zinc-800 border border-white/10 px-3 py-1.5 rounded-lg text-sm font-mono text-white"
                  />
                  <span className="text-xs text-zinc-400 font-mono">BPM</span>
                </div>
              </div>

              <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                <span className="text-xs text-zinc-400 font-mono">Target BPM</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={state.tempo.targetBpm}
                    onChange={(e) => {
                      const target = parseInt(e.target.value, 10) || 120;
                      const speedRatio = Math.round((target / state.tempo.originalBpm) * 100);
                      updateSubState('tempo', { ...state.tempo, enabled: true, targetBpm: target, speedPercent: Math.max(50, Math.min(200, speedRatio)) });
                    }}
                    className="w-24 bg-zinc-800 border border-white/10 px-3 py-1.5 rounded-lg text-sm font-mono text-white"
                  />
                  <span className="text-xs text-zinc-400 font-mono">BPM</span>
                  <button
                    onClick={() => updateSubState('tempo', { ...state.tempo, speedPercent: 100, targetBpm: state.tempo.originalBpm })}
                    className="ml-auto p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Mode Pengubahan Tempo</span>
                <label className="flex items-center gap-2 text-xs font-mono text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.tempo.preservePitch}
                    onChange={(e) => updateSubState('tempo', { ...state.tempo, preservePitch: e.target.checked, mode: e.target.checked ? 'preserve_pitch' : 'speed_only' })}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="font-bold">PRESERVE PITCH (Pertahankan Nada Vokal)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'speed_only', label: 'Speed Only', desc: 'Tempo & Pitch berubah bersama' },
                  { id: 'tempo_only', label: 'Tempo Only', desc: 'Tempo berubah, Pitch utuh' },
                  { id: 'pitch_and_speed', label: 'Pitch + Speed', desc: 'Kontrol nada & speed' },
                  { id: 'preserve_pitch', label: 'Preserve Pitch', desc: 'Advanced Time-Stretch' },
                ].map((modeItem) => (
                  <button
                    key={modeItem.id}
                    onClick={() => updateSubState('tempo', { ...state.tempo, mode: modeItem.id as TempoMode, preservePitch: modeItem.id !== 'speed_only' })}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 cursor-pointer ${
                      state.tempo.mode === modeItem.id ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-zinc-800/60 border-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">{modeItem.label}</span>
                    <span className="text-[10px] text-zinc-500 line-clamp-1">{modeItem.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EQ */}
        {activeTab === 'eq' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">⚡ 6-BAND PARAMETRIC MASTERING EQ</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={onRunAiEq}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI EQ Spectrum Correction</span>
                </button>
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.eq.enabled}
                    onChange={(e) => updateSubState('eq', { ...state.eq, enabled: e.target.checked })}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Aktif</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {state.eq.bands.map((band, idx) => (
                <div key={band.id} className="bg-black/40 border border-white/5 p-3 rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">Band {idx + 1}: {band.type}</span>
                    <input
                      type="checkbox"
                      checked={band.enabled}
                      onChange={(e) => {
                        const newBands = [...state.eq.bands];
                        newBands[idx].enabled = e.target.checked;
                        updateSubState('eq', { ...state.eq, bands: newBands });
                      }}
                      className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Freq: {band.frequency} Hz</span>
                    <input
                      type="range"
                      min={20}
                      max={20000}
                      step={5}
                      value={band.frequency}
                      onChange={(e) => {
                        const newBands = [...state.eq.bands];
                        newBands[idx].frequency = parseInt(e.target.value, 10);
                        updateSubState('eq', { ...state.eq, bands: newBands });
                      }}
                      className="w-24 accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Gain: {band.gain > 0 ? `+${band.gain}` : band.gain} dB</span>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.2}
                      value={band.gain}
                      onChange={(e) => {
                        const newBands = [...state.eq.bands];
                        newBands[idx].gain = parseFloat(e.target.value);
                        updateSubState('eq', { ...state.eq, bands: newBands });
                      }}
                      className="w-24 accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DYNAMICS */}
        {activeTab === 'dynamics' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">⚡ DYNAMICS COMPRESSOR & MULTIBAND</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={onRunAiCompression}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI Compression</span>
                </button>
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.compressor.enabled}
                    onChange={(e) => updateSubState('compressor', { ...state.compressor, enabled: e.target.checked })}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Aktif</span>
                </label>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-xl border border-white/5">
                <span className="text-xs font-mono text-zinc-400">Gain Reduction (GR):</span>
                <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-rose-500 transition-all duration-100 rounded-full" style={{ width: `${Math.min(100, (gainReductionDb / 12) * 100)}%` }} />
                </div>
                <span className="text-xs font-mono text-rose-400 font-bold">-{gainReductionDb.toFixed(1)} dB</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Threshold</span>
                    <span className="text-amber-400">{state.compressor.threshold} dB</span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={0}
                    step={1}
                    value={state.compressor.threshold}
                    onChange={(e) => updateSubState('compressor', { ...state.compressor, threshold: parseInt(e.target.value, 10) })}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Ratio</span>
                    <span className="text-amber-400">{state.compressor.ratio}:1</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={0.1}
                    value={state.compressor.ratio}
                    onChange={(e) => updateSubState('compressor', { ...state.compressor, ratio: parseFloat(e.target.value) })}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Makeup Gain</span>
                    <span className="text-amber-400">+{state.compressor.makeupGain} dB</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.2}
                    value={state.compressor.makeupGain}
                    onChange={(e) => updateSubState('compressor', { ...state.compressor, makeupGain: parseFloat(e.target.value) })}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SATURATION & EXCITER */}
        {activeTab === 'color' && (
          <div className="flex flex-col gap-4">
            <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>HARMONIC SATURATION</span>
                </span>
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.saturation.enabled}
                    onChange={(e) => updateSubState('saturation', { ...state.saturation, enabled: e.target.checked })}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Aktif</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Drive</span>
                    <span className="text-orange-400">{state.saturation.drive}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={state.saturation.drive}
                    onChange={(e) => updateSubState('saturation', { ...state.saturation, drive: parseInt(e.target.value, 10) })}
                    className="accent-orange-500 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Mix</span>
                    <span className="text-orange-400">{state.saturation.mix}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={state.saturation.mix}
                    onChange={(e) => updateSubState('saturation', { ...state.saturation, mix: parseInt(e.target.value, 10) })}
                    className="accent-orange-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>HARMONIC EXCITER (Air Sparkle)</span>
                </span>
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.exciter.enabled}
                    onChange={(e) => updateSubState('exciter', { ...state.exciter, enabled: e.target.checked })}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Aktif</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Frequency</span>
                    <span className="text-amber-400">{state.exciter.frequency} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={3000}
                    max={14000}
                    step={100}
                    value={state.exciter.frequency}
                    onChange={(e) => updateSubState('exciter', { ...state.exciter, frequency: parseInt(e.target.value, 10) })}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Amount</span>
                    <span className="text-amber-400">{state.exciter.amount}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={state.exciter.amount}
                    onChange={(e) => updateSubState('exciter', { ...state.exciter, amount: parseInt(e.target.value, 10) })}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEREO & LIMITER */}
        {activeTab === 'stereo_limiter' && (
          <div className="flex flex-col gap-4">
            <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">⚡ STEREO IMAGE & MID/SIDE</span>
                <button
                  onClick={() => updateSubState('stereo', { ...state.stereo, monoCheckActive: !state.stereo.monoCheckActive })}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                    state.stereo.monoCheckActive ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  MONO CHECK: {state.stereo.monoCheckActive ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Stereo Width</span>
                    <span className="text-amber-400">{state.stereo.stereoWidth}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={160}
                    value={state.stereo.stereoWidth}
                    onChange={(e) => updateSubState('stereo', { ...state.stereo, stereoWidth: parseInt(e.target.value, 10) })}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Stereo Bass Cutoff</span>
                    <span className="text-amber-400">{state.stereo.stereoBassCutoff} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={180}
                    value={state.stereo.stereoBassCutoff}
                    onChange={(e) => updateSubState('stereo', { ...state.stereo, stereoBassCutoff: parseInt(e.target.value, 10) })}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>TRUE PEAK BRICKWALL LIMITER</span>
                </span>
                <label className="flex items-center gap-2 text-xs font-mono text-emerald-300 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.limiter.truePeakProtection}
                    onChange={(e) => updateSubState('limiter', { ...state.limiter, truePeakProtection: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>True Peak Protection</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Ceiling</span>
                    <span className="text-emerald-400">{state.limiter.ceiling} dBTP</span>
                  </div>
                  <input
                    type="range"
                    min={-2.0}
                    max={-0.1}
                    step={0.1}
                    value={state.limiter.ceiling}
                    onChange={(e) => updateSubState('limiter', { ...state.limiter, ceiling: parseFloat(e.target.value) })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Limiter Gain</span>
                    <span className="text-emerald-400">+{state.limiter.gain} dB</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.2}
                    value={state.limiter.gain}
                    onChange={(e) => updateSubState('limiter', { ...state.limiter, gain: parseFloat(e.target.value) })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Release</span>
                    <span className="text-emerald-400">{state.limiter.release} ms</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={300}
                    value={state.limiter.release}
                    onChange={(e) => updateSubState('limiter', { ...state.limiter, release: parseInt(e.target.value, 10) })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPAIR */}
        {activeTab === 'repair' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">⚡ AI AUDIO REPAIR & NOISE REDUCTION</span>
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.repair.enabled}
                  onChange={(e) => updateSubState('repair', { ...state.repair, enabled: e.target.checked })}
                  className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                />
                <span>Aktif</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between cursor-pointer">
                <span className="text-xs font-mono text-zinc-300">De-Clip</span>
                <input
                  type="checkbox"
                  checked={state.repair.deClip}
                  onChange={(e) => updateSubState('repair', { ...state.repair, enabled: true, deClip: e.target.checked })}
                  className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                />
              </label>
              <label className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between cursor-pointer">
                <span className="text-xs font-mono text-zinc-300">Click & Pop Removal</span>
                <input
                  type="checkbox"
                  checked={state.repair.clickRemoval}
                  onChange={(e) => updateSubState('repair', { ...state.repair, enabled: true, clickRemoval: e.target.checked })}
                  className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
