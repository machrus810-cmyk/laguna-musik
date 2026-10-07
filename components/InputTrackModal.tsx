'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { MusicTrack } from '@/database/db';
import { apiFetch } from '@/lib/api';

interface InputTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackSaved: (track: MusicTrack) => void;
  workspaces?: string[];
  activeWorkspace?: string;
}

const STYLE_SUGGESTIONS = [
  'Pop Indonesia',
  'Dangdut Koplo',
  'Akustik Santai',
  'Rock Melayu',
  'R&B Soul',
  'EDM Jedag Jedug',
  'Campursari',
  'Balada Akustik',
  'Lofi Chill',
];

export default function InputTrackModal({
  isOpen,
  onClose,
  onTrackSaved,
  workspaces = ['My Workspace', 'Remix & Covers'],
  activeWorkspace = 'My Workspace',
}: InputTrackModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('Pop Indonesia');
  const [vocalType, setVocalType] = useState<'Male' | 'Female' | 'Instrumental'>('Female');
  const [targetWorkspace, setTargetWorkspace] = useState(activeWorkspace || 'My Workspace');
  const [lyrics, setLyrics] = useState('');
  const [localAudioUrl, setLocalAudioUrl] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Ukuran berkas audio terlalu besar (maksimal 50MB).');
      return;
    }
    setErrorMessage('');
    setSelectedFile(file);

    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const formattedTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    setTitle(formattedTitle);

    const objectUrl = URL.createObjectURL(file);
    setLocalAudioUrl(objectUrl);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlayAudio = () => {
    if (!audioRef.current || !localAudioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Harap masukkan judul lagu.');
      return;
    }
    if (!selectedFile && !localAudioUrl) {
      setErrorMessage('Harap pilih berkas audio lagu terlebih dahulu.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('Mengunggah & memproses audio...');

    try {
      let finalAudioUrl = localAudioUrl;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await apiFetch('/api/audio/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && (uploadData.fullUrl || uploadData.url)) {
          finalAudioUrl = uploadData.fullUrl || uploadData.url;
        }
      }

      setSuccessMessage('Menyimpan lagu ke Workspace Library...');
      const isInstrumental = vocalType === 'Instrumental';
      const saveRes = await apiFetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          audio_url: finalAudioUrl,
          stream_audio_url: finalAudioUrl,
          duration: audioDuration > 0 ? Math.round(audioDuration) : 180,
          lyrics: lyrics.trim(),
          style: style.trim() || 'Pop Indonesia',
          vocal_gender: isInstrumental ? 'Any' : vocalType,
          instrumental: isInstrumental,
          workspace: targetWorkspace || 'My Workspace',
          model: 'Audio Input',
          tags: [style.trim() || 'Pop Indonesia', isInstrumental ? 'Instrumental' : `Vocal ${vocalType}`, 'Audio Input'].filter(Boolean),
        }),
      });

      const data = await saveRes.json();
      if (!saveRes.ok || !data.success || !data.track) {
        throw new Error(data.message || 'Gagal menyimpan lagu ke library');
      }

      setSuccessMessage('Lagu berhasil disimpan ke Workspace Library!');
      onTrackSaved(data.track);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat menyimpan';
      setErrorMessage(msg);
      setSuccessMessage('');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-400/10">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                INPUT & SIMPAN LAGU KE WORKSPACE
              </h3>
              <p className="text-[11px] text-zinc-400">
                Unggah file audio MP3/WAV milik Anda dan simpan langsung ke Workspace Library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {localAudioUrl && (
          <audio
            ref={audioRef}
            src={localAudioUrl}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              if (e.currentTarget.duration) setAudioDuration(e.currentTarget.duration);
            }}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
          />
        )}

        <form onSubmit={handleSaveTrack} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Berkas Audio Lagu (Wajib)
            </label>
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl bg-zinc-950/80 border-2 border-dashed border-amber-400/30 hover:border-amber-400/70 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-110 transition-transform">
                  <FileAudio className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-white mb-1">
                  Klik untuk Memilih File Audio atau Tarik ke Sini
                </p>
                <p className="text-[11px] text-zinc-500 max-w-sm">
                  Mendukung MP3, WAV, M4A, FLAC, OGG (Maks. 50MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-400/30 flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="w-10 h-10 rounded-full bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-md shadow-amber-400/20 shrink-0 transition-transform active:scale-95 cursor-pointer"
                    title={isPlaying ? 'Jeda' : 'Putar Audio'}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                      <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <span className="font-mono text-amber-400">
                        {formatTime(currentTime)} / {formatTime(audioDuration)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white border border-white/10 shrink-0 cursor-pointer"
                >
                  Ganti File
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Judul Lagu <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Kemesraan Cinta, Melodi Senja, dsb."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Gaya Musik / Genre
            </label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Contoh: Pop Indonesia, Dangdut, Akustik..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 text-xs mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {STYLE_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                    style === s
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Karakter Suara
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-950 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setVocalType('Female')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    vocalType === 'Female' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Vokal Cewek
                </button>
                <button
                  type="button"
                  onClick={() => setVocalType('Male')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    vocalType === 'Male' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Vokal Cowok
                </button>
                <button
                  type="button"
                  onClick={() => setVocalType('Instrumental')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    vocalType === 'Instrumental' ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Instrumen
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Workspace Tujuan
              </label>
              <select
                value={targetWorkspace}
                onChange={(e) => setTargetWorkspace(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/60 cursor-pointer"
              >
                {workspaces.map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Lirik Lagu <span className="text-zinc-500 font-normal">(Opsional)</span>
            </label>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Ketik atau tempel lirik lagu di sini untuk melihat teks lirik saat diputar..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 text-xs resize-none"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || !selectedFile}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Simpan ke Workspace Library</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
