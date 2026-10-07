'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Video,
  Play,
  Pause,
  Sparkles,
  Loader2,
  CheckCircle2,
  Globe,
  User,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { apiFetch, safeJson } from '@/lib/api';

interface MusicVideoModalProps {
  track: MusicTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onVideoCreated?: () => void;
}

export default function MusicVideoModal({
  track,
  isOpen,
  onClose,
  onVideoCreated,
}: MusicVideoModalProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, analyserNode } = useAudioPlayer();
  const [artistName, setArtistName] = useState('Laguna Musik Studio');
  const [brandWebsite, setBrandWebsite] = useState('lagunamusik.app');
  const [visualStyle, setVisualStyle] = useState<'Spectrum Neon' | 'Golden Wave' | 'Cyber Circle'>('Spectrum Neon');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isCurrent = currentTrack?.id === track?.id;
  const isThisPlaying = isCurrent && isPlaying;

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;
    const render = () => {
      tick += 0.04;
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width / 1.8);
      if (visualStyle === 'Spectrum Neon') {
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
        grad.addColorStop(1, 'rgba(9, 9, 11, 0.95)');
      } else if (visualStyle === 'Golden Wave') {
        grad.addColorStop(0, 'rgba(234, 179, 8, 0.3)');
        grad.addColorStop(1, 'rgba(9, 9, 11, 0.95)');
      } else {
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        grad.addColorStop(1, 'rgba(9, 9, 11, 0.95)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 64;
      const dataArray = new Uint8Array(bufferLength);
      if (analyserNode && isThisPlaying) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          const wave = Math.sin(tick + i * 0.15) * 40 + Math.cos(tick * 0.8 + i * 0.2) * 30 + 50;
          dataArray[i] = Math.max(10, Math.min(255, wave * (isThisPlaying ? 1.8 : 0.6)));
        }
      }

      if (visualStyle === 'Spectrum Neon' || visualStyle === 'Golden Wave') {
        const barCount = 48;
        const barWidth = (width - 60) / barCount;
        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i % bufferLength] / 255;
          const barHeight = Math.max(6, val * (height * 0.55));
          const x = 30 + i * barWidth;
          const y = height / 2 - barHeight / 2;
          const barGrad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          if (visualStyle === 'Spectrum Neon') {
            barGrad.addColorStop(0, '#f59e0b');
            barGrad.addColorStop(0.5, '#fbbf24');
            barGrad.addColorStop(1, '#ef4444');
          } else {
            barGrad.addColorStop(0, '#fbbf24');
            barGrad.addColorStop(1, '#d97706');
          }
          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth - 3, barHeight, 3);
          ctx.fill();
        }
      } else {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 70;
        const numPoints = 64;
        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const val = dataArray[i % bufferLength] / 255;
          const r = radius + val * 45;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(track?.title || 'AI Track', width / 2, height - 60);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 12px sans-serif';
      ctx.fillText(artistName.toUpperCase(), width / 2, height - 40);
      ctx.fillStyle = '#71717a';
      ctx.font = '10px monospace';
      ctx.fillText(brandWebsite, width / 2, height - 22);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, analyserNode, isThisPlaying, visualStyle, track, artistName, brandWebsite]);

  if (!isOpen || !track) return null;

  const handleSaveVideo = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/music-video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_id: track.id,
          artist_name: artistName,
          brand_website: brandWebsite,
          visual_style: visualStyle,
        }),
      });
      const data = await safeJson<{ success?: boolean }>(res);
      if (data.success) {
        setSavedSuccess(true);
        if (onVideoCreated) onVideoCreated();
      }
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                AI MUSIC VIDEO & VISUALIZER STUDIO
              </h3>
              <p className="text-[11px] text-zinc-400">
                Visualisasi spektrum audio dinamis berbasis browser untuk YouTube/TikTok
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer Canvas Area */}
        <div className="p-5 flex flex-col items-center justify-center bg-zinc-950/70 border-b border-white/5">
          <div className="relative w-full max-w-xl aspect-video rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-[#09090b]">
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3">
              <button
                onClick={() => {
                  if (isCurrent) togglePlay();
                  else playTrack(track);
                }}
                className="px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                {isThisPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Jeda Musik</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Putar Audio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Toolbar */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-amber-400" />
                <span>Artist Name</span>
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 rounded-xl border border-white/10 text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3 text-amber-400" />
                <span>Website / Brand</span>
              </label>
              <input
                type="text"
                value={brandWebsite}
                onChange={(e) => setBrandWebsite(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 rounded-xl border border-white/10 text-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Gaya Spektrum
              </label>
              <select
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value as 'Spectrum Neon' | 'Golden Wave' | 'Cyber Circle')}
                className="w-full px-3 py-2 bg-zinc-950 rounded-xl border border-white/10 text-white text-xs"
              >
                <option value="Spectrum Neon">Spectrum Neon</option>
                <option value="Golden Wave">Golden Wave</option>
                <option value="Cyber Circle">Cyber Circle</option>
              </select>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Video visualizer berhasil disimpan dan dikaitkan ke trek ini!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleSaveVideo}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Simpan Video Visualizer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
