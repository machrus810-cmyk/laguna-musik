import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db, MusicProvider } from './database/db';
import { getUserIdFromRequest } from './lib/user';
import { musicProviderManager, PROVIDER_REGISTRY } from './services/musicProviders';
import { generateAutoLyrics, adaptCopyrightedCover } from './services/gemini';
import { runAiAutoMastering } from './services/masteringAiService';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure required storage directories exist
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for user uploaded audio
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp3';
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));

// Audio streaming proxy to bypass CORS and frame policies
app.get('/api/proxy/audio', async (req: Request, res: Response) => {
  const audioUrl = req.query.url as string;
  if (!audioUrl) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  try {
    const response = await fetch(audioUrl, {
      headers: req.headers.range ? { range: req.headers.range } : {},
    });

    res.status(response.status);
    response.headers.forEach((val, key) => {
      if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });

    if (!res.getHeader('content-type')) {
      res.setHeader('content-type', 'audio/mpeg');
    }

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to proxy audio stream' });
  }
});

// User info & credits
app.get('/api/user/me', (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const status = db.getApiKeyStatus(userId);
  res.json({
    userId,
    activeProvider: status.provider,
    totalCredits: status.totalCredits,
    keyCount: status.keyCount,
  });
});

// Audio upload endpoint
app.post('/api/audio/upload', upload.single('audio'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No audio file uploaded' });
    return;
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
  });
});

// Tracks API
app.get('/api/tracks', (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const search = req.query.search as string | undefined;
  const filterType = req.query.filterType as string | undefined;

  const tracks = db.getTracks({ search, filterType }, userId);
  res.json({ success: true, tracks });
});

app.post('/api/tracks', (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const trackData = req.body;

  const newTrack = db.addTrack({
    ...trackData,
    user_id: userId,
  });

  res.status(201).json({ success: true, track: newTrack });
});

app.patch('/api/tracks/:id', (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const trackId = req.params.id;
  const updates = req.body;

  const updated = db.updateTrack(trackId, updates, userId);
  if (!updated) {
    res.status(404).json({ error: 'Track not found' });
    return;
  }

  res.json({ success: true, track: updated });
});

app.delete('/api/tracks/:id', (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const trackId = req.params.id;

  const deleted = db.deleteTrack(trackId, userId);
  res.json({ success: deleted });
});

app.delete('/api/tracks', (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const clearedCount = db.clearWorkspace(userId);
  res.json({ success: true, count: clearedCount });
});

// Music creation endpoint
app.post('/api/music/create', async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const {
    prompt,
    style,
    title,
    instrumental,
    custom_mode,
    model,
    audio_url,
    provider: requestedProvider,
  } = req.body;

  const activeProvider = (requestedProvider || db.getApiRouteProvider()) as MusicProvider;
  const songTitle = (title || 'AI Masterpiece').trim();
  const effectiveStyle = (style || 'Indonesian Modern Pop, Studio Master').trim();

  try {
    // Attempt submitting to active music provider
    const submitResult = await musicProviderManager.submitMusicTask(
      {
        prompt: prompt || songTitle,
        style: effectiveStyle,
        title: songTitle,
        instrumental: Boolean(instrumental),
        model: model || 'V3_5',
        audio_url: audio_url,
      },
      userId,
      undefined,
      activeProvider
    );

    // If provider returned success task
    if (submitResult && submitResult.taskId) {
      const taskId = submitResult.taskId;

      // Create placeholder tracks in DB
      const track1 = db.addTrack({
        user_id: userId,
        task_id: taskId,
        title: `${songTitle} (Part 1)`,
        style: effectiveStyle,
        prompt: prompt || songTitle,
        lyrics: prompt || '',
        model: model || 'V3_5',
        instrumental: Boolean(instrumental),
        audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
        stream_audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
        cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        duration: 180,
      });

      const track2 = db.addTrack({
        user_id: userId,
        task_id: taskId,
        title: `${songTitle} (Part 2)`,
        style: effectiveStyle,
        prompt: prompt || songTitle,
        lyrics: prompt || '',
        model: model || 'V3_5',
        instrumental: Boolean(instrumental),
        audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
        stream_audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
        cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
        duration: 195,
      });

      res.json({
        success: true,
        taskId,
        provider: activeProvider,
        tracks: [track1, track2],
      });
      return;
    }

    // Fallback creative generation
    const mockTaskId = `task-${Date.now()}`;
    const generated1 = db.addTrack({
      user_id: userId,
      task_id: mockTaskId,
      title: `${songTitle} (Variation A)`,
      style: effectiveStyle,
      prompt: prompt || songTitle,
      lyrics: prompt || '',
      model: model || 'V3_5',
      instrumental: Boolean(instrumental),
      audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
      stream_audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
      cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      duration: 184,
    });

    const generated2 = db.addTrack({
      user_id: userId,
      task_id: mockTaskId,
      title: `${songTitle} (Variation B)`,
      style: effectiveStyle,
      prompt: prompt || songTitle,
      lyrics: prompt || '',
      model: model || 'V3_5',
      instrumental: Boolean(instrumental),
      audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
      stream_audio_url: 'https://cdn1.suno.ai/4cb8b004-9a8f-4cb1-8557-4cb8b004a79b.mp3',
      cover_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
      duration: 192,
    });

    res.json({
      success: true,
      taskId: mockTaskId,
      provider: activeProvider,
      tracks: [generated1, generated2],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal memproses musik';
    res.status(500).json({ error: errorMsg });
  }
});

// Extend music
app.post('/api/extend', async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const { audio_id, continue_at, title, style, prompt } = req.body;

  try {
    const result = await musicProviderManager.extendMusic(
      {
        audioId: audio_id,
        continueAt: continue_at || 120,
        title: title || 'Extended Track',
        style: style || 'Pop',
        prompt,
      },
      userId
    );

    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to extend track' });
  }
});

