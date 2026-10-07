'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Music,
  ArrowRight,
  BookOpen,
  Layers,
  Heart,
  Smile,
  Globe,
  Sliders,
} from 'lucide-react';
import { GeneratedLyricsOutput } from '@/services/gemini';
import { apiFetch, safeJson } from '@/lib/api';

interface AutoLyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLyrics: (lyrics: string, title?: string, style?: string) => void;
}

export const GENRE_OPTIONS = [
  'Indonesian Pop',
  'Dangdut Koplo',
  'Dangdut Modern / Remix',
  'Dangdut Klasik / Melayu',
  'Pop Rock',
  'Slow Rock / Ballad',
  'Hard Rock / Metal',
  'Acoustic Ballad',
  'Campursari',
  'Keroncong Modern',
  'Jaipongan / Etnik Sunda',
  'Pop Minang',
  'Islamic Dzikir / Ratib / Wirid',
  'Dzikir & Doa Munajat',
  'Islamic Sholawat / Gambus',
  'Qasidah Modern',
  'Nasyid Acapella',
  'DJ Remix / Jedag Jedug',
  'Lo-Fi Chill Beats',
  'R&B Soul',
  'Hip-Hop / Rap',
  'EDM / Electro Pop',
  'Synthwave / 80s Retro',
  'Reggae / Ska',
  'Jazz / Bossa Nova',
  'Blues Rock',
  'K-Pop',
  'J-Pop / Anime Rock',
  'Folk / Indie Akustik',
  'Cinematic Orchestral',
  'Custom (Tentukan Sendiri)',
];

