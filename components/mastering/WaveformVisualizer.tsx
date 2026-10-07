'use client';

import React, { useRef, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Volume2, SlidersHorizontal } from 'lucide-react';

interface WaveformVisualizerProps {
  analyserNode: AnalyserNode | null;
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isAbMastered: boolean;
  loudnessMatch: boolean;
  phaseCorrelation: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onSeek: (seconds: number) => void;
  onToggleAb: () => void;
  onToggleLoudnessMatch: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export default function WaveformVisualizer({
  analyserNode,
  audioBuffer,
  isPlaying,
  currentTime,
  duration,
  isAbMastered,
  loudnessMatch,
  phaseCorrelation,
  onTogglePlay,
  onStop,
  onSeek,
  onToggleAb,
  onToggleLoudnessMatch,
  volume,
  onVolumeChange,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bufferLength = 128;
    let dataArray = new Uint8Array(bufferLength);
    if (analyserNode) {
      bufferLength = analyserNode.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const freqs = [60, 250, 1000, 4000, 12000];
      for (const f of freqs) {
        const x = (Math.log10(f / 20) / Math.log10(20000 / 20)) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Background audio waveform peaks
      if (audioBuffer) {
        const rawData = audioBuffer.getChannelData(0);
        const step = Math.ceil(rawData.length / width);
        const amp = height / 2.6;
        ctx.fillStyle = isAbMastered ? 'rgba(245, 158, 11, 0.18)' : 'rgba(161, 161, 170, 0.15)';
        for (let i = 0; i < width; i++) {
          let min = 1.0;
          let max = -1.0;
          for (let j = 0; j < step; j++) {
            const datum = rawData[i * step + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }
          ctx.fillRect(i, (1 + min) * amp + 20, 1, Math.max(1, (max - min) * amp));
        }
      }

      // Live FFT spectrum
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(0.3, '#fb923c');
        gradient.addColorStop(0.7, '#f43f5e');
        gradient.addColorStop(1, '#a855f7');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let i = 0; i < bufferLength; i++) {
          const value = dataArray[i];
          const percent = value / 255;
          const barHeight = height * percent * 0.85;
          const x = (i / bufferLength) * width;
          const y = height - barHeight;
          if (i === 0) ctx.lineTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.globalAlpha = 0.55;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = isAbMastered ? '#fbbf24' : '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Playhead scrubber
      if (duration > 0) {
        const progressX = (currentTime / duration) * width;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(progressX, 0);
        ctx.lineTo(progressX, height);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(progressX, 8, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [analyserNode, audioBuffer, currentTime, duration, isAbMastered]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              onClick={onToggleAb}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isAbMastered ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>ORIGINAL (A)</span>
            </button>
            <button
              onClick={onToggleAb}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isAbMastered
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>MASTERED (B)</span>
            </button>
          </div>

          <button
            onClick={onToggleLoudnessMatch}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              loudnessMatch
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-800/80 border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Loudness Match menyeimbangkan level suara A & B"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Loudness Match: {loudnessMatch ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
          <span className="text-[11px] font-mono text-zinc-400">Phase:</span>
          <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden flex items-center relative">
            <div className="w-0.5 h-full bg-zinc-600 absolute left-1/2 -translate-x-1/2" />
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                phaseCorrelation >= 0.5 ? 'bg-emerald-400' : phaseCorrelation >= 0.1 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.max(10, Math.min(100, ((phaseCorrelation + 1) / 2) * 100))}%` }}
            />
          </div>
          <span className={`text-xs font-mono font-bold ${phaseCorrelation >= 0.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {phaseCorrelation >= 0 ? `+${phaseCorrelation.toFixed(2)}` : phaseCorrelation.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="relative w-full h-44 sm:h-56 bg-black/90 rounded-xl overflow-hidden border border-white/10 shadow-inner group">
        <canvas
          ref={canvasRef}
          width={900}
          height={240}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-pointer block"
        />
        <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] font-mono text-zinc-500 pointer-events-none">
          <span>20 Hz</span>
          <span>100 Hz</span>
          <span>500 Hz</span>
          <span>1 kHz</span>
          <span>5 kHz</span>
          <span>10 kHz</span>
          <span>20 kHz</span>
        </div>
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-[10px] font-mono font-bold text-zinc-300 pointer-events-none">
          {isAbMastered ? 'Previewing Mastered DSP Chain' : 'Bypassed (Original Audio)'}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className="w-11 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
          </button>
          <button
            onClick={onStop}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSeek(0)}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="text-xs font-mono text-zinc-300 ml-2">
            <span className="text-amber-400 font-bold">{formatTime(currentTime)}</span>
            <span className="text-zinc-600"> / </span>
            <span className="text-zinc-400">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-zinc-400" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-24 accent-amber-500 cursor-pointer"
          />
          <span className="text-[11px] font-mono text-zinc-400 w-8">{Math.round(volume * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