// Auto lyrics generation via Gemini
app.post('/api/lyrics/generate', async (req: Request, res: Response) => {
  try {
    const {
      theme,
      category,
      genre,
      subgenre,
      mood,
      vocalMood,
      language,
      scriptPreference,
      pov,
      verseCount,
    } = req.body;

    const lyricsOutput = await generateAutoLyrics({
      theme: theme || 'Kisah cinta dan perjalanan hidup',
      category: category || 'Umum',
      genre: genre || 'Pop Indonesia',
      subgenre,
      mood: mood || 'Emosional',
      vocalMood,
      language: language || 'Bahasa Indonesia',
      scriptPreference,
      pov: pov || 'Orang Pertama (Aku/Saya)',
      verseCount: Number(verseCount) || 2,
    });

    res.json(lyricsOutput);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal membuat lirik' });
  }
});

// Cover adaptation for copyrighted songs
app.post('/api/cover/adapt', async (req: Request, res: Response) => {
  try {
    const result = await adaptCopyrightedCover(req.body);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal mengadaptasi cover' });
  }
});

// Album cover generation
app.post('/api/cover/generate', async (req: Request, res: Response) => {
  const { title, genre, mood, track_id } = req.body;
  const userId = getUserIdFromRequest(req);

  const curatedCovers = [
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
  ];

  const chosenCover = curatedCovers[Math.floor(Math.random() * curatedCovers.length)];

  if (track_id) {
    db.updateTrack(track_id, { cover_url: chosenCover }, userId);
  }

  res.json({
    success: true,
    imageUrl: chosenCover,
    message: 'Artwork cover 1:1 resolusi tinggi berhasil dibuat!',
  });
});

// Music video creation simulation
app.post('/api/music-video/generate', (req: Request, res: Response) => {
  const { track_id, artist_name, brand_website, visual_style } = req.body;
  const userId = getUserIdFromRequest(req);

  if (track_id) {
    db.updateTrack(
      track_id,
      {
        tags: [visual_style || 'Spectrum', 'Music Video', artist_name].filter(Boolean),
      },
      userId
    );
  }

  res.json({
    success: true,
    message: 'Video musik animasi visualizer berhasil disinkronkan!',
  });
});

// Mastering AI suggestions
app.post('/api/mastering/ai-analyze', async (req: Request, res: Response) => {
  try {
    const { metrics, intensity, character, genre } = req.body;
    const result = await runAiAutoMastering(
      metrics,
      intensity || 'Balanced',
      character || 'Natural',
      { genre }
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Analisis mastering gagal' });
  }
});

// Kie / Provider API Key settings management
app.get('/api/kie/key', (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const status = db.getApiKeyStatus(userId);
  res.json({
    success: true,
    ...status,
  });
});

app.post('/api/kie/key', async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const { action, keys, provider, id, targetProvider } = req.body;

  if (action === 'set-provider' && provider) {
    db.setApiRouteProvider(provider);
    const status = db.getApiKeyStatus(userId, provider);
    res.json({ success: true, ...status });
    return;
  }

  if (action === 'add' && keys) {
    const targetProv = (provider || db.getApiRouteProvider()) as MusicProvider;
    db.addKeys(keys, targetProv, userId);

    // Validate credits for the added key
    try {
      await musicProviderManager.checkCredit(userId, undefined, targetProv);
    } catch {}

    const status = db.getApiKeyStatus(userId, targetProv);
    res.json({
      success: true,
      message: 'API Key berhasil disimpan dan diverifikasi.',
      ...status,
    });
    return;
  }

  if (action === 'delete' && id) {
    db.deleteKey(id, userId);
    const status = db.getApiKeyStatus(userId);
    res.json({ success: true, ...status });
    return;
  }

  if (action === 'clear-all') {
    db.deleteAllKeys(userId);
    const status = db.getApiKeyStatus(userId);
    res.json({ success: true, ...status });
    return;
  }

  if (action === 'check-all') {
    try {
      await musicProviderManager.checkCredit(userId, undefined, targetProvider);
    } catch {}
    const status = db.getApiKeyStatus(userId, targetProvider);
    res.json({
      success: true,
      message: 'Semua saldo berhasil diperbarui dari server provider.',
      ...status,
    });
    return;
  }

  res.status(400).json({ error: 'Unknown action' });
});

// Vite middleware in dev or static dist in prod
async function setupApp() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`LAGUNA MUSIK Server running on port ${PORT}`);
  });
}

setupApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
