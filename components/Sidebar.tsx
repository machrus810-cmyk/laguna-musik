'use client';

import React from 'react';
import Image from 'next/image';
import {
  Home,
  Music,
  PenTool,
  Library,
  Heart,
  Settings,
  Sparkles,
  RefreshCw,
  Zap,
  SlidersHorizontal,
} from 'lucide-react';
import { MusicProvider } from '@/database/db';

export type NavTab = 'home' | 'create' | 'mastering' | 'lyrics' | 'library' | 'favorites' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  credits: number;
  totalTracks: number;
  isConnected: boolean;
  isCheckingCredit: boolean;
  onRefreshCredit: () => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  maxSingleKeyCredit?: number;
  hasEligibleKey?: boolean;
  keyCount?: number;
  activeProvider?: MusicProvider;
  onProviderChange?: (provider: MusicProvider) => void;
  providerStats?: Record<MusicProvider, { keyCount: number; totalCredits: number; activeKeyCount: number }>;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  credits,
  totalTracks,
  isConnected,
  isCheckingCredit,
  onRefreshCredit,
  isOpenMobile,
  setIsOpenMobile,
  maxSingleKeyCredit = 0,
  hasEligibleKey = false,
  keyCount = 0,
  activeProvider = 'kie.ai',
  onProviderChange,
  providerStats,
}: SidebarProps) {
  const providerName =
    activeProvider === 'apiframe'
      ? 'Apiframe'
      : activeProvider === 'fal.ai'
      ? 'Fal.ai'
      : activeProvider === 'sunor'
      ? 'Sunor'
      : 'Kie.ai';

  const minCredit =
    activeProvider === 'fal.ai'
      ? 1
      : activeProvider === 'sunor'
      ? 10
      : activeProvider === 'apiframe'
      ? 11
      : 12;

  const isEngineConnected = isConnected && credits > 0;

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', label: 'Beranda', icon: <Home className="w-4 h-4" /> },
    {
      id: 'create',
      label: 'Buat Lagu',
      icon: <Music className="w-4 h-4" />,
      badge:
        activeProvider === 'apiframe'
          ? 'Suno V5.5'
          : activeProvider === 'fal.ai'
          ? 'MiniMax'
          : activeProvider === 'sunor'
          ? 'Suno V6'
          : 'AI V6',
    },
    {
      id: 'mastering',
      label: 'Mastering Audio',
      icon: <SlidersHorizontal className="w-4 h-4" />,
      badge: 'DSP + AI',
    },
    { id: 'lyrics', label: 'Buat Lirik', icon: <PenTool className="w-4 h-4" /> },
    { id: 'library', label: 'Library', icon: <Library className="w-4 h-4" />, badge: totalTracks.toString() },
    { id: 'favorites', label: 'Disukai', icon: <Heart className="w-4 h-4" /> },
    { id: 'settings', label: 'Pengaturan', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container: 260px on desktop */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[260px] bg-[#09090b] border-r border-white/10 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Brand */}
        <div className="flex flex-col">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                setActiveTab('home');
                setIsOpenMobile(false);
              }}
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-amber-500/40 shadow-lg shadow-amber-500/20 group-hover:scale-105 group-hover:border-amber-400 transition-all bg-zinc-950 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Laguna Musik Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5 font-mono">
                  LAGUNA MUSIK
                </h1>
                <p className="text-[11px] font-medium tracking-widest text-amber-400/80 uppercase">
                  AI MUSIC CREATOR
                </p>
                <p className="text-[9px] font-medium tracking-widest text-zinc-500 uppercase mt-0.5">
                  By Nurul Falah
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Menu Utama
            </p>
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpenMobile(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-sm shadow-amber-400/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={active ? 'text-amber-400' : 'text-zinc-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        active
                          ? 'bg-amber-400/30 text-amber-200'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status & Credit Balance */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/60 space-y-2.5">
          {onProviderChange && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-0.5 text-[10px] text-zinc-400 font-medium">
                <span>Pilih Engine Provider</span>
                <span className="font-mono text-amber-400 font-semibold">{providerName}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900/90 rounded-xl border border-white/10">
                {(
                  [
                    { id: 'apiframe', label: 'Apiframe', badge: providerStats?.apiframe?.totalCredits !== undefined ? `${providerStats.apiframe.totalCredits} cr` : undefined },
                    { id: 'kie.ai', label: 'Kie.ai', badge: providerStats?.['kie.ai']?.totalCredits !== undefined ? `${providerStats['kie.ai'].totalCredits} cr` : undefined },
                    { id: 'fal.ai', label: 'Fal.ai', badge: providerStats?.['fal.ai']?.totalCredits !== undefined ? `${providerStats['fal.ai'].totalCredits} cr` : undefined },
                    { id: 'sunor', label: 'Sunor', badge: providerStats?.sunor?.totalCredits !== undefined ? `${providerStats.sunor.totalCredits} cr` : undefined },
                  ] as const
                ).map((p) => {
                  const isActive = activeProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onProviderChange(p.id)}
                      className={`px-2 py-1.5 rounded-lg text-left transition-all flex flex-col ${
                        isActive
                          ? 'bg-amber-400/15 border border-amber-400/50 text-amber-300 shadow-sm shadow-amber-400/10'
                          : 'bg-black/20 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-semibold leading-none">{p.label}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-xs shadow-amber-400" />}
                      </div>
                      {p.badge && (
                        <span className={`text-[9px] font-mono mt-0.5 ${isActive ? 'text-amber-300/80 font-bold' : 'text-zinc-500'}`}>
                          {p.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Credit balance box */}
          <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Saldo {providerName}</span>
              </div>
              <button
                onClick={onRefreshCredit}
                disabled={isCheckingCredit}
                title="Perbarui saldo kredit"
                className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isCheckingCredit ? 'animate-spin text-amber-400' : ''}`}
                />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-amber-400">
                  {credits}
                </span>
                <span className="text-xs text-zinc-400 font-medium">Kredit</span>
                {keyCount > 1 && (
                  <span className="text-[10px] text-zinc-500 font-mono ml-0.5">
                    ({keyCount} key)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                {totalTracks} lagu dibuat
              </span>
            </div>

            {credits > 0 && (
              <div className="pt-1.5 border-t border-white/5 space-y-0.5">
                {hasEligibleKey ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Siap buat lagu (Key aktif: {maxSingleKeyCredit} cr)</span>
                  </div>
                ) : (
                  <div className="text-[10px] space-y-0.5">
                    <div className="text-amber-400 font-medium flex items-center gap-1">
                      <span>• Butuh min. {minCredit} cr dalam 1 key</span>
                    </div>
                    <div className="text-zinc-500 text-[9.5px]">
                      Maks. 1 key: <span className="text-zinc-300 font-mono">{maxSingleKeyCredit} cr</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {credits <= 0 && (
              <div className="pt-1.5 border-t border-white/5 text-[10px] text-rose-400 font-medium flex items-center gap-1">
                <span>• Saldo habis (0 cr) - Mesin Disconnected</span>
              </div>
            )}

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Status Mesin:</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isEngineConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span className={isEngineConnected ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                  {isEngineConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab('create');
              setIsOpenMobile(false);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs tracking-wide uppercase transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Studio Buat Lagu</span>
          </button>
        </div>
      </aside>
    </>
  );
}
