'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Search,
  Play,
  Pause,
  Download,
  ThumbsUp,
  Edit2,
  Image as ImageIcon,
  Sliders,
  RotateCcw,
  Trash2,
  Check,
  X,
  Plus,
  Music,
  Disc3,
  Loader2,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { apiFetch } from '@/lib/api';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface StudioLibraryColumnProps {
  tracks: MusicTrack[];
  selectedTrack: MusicTrack | null;
  onSelectTrack: (track: MusicTrack) => void;
  onRefreshTracks: () => void;
  onRegenerate: (track: MusicTrack) => void;
  onCoverToRemix: (track: MusicTrack) => void;
  onOpenCoverGen?: (track: MusicTrack) => void;
  onOpenMastering: (track: MusicTrack) => void;
  onOpenExtend?: (track: MusicTrack) => void;
  onOpenEdit?: (track: MusicTrack) => void;
  className?: string;
}

function formatTimeAgo(dateStr: string): string {
  try {
    const now = Date.now();
    const past = new Date(dateStr).getTime();
    const diffMs = now - past;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Baru saja';
  }
}

function formatDuration(secs: number): string {
  if (isNaN(secs) || secs < 0) return '3:00';
  const mins = Math.floor(secs / 60);
  const remainder = Math.floor(secs % 60);
  return `${mins}:${remainder.toString().padStart(2, '0')}`;
}

