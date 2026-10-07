'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Mic,
  Copy,
  Check,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Radio,
  Sliders,
  FileText,
  Loader2,
} from 'lucide-react';
import { apiFetch, safeJson } from '@/lib/api';

interface CoverAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToForm: (data: {
    title: string;
    lyrics: string;
    style: string;
    mode: 'create' | 'remix';
  }) => void;
  initialTitle?: string;
  initialLyrics?: string;
  initialStyle?: string;
}

interface AdaptationResult {
  safeTitle: string;
  adaptedLyrics: string;
  safeStylePrompt: string;
  vocalDescription: string;
  arrangementTips: string[];
  explanation: string;
}

const GENRE_PRESETS = [
  'Indonesian Acoustic Pop, fingerstyle guitar & piano',
  'Dangdut Koplo Modern, kendang rampak & upbeat bass',
  'Chill Lo-Fi Hip Hop, warm rhodes & vinyl crackle',
  'Reggae Nusantara, skank guitar, warm melodic brass',
  'Melancholic Indie Folk, cello & acoustic strumming',
  'Midnight Jazz Lounge, upright bass & muted trumpet',
  'Epic Cinematic Orchestral, soaring strings & brass',
  '80s Retro Synthwave, neon analog synth & punchy drums',
  'Modern Campursari Etnik, gamelan pelog & suling',
  'Modern Alt Rock, overdriven guitars & powerful drums',
];

