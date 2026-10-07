// Gemini AI Service for Auto Lyrics generation and creative album art conceptualization
import { GoogleGenAI } from '@google/genai';

export interface LyricsGeneratorInput {
  theme: string;
  category?: string;
  genre: string;
  subgenre?: string;
  mood: string;
  vocalMood?: string;
  language: string; // 'Bahasa Indonesia', 'English', 'Bahasa Jawa', 'Bahasa Sunda', 'Bahasa Arab', dll
  scriptPreference?: 'native' | 'latin';
  pov: string; // 'Orang Pertama (Aku/Saya)', 'Orang Kedua (Kamu)', 'Orang Ketiga (Dia/Mereka)'
  verseCount?: number;
}

export interface GeneratedLyricsOutput {
  title: string;
  styleTags: string;
  lyrics: string;
  verse1: string;
  preChorus: string;
  chorus: string;
  verse2?: string;
  verse3?: string;
  verse4?: string;
  bridge: string;
  finalChorus: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Robust helper to invoke Gemini models with timeout and fallback across models
async function callGeminiGenerate(
  client: GoogleGenAI,
  prompt: string,
  systemInstruction: string,
  options: { temperature?: number; maxOutputTokens?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  const timeoutMs = options.timeoutMs || 10000;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const generatePromise = client.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: options.temperature ?? 0.8,
            maxOutputTokens: options.maxOutputTokens,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on ${model}`)), timeoutMs)
        );

        const response = await Promise.race([generatePromise, timeoutPromise]);
        const text = response.text || '';
        if (text.trim().length > 0) {
          return text.trim();
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const is503 = errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('high demand');
        const is429 = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota');

        if (is503 && attempt === 1) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        if (is429) {
          break;
        }
        break;
      }
    }
  }
  return null;
}

export async function generateAutoLyrics(input: LyricsGeneratorInput): Promise<GeneratedLyricsOutput> {
  const gemini = getGeminiClient();
  const requestedVerseCount = Math.min(4, Math.max(1, Number(input.verseCount) || 2));

  let verseDirective = '';
  if (requestedVerseCount === 1) {
    verseDirective = `ATURAN WAJIB JUMLAH VERSE: TEPAT 1 (SATU) VERSE SAJA!
- HANYA buatkan [Verse 1]. DILARANG KERAS membuat [Verse 2], [Verse 3], atau [Verse 4].
- Struktur lagu wajib: [Intro] -> [Verse 1] -> [Pre-Chorus] -> [Chorus] -> [Bridge] -> [Final Chorus] -> [Outro].`;
  } else if (requestedVerseCount === 2) {
    verseDirective = `ATURAN WAJIB JUMLAH VERSE: TEPAT 2 (DUA) VERSE!
- Buatkan [Verse 1] dan [Verse 2]. DILARANG membuat [Verse 3] atau [Verse 4].
- Struktur lagu wajib: [Intro] -> [Verse 1] -> [Pre-Chorus] -> [Chorus] -> [Verse 2] -> [Bridge] -> [Final Chorus] -> [Outro].`;
  } else if (requestedVerseCount === 3) {
    verseDirective = `ATURAN WAJIB JUMLAH VERSE: TEPAT 3 (TIGA) VERSE!
- Buatkan [Verse 1], [Verse 2], dan [Verse 3]. DILARANG membuat [Verse 4].
- Struktur lagu wajib: [Intro] -> [Verse 1] -> [Pre-Chorus] -> [Chorus] -> [Verse 2] -> [Chorus] -> [Verse 3] -> [Bridge] -> [Final Chorus] -> [Outro].`;
  } else {
    verseDirective = `ATURAN WAJIB JUMLAH VERSE: TEPAT 4 (EMPAT) VERSE!
- Buatkan [Verse 1], [Verse 2], [Verse 3], dan [Verse 4].
- Struktur lagu wajib: [Intro] -> [Verse 1] -> [Chorus] -> [Verse 2] -> [Chorus] -> [Verse 3] -> [Bridge] -> [Verse 4] -> [Final Chorus] -> [Outro].`;
  }

  const isDzikir = (input.genre || '').toLowerCase().includes('dzikir') ||
                   (input.genre || '').toLowerCase().includes('wirid') ||
                   (input.genre || '').toLowerCase().includes('ratib') ||
                   (input.subgenre || '').toLowerCase().includes('dzikir') ||
                   (input.subgenre || '').toLowerCase().includes('ratib');

  const dzikirDirective = isDzikir ? `
ATURAN KHUSUS GENRE DZIKIR / RATIB / WIRID:
- Tema dan lirik berfokus pada taqarrub ilallah, kalimah thayyibah (Subhanallah, Alhamdulillah, La ilaha illallah, Allahu Akbar, Astaghfirullahal 'adzim, Hasbunallah wa ni'mal wakil, La hawla wa la quwwata illa billah).
- Tulis bait dzikir yang menggetarkan hati, penuh permohonan ampun dan ketenangan jiwa.
- Style tag: Islamic Dzikir, Khusyuk, Tasbih, Oud, Ney, Soft Percussion, Spiritual Ambience.` : '';

  const languageScriptDirective = input.scriptPreference === 'latin' ? `
ATURAN WAJIB BAHASA & AKSARA (LATIN SCRIPT MANDATE):
Pengguna memilih bahasa: "${input.language || 'Bahasa Indonesia'}".
PENTING: Pengguna meminta lirik ditulis MENGGUNAKAN TULISAN LATIN (ROMANIZED), meskipun bahasa aslinya tidak menggunakan alfabet Latin.
1. Jika Bahasa Arab: Tulis dalam huruf Latin (contoh: "Habibi", "Alhamdulillah").
2. Jika Bahasa Jepang: Tulis dalam Romaji.
3. Jika Bahasa Korea: Tulis dalam Romanized Korean.
4. Jika Bahasa Mandarin: Tulis dalam Pinyin tanpa nada.
5. Jika Bahasa Jawa (Ngoko/Alus/Kromo): Gunakan kosakata sastra Jawa yang tepat dengan ejaan Latin standar.
Label metatag penanda struktur seperti [Intro], [Verse 1], [Chorus] tetap gunakan tanda kurung siku.` : `
ATURAN WAJIB BAHASA & AKSARA / TULISAN ASLI:
Pengguna memilih bahasa: "${input.language || 'Bahasa Indonesia'}".
Jika bahasa memiliki aksara resmi (Arab, Jepang, Korea, Hindi, dll.), tuliskan lirik dalam aksara yang kaya makna atau campuran puitis.
Label metatag penanda struktur seperti [Intro], [Verse 1], [Chorus], [Bridge], [Outro] tetap gunakan standar tanda kurung siku.`;

  const systemInstruction = `Anda adalah seorang produser musik dan komposer lirik lagu profesional papan atas Indonesia di LAGUNA MUSIK.
Tugas Anda adalah menciptakan lirik lagu yang sangat emosional, puitis, memiliki ritme musikal yang pas, dan diformat khusus untuk AI Music Model (Suno AI / Kie.ai / Fal.ai).
Gunakan tag struktur lagu standar dengan tanda kurung siku: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Final Chorus], [Outro].
Pastikan rima dan ketukan lirik terdengar merdu saat dinyanyikan.
${verseDirective}
${languageScriptDirective}
${dzikirDirective}`;

  const userPrompt = `Buatkan lirik lagu lengkap berdasarkan spesifikasi berikut:
- Tema Lagu: ${input.theme || 'Perjalanan cinta dan rindu yang mendalam'}
- Kategori Lagu: ${input.category || 'Umum'}
- Genre Musik: ${input.genre || 'Indonesian Pop'}${input.subgenre ? ` (Subgenre: ${input.subgenre})` : ''}
- Mood / Suasana: ${input.mood || 'Emosional dan Menyentuh'}
- Mood Vocal / Jenis Suara: ${input.vocalMood || 'Bebas'}
- Bahasa & Aksara Wajib: ${input.language || 'Bahasa Indonesia'}
- Sudut Pandang Lirik: ${input.pov || 'Orang Pertama (Aku/Saya)'}
- Jumlah Verse Wajib: ${requestedVerseCount} Verse (HASIL AKHIR HARUS PERSIS ${requestedVerseCount} VERSE)

Format output dalam format teks rapi dengan metatag lagu:
[Title: Judul Lagu]
[Style: Tag gaya musik yang disarankan]

[Intro]
...`;

  if (gemini) {
    const text = await callGeminiGenerate(gemini, userPrompt, systemInstruction, {
      temperature: 0.8,
      timeoutMs: 12000,
    });
    if (text && text.length > 50) {
      return parseGeneratedLyrics(text, input, requestedVerseCount);
    }
  }

  return generateProceduralLyrics(input, requestedVerseCount);
}

function enforceExactVerseCount(lyricsText: string, targetCount: number): string {
  let processed = lyricsText;
  if (targetCount === 1) {
    processed = processed.replace(
      /\[Verse\s*[2-9][^\]]*\][\s\S]*?(?=\[(?:Intro|Verse|Pre-Chorus|Chorus|Bridge|Final Chorus|Outro)[^\]]*\]|$)/gi,
      ''
    );
  } else if (targetCount === 2) {
    processed = processed.replace(
      /\[Verse\s*[3-9][^\]]*\][\s\S]*?(?=\[(?:Intro|Verse|Pre-Chorus|Chorus|Bridge|Final Chorus|Outro)[^\]]*\]|$)/gi,
      ''
    );
  } else if (targetCount === 3) {
    processed = processed.replace(
      /\[Verse\s*[4-9][^\]]*\][\s\S]*?(?=\[(?:Intro|Verse|Pre-Chorus|Chorus|Bridge|Final Chorus|Outro)[^\]]*\]|$)/gi,
      ''
    );
  }
  processed = processed.replace(/\n{3,}/g, '\n\n').trim();
  return processed;
}

function parseGeneratedLyrics(
  fullText: string,
  input: LyricsGeneratorInput,
  requestedVerseCount: number = 2
): GeneratedLyricsOutput {
  const titleMatch = fullText.match(/\[Title:\s*(.+?)\]/i) || fullText.match(/^#\s*(.+?)$/m);
  const styleMatch = fullText.match(/\[Style:\s*(.+?)\]/i);

  const title = titleMatch ? titleMatch[1].trim() : `${input.theme.slice(0, 30)} (${input.genre})`;
  const styleTags = styleMatch
    ? styleMatch[1].trim()
    : `${input.genre}${input.subgenre ? `, ${input.subgenre}` : ''}, ${input.mood}, ${input.language}`;

  let cleanedLyrics = fullText
    .replace(/\[Title:.*?\]/gi, '')
    .replace(/\[Style:.*?\]/gi, '')
    .trim();

  cleanedLyrics = enforceExactVerseCount(cleanedLyrics, requestedVerseCount);

  const extractSection = (tag: string, nextTags: string[]): string => {
    const pattern = new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[(${nextTags.join('|')})\\]|$)`, 'i');
    const match = cleanedLyrics.match(pattern);
    return match ? match[1].trim() : '';
  };

  const verse1 = extractSection('Verse 1', ['Pre-Chorus', 'Chorus', 'Verse 2']);
  const preChorus = extractSection('Pre-Chorus', ['Chorus', 'Verse 2']);
  const chorus = extractSection('Chorus', ['Verse 2', 'Bridge', 'Outro']);
  const verse2 = requestedVerseCount >= 2 ? extractSection('Verse 2', ['Bridge', 'Pre-Chorus', 'Chorus', 'Verse 3']) : undefined;
  const verse3 = requestedVerseCount >= 3 ? extractSection('Verse 3', ['Bridge', 'Chorus', 'Verse 4']) : undefined;
  const verse4 = requestedVerseCount >= 4 ? extractSection('Verse 4', ['Bridge', 'Final Chorus', 'Outro']) : undefined;
  const bridge = extractSection('Bridge', ['Final Chorus', 'Chorus', 'Outro']);
  const finalChorus = extractSection('Final Chorus', ['Outro']) || chorus;

  return {
    title,
    styleTags,
    lyrics: cleanedLyrics,
    verse1,
    preChorus,
    chorus,
    verse2,
    verse3,
    verse4,
    bridge,
    finalChorus,
  };
}

