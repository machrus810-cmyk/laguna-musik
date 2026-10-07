// Database schema and in-memory/file-backed persistent store for LAGUNA MUSIK
import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  email?: string;
  created_at: string;
}

export type MusicProvider = 'kie.ai' | 'fal.ai' | 'sunor' | 'apiframe';

export interface StoredApiKey {
  user_id?: string;
  id: string;
  key: string;
  provider: MusicProvider;
  credit: number;
  status: 'active' | 'error' | 'exhausted';
  errorMessage?: string;
  lastChecked?: string;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  provider: MusicProvider;
  key_hash: string;
  encrypted_key?: string;
  is_active: boolean;
  credit_cached: number;
  last_checked_at: string;
}

export interface MusicTask {
  id: string;
  user_id: string;
  kie_task_id: string;
  provider?: MusicProvider;
  api_key?: string;
  status: 'QUEUED' | 'GENERATING' | 'SUCCESS' | 'FAILED';
  model: string;
  prompt: string;
  style: string;
  title: string;
  negative_tags?: string;
  instrumental: boolean;
  vocal_gender?: 'Male' | 'Female' | 'Any';
  duration?: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  refund_status?: string;
  mode?: 'create' | 'remix';
  is_remix?: boolean;
  audio_url?: string;
  original_audio_url?: string;
}

export interface MusicTrack {
  user_id?: string;
  id: string;
  task_id: string;
  audio_id: string;
  audio_url: string;
  stream_audio_url: string;
  cover_url: string;
  title: string;
  duration: number; // in seconds
  lyrics: string;
  prompt: string;
  style: string;
  model: string;
  tags: string[];
  vocal_gender?: string;
  instrumental: boolean;
  is_favorite: boolean;
  mastering_preset?: string;
  tempo_speed?: number;
  vocal_preset?: string;
  vocal_pitch?: number;
  vocal_intensity?: number;
  preserves_pitch?: boolean;
  workspace?: string;
  video_url?: string;
  download_count: number;
  created_at: string;
  is_remix?: boolean;
  original_audio_url?: string;
}

export interface LyricsRecord {
  id: string;
  user_id: string;
  title: string;
  theme: string;
  genre: string;
  subgenre?: string;
  mood: string;
  language: string;
  pov: string;
  verse_count: number;
  content: string;
  created_at: string;
}

export interface CoverRecord {
  user_id?: string;
  id: string;
  track_id?: string;
  title: string;
  genre: string;
  mood: string;
  artist_concept: string;
  image_url: string;
  created_at: string;
}

export interface MusicVideoRecord {
  user_id?: string;
  id: string;
  track_id: string;
  artist_name: string;
  brand_website: string;
  visual_style: string;
  video_url: string;
  created_at: string;
}

interface DatabaseSchema {
  users: User[];
  api_keys: ApiKeyRecord[];
  music_tasks: MusicTask[];
  music_tracks: MusicTrack[];
  lyrics: LyricsRecord[];
  covers: CoverRecord[];
  music_videos: MusicVideoRecord[];
  byok_key?: string;
  byok_keys: StoredApiKey[];
  api_route_provider?: MusicProvider;
  seeded_users?: string[];
}