export const SUBGENRE_MAP: Record<string, string[]> = {
  'Indonesian Pop': [
    'Indie Pop Senja',
    'City Pop Indonesia',
    'Acoustic Pop',
    'Pop Melayu Lembut',
    'Synthpop Modern',
    'Ballad Nostalgia 2000-an',
    'Pop Folk Nusantara',
    'Pop Remaja Energik',
  ],
  'Dangdut Koplo': [
    'Koplo Ambyar',
    'Koplo Funkot / Breakbeat',
    'Koplo Jawa Kendang Kempul',
    'Koplo Jedag Jedug Bass Horeg',
    'Koplo Jaranan Etnik',
    'Dangdut Remix Viral TikTok',
  ],
  'Dangdut Modern / Remix': [
    'Dangdut Disco 90s',
    'Dangdut House Music',
    'Dangdut Pop Syahdu',
    'Electro Dangdut EDM',
    'Dangdut Trap Bass',
  ],
  'Dangdut Klasik / Melayu': [
    'Dangdut Original 80s/90s',
    'Melayu Deli Asli',
    'Dangdut Ratapan Sedih',
    'Ghazal Dangdut India',
    'Orkes Melayu Tradisional',
  ],
  'Pop Rock': [
    '90s Alternative Rock',
    'Indie Rock Mentah',
    'Pop Punk Energik',
    'Modern Rock Ballad',
    'Soft Rock Akustik',
    'Britpop Melodik',
  ],
  'Slow Rock / Ballad': [
    'Slow Rock Malaysia 90s',
    'Indonesian Rock Ballad 90s',
    'Power Ballad Distorsi',
    'Gothic Rock Slow',
    'Acoustic Rock Rindu',
  ],
  'Hard Rock / Metal': [
    'Heavy Metal Klasik',
    'Metalcore Modern',
    'Nu-Metal Rap Rock',
    'Thrash Metal Agresif',
    'Symphonic Gothic Metal',
  ],
  'Acoustic Ballad': [
    'Fingerstyle Guitar Solo',
    'Piano Ballad Minimalis',
    'Campfire Warm Acoustic',
    'Intimate Bedroom Acoustic',
    'String Quartet & Guitar',
  ],
  'Campursari': [
    'Campursari Klasik Manthous',
    'Campursari Langgam Jawa Alus',
    'Campursari Dangdut Koplo',
    'Campursari Modern Keyboard',
    'Gamelan Kontemporer',
  ],
  'Keroncong Modern': [
    'Keroncong Beat Pop',
    'Langgam Jawa Syahdu',
    'Keroncong Asli Tempo Dulu',
    'Keroncong Jazz Fusion',
  ],
  'Jaipongan / Etnik Sunda': [
    'Degung Sunda Syahdu',
    'Jaipong Rampak Kendang',
    'Bajidoran Asyik',
    'Pop Sunda Modern Kacapi',
    'Calung Banyolan',
  ],
  'Pop Minang': [
    'Pop Minang Modern',
    'Salawat Minang Ratok',
    'Gamadin Pesisir',
    'Lagu Rantau Mengiba',
    'Dendang Bansi Tradisional',
  ],
  'Islamic Dzikir / Ratib / Wirid': [
    'Dzikir Pagi & Petang Khusyuk',
    'Ratib Al-Haddad & Al-Athas',
    'Istighfar Taubat & Munajat',
    'Dzikir Tahlil & Tasbih Syahdu',
    'Dzikir Asmaul Husna Melodik',
    'Wirid Sakran & Hizib Bahar',
    'Dzikir Hati Tenang / Meditatif Sufi',
    'Sholawat & Dzikir Bersama (Majelis)',
  ],
  'Dzikir & Doa Munajat': [
    'Doa Munajat Tengah Malam',
    'Sayyidul Istighfar Syahdu',
    'Dzikir Penenang Jiwa & Kesembuhan',
    'Doa Khotmil Quran & Dzikir',
    'Hasbunallah Wanikmal Wakil',
    'Hauqalah & Doa Perlindungan',
  ],
  'Islamic Sholawat / Gambus': [
    'Gambus Modern Oud & Ney',
    'Sholawat Akustik Syahdu',
    'Qasidah Rebana Modern',
    'Hadhrah Banjari Terbang',
    'Nasyid Hijaz Merdu',
  ],
  'DJ Remix / Jedag Jedug': [
    'DJ Breakbeat Kota',
    'DJ Remix Full Bass',
    'DJ Tiktok Jedag Jedug',
    'DJ Dangdut Remix',
    'DJ Slow Bass',
  ],
  'Lo-Fi Chill Beats': [
    'Lo-Fi Hiphop Coffee Shop',
    'Chillhop Rainy Day',
    'Lo-Fi Jazz Piano',
    'Midnight Study Beats',
    'Nostalgic Tape Cassette',
  ],
  'R&B Soul': [
    'Neo-Soul Smooth & Warm',
    'Contemporary R&B 2000s',
    'Vintage Motown 70s',
    'Afro-R&B Groovy',
    'Trap Soul Emosional',
  ],
  'Hip-Hop / Rap': [
    'Boom Bap 90s Old School',
    'Modern Trap 808',
    'Melodic Rap Storytelling',
    'Drill Bass Horeg',
    'Hip-Hop Jazz Chill',
  ],
  'EDM / Electro Pop': [
    'Slap House Groovy',
    'Future Bass Melodic',
    'Tropical House Sunset',
    'Progressive House Uplifting',
    'Eurodance Nostalgia',
  ],
  'Jazz / Bossa Nova': [
    'Bossa Nova Pantai Sore',
    'Smooth Jazz Kafe',
    'Gypsy Jazz Akustik',
    'Swing Jazz Klasik',
    'Jazz Ballad Tengah Malam',
  ],
  'Reggae / Ska': [
    'Roots Reggae Santai Pantai',
    'Dub Reggae Bass Tebal',
    'Ska Punk Ceria',
    'Rocksteady Melow',
  ],
  'Folk / Indie Akustik': [
    'Indie Folk Nusantara Kopi',
    'Americana Folk Senja',
    'Chamber Folk Akustik Gesek',
    'Mountain Acoustic Story',
  ],
};

const DEFAULT_GENERIC_SUBGENRES = [
  'Modern & Kontemporer',
  'Akustik / Unplugged',
  'Melodic & Harmonis',
  'Heavy & Berenergi',
  'Minimalis & Syahdu',
  'Retro & Nostalgia',
];