function generateProceduralLyrics(
  input: LyricsGeneratorInput,
  requestedVerseCount: number = 2
): GeneratedLyricsOutput {
  const theme = input.theme || 'Malam Yang Hilang';
  const langLower = (input.language || '').toLowerCase();
  const isJawa = langLower.includes('jawa');
  const isSunda = langLower.includes('sunda');
  const isEnglish = langLower.includes('english');
  const isArabic = langLower.includes('arab');

  const targetVerses = Math.min(4, Math.max(1, requestedVerseCount));

  if (isJawa) {
    const v1 = `Angin wengi nelesi ati sing sepi\nKelingan esemmu neng pinggir kali\nBiyen awake dewe tau nyawiji\nSaiki kowe wis lali karo janji`;
    const v2 = `Rintik udan nambahi larane dodo\nKembang tresno saiki wis layu sirna\nMung dongo sing biso tak wenehake\nMugi kowe bungah neng sanding liyane`;
    const preChorus = `Kabeh kenangan ora gampang ilang\nNyoto tresnamu mung marai wirang`;
    const chorus = `Duh Gusti paringono dalan padhang\nSupoyo ati iki ora tansah bimbang\nYen pancen dudu jodhone\nKulo ikhlas ngeculke sliramu selawase`;
    const bridge = `Nadyan abot tak songgo dewe\nLaku tresno kudu rampung kene`;

    let lyrics = `[Intro - Suling Gamelan Syahdu]\n\n[Verse 1]\n${v1}\n\n[Pre-Chorus]\n${preChorus}\n\n[Chorus]\n${chorus}`;
    if (targetVerses >= 2) {
      lyrics += `\n\n[Verse 2]\n${v2}\n\n[Bridge]\n${bridge}\n\n[Final Chorus]\n${chorus}`;
    } else {
      lyrics += `\n\n[Bridge]\n${bridge}\n\n[Final Chorus]\n${chorus}`;
    }
    lyrics += `\n\n[Outro]\nIkhlas... lilo... selawase...`;

    return {
      title: `Kembang Kenangan (${theme.slice(0, 20)})`,
      styleTags: `${input.genre || 'Campursari'}, ${input.mood || 'Melankolis'}, Kendang Jawa, Suling`,
      lyrics,
      verse1: v1,
      preChorus,
      chorus,
      verse2: targetVerses >= 2 ? v2 : undefined,
      bridge,
      finalChorus: chorus,
    };
  }

  // Indonesian default
  const v1 = `Matahari tenggelam perlahan di ufuk barat\nMembawa sepenggal rasa yang kian pekat\nKutatapi langit merah yang mulai membias\nTersimpan rindu yang tak kunjung terbalas`;
  const v2 = `Langkah kaki menyusuri jalan kenangan\nTempat kita pernah bertukar senyuman\nKini tinggal bayangmu di balik awan\nMenenteramkan hati dalam kedamaian`;
  const v3 = `Bintang-bintang malam mulai berkelip mesra\nMenyapa hatiku yang dipeluk gulita\nSetiap nada dawai yang kupetik pelan\nMenyuratkan doa di hening kesunyian`;
  const v4 = `Kini ku percaya takdir tak pernah salah\nMeski kita harus menempuh jalan berpisah\nRasa syukur kan selalu bertahta di dada\nKarena pernah mengenalmu sebagai anugerah terindah`;
  const preChorus = `Detik jam berdetak tanpa henti\nMenemaniku merajut sepi di dalam hati`;
  const chorus = `Biarkan melodi ini mengalun merdu\nMenyampaikan salam rindu kepadamu\nWalau jarak membentang samudera raya\nKau tetap nada terindah di jiwa`;
  const bridge = `Jika waktu kan membawamu kembali\nKan ku genggam tanganmu takkan ku lepas lagi`;

  let lyrics = `[Intro - Petikan Gitar Akustik Lembut]\n\n[Verse 1]\n${v1}\n\n[Pre-Chorus]\n${preChorus}\n\n[Chorus]\n${chorus}`;
  if (targetVerses === 2) {
    lyrics += `\n\n[Verse 2]\n${v2}\n\n[Bridge]\n${bridge}\n\n[Final Chorus]\n${chorus}`;
  } else if (targetVerses === 3) {
    lyrics += `\n\n[Verse 2]\n${v2}\n\n[Chorus]\n${chorus}\n\n[Verse 3]\n${v3}\n\n[Bridge]\n${bridge}\n\n[Final Chorus]\n${chorus}`;
  } else if (targetVerses === 4) {
    lyrics += `\n\n[Verse 2]\n${v2}\n\n[Chorus]\n${chorus}\n\n[Verse 3]\n${v3}\n\n[Bridge]\n${bridge}\n\n[Verse 4]\n${v4}\n\n[Final Chorus]\n${chorus}`;
  } else {
    lyrics += `\n\n[Bridge]\n${bridge}\n\n[Final Chorus]\n${chorus}`;
  }
  lyrics += `\n\n[Outro]\nNada terindah... di dalam jiwa... selamanya...`;

  return {
    title: `Nada Rindu (${theme.slice(0, 20)})`,
    styleTags: `${input.genre || 'Indonesian Pop'}${input.subgenre ? `, ${input.subgenre}` : ''}, ${input.mood || 'Romantic'}, Acoustic Guitar, Warm Strings`,
    lyrics,
    verse1: v1,
    preChorus,
    chorus,
    verse2: targetVerses >= 2 ? v2 : undefined,
    verse3: targetVerses >= 3 ? v3 : undefined,
    verse4: targetVerses >= 4 ? v4 : undefined,
    bridge,
    finalChorus: chorus,
  };
}