export function maskKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length > 12) {
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-6)}`;
  }
  if (trimmed.length > 6) {
    return `${trimmed.slice(0, 3)}...${trimmed.slice(-3)}`;
  }
  return '***';
}

// Initial starter tracks - seeded when user has no tracks
const DEFAULT_TRACKS_SEED: Omit<MusicTrack, 'id' | 'created_at' | 'download_count'>[] = [
  {
    task_id: 'task-sejak-tatapan-1',
    audio_id: '4cb8b004a79b2e',
    audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
    stream_audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
    cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    title: 'Sejak Tatapan Pertama',
    duration: 308,
    lyrics: `[Intro]\nDi antara riuh orang-orang\nMataku berhenti di matamu\nDan sejak detik itu berlalu\nAda namamu di pikiranku\n\n[Verse 1]\nKau berdiri di dekat jendela\nDengan rambut tersapu cahaya\nTersenyum kecil pada seseorang\nNamun entah kenapa jatuh padaku\nAku pura-pura sibuk membaca\nPadahal satu kalimat pun tak terbaca\nJantungku ramai tanpa suara`,
    prompt: 'Roots reggae at 76 BPM with a tense, minor-key edge: skanking electric guitar through spring reverb, deep melodic bass, one-drop drums, rim-click snare, organ bubble, and restrained brass stabs. Low, controlled lead vocals with stacked harmonies, tape saturation, dub delays, and spacious echo trails create a warm yet menacing atmosphere.',
    style: 'Roots reggae at 76 BPM with a tense, minor-key edge: skanking electric guitar through spring reverb, deep melodic bass, one-drop drums, rim-click snare, organ bubble, and restrained brass stabs. Low, controlled lead vocals with stacked harmonies, tape saturation, dub delays, and spacious echo trails create a warm yet menacing atmosphere.',
    model: 'V6',
    tags: ['Roots Reggae', 'V6', 'Vokal', 'Indonesia'],
    vocal_gender: 'Female',
    instrumental: false,
    is_favorite: true,
  },
  {
    task_id: 'task-sejak-tatapan-2',
    audio_id: '4cb8b004b901fc',
    audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
    stream_audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
    cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    title: 'Sejak Tatapan Pertama (Acoustic)',
    duration: 374,
    lyrics: `[Intro]\nDi antara riuh orang-orang\nMataku berhenti di matamu\nDan sejak detik itu berlalu\nAda namamu di pikiranku\n\n[Verse 1]\nKau berdiri di dekat jendela\nDengan rambut tersapu cahaya\nTersenyum kecil pada seseorang`,
    prompt: 'Roots reggae at 76 BPM with dub delay and brass stabs',
    style: 'Roots reggae at 76 BPM with dub delay and brass stabs',
    model: 'V6',
    tags: ['Reggae', 'V6', 'Female'],
    vocal_gender: 'Female',
    instrumental: false,
    is_favorite: false,
  },
  {
    task_id: 'task-sejak-tatapan-3',
    audio_id: '3c7de5d3a908bc',
    audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
    stream_audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
    cover_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
    title: 'Sejak Tatapan Pertama (Dub Edit)',
    duration: 300,
    lyrics: `[Verse 1]\nKau berdiri di dekat jendela\nDengan rambut tersapu cahaya\nTersenyum kecil pada seseorang\nNamun entah kenapa jatuh padaku`,
    prompt: 'Acoustic roots reggae with soft percussion',
    style: 'Acoustic roots reggae with soft percussion',
    model: 'V6',
    tags: ['Acoustic', 'Roots Reggae', 'V6'],
    vocal_gender: 'Female',
    instrumental: false,
    is_favorite: false,
  },
  {
    task_id: 'task-sejak-tatapan-4',
    audio_id: '5f92c108bb21dc',
    audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
    stream_audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
    cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    title: 'Sejak Tatapan Pertama (Instrumental)',
    duration: 288,
    lyrics: `[Intro]\nDi antara riuh orang-orang\nMataku berhenti di matamu`,
    prompt: 'Roots reggae instrumental version with tape saturation',
    style: 'Roots reggae instrumental version with tape saturation',
    model: 'V6',
    tags: ['Reggae', 'Dub', 'Instrumental'],
    vocal_gender: 'Any',
    instrumental: true,
    is_favorite: false,
  },
];

const DATA_FILE_PATH = path.join(process.cwd(), '.data', 'kampung_lagu_db.json');

// In-memory singleton state with file sync
class Database {
  private data: DatabaseSchema;
  private isLoaded = false;
  private lastMtime = 0;

  constructor() {
    this.data = {
      users: [
        {
          id: 'user-default',
          name: 'Producer Laguna Musik',
          email: 'creator@lagunamusik.app',
          created_at: new Date().toISOString(),
        },
      ],
      api_keys: [],
      music_tasks: [],
      music_tracks: [],
      lyrics: [],
      covers: [],
      music_videos: [],
      byok_key: '',
      byok_keys: [],
      api_route_provider: 'kie.ai',
    };
    this.ensureLoaded();
  }

  ensureLoaded() {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const stat = fs.statSync(DATA_FILE_PATH);
        if (stat.mtimeMs !== this.lastMtime) {
          const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
          const parsed = JSON.parse(raw);
          this.data = {
            ...this.data,
            ...parsed,
            music_tracks: Array.isArray(parsed.music_tracks)
              ? parsed.music_tracks.filter((t: MusicTrack) => t && t.id && !t.id.startsWith('track-demo-'))
              : [],
            byok_keys: Array.isArray(parsed.byok_keys) ? parsed.byok_keys : [],
            api_route_provider: parsed.api_route_provider || 'kie.ai',
          };
          this.lastMtime = stat.mtimeMs;
        }
      }
    } catch (e) {
      console.warn('Could not read persistent DB file, using memory state:', e);
    }
    this.isLoaded = true;
  }

  private save() {
    try {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
      try {
        const stat = fs.statSync(DATA_FILE_PATH);
        this.lastMtime = stat.mtimeMs;
      } catch {}
    } catch (e) {
      console.warn('Could not persist DB to disk:', e);
    }
  }

  // --- API Key & BYOK (Multi-Key Support) ---
  getApiRouteProvider(): MusicProvider {
    this.ensureLoaded();
    const p = this.data.api_route_provider;
    if (p === 'fal.ai' || p === 'sunor' || p === 'kie.ai' || p === 'apiframe') {
      return p;
    }
    return 'kie.ai';
  }

  setApiRouteProvider(provider: MusicProvider) {
    this.ensureLoaded();
    this.data.api_route_provider = provider;
    this.save();
  }

  getAllKeys(userId?: string, provider?: MusicProvider): StoredApiKey[] {
    this.ensureLoaded();
    if (!userId) return [];
    let keys = (this.data.byok_keys || []).filter((k) => k.user_id === userId);
    if (provider) {
      keys = keys.filter((k) => (k.provider || 'kie.ai') === provider);
    }
    return keys;
  }

  getTotalCredits(userId?: string, provider?: MusicProvider): number {
    this.ensureLoaded();
    if (!userId) return 0;
    const targetProvider = provider || this.getApiRouteProvider();
    const keys = (this.data.byok_keys || []).filter(
      (k) => k.user_id === userId && (k.provider || 'kie.ai') === targetProvider
    );
    if (keys.length === 0) return 0;
    const total = keys.reduce(
      (acc, k) => acc + (typeof k.credit === 'number' && k.credit > 0 ? k.credit : 0),
      0
    );
    return Math.round(total * 100) / 100;
  }

  getOrderedActiveKeys(userId?: string, provider?: MusicProvider): StoredApiKey[] {
    this.ensureLoaded();
    if (!userId) return [];
    const targetProvider = provider || this.getApiRouteProvider();
    let keys = (this.data.byok_keys || []).filter(
      (k) => k.user_id === userId && (k.provider || 'kie.ai') === targetProvider
    );
    if (keys.length === 0 && !provider) {
      keys = (this.data.byok_keys || []).filter((k) => k.user_id === userId);
    }
    return keys.sort((a, b) => {
      const aValid = a.status === 'active' ? 1 : 0;
      const bValid = b.status === 'active' ? 1 : 0;
      if (aValid !== bValid) return bValid - aValid;
      return (b.credit || 0) - (a.credit || 0);
    });
  }

  getKieApiKey(userId?: string, provider?: MusicProvider): string {
    this.ensureLoaded();
    if (!userId) {
      // Fallback to environment variable if present
      return (process.env.KIE_API_KEY || '').trim();
    }
    const ordered = this.getOrderedActiveKeys(userId, provider);
    if (ordered.length > 0 && ordered[0].key) {
      return ordered[0].key.trim();
    }
    return (process.env.KIE_API_KEY || '').trim();
  }

  addKeys(
    rawKeys: string[],
    provider: MusicProvider = 'kie.ai',
    userId: string = 'user-guest'
  ): { added: StoredApiKey[]; skippedDuplicates: number } {
    this.ensureLoaded();
    if (!this.data.byok_keys) {
      this.data.byok_keys = [];
    }
    const added: StoredApiKey[] = [];
    let skippedDuplicates = 0;
    for (const raw of rawKeys) {
      let clean = raw.trim();
      if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.slice(1, -1).trim();
      }
      if (clean.toLowerCase().startsWith('bearer ')) {
        clean = clean.slice(7).trim();
      }
      if (!clean) continue;

      const exists = this.data.byok_keys.some(
        (k) => k.key.trim() === clean && k.user_id === userId && (k.provider || 'kie.ai') === provider
      );
      if (exists) {
        skippedDuplicates++;
        continue;
      }
      const newKeyRecord: StoredApiKey = {
        id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        key: clean,
        provider,
        credit: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        user_id: userId,
      };
      this.data.byok_keys.push(newKeyRecord);
      added.push(newKeyRecord);
    }
    this.save();
    return { added, skippedDuplicates };
  }

  updateKey(id: string, updates: Partial<StoredApiKey>) {
    this.ensureLoaded();
    if (!this.data.byok_keys) return;
    const index = this.data.byok_keys.findIndex((k) => k.id === id || k.key === id);
    if (index !== -1) {
      this.data.byok_keys[index] = {
        ...this.data.byok_keys[index],
        ...updates,
      };
      this.save();
    }
  }

  deductCreditOnSuccess(
    userId: string,
    usedKey?: string,
    provider?: MusicProvider,
    model?: string
  ): { success: boolean; newCredit: number; deducted: number } {
    this.ensureLoaded();
    const activeProvider = provider || this.getApiRouteProvider();
    if (!this.data.byok_keys || this.data.byok_keys.length === 0) {
      return { success: false, newCredit: 0, deducted: 0 };
    }
    let targetIndex = -1;
    if (usedKey) {
      targetIndex = this.data.byok_keys.findIndex(
        (k) => (k.key.trim() === usedKey.trim() || k.id === usedKey) && (k.provider || 'kie.ai') === activeProvider
      );
    }
    if (targetIndex === -1) {
      const candidates = this.data.byok_keys
        .map((k, index) => ({ k, index }))
        .filter(
          ({ k }) =>
            k.user_id === userId &&
            (k.provider || 'kie.ai') === activeProvider &&
            k.status === 'active'
        )
        .sort((a, b) => (b.k.credit || 0) - (a.k.credit || 0));
      if (candidates.length > 0) {
        targetIndex = candidates[0].index;
      }
    }
    if (targetIndex === -1) {
      return { success: false, newCredit: this.getTotalCredits(userId, activeProvider), deducted: 0 };
    }
    const targetKey = this.data.byok_keys[targetIndex];
    const currentCredit = typeof targetKey.credit === 'number' ? targetKey.credit : 0;

    let deduction = 5;
    if (activeProvider === 'kie.ai') {
      deduction = model && (model.includes('v6') || model.includes('V6')) ? 10 : 5;
    } else if (activeProvider === 'sunor') {
      deduction = 5;
    } else if (activeProvider === 'fal.ai') {
      deduction = 1;
    } else if (activeProvider === 'apiframe') {
      deduction = 11;
    }

    const actualDeducted = currentCredit > 0 ? (currentCredit >= deduction ? deduction : currentCredit) : 0;
    const newCredit = Math.max(0, Math.round((currentCredit - actualDeducted) * 100) / 100);
    this.data.byok_keys[targetIndex] = {
      ...targetKey,
      credit: newCredit,
      lastChecked: new Date().toISOString(),
    };
    this.save();
    const totalNewCredits = this.getTotalCredits(userId, activeProvider);
    return {
      success: true,
      newCredit: totalNewCredits,
      deducted: actualDeducted,
    };
  }

  deleteKey(idOrKey: string, userId?: string): boolean {
    this.ensureLoaded();
    if (!this.data.byok_keys) return false;
    const beforeCount = this.data.byok_keys.length;
    this.data.byok_keys = this.data.byok_keys.filter((k) => {
      const match = k.id === idOrKey || k.key === idOrKey;
      if (!match) return true;
      if (userId && k.user_id && k.user_id !== userId) return true;
      return false;
    });
    this.save();
    return this.data.byok_keys.length < beforeCount;
  }

  deleteAllKeys(userId?: string) {
    this.ensureLoaded();
    if (userId) {
      this.data.byok_keys = (this.data.byok_keys || []).filter((k) => k.user_id !== userId);
    } else {
      this.data.byok_keys = [];
    }
    this.save();
  }

  getApiKeyStatus(userId?: string, targetProvider?: MusicProvider) {
    this.ensureLoaded();
    const activeProvider = targetProvider || this.getApiRouteProvider();
    if (!userId) {
      return {
        hasKey: false,
        isByok: false,
        keyCount: 0,
        totalCredits: 0,
        maxSingleKeyCredit: 0,
        hasEligibleKey: false,
        eligibleKeyCount: 0,
        maskedKey: '',
        keys: [],
        provider: activeProvider,
        providerStats: {
          'kie.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
          'fal.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
          sunor: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
          apiframe: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
        },
      };
    }
    const allUserKeys = (this.data.byok_keys || []).filter((k) => k.user_id === userId);

    const providerStats: Record<MusicProvider, { keyCount: number; totalCredits: number; activeKeyCount: number }> = {
      'kie.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
      'fal.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
      sunor: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
      apiframe: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
    };

    for (const k of allUserKeys) {
      const p = (k.provider || 'kie.ai') as MusicProvider;
      if (providerStats[p]) {
        providerStats[p].keyCount++;
        if (typeof k.credit === 'number' && k.credit > 0) {
          providerStats[p].totalCredits += k.credit;
        }
        if (k.status !== 'error') {
          providerStats[p].activeKeyCount++;
        }
      }
    }

    providerStats['kie.ai'].totalCredits = Math.round(providerStats['kie.ai'].totalCredits * 100) / 100;
    providerStats['fal.ai'].totalCredits = Math.round(providerStats['fal.ai'].totalCredits * 100) / 100;
    providerStats.sunor.totalCredits = Math.round(providerStats.sunor.totalCredits * 100) / 100;
    providerStats.apiframe.totalCredits = Math.round(providerStats.apiframe.totalCredits * 100) / 100;

    const providerKeys = allUserKeys.filter((k) => (k.provider || 'kie.ai') === activeProvider);
    const hasKeys = providerKeys.length > 0;
    const hasKey = hasKeys;
    const isByok = hasKeys;
    const totalCredits = providerStats[activeProvider]?.totalCredits || 0;
    const minRequiredCredit = activeProvider === 'kie.ai' ? 12 : activeProvider === 'fal.ai' ? 1 : activeProvider === 'apiframe' ? 11 : 10;
    const activeKeys = providerKeys.filter((k) => k.status !== 'error');
    const maxSingleKeyCredit = activeKeys.length > 0
      ? Math.max(...activeKeys.map((k) => (typeof k.credit === 'number' ? k.credit : 0)), 0)
      : 0;
    const eligibleKeyCount = activeKeys.filter((k) => (k.credit || 0) >= minRequiredCredit).length;
    const hasEligibleKey = eligibleKeyCount > 0;

    const sortedKeys = [...allUserKeys].sort((a, b) => {
      const aIsCurrent = (a.provider || 'kie.ai') === activeProvider ? 1 : 0;
      const bIsCurrent = (b.provider || 'kie.ai') === activeProvider ? 1 : 0;
      if (aIsCurrent !== bIsCurrent) return bIsCurrent - aIsCurrent;
      return (b.credit || 0) - (a.credit || 0);
    });

    const maskedKeys = sortedKeys.map((k, idx) => {
      const p = (k.provider || 'kie.ai') as MusicProvider;
      const required = p === 'kie.ai' ? 12 : p === 'apiframe' ? 11 : 10;
      return {
        id: k.id,
        index: idx + 1,
        maskedKey: maskKey(k.key),
        key: k.key,
        provider: p,
        credit: k.credit,
        isEligible: (k.credit || 0) >= required,
        status: k.status,
        errorMessage: k.errorMessage,
        lastChecked: k.lastChecked,
        createdAt: k.createdAt,
      };
    });

    const activeKey = providerKeys.find((k) => k.status === 'active')?.key || sortedKeys[0]?.key || '';

    return {
      hasKey,
      isByok,
      keyCount: providerKeys.length,
      totalKeysCount: allUserKeys.length,
      totalCredits: hasKeys ? totalCredits : 0,
      maxSingleKeyCredit,
      hasEligibleKey,
      eligibleKeyCount,
      maskedKey: maskKey(activeKey),
      keys: maskedKeys,
      provider: activeProvider,
      providerStats,
    };
  }

  // --- Music Tasks ---
  getTasks(userId?: string): MusicTask[] {
    this.ensureLoaded();
    if (!userId) return [];
    return (this.data.music_tasks || [])
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getTaskById(id: string, userId?: string): MusicTask | undefined {
    this.ensureLoaded();
    const task = this.data.music_tasks.find((t) => t.id === id || t.kie_task_id === id);
    if (task && userId && task.user_id && task.user_id !== userId) {
      return undefined;
    }
    return task;
  }

  addTask(task: Omit<MusicTask, 'created_at'>): MusicTask {
    this.ensureLoaded();
    const newTask: MusicTask = {
      ...task,
      created_at: new Date().toISOString(),
    };
    this.data.music_tasks.unshift(newTask);
    this.save();
    return newTask;
  }

  updateTask(id: string, updates: Partial<MusicTask>): MusicTask | undefined {
    this.ensureLoaded();
    const index = this.data.music_tasks.findIndex((t) => t.id === id || t.kie_task_id === id);
    if (index === -1) return undefined;
    this.data.music_tasks[index] = {
      ...this.data.music_tasks[index],
      ...updates,
    };
    this.save();
    return this.data.music_tasks[index];
  }

  // --- Music Tracks ---
  getTracks(filter?: { search?: string; filterType?: string }, userId?: string): MusicTrack[] {
    this.ensureLoaded();
    if (!userId) return [];
    if (!this.data.seeded_users) {
      this.data.seeded_users = [];
    }

    let result = (this.data.music_tracks || []).filter(
      (t) => !t.user_id || t.user_id === userId || (userId && t.user_id === 'user-guest')
    );

    if (!this.data.seeded_users.includes(userId)) {
      this.data.seeded_users.push(userId);
      if (result.length === 0) {
        DEFAULT_TRACKS_SEED.forEach((seed, idx) => {
          const newTrack: MusicTrack = {
            ...seed,
            user_id: userId,
            id: `seed-track-${idx + 1}-${userId.slice(-6)}`,
            download_count: 0,
            created_at: new Date(Date.now() - (idx + 1) * 7200000).toISOString(),
            workspace: 'My Workspace',
          };
          this.data.music_tracks.unshift(newTrack);
        });
        result = (this.data.music_tracks || []).filter(
          (t) => !t.user_id || t.user_id === userId || (userId && t.user_id === 'user-guest')
        );
      }
      this.save();
    }

    if (filter?.filterType === 'Disukai') {
      result = result.filter((t) => t.is_favorite);
    } else if (filter?.filterType === 'Unduh') {
      result = result.filter((t) => (t.download_count || 0) > 0);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.style || '').toLowerCase().includes(q) ||
          (t.prompt || '').toLowerCase().includes(q) ||
          (Array.isArray(t.tags) && t.tags.some((tag) => (tag || '').toLowerCase().includes(q)))
      );
    }

    return result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getTrackById(id: string, userId?: string): MusicTrack | undefined {
    this.ensureLoaded();
    const track = this.data.music_tracks.find((t) => t.id === id || t.audio_id === id);
    if (track && userId && track.user_id && track.user_id !== userId) {
      return undefined;
    }
    return track;
  }

  addTrack(track: Partial<MusicTrack> & { title?: string }): MusicTrack {
    this.ensureLoaded();
    const uniqueId = `track-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const coverImages = [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    ];
    const fallbackCover = coverImages[Math.floor(Math.random() * coverImages.length)];
    const rawAudio = track.audio_url || track.stream_audio_url || '';
    const proxiedStreamUrl = rawAudio.startsWith('http') && !rawAudio.includes('/api/proxy/audio')
      ? `/api/proxy/audio?url=${encodeURIComponent(track.stream_audio_url || rawAudio)}`
      : track.stream_audio_url || rawAudio;

    const newTrack: MusicTrack = {
      user_id: track.user_id || 'user-guest',
      id: track.id || uniqueId,
      task_id: track.task_id || `task-${uniqueId}`,
      audio_id: track.audio_id || `audio-${uniqueId}`,
      audio_url: rawAudio,
      stream_audio_url: proxiedStreamUrl,
      cover_url: track.cover_url || fallbackCover,
      title: (track.title || 'Lagu Baru').trim(),
      duration: typeof track.duration === 'number' && track.duration > 0 ? track.duration : 180,
      lyrics: track.lyrics || '',
      prompt: track.prompt || track.lyrics || track.title || '',
      style: track.style || 'Pop Indonesia',
      model: track.model || 'Audio Input',
      tags: Array.isArray(track.tags) && track.tags.length > 0 ? track.tags : [track.style || 'Pop Indonesia', 'Audio Input'].filter(Boolean),
      vocal_gender: track.vocal_gender || 'Any',
      instrumental: Boolean(track.instrumental),
      is_favorite: Boolean(track.is_favorite),
      mastering_preset: track.mastering_preset || 'Studio Warmth',
      tempo_speed: typeof track.tempo_speed === 'number' ? track.tempo_speed : 1.0,
      vocal_preset: track.vocal_preset || 'Normal',
      vocal_pitch: typeof track.vocal_pitch === 'number' ? track.vocal_pitch : 0,
      vocal_intensity: typeof track.vocal_intensity === 'number' ? track.vocal_intensity : 80,
      preserves_pitch: track.preserves_pitch !== undefined ? Boolean(track.preserves_pitch) : true,
      workspace: track.workspace || 'My Workspace',
      download_count: typeof track.download_count === 'number' ? track.download_count : 0,
      created_at: track.created_at || new Date().toISOString(),
      is_remix: Boolean(track.is_remix),
      original_audio_url: track.original_audio_url || rawAudio,
    };
    this.data.music_tracks.unshift(newTrack);
    this.save();
    return newTrack;
  }

  updateTrack(id: string, updates: Partial<MusicTrack>, userId?: string): MusicTrack | undefined {
    this.ensureLoaded();
    const index = this.data.music_tracks.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    if (userId && this.data.music_tracks[index].user_id && this.data.music_tracks[index].user_id !== userId) {
      return undefined;
    }
    this.data.music_tracks[index] = {
      ...this.data.music_tracks[index],
      ...updates,
    };
    this.save();
    return this.data.music_tracks[index];
  }

  deleteTrack(id: string, userId?: string): boolean {
    this.ensureLoaded();
    if (!this.data.seeded_users) {
      this.data.seeded_users = [];
    }
    if (userId && !this.data.seeded_users.includes(userId)) {
      this.data.seeded_users.push(userId);
    }
    const prevLen = this.data.music_tracks.length;
    this.data.music_tracks = this.data.music_tracks.filter(
      (t) => !(t.id === id && (!userId || !t.user_id || t.user_id === userId))
    );
    const deleted = this.data.music_tracks.length < prevLen;
    if (deleted) this.save();
    return deleted;
  }

  removeFromWorkspace(id: string, userId?: string): boolean {
    this.ensureLoaded();
    const track = this.data.music_tracks.find(
      (t) => t.id === id && (!userId || !t.user_id || t.user_id === userId)
    );
    if (!track) return false;
    track.workspace = 'hidden';
    this.save();
    return true;
  }

  clearWorkspace(userId?: string): number {
    this.ensureLoaded();
    let count = 0;
    this.data.music_tracks.forEach((t) => {
      if ((!userId || !t.user_id || t.user_id === userId) && t.workspace !== 'hidden') {
        t.workspace = 'hidden';
        count++;
      }
    });
    if (count > 0) this.save();
    return count;
  }

  restoreToWorkspace(id: string, userId?: string): boolean {
    this.ensureLoaded();
    const track = this.data.music_tracks.find(
      (t) => t.id === id && (!userId || !t.user_id || t.user_id === userId)
    );
    if (!track) return false;
    track.workspace = 'My Workspace';
    this.save();
    return true;
  }

  deleteAllTracks(userId?: string): number {
    this.ensureLoaded();
    if (!this.data.seeded_users) {
      this.data.seeded_users = [];
    }
    if (userId && !this.data.seeded_users.includes(userId)) {
      this.data.seeded_users.push(userId);
    }
    const prevLen = this.data.music_tracks.length;
    if (!userId) {
      this.data.music_tracks = [];
    } else {
      this.data.music_tracks = this.data.music_tracks.filter(
        (t) => t.user_id && t.user_id !== userId
      );
    }
    const deletedCount = prevLen - this.data.music_tracks.length;
    if (deletedCount > 0) this.save();
    return deletedCount;
  }

  // --- Lyrics ---
  getLyrics(userId?: string): LyricsRecord[] {
    if (!userId) return [];
    return (this.data.lyrics || [])
      .filter((l) => l.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addLyrics(lyrics: Omit<LyricsRecord, 'id' | 'created_at'>): LyricsRecord {
    const record: LyricsRecord = {
      ...lyrics,
      id: `lyrics-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    this.data.lyrics.unshift(record);
    this.save();
    return record;
  }

  // --- Covers & Videos ---
  addCover(cover: Omit<CoverRecord, 'id' | 'created_at'>): CoverRecord {
    const record: CoverRecord = {
      ...cover,
      id: `cover-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.data.covers.unshift(record);
    this.save();
    return record;
  }

  addMusicVideo(video: Omit<MusicVideoRecord, 'id' | 'created_at'>): MusicVideoRecord {
    const record: MusicVideoRecord = {
      ...video,
      id: `video-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.data.music_videos.unshift(record);
    this.save();
    return record;
  }

  getMusicVideos(): MusicVideoRecord[] {
    return this.data.music_videos;
  }
}

// Global singleton instance
export const db = new Database();