export const MOOD_OPTIONS = [
  'Romantis & Hangat',
  'Galau & Menyayat Hati',
  'Patah Hati & Kecewa',
  'Penuh Semangat & Ceria',
  'Nostalgia & Kenangan Masa Lalu',
  'Religius, Spiritual & Khusyuk',
  'Santai, Chill & Tenang',
  'Harapan & Penuh Inspirasi',
  'Misterius, Gelap & Epik',
  'Pesta, Dansa & Hype',
  'Rindu Mendalam & Sunyi',
  'Melankolis & Syahdu',
  'Sedih & Berduka (Elegi)',
  'Gelisah, Cemas & Dilema',
  'Marah, Pemberontak & Protes Sosial',
  'Lucu, Jenaka & Humoris',
  'Puitis & Filosofis',
  'Heroik, Kemenangan & Patriotik',
  'Menenangkan Jiwa (Lullaby / Meditatif)',
  'Bangkit & Pantang Menyerah',
  'Hangat Bersama Keluarga / Kasih Ibu',
  'Cinta Bertepuk Sebelah Tangan',
  'Petualangan & Kebebasan',
  'Sensual, Intim & Manis',
  'Groovy & Asyik Bergoyang',
  'Custom (Tentukan Mood Sendiri)',
];

export const LANGUAGE_OPTIONS = [
  'Bahasa Indonesia',
  'Bahasa Arab (العربية)',
  'Bahasa Jepang (日本語)',
  'Bahasa India / Hindi (हिन्दी)',
  'Bahasa Korea (한국어)',
  'Bahasa Mandarin (中文)',
  'Bahasa Rusia (Русский)',
  'Bahasa Thailand (ไทย)',
  'Bahasa Turki (Türkçe)',
  'Bahasa Spanyol (Español)',
  'Bahasa Jerman (Deutsch)',
  'Bahasa Prancis (Français)',
  'Bahasa Jawa Ngoko',
  'Bahasa Jawa Alus',
  'Bahasa Jawa Kromo',
  'Bahasa Sunda (Basa Sunda)',
  'Bahasa Minang (Baso Minangkabau)',
  'Bahasa Melayu (Bahasa Melayu)',
  'English',
  'Campuran Indonesia - Arab (عربي)',
  'Campuran Indonesia - Inggris',
  'Custom (Tentukan Bahasa Sendiri)',
];

export const POV_OPTIONS = [
  'Orang Pertama (Aku / Saya)',
  'Orang Kedua (Kamu / Kau)',
  'Orang Ketiga (Dia / Mereka)',
];

export const MOOD_VOCAL_OPTIONS = [
  'Bebas',
  'Pria',
  'Wanita',
  'Duet',
];