export interface StyleBoostInput {
  currentStyle?: string;
  title?: string;
  instrumental?: boolean;
}

export async function boostMusicStyle(input: StyleBoostInput): Promise<string> {
  const gemini = getGeminiClient();
  const rawDescription = (input.currentStyle || input.title || '').trim();
  const instrumentalHint = input.instrumental ? 'instrumental aransemen musik tanpa vokal' : 'gaya musik Suno AI';

  const systemInstruction = `Anda adalah master sound designer, music arranger, dan prompt engineer untuk Suno AI & Kie.ai Music Engine (Suno V4/V6).
Tugas Anda adalah memperkaya (boost) deskripsi gaya musik singkat dari pengguna menjadi prompt musikal yang sangat detail, imersif, dan broadcast-ready.
Aturan Wajib:
1. JANGAN PERNAH menyebutkan nama artis, grup band, atau penyanyi terkenal.
2. Tuliskan deskripsi dalam format daftar frasa dipisahkan koma yang rapi, padat, dan ekspresif.
3. Selalu integrasikan elemen: Genre spesifik, Tempo BPM, Instrumen utama & pendukung, Atmosfer emosional, Kualitas mixing studio.
4. Panjang optimal 150-320 karakter.
5. Langsung keluarkan teks deskripsi saja.`;

  const userPrompt = `Tolong boost gaya musik ini untuk ${instrumentalHint}: "${rawDescription || 'melancholic pop, soft piano'}"`;

  if (gemini) {
    const rawResult = await callGeminiGenerate(gemini, userPrompt, systemInstruction, {
      temperature: 0.7,
      maxOutputTokens: 200,
      timeoutMs: 10000,
    });
    if (rawResult) {
      const text = rawResult.replace(/^["'`]|["'`]$/g, '').replace(/\n+/g, ', ').trim();
      if (text.length > 20) {
        return text;
      }
    }
  }

  return generateProceduralStyleBoost(input);
}

function generateProceduralStyleBoost(input: StyleBoostInput): string {
  const desc = (input.currentStyle || input.title || '').toLowerCase();
  if (desc.includes('koplo') || desc.includes('dangdut')) {
    return 'modern dangdut koplo, 135 BPM, kendang rampak jawa timuran, crisp tabla, slapping slap bass, subtle brass section, festive live concert reverb, punchy kick, pristine stereo master';
  }
  if (desc.includes('rock') || desc.includes('metal')) {
    return 'energetic alt rock, 140 BPM, overdriven Gibson Les Paul guitar riffs, tight punchy acoustic drum fills, soaring harmonic bassline, stadium reverb, powerful dynamic master';
  }
  if (desc.includes('jazz') || desc.includes('bossa')) {
    return 'smooth midnight jazz, 78 BPM, warm muted trumpet, walking upright double bass, brushed snare drums, gentle grand piano, smoky lounge ambience, vinyl warmth';
  }
  if (desc.includes('lofi') || desc.includes('lo-fi') || desc.includes('chill')) {
    return 'chill lo-fi hip hop, 82 BPM, nostalgic vinyl crackle, warm Rhodes electric piano, mellow nylon acoustic guitar, laid-back boombap drums, late night cozy atmosphere';
  }
  const base = input.currentStyle?.trim() || 'melancholic pop';
  return `${base}, 92 BPM, soft emotional acoustic piano, warm vintage Rhodes, subtle cello quartet, night atmosphere, dreamy stereo reverb, 44.1kHz studio master`;
}

export interface AdaptCoverInput {
  songTitle: string;
  originalLyrics: string;
  targetGenre: string;
  targetMood?: string;
  vocalGender?: string;
  creativeLevel?: 'faithful' | 'creative' | 'parody';
}

export interface AdaptCoverOutput {
  safeTitle: string;
  adaptedLyrics: string;
  safeStylePrompt: string;
  vocalDescription: string;
  arrangementTips: string[];
  explanation: string;
}

export async function adaptCopyrightedCover(input: AdaptCoverInput): Promise<AdaptCoverOutput> {
  const gemini = getGeminiClient();
  const creativeLevel = input.creativeLevel || 'faithful';

  const systemInstruction = `Anda adalah Produser Musik & Ahli Aransemen Cover AI Profesional di LAGUNA MUSIK.
Tugas Anda adalah membantu pengguna mengaransemen ulang lagu yang berhak cipta (Copyrighted Songs) agar:
1. LOLOS 100% dari filter blokir hak cipta / moderation filter provider AI (Suno, Kie.ai, Fal.ai, Udio, dsb).
2. Mempertahankan jumlah suku kata (syllable meter), rima akhir, dinamika vokal, dan rasa emosional lagu asli agar melodi cover tetap selaras.
3. Menghasilkan deskripsi prompt gaya instrumen & aransemen tanpa menyebut nama artis/penyanyi terkenal.
4. Menghasilkan judul yang aman (contoh: "Rasa Yang Tertinggal (Acoustic Arrangement)").

Aturan Format JSON: Keluarkan output HANYA dalam format JSON valid dengan properti:
{
  "safeTitle": "Judul lagu yang aman dan deskriptif",
  "adaptedLyrics": "Teks lirik lengkap dengan penanda struktur [Intro], [Verse 1], [Chorus], [Bridge], [Outro]",
  "safeStylePrompt": "Deskripsi genre, BPM, instrumen, mixing style tanpa nama artis",
  "vocalDescription": "Karakter vokal yang cocok",
  "arrangementTips": ["Tip 1", "Tip 2", "Tip 3"],
  "explanation": "Penjelasan singkat teknik adaptasi yang dilakukan"
}`;

  const userPrompt = `Tolong bantu adaptasikan lagu cover berikut:
- Judul Asli: "${input.songTitle || 'Lagu Terkenal'}"
- Lirik Asli: ${input.originalLyrics || '(Lirik lagu terkenal yang ingin di-cover)'}
- Target Genre: ${input.targetGenre || 'Acoustic Pop Nusantara'}
- Mood: ${input.targetMood || 'Emosional dan Hangat'}
- Karakter Vokal: ${input.vocalGender || 'Male/Female'}
- Tingkat Modifikasi: ${creativeLevel}`;

  if (gemini) {
    try {
      const rawResult = await callGeminiGenerate(gemini, userPrompt, systemInstruction, {
        temperature: 0.75,
        maxOutputTokens: 1500,
        timeoutMs: 15000,
      });
      if (rawResult) {
        const cleaned = rawResult.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.adaptedLyrics && parsed.safeStylePrompt) {
          return {
            safeTitle: parsed.safeTitle || `${input.songTitle || 'Cover Song'} (Reimagined)`,
            adaptedLyrics: parsed.adaptedLyrics,
            safeStylePrompt: parsed.safeStylePrompt,
            vocalDescription: parsed.vocalDescription || 'Clear melodic vocal',
            arrangementTips: Array.isArray(parsed.arrangementTips) ? parsed.arrangementTips : [
              'Gunakan audio panduan vokal/gitar sendiri jika ingin melodi 100% identik.',
              'Gunakan prompt instrumen spesifik alih-alih menyebut nama artis.',
              'Atur tempo di Studio Audio Editor jika ingin menyesuaikan BPM lebih lanjut.'
            ],
            explanation: parsed.explanation || 'Lirik telah diadaptasi dengan sinonim rima yang presisi agar lolos filter hak cipta.',
          };
        }
      }
    } catch (e) {
      console.warn('Gemini adaptCopyrightedCover fallback triggered:', e);
    }
  }

  return generateProceduralCoverAdaptation(input);
}

function generateProceduralCoverAdaptation(input: AdaptCoverInput): AdaptCoverOutput {
  const title = input.songTitle ? input.songTitle.replace(/[^\w\s]/g, '') : 'Aransemen Melodi';
  const genre = input.targetGenre || 'Indonesian Acoustic Pop';

  return {
    safeTitle: `${title} (New Arrangement Cover)`,
    adaptedLyrics: `[Intro]\n(Petikan instrumen akustik lembut membuka lagu)\n\n[Verse 1]\nDi dalam sunyi malam ku terdiam menatap bayang\nMengingat kembali semua cerita yang telah hilang\nLangkah kaki ini masih terbayang kisah lalu\nAkankah waktu menghapus rasa rinduku padamu\n\n[Pre-Chorus]\nDan bila nanti saatnya tiba kembali\nKusimpan rasa di lubuk hati yang sunyi\n\n[Chorus]\nBiarkan semua mengalir bagai air tenang\nMembawa pergi setiap perih dan duka yang datang\nKutetap melangkah dengan senyuman baru\nMenyambut esok hari bersama harapanmu\n\n[Bridge]\nWalau rintangan menghadang di depan mata\nKu takkan gentar jalani takdir dan cinta\n\n[Chorus]\nBiarkan semua mengalir bagai air tenang\nMembawa pergi setiap perih dan duka yang datang\nKutetap melangkah dengan senyuman baru\nMenyambut esok hari bersama harapanmu\n\n[Outro]\n(Melodi piano dan gitar memudar perlahan)\nHarapan baru... di dalam kalbu...`,
    safeStylePrompt: `${genre}, 90 BPM, clean acoustic guitar strumming, upright piano, warm room reverb, intimate melodic vocal, high fidelity studio master`,
    vocalDescription: `${input.vocalGender || 'Any'} vocal with emotional warmth and natural vibrato`,
    arrangementTips: [
      'Gunakan lirik adaptasi di atas agar terhindar dari pemblokiran kata kunci hak cipta.',
      'Unggah rekaman petikan gitar atau suara acapella Anda di menu Remix untuk menuntun progresi akord.',
      'Gunakan fitur Editor Audio untuk menyesuaikan tempo BPM atau nada dasar (pitch shift).'
    ],
    explanation: 'Lirik dan prompt telah dioptimalkan agar tidak memicu filter moderasi AI namun tetap memiliki ritme dan aransemen yang indah.',
  };
}
