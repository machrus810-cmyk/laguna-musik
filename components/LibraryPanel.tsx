'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Search,
  Play,
  Pause,
  Download,
  Heart,
  Edit2,
  Image as ImageIcon,
  Sliders,
  PlusCircle,
  Video,
  Trash2,
  Check,
  X,
  Music,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { apiFetch } from '@/lib/api';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface LibraryPanelProps {
  tracks: MusicTrack[];
  onSelectTrack: (track: MusicTrack) => void;
  onRefreshTracks: () => void;
  onOpenExtend: (track: MusicTrack) => void;
  onOpenCoverGen: (track: MusicTrack) => void;
  onOpenMastering: (track: MusicTrack) => void;
  onOpenMusicVideo: (track: MusicTrack) => void;
  onRegenerate: (track: MusicTrack) => void;
  onOpenEdit?: (track: MusicTrack) => void;
  activeFilter?: string;
}

export default function LibraryPanel({
  tracks,
  onSelectTrack,
  onRefreshTracks,
  onOpenExtend,
  onOpenCoverGen,
  onOpenMastering,
  onOpenMusicVideo,
  onRegenerate,
  onOpenEdit,
  activeFilter = 'Semua',
}: LibraryPanelProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, downloadTrack } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(activeFilter);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const filteredTracks = tracks.filter((t) => {
    if (filter === 'Disukai' && !t.is_favorite) return false;
    if (filter === 'Unduh' && (t.download_count || 0) <= 0) return false;
    if (filter === 'Remix & Cover') {
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
    if (filter === 'Gagal') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.style.toLowerCase().includes(q) ||
      t.model.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
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
    } catch {
      // ignore
    }
  };

  const handleStartRename = (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrackId(track.id);
    setNewTitle(track.title);
  };

  const handleSaveRename = async (trackId: string) => {
    if (!newTitle.trim()) return;
    try {
      await apiFetch(`/api/tracks/${trackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setEditingTrackId(null);
      onRefreshTracks();
    } catch {
      // ignore
    }
  };

  const handleDeleteTrack = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus lagu ini dari Library?')) return;
    try {
      setIsDeletingId(trackId);
      await apiFetch(`/api/tracks/${trackId}`, { method: 'DELETE' });
      setIsDeletingId(null);
      onRefreshTracks();
    } catch {
      setIsDeletingId(null);
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-28">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>MUSIC PRODUCTION LIBRARY</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              {filteredTracks.length} Trek
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Koleksi karya musik AI berkualitas studio, siap mastering, ekspor video, dan perpanjangan lagu.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul lagu, gaya musik, instrumen, atau status..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 text-xs"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['Semua', 'Disukai', 'Remix & Cover', 'Berhasil', 'Gagal', 'Unduh'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-amber-400 text-black font-bold shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filteredTracks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-white/5 space-y-3">
          <Music className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-zinc-300">Tidak ada lagu yang ditemukan</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau buka Studio Buat Lagu untuk mengomposisi karya baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id;
            const isThisPlaying = isCurrent && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track)}
                className={`group relative rounded-2xl bg-zinc-900/90 border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xl cursor-pointer ${
                  isCurrent
                    ? 'border-amber-400/70 shadow-amber-500/10 ring-1 ring-amber-400/40'
                    : 'border-white/10 hover:border-amber-400/40 hover:shadow-2xl hover:-translate-y-0.5'
                }`}
              >
                <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden">
                  <Image
                    src={track.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                    alt={track.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/80 text-black shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      BERHASIL
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleToggleFavorite(track, e)}
                        className={`p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                          track.is_favorite
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                            : 'bg-black/50 text-zinc-300 hover:text-white hover:bg-black/80'
                        }`}
                        title={track.is_favorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadTrack(track);
                        }}
                        className="p-2 rounded-full bg-black/50 text-zinc-300 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all cursor-pointer"
                        title="Unduh MP3"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrent) {
                          togglePlay();
                        } else {
                          playTrack(track);
                        }
                      }}
                      className={`pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                        isThisPlaying
                          ? 'bg-amber-400 text-black scale-100'
                          : 'bg-black/70 text-white border border-white/20 hover:scale-110 hover:bg-amber-400 hover:text-black opacity-90 group-hover:opacity-100'
                      }`}
                      title={isThisPlaying ? 'Jeda' : 'Putar lagu'}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 fill-current ml-1" />
                      )}
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-zinc-300 font-mono">
                    <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{formatDuration(track.duration)}</span>
                    </span>
                    <span className="bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm text-amber-300">
                      {track.model}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    {editingTrackId === track.id ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="flex-1 px-2 py-1 bg-zinc-950 border border-amber-400 rounded text-xs text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(track.id)}
                          className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingTrackId(null)}
                          className="p-1 text-zinc-400 hover:bg-zinc-800 rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                          {track.title}
                        </h4>
                        <button
                          onClick={(e) => handleStartRename(track, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-amber-400 transition-opacity cursor-pointer"
                          title="Ubah judul"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-amber-400/90 font-medium mt-0.5 truncate">
                      {track.style}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {track.is_remix && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 flex items-center gap-1">
                        Remix Cover
                      </span>
                    )}
                    {track.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-400 border border-white/5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div
                    className="pt-3 border-t border-white/5 grid grid-cols-6 gap-1 text-zinc-400 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onOpenCoverGen(track)}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-zinc-800 hover:text-amber-300 flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                      title="Generate Cover Album (1:1)"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[9px]">Cover</span>
                    </button>
                    <button
                      onClick={() => onOpenEdit && onOpenEdit(track)}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-cyan-950/60 text-cyan-300 hover:text-cyan-200 flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                      title="Edit Audio: Ubah kecepatan/tempo dan karakter suara vokal"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[9px]">Edit</span>
                    </button>
                    <button
                      onClick={() => onOpenMastering(track)}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-zinc-800 hover:text-amber-300 flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                      title="Audio Mastering Rack"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[9px]">Master</span>
                    </button>
                    <button
                      onClick={() => onOpenExtend(track)}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-zinc-800 hover:text-amber-300 flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                      title="Perpanjang Lagu (Extend)"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[9px]">Extend</span>
                    </button>
                    <button
                      onClick={() => onOpenMusicVideo(track)}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-zinc-800 hover:text-amber-300 flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                      title="Buat Video Visualizer Musik"
                    >
                      <Video className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[9px]">Video</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteTrack(track.id, e)}
                      disabled={isDeletingId === track.id}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-rose-950/40 hover:text-rose-400 flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                      title="Hapus lagu dari perpustakaan"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-rose-400" />
                      <span className="text-[9px]">Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