export const CoverAssistantModal: React.FC<CoverAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyToForm,
  initialTitle = '',
  initialLyrics = '',
  initialStyle = '',
}) => {
  const [activeTab, setActiveTab] = useState<'adaptor' | 'guide' | 'dsp'>('adaptor');
  const [songTitle, setSongTitle] = useState(initialTitle);
  const [originalLyrics, setOriginalLyrics] = useState(initialLyrics);
  const [targetGenre, setTargetGenre] = useState(initialStyle || GENRE_PRESETS[0]);
  const [creativeLevel, setCreativeLevel] = useState<'faithful' | 'creative' | 'parody'>('faithful');
  const [targetMood, setTargetMood] = useState('Emosional & Hangat');
  const [vocalGender, setVocalGender] = useState('Any');
  const [isLoading, setIsLoading] = useState(false);
  const [adaptationResult, setAdaptationResult] = useState<AdaptationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAdaptCover = async () => {
    if (!songTitle.trim() && !originalLyrics.trim()) {
      setErrorMessage('Harap masukkan judul lagu atau lirik asli yang ingin diaransemen cover.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await apiFetch('/api/cover/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songTitle: songTitle.trim(),
          originalLyrics: originalLyrics.trim(),
          targetGenre: targetGenre.trim(),
          targetMood: targetMood.trim(),
          vocalGender,
          creativeLevel,
        }),
      });
      const data = await safeJson<{ success?: boolean; data?: AdaptationResult; message?: string }>(res);
      if (res.ok && data.success && data.data) {
        setAdaptationResult(data.data);
      } else {
        throw new Error(data.message || 'Gagal mengadaptasi lagu.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses cover');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!adaptationResult) return;
    onApplyToForm({
      title: adaptationResult.safeTitle,
      lyrics: adaptationResult.adaptedLyrics,
      style: adaptationResult.safeStylePrompt,
      mode: 'create',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Solusi Aransemen & Cover Lagu Berhak Cipta
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  Anti-Block AI
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Panduan resmi & asisten pintar adaptasi lirik, progresi musik, dan bypass filter hak cipta AI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-zinc-900/60 border-b border-white/5 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('adaptor')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'adaptor'
                ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Cover Adaptor (1-Klik)</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>3 Teknik Rahasia Cover Lagu</span>
          </button>
          <button
            onClick={() => setActiveTab('dsp')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dsp'
                ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Studio Audio DSP (Edit BPM & Pitch)</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'adaptor' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 font-semibold block mb-0.5">
                    Kenapa lagu berhak cipta diblokir oleh AI?
                  </strong>
                  Sistem AI mendeteksi nama artis dan lirik kata demi kata yang ada di database hak cipta. Asisten ini secara cerdas mengganti kata-kata pemicu dengan sinonim berima sama (rhyme meter matching), sehingga melodi cover tetap sama namun 100% lolos filter!
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Judul Lagu Asli
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Separuh Aku, Kemesraan, Hati-Hati di Jalan"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-300">
                        Lirik Asli Lagu yang Ingin di-Cover
                      </label>
                      <span className="text-[10px] text-zinc-500">Ketik / Tempel lirik</span>
                    </div>
                    <textarea
                      rows={5}
                      placeholder="Tempel lirik lagu asli di sini..."
                      value={originalLyrics}
                      onChange={(e) => setOriginalLyrics(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Target Genre Aransemen Baru
                    </label>
                    <div className="space-y-2">
                      <select
                        value={targetGenre}
                        onChange={(e) => setTargetGenre(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                      >
                        {GENRE_PRESETS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Atau ketik genre custom..."
                        value={targetGenre}
                        onChange={(e) => setTargetGenre(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5 text-[11px] text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Tingkat Adaptasi
                      </label>
                      <select
                        value={creativeLevel}
                        onChange={(e) => setCreativeLevel(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                      >
                        <option value="faithful">Setia Nada & Rima (Rekomendasi)</option>
                        <option value="creative">Aransemen Kreatif Baru</option>
                        <option value="parody">Parodi / Twist Lirik</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Karakter Vokal
                      </label>
                      <select
                        value={vocalGender}
                        onChange={(e) => setVocalGender(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                      >
                        <option value="Any">Bebas / Auto</option>
                        <option value="Male">Vokal Pria (Male)</option>
                        <option value="Female">Vokal Wanita (Female)</option>
                        <option value="Duet">Duet Pria & Wanita</option>
                      </select>
                    </div>
                  </div>
                  {errorMessage && (
                    <p className="text-xs text-rose-400 font-medium bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                      {errorMessage}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleAdaptCover}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengadaptasi Lirik & Harmoni Bebas Hak Cipta...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Adaptasikan Cover (Anti-Blokir AI)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-4">
                  {adaptationResult ? (
                    <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/30 space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Hasil Adaptasi Lolos Hak Cipta</span>
                        </div>
                        <button
                          onClick={handleApply}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 text-zinc-950 font-bold text-[11px] hover:bg-amber-300 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <span>Gunakan di Form</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase">
                            Judul Aman
                          </span>
                          <button
                            onClick={() => handleCopy(adaptationResult.safeTitle, 'title')}
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {copiedField === 'title' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>Salin</span>
                          </button>
                        </div>
                        <p className="text-xs font-bold text-white bg-zinc-950 p-2 rounded-lg border border-white/5">
                          {adaptationResult.safeTitle}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase">
                            Prompt Gaya & Aransemen
                          </span>
                          <button
                            onClick={() => handleCopy(adaptationResult.safeStylePrompt, 'style')}
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {copiedField === 'style' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>Salin</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-300 bg-zinc-950 p-2 rounded-lg border border-white/5 font-mono">
                          {adaptationResult.safeStylePrompt}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase">
                            Lirik Adaptasi (Ritme & Rima Selaras)
                          </span>
                          <button
                            onClick={() => handleCopy(adaptationResult.adaptedLyrics, 'lyrics')}
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {copiedField === 'lyrics' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>Salin Lirik</span>
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto bg-zinc-950 p-2.5 rounded-lg border border-white/5 font-mono text-[11px] text-zinc-300 whitespace-pre-line leading-relaxed">
                          {adaptationResult.adaptedLyrics}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[280px] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                      <FileText className="w-10 h-10 mb-2 opacity-40" />
                      <p className="text-xs font-semibold text-zinc-400 mb-1">
                        Belum Ada Hasil Adaptasi
                      </p>
                      <p className="text-[11px] text-zinc-500 max-w-xs">
                        Isi judul dan lirik lagu asli di sebelah kiri, lalu klik tombol kuning untuk mengenerate versi bebas hak cipta.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Mic className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    1. Unggah Audio Acapella / Petikan Gitar Sendiri
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Rekam suara Anda sendiri menyanyikan nada lagu tersebut (acapella polos atau petikan gitar), lalu unggah di menu <strong>Remix Audio</strong>.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    2. Deskripsikan Harmoni & Instrumen (Bukan Nama Artis)
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Filter AI memblokir nama artis ternama. Gunakan deskripsi musikal teknis seperti tempo BPM, instrumen, dan mood.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    3. Gunakan AI Lyric Paraphraser
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Gunakan tab <strong>AI Cover Adaptor</strong> di modal ini untuk mengganti kata kunci dengan sinonim rima yang presisi.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dsp' && (
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Aransemen Ulang Instan via Studio DSP Editor
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Ubah tempo ketukan lagu, nada dasar (pitch), dan karakter timbre suara vokal langsung dari browser.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>LAGUNA MUSIK - Smart Copyright Adaptor Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoverAssistantModal;
