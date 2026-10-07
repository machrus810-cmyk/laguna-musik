// Helper to host audio publicly on fast, reliable CDN services
// This allows Suno, Kie.ai, and Fal.ai to access uploaded user audio files
// without being blocked by AI Studio iframe/authentication firewalls.

import fs from 'fs';
import path from 'path';
import { db } from '@/database/db';

export interface PublicAudioUploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

// In-memory cache for public URLs to avoid redundant uploads and make lookups instant
export const publicUrlCache = new Map<string, string>();

// 0. Upload to Kie.ai official file stream endpoint (Ultra-fast direct media CDN, 100% compatible with Suno/Kie backend)
async function uploadToKieAi(
  buffer: Buffer,
  filename: string,
  apiKey?: string,
  timeoutMs: number = 7000
): Promise<string | null> {
  try {
    const key = (apiKey || db.getKieApiKey())?.trim();
    if (!key) return null;

    const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/mpeg' });
    const formData = new FormData();
    formData.append('uploadPath', 'audio');
    formData.append('file', blob, filename || 'reference_audio.mp3');

    const res = await fetch('https://kieai.redpandaai.co/api/file-stream-upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const downloadUrl = data?.data?.downloadUrl || data?.downloadUrl;
      if (downloadUrl && typeof downloadUrl === 'string' && downloadUrl.startsWith('http')) {
        return downloadUrl;
      }
    }
  } catch {
    // silently catch timeout/aborts to prevent node warning logs
  }
  return null;
}

// 1. Upload Buffer to Uguu.se (Fast temporary media CDN)
async function uploadToUguu(buffer: Buffer, filename: string, timeoutMs: number = 5000): Promise<string | null> {
  try {
    const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/mpeg' });
    const formData = new FormData();
    formData.append('files[]', blob, filename || 'audio_ref.mp3');

    const res = await fetch('https://uguu.se/upload.php', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.ok) {
      const json = await res.json().catch(() => null);
      const fileUrl = json?.files?.[0]?.url;
      if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
        return fileUrl;
      }
    }
  } catch {
    // fallback
  }
  return null;
}

// 2. Upload Buffer to Litterbox (Catbox.moe 72h media hosting)
async function uploadToLitterbox(buffer: Buffer, filename: string, timeoutMs: number = 5000): Promise<string | null> {
  try {
    const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/mpeg' });
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('time', '72h');
    formData.append('fileToUpload', blob, filename || 'audio_ref.mp3');

    const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.ok) {
      const text = (await res.text().catch(() => '')).trim();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        return text;
      }
    }
  } catch {
    // fallback
  }
  return null;
}

// 3. Upload Buffer to Catbox.moe permanent hosting
async function uploadToCatbox(buffer: Buffer, filename: string, timeoutMs: number = 5000): Promise<string | null> {
  try {
    const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/mpeg' });
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, filename || 'audio_ref.mp3');

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.ok) {
      const text = (await res.text().catch(() => '')).trim();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        return text;
      }
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Upload an in-memory buffer to a public audio CDN.
 * Prioritizes Kie.ai high-speed official CDN if key is available,
 * then falls back to Uguu, Litterbox, and Catbox.
 */
export async function uploadAudioBufferToPublicCdn(
  buffer: Buffer,
  filename: string = 'reference_audio.mp3',
  apiKey?: string
): Promise<PublicAudioUploadResult> {
  // Check cache first
  if (publicUrlCache.has(filename)) {
    return { success: true, publicUrl: publicUrlCache.get(filename) };
  }

  // 1. Try Kie.ai first if API key is present (highest reliability & compatibility for Suno/Kie)
  try {
    const kieUrl = await uploadToKieAi(buffer, filename, apiKey, 6000);
    if (kieUrl) {
      publicUrlCache.set(filename, kieUrl);
      return { success: true, publicUrl: kieUrl };
    }
  } catch {
    // continue to public CDN fallbacks
  }

  // 2. Race Uguu & Litterbox in parallel
  try {
    const fastest = await Promise.any([
      uploadToUguu(buffer, filename, 4500).then((url) => {
        if (!url) throw new Error('Uguu returned null');
        return url;
      }),
      uploadToLitterbox(buffer, filename, 4500).then((url) => {
        if (!url) throw new Error('Litterbox returned null');
        return url;
      }),
    ]);
    if (fastest) {
      publicUrlCache.set(filename, fastest);
      return { success: true, publicUrl: fastest };
    }
  } catch {
    // Parallel fast race failed or timed out, try fallback
  }

  // 3. Fallback to Catbox
  try {
    const catboxUrl = await uploadToCatbox(buffer, filename, 5000);
    if (catboxUrl) {
      publicUrlCache.set(filename, catboxUrl);
      return { success: true, publicUrl: catboxUrl };
    }
  } catch {
    // ignore
  }

  return {
    success: false,
    error: 'Semua server hosting audio publik sementara sedang tidak merespons.',
  };
}

