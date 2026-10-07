'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Sparkles, Music, SlidersHorizontal, Plus } from 'lucide-react';
import { AudioPlayerProvider, useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { MusicTrack, MusicProvider } from '@/database/db';
import { apiFetch, safeJson } from '@/lib/api';

import Sidebar, { NavTab } from '@/components/Sidebar';
import PersistentMusicPlayer from '@/components/PersistentMusicPlayer';
import HomeOverview from '@/components/HomeOverview';
import StudioForm from '@/components/StudioForm';
import StudioLibraryColumn from '@/components/StudioLibraryColumn';
import StudioLyricsColumn from '@/components/StudioLyricsColumn';
import MasteringView from '@/components/MasteringView';
import LibraryPanel from '@/components/LibraryPanel';
import SettingsView from '@/components/SettingsView';

// Modals
import AutoLyricsModal from '@/components/AutoLyricsModal';
import CoverGeneratorModal from '@/components/CoverGeneratorModal';
import CoverAssistantModal from '@/components/CoverAssistantModal';
import ExtendMusicModal from '@/components/ExtendMusicModal';
import MusicVideoModal from '@/components/MusicVideoModal';
import TrackDetailModal from '@/components/TrackDetailModal';
import InputTrackModal from '@/components/InputTrackModal';
import EditTrackModal from '@/components/EditTrackModal';
import AudioTempoEditorModal from '@/components/AudioTempoEditorModal';
import EditMusicModal from '@/components/EditMusicModal';

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);

  const [credits, setCredits] = useState(0);
  const [activeProvider, setActiveProvider] = useState<MusicProvider>('kie.ai');
  const [isCheckingCredit, setIsCheckingCredit] = useState(false);
  const [keyCount, setKeyCount] = useState(0);
  const [maxSingleKeyCredit, setMaxSingleKeyCredit] = useState(0);
  const [hasEligibleKey, setHasEligibleKey] = useState(false);
  const [providerStats, setProviderStats] = useState<Record<MusicProvider, { keyCount: number; totalCredits: number; activeKeyCount: number }>>({
    'kie.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
    'fal.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
    sunor: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
    apiframe: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
  });

  // Prefilled fields for Create Studio
  const [prefilledLyrics, setPrefilledLyrics] = useState('');
  const [prefilledStyle, setPrefilledStyle] = useState('');
  const [prefilledTitle, setPrefilledTitle] = useState('');

  // Modals state
  const [isAutoLyricsOpen, setIsAutoLyricsOpen] = useState(false);
  const [isCoverGenOpen, setIsCoverGenOpen] = useState(false);
  const [targetTrackForCover, setTargetTrackForCover] = useState<MusicTrack | null>(null);

  const [isCoverAssistantOpen, setIsCoverAssistantOpen] = useState(false);

  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [targetTrackForExtend, setTargetTrackForExtend] = useState<MusicTrack | null>(null);

  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [targetTrackForVideo, setTargetTrackForVideo] = useState<MusicTrack | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInputTrackOpen, setIsInputTrackOpen] = useState(false);
  const [isEditTrackOpen, setIsEditTrackOpen] = useState(false);
  const [isTempoEditorOpen, setIsTempoEditorOpen] = useState(false);
  const [isEditMusicOpen, setIsEditMusicOpen] = useState(false);

  const { playTrack } = useAudioPlayer();

  // Fetch tracks
  const fetchTracks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/tracks');
      const data = await safeJson<{ success: boolean; tracks: MusicTrack[] }>(res);
      if (data && Array.isArray(data.tracks)) {
        setTracks(data.tracks);
        if (!selectedTrack && data.tracks.length > 0) {
          setSelectedTrack(data.tracks[0]);
        }
      }
    } catch {}
  }, [selectedTrack]);

  // Fetch credits & provider status
  const fetchCredits = useCallback(async () => {
    setIsCheckingCredit(true);
    try {
      const res = await apiFetch('/api/kie/key');
      const data = await safeJson<Record<string, any>>(res);
      if (data && data.success) {
        setCredits(data.totalCredits || 0);
        if (data.provider) setActiveProvider(data.provider);
        if (data.keyCount !== undefined) setKeyCount(data.keyCount);
        if (data.maxSingleKeyCredit !== undefined) setMaxSingleKeyCredit(data.maxSingleKeyCredit);
        if (data.hasEligibleKey !== undefined) setHasEligibleKey(data.hasEligibleKey);
        if (data.providerStats) setProviderStats(data.providerStats);
      }
    } catch {} finally {
      setIsCheckingCredit(false);
    }
  }, []);

  useEffect(() => {
    fetchTracks();
    fetchCredits();
  }, [fetchTracks, fetchCredits]);

  // Handlers
  const handleSelectTrack = (track: MusicTrack) => {
    setSelectedTrack(track);
  };

  const handleApplyLyricsToStudio = (lyrics: string, title?: string, style?: string) => {
    setPrefilledLyrics(lyrics);
    if (title) setPrefilledTitle(title);
    if (style) setPrefilledStyle(style);
    setActiveTab('create');
  };

  const handleOpenMasteringForTrack = (track: MusicTrack) => {
    setSelectedTrack(track);
    setActiveTab('mastering');
  };

  const handleOpenCoverGenForTrack = (track: MusicTrack) => {
    setTargetTrackForCover(track);
    setIsCoverGenOpen(true);
  };

  const handleOpenExtendForTrack = (track: MusicTrack) => {
    setTargetTrackForExtend(track);
    setIsExtendOpen(true);
  };

  const handleOpenVideoForTrack = (track: MusicTrack) => {
    setTargetTrackForVideo(track);
    setIsVideoOpen(true);
  };

  const handleOpenEditForTrack = (track: MusicTrack) => {
    setSelectedTrack(track);
    setIsEditTrackOpen(true);
  };

  const handleCoverToRemix = (track: MusicTrack) => {
    setPrefilledTitle(`${track.title} (Remix)`);
    setPrefilledStyle(track.style || 'Pop Modern Remix');
    setPrefilledLyrics(track.lyrics || '');
    setActiveTab('create');
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-zinc-100 overflow-hidden font-sans select-none">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        credits={credits}
        totalTracks={tracks.length}
        isConnected={credits > 0 || keyCount > 0}
        isCheckingCredit={isCheckingCredit}
        onRefreshCredit={fetchCredits}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        maxSingleKeyCredit={maxSingleKeyCredit}
        hasEligibleKey={hasEligibleKey}
        keyCount={keyCount}
        activeProvider={activeProvider}
        onProviderChange={(p) => {
          setActiveProvider(p);
          fetchCredits();
        }}
        providerStats={providerStats}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Mobile Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-950/80 border-b border-white/10 shrink-0 z-20 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsOpenMobile(true)}
            className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-black font-extrabold text-xs shadow-md shadow-amber-500/20">
              LM
            </div>
            <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-white via-zinc-200 to-amber-400 bg-clip-text text-transparent">
              LAGUNA MUSIK
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-white/10 text-xs font-semibold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{credits} Cr</span>
          </div>
        </header>

        {/* Tab View Routing */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative custom-scrollbar">
          {activeTab === 'home' && (
            <HomeOverview
              tracks={tracks}
              credits={credits}
              onNavigate={setActiveTab}
              onSelectTrack={(t) => {
                setSelectedTrack(t);
                playTrack(t);
              }}
              onOpenAutoLyrics={() => setIsAutoLyricsOpen(true)}
            />
          )}

          {activeTab === 'create' && (
            <div className="max-w-[1600px] mx-auto pb-28">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Creation Form Column */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                  <StudioForm
                    onMusicCreated={() => {
                      fetchTracks();
                      fetchCredits();
                    }}
                    onOpenAutoLyrics={() => setIsAutoLyricsOpen(true)}
                    lyricsInputValue={prefilledLyrics}
                    styleInputValue={prefilledStyle}
                    titleInputValue={prefilledTitle}
                    onClearPrefilled={() => {
                      setPrefilledLyrics('');
                      setPrefilledStyle('');
                      setPrefilledTitle('');
                    }}
                    activeProvider={activeProvider}
                    credits={credits}
                  />
                </div>

                {/* Studio Track Library Column */}
                <div className="lg:col-span-4 xl:col-span-4">
                  <StudioLibraryColumn
                    tracks={tracks}
                    selectedTrack={selectedTrack}
                    onSelectTrack={handleSelectTrack}
                    onRefreshTracks={fetchTracks}
                    onRegenerate={(track) => {
                      setPrefilledTitle(track.title);
                      setPrefilledStyle(track.style);
                      setPrefilledLyrics(track.lyrics);
                    }}
                    onCoverToRemix={handleCoverToRemix}
                    onOpenCoverGen={handleOpenCoverGenForTrack}
                    onOpenMastering={handleOpenMasteringForTrack}
                    onOpenExtend={handleOpenExtendForTrack}
                    onOpenEdit={handleOpenEditForTrack}
                  />
                </div>

                {/* Track Details & Lyrics Inspector Column */}
                <div className="lg:col-span-3 xl:col-span-4">
                  <StudioLyricsColumn
                    track={selectedTrack}
                    onApplyStyle={(s) => setPrefilledStyle(s)}
                    onApplyLyrics={(l) => setPrefilledLyrics(l)}
                    onOpenRemix={handleCoverToRemix}
                    onCoverToRemix={handleCoverToRemix}
                    onRefreshTracks={fetchTracks}
                    onRegenerate={(track) => {
                      setPrefilledTitle(track.title);
                      setPrefilledStyle(track.style);
                      setPrefilledLyrics(track.lyrics);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mastering' && (
            <MasteringView
              initialTrack={selectedTrack}
              onTrackSaved={() => fetchTracks()}
              tracks={tracks}
            />
          )}

          {activeTab === 'lyrics' && (
            <div className="max-w-4xl mx-auto space-y-6 pb-28">
              <div className="p-8 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Generator Lirik AI Maestro</h2>
                  <p className="text-sm text-zinc-400 max-w-md mx-auto mt-1">
                    Ciptakan lirik puitis dan berima harmonis dalam hitungan detik dengan model AI Gemini terbaru.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAutoLyricsOpen(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Buka Generator Lirik
                </button>
              </div>

              {/* Tips & Guidance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <h3 className="text-sm font-bold text-zinc-200">Format Tag Struktur Musik</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Gunakan penanda struktur standar seperti <code className="text-amber-400">[Verse 1]</code>, <code className="text-amber-400">[Chorus]</code>, <code className="text-amber-400">[Bridge]</code>, dan <code className="text-amber-400">[Outro]</code> agar penyanyi AI memahami dinamika lagu.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <h3 className="text-sm font-bold text-zinc-200">Multi-Bahasa & Romanisasi</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Dukung lirik bahasa Indonesia, Jawa, Sunda, Minang, Arab latin, Jepang romaji, dan Korea romanized dengan irama suku kata natural.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'library' && (
            <div className="max-w-6xl mx-auto space-y-6 pb-28">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="text-2xl font-bold text-white">Perpustakaan Audio</h2>
                  <p className="text-xs text-zinc-400">Semua trek hasil generasi studio dan upload mastering Anda</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInputTrackOpen(true)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-amber-400 flex items-center gap-2 transition-colors shadow-lg"
                >
                  <Plus className="w-4 h-4 text-amber-500" />
                  Input File Audio
                </button>
              </div>

              <LibraryPanel
                tracks={tracks}
                onSelectTrack={handleSelectTrack}
                onRefreshTracks={fetchTracks}
                onOpenExtend={handleOpenExtendForTrack}
                onOpenCoverGen={handleOpenCoverGenForTrack}
                onOpenMastering={handleOpenMasteringForTrack}
                onOpenMusicVideo={handleOpenVideoForTrack}
                onRegenerate={(track) => {
                  setPrefilledTitle(track.title);
                  setPrefilledStyle(track.style);
                  setPrefilledLyrics(track.lyrics);
                  setActiveTab('create');
                }}
                onOpenEdit={handleOpenEditForTrack}
              />
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="max-w-6xl mx-auto space-y-6 pb-28">
              <div className="pb-2">
                <h2 className="text-2xl font-bold text-white">Trek Favorit Saya</h2>
                <p className="text-xs text-zinc-400">Kumpulan trek musik yang telah Anda tandai dengan bintang/hati</p>
              </div>

              <LibraryPanel
                tracks={tracks}
                activeFilter="Disukai"
                onSelectTrack={handleSelectTrack}
                onRefreshTracks={fetchTracks}
                onOpenExtend={handleOpenExtendForTrack}
                onOpenCoverGen={handleOpenCoverGenForTrack}
                onOpenMastering={handleOpenMasteringForTrack}
                onOpenMusicVideo={handleOpenVideoForTrack}
                onRegenerate={(track) => {
                  setPrefilledTitle(track.title);
                  setPrefilledStyle(track.style);
                  setPrefilledLyrics(track.lyrics);
                  setActiveTab('create');
                }}
                onOpenEdit={handleOpenEditForTrack}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-5xl mx-auto space-y-6 pb-28">
              <SettingsView
                credits={credits}
                isConnected={credits > 0 || keyCount > 0}
                onRefreshCredit={fetchCredits}
                activeProvider={activeProvider}
                onProviderChange={(p) => {
                  setActiveProvider(p);
                  fetchCredits();
                }}
              />
            </div>
          )}
        </main>

        {/* Bottom Persistent Music Player */}
        <PersistentMusicPlayer
          onOpenTrackDetail={(track) => {
            setSelectedTrack(track);
            setIsDetailOpen(true);
          }}
          onOpenMastering={(track) => {
            setSelectedTrack(track);
            setActiveTab('mastering');
          }}
        />
      </div>

      {/* Global Modals */}
      <AutoLyricsModal
        isOpen={isAutoLyricsOpen}
        onClose={() => setIsAutoLyricsOpen(false)}
        onApplyLyrics={(lyrics, title, style) => {
          handleApplyLyricsToStudio(lyrics, title, style);
          setIsAutoLyricsOpen(false);
        }}
      />

      <CoverGeneratorModal
        isOpen={isCoverGenOpen}
        onClose={() => {
          setIsCoverGenOpen(false);
          setTargetTrackForCover(null);
        }}
        track={targetTrackForCover}
        onCoverUpdated={() => fetchTracks()}
      />

      <CoverAssistantModal
        isOpen={isCoverAssistantOpen}
        onClose={() => setIsCoverAssistantOpen(false)}
        onApplyToForm={(data) => {
          setPrefilledTitle(data.title);
          setPrefilledLyrics(data.lyrics);
          setPrefilledStyle(data.style);
          setActiveTab('create');
          setIsCoverAssistantOpen(false);
        }}
      />

      <ExtendMusicModal
        isOpen={isExtendOpen}
        onClose={() => {
          setIsExtendOpen(false);
          setTargetTrackForExtend(null);
        }}
        track={targetTrackForExtend}
        onExtendSubmitted={() => {
          fetchTracks();
          fetchCredits();
        }}
      />

      <MusicVideoModal
        isOpen={isVideoOpen}
        onClose={() => {
          setIsVideoOpen(false);
          setTargetTrackForVideo(null);
        }}
        track={targetTrackForVideo}
        onVideoCreated={() => fetchTracks()}
      />

      <TrackDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        track={selectedTrack}
        onOpenExtend={handleOpenExtendForTrack}
        onOpenCoverGen={handleOpenCoverGenForTrack}
        onOpenMastering={handleOpenMasteringForTrack}
        onOpenMusicVideo={handleOpenVideoForTrack}
        onOpenEdit={handleOpenEditForTrack}
      />

      <InputTrackModal
        isOpen={isInputTrackOpen}
        onClose={() => setIsInputTrackOpen(false)}
        onTrackSaved={() => fetchTracks()}
      />

      <EditTrackModal
        isOpen={isEditTrackOpen}
        onClose={() => setIsEditTrackOpen(false)}
        track={selectedTrack}
        onRefreshTracks={fetchTracks}
        onOpenMastering={handleOpenMasteringForTrack}
        onOpenRemix={handleCoverToRemix}
        onOpenTempoEditor={() => setIsTempoEditorOpen(true)}
      />

      <AudioTempoEditorModal
        isOpen={isTempoEditorOpen}
        onClose={() => setIsTempoEditorOpen(false)}
        track={selectedTrack}
        onSaveToWorkspace={() => fetchTracks()}
      />

      <EditMusicModal
        isOpen={isEditMusicOpen}
        onClose={() => setIsEditMusicOpen(false)}
        track={selectedTrack}
        onTrackUpdated={fetchTracks}
      />
    </div>
  );
}

export default function App() {
  return (
    <AudioPlayerProvider>
      <AppContent />
    </AudioPlayerProvider>
  );
}