export default function StudioLibraryColumn({
  tracks,
  selectedTrack,
  onSelectTrack,
  onRefreshTracks,
  onRegenerate,
  onCoverToRemix,
  onOpenMastering,
  onOpenEdit,
  className = '',
}: StudioLibraryColumnProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, downloadTrack } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Semua' | 'Disukai' | 'Unduh'>('Semua');
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<MusicTrack | null>(null);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);

  const [workspaces, setWorkspaces] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('laguna_workspaces');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return ['My Workspace', 'Remix & Covers'];
  });
  const [activeWorkspace, setActiveWorkspace] = useState('My Workspace');
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const handleSaveWorkspace = () => {
    const trimmed = newWorkspaceName.trim();
    if (trimmed) {
      if (!workspaces.includes(trimmed)) {
        const updated = [...workspaces, trimmed];
        setWorkspaces(updated);
        try {
          localStorage.setItem('laguna_workspaces', JSON.stringify(updated));
        } catch {}
      }
      setActiveWorkspace(trimmed);
      setNewWorkspaceName('');
      setIsAddingWorkspace(false);
    }
  };

  const filteredTracks = tracks.filter((t) => {
    if (activeTab === 'Disukai' && !t.is_favorite) return false;
    if (activeTab === 'Unduh' && (t.download_count || 0) <= 0) return false;

    if (activeWorkspace === 'Remix & Covers') {
      const isRemixOrCover = Boolean(
        t.is_remix ||
        t.model?.toLowerCase().includes('remix') ||
        t.style?.toLowerCase().includes('remix') ||
        t.prompt?.toLowerCase().includes('remix') ||
        t.title?.toLowerCase().includes('remix') ||
        t.title?.toLowerCase().includes('cover') ||
        t.tags?.some((tag) => tag.toLowerCase().includes('remix') || tag.toLowerCase().includes('cover'))
      );
      if (!isRemixOrCover) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.style.toLowerCase().includes(q) ||
      (t.lyrics && t.lyrics.toLowerCase().includes(q)) ||
      t.model.toLowerCase().includes(q) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const handleToggleFavorite = async (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/tracks/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !track.is_favorite }),
      });
      onRefreshTracks();
    } catch {}
  };

  const handleStartRename = (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrackId(track.id);
    setEditTitleValue(track.title);
  };

  const handleSaveRename = async (trackId: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (!editTitleValue.trim()) {
      setEditingTrackId(null);
      return;
    }
    try {
      await apiFetch(`/api/tracks/${trackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitleValue.trim() }),
      });
      setEditingTrackId(null);
      onRefreshTracks();
    } catch {
      setEditingTrackId(null);
    }
  };

  const executeDeleteTrack = async (track: MusicTrack) => {
    try {
      setIsDeletingId(track.id);
      await apiFetch(`/api/tracks/${track.id}`, { method: 'DELETE' });
      setIsDeletingId(null);
      setTrackToDelete(null);
      onRefreshTracks();
    } catch {
      setIsDeletingId(null);
      setTrackToDelete(null);
      onRefreshTracks();
    }
  };

  const executeClearAll = async () => {
    try {
      setIsClearingAll(true);
      await apiFetch('/api/tracks', { method: 'DELETE' });
      setIsClearingAll(false);
      setShowConfirmClearAll(false);
      onRefreshTracks();
    } catch {
      setIsClearingAll(false);
      setShowConfirmClearAll(false);
      onRefreshTracks();
    }
  };

  return (
    <div
      id="studio-library-column"
      className={`flex flex-col bg-zinc-950/90 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase block">
            WORKSPACES
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mt-1">
            Library
          </h2>
        </div>
        {tracks.length > 0 && (
          <button
            type="button"
            onClick={() => setShowConfirmClearAll(true)}
            disabled={isClearingAll}
            className="px-3 py-1 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isClearingAll ? 'Menghapus...' : 'Hapus semua'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-none pb-1">
        {workspaces.map((ws) => (
          <button
            key={ws}
            type="button"
            onClick={() => setActiveWorkspace(ws)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeWorkspace === ws
                ? 'bg-zinc-800 text-white border border-amber-500/40 shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-white/5'
            }`}
          >
            {ws}
          </button>
        ))}
        {isAddingWorkspace ? (
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-amber-400/60 rounded-xl">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Nama workspace..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveWorkspace();
                if (e.key === 'Escape') setIsAddingWorkspace(false);
              }}
              autoFocus
              className="w-28 px-2 py-0.5 bg-transparent text-xs text-white placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveWorkspace}
              className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingWorkspace(false);
                setNewWorkspaceName('');
              }}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingWorkspace(true)}
            className="px-2.5 py-1 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 flex items-center gap-1 transition-all whitespace-nowrap active:scale-95 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Tambah</span>
          </button>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari judul atau gaya..."
          className="w-full pl-10 pr-10 py-2 bg-zinc-900/90 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 text-xs transition-colors"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono font-bold text-zinc-400 border border-white/5">
          {filteredTracks.length}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {(['Semua', 'Disukai', 'Unduh'] as const).map((tab) => {
          const label = tab === 'Unduh' ? 'Unduh beberapa' : tab;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-white/5'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[640px] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {filteredTracks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-white/5 space-y-2">
            <Music className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs font-bold text-zinc-400">
              {activeWorkspace === 'Remix & Covers'
                ? 'Belum ada trek Remix & Cover'
                : 'Belum ada trek musik'}
            </p>
          </div>
        ) : (
          filteredTracks.map((track) => {
            const isSelected = selectedTrack?.id === track.id;
            const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
            const shortHash = (track.audio_id || track.task_id || track.id).slice(0, 8);
            return (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track)}
                className={`group relative rounded-2xl p-3 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900/95 border-amber-400/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40'
                    : 'bg-zinc-900/60 border-white/10 hover:border-amber-400/40 hover:bg-zinc-900/90'
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-amber-500/20 shadow-md">
                      <Image
                        src={
                          track.cover_url ||
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                        }
                        alt={track.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(track, e)}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${
                        track.is_favorite
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title={track.is_favorite ? 'Hapus dari disukai' : 'Sukai lagu ini'}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${track.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      {editingTrackId === track.id ? (
                        <div
                          className="flex items-center gap-1 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(track.id);
                              if (e.key === 'Escape') setEditingTrackId(null);
                            }}
                            autoFocus
                            className="w-full px-2 py-0.5 bg-zinc-950 border border-amber-400 rounded-lg text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveRename(track.id, e)}
                            className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTrackId(null);
                            }}
                            className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 w-full min-w-0">
                          <h4 className="text-sm font-bold text-white truncate tracking-tight">
                            {track.title}
                          </h4>
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(track, e)}
                            className="text-zinc-500 hover:text-amber-400 p-0.5 transition-colors shrink-0 cursor-pointer"
                            title="Ubah judul lagu"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 mb-2 font-mono">
                      {formatTimeAgo(track.created_at)} • {formatDuration(track.duration)}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        SUCCESS
                      </span>
                      {track.is_remix && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Disc3 className="w-2.5 h-2.5 text-amber-400" />
                          REMIX
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        LOKAL
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {track.instrumental ? 'INSTRUMEN' : 'VOKAL'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono text-zinc-400 bg-zinc-800/80 border border-white/5">
                        {shortHash}...
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 sm:gap-1.5 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentTrack?.id === track.id) {
                            togglePlay();
                          } else {
                            playTrack(track);
                          }
                        }}
                        className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isCurrentPlaying
                            ? 'bg-amber-500 text-black shadow-sm'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                        }`}
                        title={isCurrentPlaying ? 'Jeda pemutaran' : 'Putar lagu'}
                      >
                        {isCurrentPlaying ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Jeda</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Putar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadTrack(track);
                        }}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 hover:text-white border border-white/10 transition-all cursor-pointer"
                        title="Unduh file audio musik"
                      >
                        <Download className="w-3 h-3" />
                        <span>Unduh</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCoverToRemix(track);
                        }}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-xs font-semibold text-amber-300 bg-zinc-800/90 hover:bg-amber-500/20 hover:border-amber-400/40 border border-white/10 transition-all active:scale-95 shadow-sm cursor-pointer"
                        title="Cover Lagu: Muat otomatis audio, judul, lirik, dan gaya musik ini ke fitur Remix Audio"
                      >
                        <ImageIcon className="w-3 h-3 text-amber-400" />
                        <span>Cover</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenEdit) onOpenEdit(track);
                        }}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-xs font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-400/50 transition-all active:scale-95 shadow-sm cursor-pointer"
                        title="Edit Audio: Ubah kecepatan/tempo lagu dan karakter suara vokal"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMastering(track);
                        }}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 hover:text-white border border-white/10 transition-all cursor-pointer"
                        title="Buka Studio Mastering EQ"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Master</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRegenerate(track);
                        }}
                        className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
                        title="Ulangi aransemen lagu di studio"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Ulang</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTrackToDelete(track);
                        }}
                        disabled={isDeletingId === track.id}
                        className="col-span-2 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                        title="Hapus lagu ini dari Library"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {trackToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hapus Lagu?</h3>
                <p className="text-xs text-zinc-400">Lagu akan dihapus permanen dari Library Anda.</p>
              </div>
            </div>
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg overflow-hidden relative bg-zinc-800 shrink-0">
                {trackToDelete.cover_url ? (
                  <Image
                    src={trackToDelete.cover_url}
                    alt={trackToDelete.title}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <Music className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{trackToDelete.title}</p>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {formatDuration(trackToDelete.duration)} • {trackToDelete.style || 'Pop'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTrackToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingId === trackToDelete.id}
                onClick={() => executeDeleteTrack(trackToDelete)}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingId === trackToDelete.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hapus Semua Lagu?</h3>
                <p className="text-xs text-zinc-400">Perhatian: Tindakan ini permanen</p>
              </div>
            </div>
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-rose-500/20">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Anda akan menghapus seluruh <span className="text-rose-400 font-bold">{tracks.length} lagu</span> dari database Library Anda.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearAll(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={executeClearAll}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isClearingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Semua</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
