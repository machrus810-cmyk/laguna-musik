'use client';

import React from 'react';
import Image from 'next/image';
import {
  Sparkles,
  Music,
  PenTool,
  Play,
  Pause,
  TrendingUp,
  ArrowRight,
  Disc3,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { NavTab } from './Sidebar';

interface HomeOverviewProps {
  tracks: MusicTrack[];
  credits: number;
  onNavigate: (tab: NavTab) => void;
  onSelectTrack: (track: MusicTrack) => void;
  onOpenAutoLyrics: () => void;
}

export default function HomeOverview({
  tracks,
  credits,
  onNavigate,
  onSelectTrack,
  onOpenAutoLyrics,
}: HomeOverviewProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const recentTracks = tracks.slice(0, 6);
  const featuredTrack = tracks[0] || null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-28">
      {/* Hero Studio Banner */}
      <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-[#121214] via-[#09090b] to-[#050505] border border-amber-500/20 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-700/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Studio Musik AI Generasi V6 Aktif</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-amber-500/40 shadow-xl shadow-amber-500/20 bg-zinc-950 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Laguna Musik Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  LAGUNA MUSIK
                </h1>
                <p className="text-xs sm:text-sm font-medium tracking-[0.2em] text-amber-500 uppercase mt-0.5">
                  By Nurul Falah
                </p>
              </div>
            </div>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl">
              Platform kreasi musik AI independen terdepan di Indonesia. Komposisi lirik, vokal autentik pria & wanita, serta aransemen musik nusantara hingga pop modern dengan Kie.ai Engine.
            </p>
            {/* Quick Action CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('create')}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer"
              >
                <Music className="w-4 h-4 fill-current" />
                <span>Mulai Buat Lagu</span>
              </button>
              <button
                onClick={onOpenAutoLyrics}
                className="px-5 py-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-400/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <PenTool className="w-4 h-4 text-amber-400" />
                <span>Auto Lyrics AI</span>
              </button>
              <button
                onClick={() => onNavigate('mastering')}
                className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-500/40 transition-all flex items-center gap-2 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Mastering Audio</span>
              </button>
            </div>
          </div>
          {/* Featured Spotlight Card */}
          {featuredTrack && (
            <div
              onClick={() => onSelectTrack(featuredTrack)}
              className="w-full lg:w-80 p-4 rounded-2xl bg-zinc-950/90 border border-white/10 shadow-2xl space-y-3 cursor-pointer group hover:border-amber-400/40 transition-all"
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Disc3 className="w-3.5 h-3.5 animate-spin-slow" />
                  KARYA TERBARU
                </span>
                <span className="text-zinc-500">{featuredTrack.model}</span>
              </div>
              <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-white/10">
                <Image
                  src={featuredTrack.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                  alt={featuredTrack.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentTrack?.id === featuredTrack.id) togglePlay();
                      else playTrack(featuredTrack);
                    }}
                    className="w-12 h-12 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  >
                    {currentTrack?.id === featuredTrack.id && isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                  {featuredTrack.title}
                </h3>
                <p className="text-xs text-amber-400/90 font-medium truncate mt-0.5">
                  {featuredTrack.style}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature Highlights Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('create')}
          className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-amber-400/40 cursor-pointer group transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
            <Music className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
            AI Music Generator V6
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Pilihan model V6, V6 MINI, hingga V6 WILD dengan kontrol durasi, vokal pria/wanita, dan instrumen.
          </p>
        </div>
        <div
          onClick={onOpenAutoLyrics}
          className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-amber-400/40 cursor-pointer group transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
            <PenTool className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
            Komposer Auto Lyrics
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Menghasilkan bait lagu terstruktur (Verse, Chorus, Bridge) dalam Bahasa Indonesia, Jawa, Sunda, dan Inggris.
          </p>
        </div>
        <div
          onClick={() => onNavigate('settings')}
          className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-amber-400/40 cursor-pointer group transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
            Kie.ai BYOK & Keamanan
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Arsitektur backend tertutup untuk penyimpanan kunci API aman tanpa mengekspos rahasia ke browser.
          </p>
        </div>
      </div>

      {/* Recent Productions Strip */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Produksi Studio Terbaru
            </h3>
          </div>
          <button
            onClick={() => onNavigate('library')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Buka Semua di Library ({tracks.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {recentTracks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-white/5 space-y-2">
            <Music className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs font-bold text-zinc-400">Belum ada karya musik di studio</p>
            <p className="text-[11px] text-zinc-500">
              Mulai buat lagu pertama Anda menggunakan AI Music Studio di tab Buat Lagu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTracks.map((t) => {
              const isCurrent = currentTrack?.id === t.id;
              const isThisPlaying = isCurrent && isPlaying;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTrack(t)}
                  className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-amber-400/40 cursor-pointer group flex items-center gap-3.5 transition-all shadow-md"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10">
                    <Image
                      src={t.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                      alt={t.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCurrent) togglePlay();
                          else playTrack(t);
                        }}
                        className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center shadow cursor-pointer"
                      >
                        {isThisPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {t.title}
                    </h4>
                    <p className="text-[11px] text-amber-400/90 font-medium truncate mt-0.5">
                      {t.style}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-1">
                      <span>{t.model}</span>
                      <span>•</span>
                      <span>{Math.floor(t.duration / 60)}:{(t.duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