export default function AutoLyricsModal({
  isOpen,
  onClose,
  onApplyLyrics,
}: AutoLyricsModalProps) {
  const [theme, setTheme] = useState('Pertemuan tak sengaja di kedai kopi saat senja');
  const [genre, setGenre] = useState('Indonesian Pop');
  const [customGenre, setCustomGenre] = useState('');
  const [subgenre, setSubgenre] = useState('Indie Pop Senja');
  const [customSubgenre, setCustomSubgenre] = useState('');
  const [mood, setMood] = useState('Romantis & Hangat');
  const [customMood, setCustomMood] = useState('');
  const [vocalMood, setVocalMood] = useState('Bebas');
  const [language, setLanguage] = useState('Bahasa Indonesia');
  const [customLanguage, setCustomLanguage] = useState('');
  const [scriptPreference, setScriptPreference] = useState<'native' | 'latin'>('native');
  const [pov, setPov] = useState('Orang Pertama (Aku / Saya)');
  const [verseCount, setVerseCount] = useState(2);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedLyricsOutput | null>(null);
  const [editableLyrics, setEditableLyrics] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const availableSubgenres = useMemo(() => {
    const list = SUBGENRE_MAP[genre] || DEFAULT_GENERIC_SUBGENRES;
    return ['Semua Subgenre / Default', ...list, 'Custom (Tentukan Sendiri)'];
  }, [genre]);

  if (!isOpen) return null;

  const handleGenreChange = (newGenre: string) => {
    setGenre(newGenre);
    const subList = SUBGENRE_MAP[newGenre] || DEFAULT_GENERIC_SUBGENRES;
    setSubgenre(subList[0] || 'Semua Subgenre / Default');
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg('');
    const effectiveGenre = genre === 'Custom (Tentukan Sendiri)' && customGenre.trim() ? customGenre.trim() : genre;
    const effectiveSubgenre =
      subgenre === 'Custom (Tentukan Sendiri)' && customSubgenre.trim()
        ? customSubgenre.trim()
        : subgenre === 'Semua Subgenre / Default'
        ? ''
        : subgenre;
    const effectiveMood = mood === 'Custom (Tentukan Mood Sendiri)' && customMood.trim() ? customMood.trim() : mood;
    const effectiveLanguage = language === 'Custom (Tentukan Bahasa Sendiri)' && customLanguage.trim() ? customLanguage.trim() : language;

    try {
      const res = await apiFetch('/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          genre: effectiveGenre,
          subgenre: effectiveSubgenre,
          mood: effectiveMood,
          vocalMood,
          language: effectiveLanguage,
          scriptPreference,
          pov,
          verseCount,
        }),
      });
      const data = await safeJson<{ success?: boolean; data?: GeneratedLyricsOutput; message?: string }>(res);
      if (data.success && data.data) {
        setGeneratedResult(data.data);
        setEditableLyrics(data.data.lyrics);
      } else {
        setErrorMsg(data.message || 'Gagal membuat lirik otomatis.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Server error';
      setErrorMsg(`Kendala: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!editableLyrics) return;
    navigator.clipboard.writeText(editableLyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApply = () => {
    if (!editableLyrics) return;
    onApplyLyrics(editableLyrics, generatedResult?.title, generatedResult?.styleTags);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner shadow-amber-400/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  AUTO LYRICS CREATOR
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                  AI Model V6
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Buat lirik berima & berstruktur presisi dengan kontrol Genre, Subgenre, Mood, dan Jumlah Verse
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Form: Parameters */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Tema Lagu</span>
                <span className="text-[10px] text-zinc-500 font-normal">Deskripsikan ide lagu</span>
              </label>
              <textarea
                rows={2}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ceritakan tentang apa lagu ini (misal: penyesalan cinta, rindu kampung halaman, semangat pantang menyerah)..."
                className="w-full px-3 py-2 bg-zinc-900/90 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 text-xs leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Music className="w-3 h-3 text-amber-400" />
                  <span>Genre Musik</span>
                </label>
                <select
                  value={genre}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 rounded-xl border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/60"
                >
                  {GENRE_OPTIONS.map((g) => (
                    <option key={g} value={g} className="bg-zinc-950">
                      {g}
                    </option>
                  ))}
                </select>
                {genre === 'Custom (Tentukan Sendiri)' && (
                  <input
                    type="text"
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    placeholder="Ketik genre kustom..."
                    className="w-full mt-2 px-3 py-1.5 bg-zinc-950 rounded-lg border border-amber-400/60 text-white placeholder:text-zinc-600 focus:outline-none text-xs"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>Subgenre</span>
                </label>
                <select
                  value={subgenre}
                  onChange={(e) => setSubgenre(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 rounded-xl border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/60"
                >
                  {availableSubgenres.map((sg) => (
                    <option key={sg} value={sg} className="bg-zinc-950">
                      {sg}
                    </option>
                  ))}
                </select>
                {subgenre === 'Custom (Tentukan Sendiri)' && (
                  <input
                    type="text"
                    value={customSubgenre}
                    onChange={(e) => setCustomSubgenre(e.target.value)}
                    placeholder="Ketik subgenre kustom..."
                    className="w-full mt-2 px-3 py-1.5 bg-zinc-950 rounded-lg border border-amber-400/60 text-white placeholder:text-zinc-600 focus:outline-none text-xs"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3 h-3 text-amber-400" />
                    <span>Mood / Suasana</span>
                  </label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 rounded-xl border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/60"
                  >
                    {MOOD_OPTIONS.map((m) => (
                      <option key={m} value={m} className="bg-zinc-950">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Smile className="w-3 h-3 text-amber-400" />
                    <span>Vokal</span>
                  </label>
                  <select
                    value={vocalMood}
                    onChange={(e) => setVocalMood(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 rounded-xl border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/60"
                  >
                    {MOOD_VOCAL_OPTIONS.map((v) => (
                      <option key={v} value={v} className="bg-zinc-950">
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {mood === 'Custom (Tentukan Mood Sendiri)' && (
                <input
                  type="text"
                  value={customMood}
                  onChange={(e) => setCustomMood(e.target.value)}
                  placeholder="Ketik mood kustom..."
                  className="w-full px-3 py-1.5 bg-zinc-950 rounded-lg border border-amber-400/60 text-white placeholder:text-zinc-600 focus:outline-none text-xs"
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-amber-400" />
                    <span>Bahasa</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 rounded-xl border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/60"
                  >
                    {LANGUAGE_OPTIONS.map((l) => (
                      <option key={l} value={l} className="bg-zinc-950">
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 pt-2 pb-1 border-t border-white/5">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Gaya Penulisan Aksara
                  </label>
                  <div className="flex bg-zinc-950 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setScriptPreference('native')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        scriptPreference === 'native'
                          ? 'bg-amber-400 text-black shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Aksara Asli (Native)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScriptPreference('latin')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        scriptPreference === 'latin'
                          ? 'bg-amber-400 text-black shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Tulisan Latin
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Sudut Pandang
                  </label>
                  <select
                    value={pov}
                    onChange={(e) => setPov(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 rounded-xl border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/60"
                  >
                    {POV_OPTIONS.map((p) => (
                      <option key={p} value={p} className="bg-zinc-950">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Jumlah Verse (Bait Lagu)</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-400 font-mono font-bold text-[11px]">
                  Tepat {verseCount} Verse
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[1, 2, 3, 4].map((count) => {
                  const isSelected = verseCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setVerseCount(count)}
                      className={`py-2 px-2 rounded-xl text-center font-bold text-xs transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20 scale-[1.02]'
                          : 'bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border-white/10'
                      }`}
                    >
                      <div className="text-sm">{count}</div>
                      <div className={`text-[10px] font-normal ${isSelected ? 'text-black/80' : 'text-zinc-500'}`}>
                        {count === 1 ? '1 Verse' : `${count} Verses`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30">
                {errorMsg}
              </p>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Sedang Mengarang Lirik ({verseCount} Verse)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Generate Lirik ({verseCount} Verse)</span>
                </>
              )}
            </button>
          </div>

          {/* Right Preview: Editable Lyrics */}
          <div className="lg:col-span-7 flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Hasil Lirik (Editor Langsung)
                </span>
                {generatedResult && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-medium">
                    ✓ {verseCount} Verse Terverifikasi
                  </span>
                )}
              </div>
              {editableLyrics && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-300 rounded-md border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-amber-400" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {generatedResult?.title && (
              <div className="px-3.5 py-2 bg-zinc-900/70 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                <div className="truncate">
                  <span className="text-zinc-500 mr-2">Judul:</span>
                  <span className="font-bold text-amber-300">{generatedResult.title}</span>
                </div>
                {generatedResult.styleTags && (
                  <div className="text-[11px] text-zinc-400 truncate max-w-[200px] ml-2">
                    <span className="text-zinc-600 mr-1">Style:</span>
                    {generatedResult.styleTags}
                  </div>
                )}
              </div>
            )}

            <textarea
              rows={16}
              value={editableLyrics}
              onChange={(e) => setEditableLyrics(e.target.value)}
              placeholder="Lirik yang dibuat akan muncul di sini dengan tag struktur lagu standar: [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro]..."
              className="w-full flex-1 p-4 bg-zinc-950 rounded-xl border border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 font-mono text-xs leading-relaxed"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/90 flex items-center justify-between">
          <p className="text-[11px] text-zinc-500">
            {editableLyrics ? 'Lirik siap dikirimkan ke modul Buat Lagu' : 'Atur Genre, Subgenre, Mood, dan klik Generate Lirik'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Batal
            </button>
            {editableLyrics && (
              <button
                onClick={handleApply}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wide flex items-center gap-2 shadow-md shadow-amber-400/20 active:scale-98 transition-all cursor-pointer"
              >
                <span>Gunakan di Buat Lagu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