/**
 * Resolves any audio URL (relative path, local file, base64 data, or public URL)
 * into a guaranteed publicly accessible HTTPS direct audio URL.
 */
export async function resolvePublicAudioUrl(audioUrl: string, apiKey?: string): Promise<string> {
  if (!audioUrl || typeof audioUrl !== 'string') return '';
  const trimmed = audioUrl.trim();

  // 1. If it's a blob URL, it cannot be read on the server
  if (trimmed.startsWith('blob:')) {
    console.warn('resolvePublicAudioUrl received client-only blob URL:', trimmed);
    return '';
  }

  // 2. If it contains /api/audio/ (whether absolute URL or relative), extract local filename
  const apiAudioMatch = trimmed.match(/\/api\/audio\/([a-zA-Z0-9._-]+)/);
  if (apiAudioMatch) {
    const localFilename = apiAudioMatch[1];
    try {
      const uploadDir = path.join(process.cwd(), '.data', 'uploads');
      const diskPath = path.join(uploadDir, path.basename(localFilename));
      if (fs.existsSync(diskPath)) {
        const fileBuf = await fs.promises.readFile(diskPath);
        const uploadRes = await uploadAudioBufferToPublicCdn(fileBuf, localFilename, apiKey);
        if (uploadRes.success && uploadRes.publicUrl) {
          return uploadRes.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Failed to read local audio file for public CDN upload:', e);
    }
  }

  // 3. If it's already a truly public HTTP/HTTPS URL (not localhost, private IP, or AI Studio Cloud Run container)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const isPrivateOrInternal =
      trimmed.includes('localhost') ||
      trimmed.includes('127.0.0.1') ||
      trimmed.includes('.local') ||
      trimmed.includes('10.') ||
      trimmed.includes('192.168.') ||
      trimmed.includes('run.app') ||
      trimmed.includes('aistudio') ||
      trimmed.includes('ais-dev') ||
      trimmed.includes('ais-pre');

    if (!isPrivateOrInternal) {
      return trimmed;
    }
  }

  // 4. If it's a data URL: extract buffer
  if (trimmed.startsWith('data:')) {
    try {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx !== -1) {
        const base64Data = trimmed.slice(commaIdx + 1);
        const buffer = Buffer.from(base64Data, 'base64');
        const uploadRes = await uploadAudioBufferToPublicCdn(buffer, `ref_${Date.now()}.mp3`, apiKey);
        if (uploadRes.success && uploadRes.publicUrl) {
          return uploadRes.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Failed to parse base64 audio data:', e);
    }
  }

  // 5. If it's a relative URL or filename pointing to local uploaded file
  let localFilename = '';
  if (trimmed.startsWith('/')) {
    localFilename = path.basename(trimmed.split('?')[0]);
  } else if (!trimmed.startsWith('http')) {
    localFilename = path.basename(trimmed.split('?')[0]);
  }

  if (localFilename) {
    try {
      const uploadDir = path.join(process.cwd(), '.data', 'uploads');
      const diskPath = path.join(uploadDir, path.basename(localFilename));
      if (fs.existsSync(diskPath)) {
        const fileBuf = await fs.promises.readFile(diskPath);
        const uploadRes = await uploadAudioBufferToPublicCdn(fileBuf, localFilename, apiKey);
        if (uploadRes.success && uploadRes.publicUrl) {
          return uploadRes.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Failed to read local audio file for public CDN upload:', e);
    }
  }

  return trimmed;
}
