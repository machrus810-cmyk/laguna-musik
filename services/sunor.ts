// Sunor (sunor.cc) API Integration Service
import { db } from '@/database/db';
import { resolvePublicAudioUrl } from '@/lib/publicAudioHosting';
import {
  KieCreditResponse,
  KieTaskSubmitParams,
  KieTaskSubmitResult,
  KieRecordResult,
} from './kie';

const DEFAULT_SUNOR_URL = 'https://sunor.cc';

export class SunorService {
  private getBaseUrl(): string {
    return (process.env.SUNOR_API_BASE_URL || DEFAULT_SUNOR_URL).replace(/\/+$/, '');
  }

  private getEffectiveKey(userId: string = 'user-default', customKey?: string): string {
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim();
    }
    const activeKeys = db.getOrderedActiveKeys(userId, 'sunor');
    if (activeKeys.length > 0 && activeKeys[0].key) {
      return activeKeys[0].key.trim();
    }
    return '';
  }

  private translateError(status: number, defaultMsg?: string): string {
    switch (status) {
      case 401:
      case 403:
        return 'API Key Sunor tidak valid atau unauthorized. Periksa API Key di Pengaturan.';
      case 402:
        return 'Saldo kredit Sunor tidak mencukupi untuk membuat lagu. Silakan top up di sunor.cc.';
      case 429:
        return 'Server Sunor sedang menerima terlalu banyak permintaan (Rate Limit). Coba beberapa saat lagi.';
      default:
        return defaultMsg || `Terjadi kendala pada server Sunor (Status ${status}).`;
    }
  }

  async checkCredit(userId: string = 'user-default', customKey?: string): Promise<KieCreditResponse> {
    const key = this.getEffectiveKey(userId, customKey);
    if (!key) {
      return {
        success: false,
        credits: 0,
        message: 'API Key Sunor belum dikonfigurasi. Masukkan API Key di Pengaturan.',
        code: 401,
      };
    }
    const baseUrl = this.getBaseUrl();
    try {
      const probeRes = await fetch(`${baseUrl}/api/v1/task/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          'x-api-key': key,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      if (probeRes.status === 401 || probeRes.status === 403) {
        return {
          success: false,
          credits: 0,
          code: probeRes.status,
          message: 'API Key Sunor ditolak oleh sunor.cc (Status 401/403).',
        };
      }
      const existingKeys = db.getAllKeys(userId, 'sunor');
      const matched = existingKeys.find((k) => k.key.trim() === key.trim());
      const credits = matched && typeof matched.credit === 'number' && matched.credit > 0 ? matched.credit : 25;
      return {
        success: true,
        credits,
        code: 200,
        message: 'Koneksi ke Sunor berhasil! API Key aktif.',
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Koneksi ke sunor.cc terputus';
      return {
        success: false,
        credits: 0,
        code: 500,
        message: `Kendala koneksi ke sunor.cc: ${msg}`,
      };
    }
  }

  async submitMusicTask(params: KieTaskSubmitParams, userId: string = 'user-default', customKey?: string, customOrigin?: string): Promise<KieTaskSubmitResult> {
    const keysToTry: string[] = [];
    if (customKey && customKey.trim()) {
      keysToTry.push(customKey.trim());
    } else {
      const activeKeys = db.getOrderedActiveKeys(userId, 'sunor');
      for (const k of activeKeys) {
        if (k.key && !keysToTry.includes(k.key.trim())) {
          keysToTry.push(k.key.trim());
        }
      }
    }

    if (keysToTry.length === 0) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: 'API Key Sunor belum dikonfigurasi. Silakan masukkan API Key di menu Pengaturan.',
      };
    }

    const baseUrl = this.getBaseUrl();
    const lyricsOrPrompt = params.lyrics ? params.lyrics.trim() : (params.prompt || params.title).trim();
    const customMode = Boolean(params.lyrics && params.lyrics.trim().length > 0);
    const rawModel = (params.model || 'V6').toUpperCase();
    const mappedModel = rawModel.includes('V4') ? 'suno-v4' : rawModel.includes('V3') ? 'suno-v3.5' : 'suno-v6';

    let lastErrorMessage = '';
    for (const activeKey of keysToTry) {
      const payload = {
        model: 'suno',
        task_type: 'music',
        input: {
          prompt: lyricsOrPrompt,
          tags: params.style.trim() || 'pop',
          title: params.title.trim().slice(0, 80),
          make_instrumental: Boolean(params.instrumental),
          custom_mode: customMode,
          model: mappedModel,
          negative_tags: params.negative_tags || undefined,
        },
      };
      try {
        const res = await fetch(`${baseUrl}/api/v1/task`, {
          method: 'POST',
          headers: {
            'x-api-key': activeKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok || res.status === 202) {
          const json = await res.json();
          const taskId = json.data?.task_id || json.data?.taskId || json.data?.id || json.taskId || json.task_id || json.id;
          if (taskId) {
            return {
              success: true,
              taskId: String(taskId),
              status: 'QUEUED',
              usedKey: activeKey,
              data: json,
            };
          }
        } else {
          const errText = await res.text().catch(() => '');
          lastErrorMessage = this.translateError(res.status, errText);
        }
      } catch (e) {
        lastErrorMessage = e instanceof Error ? e.message : 'Koneksi ke sunor.cc terputus.';
      }
    }

    return {
      success: false,
      status: 'FAILED',
      errorMessage: lastErrorMessage || 'Gagal mengirim tugas generasi musik ke Sunor.',
    };
  }

  async pollRecordInfo(taskId: string, userId: string = 'user-default', customKey?: string): Promise<KieRecordResult> {
    const baseUrl = this.getBaseUrl();
    const candidateKeys: string[] = [];
    if (customKey && customKey.trim()) {
      candidateKeys.push(customKey.trim());
    }
    const sunorKeys = db.getOrderedActiveKeys(userId, 'sunor');
    for (const k of sunorKeys) {
      if (k.key && !candidateKeys.includes(k.key.trim())) {
        candidateKeys.push(k.key.trim());
      }
    }

    if (candidateKeys.length === 0) {
      return {
        success: false,
        status: 'FAILED',
        taskId,
        errorMessage: 'API Key Sunor belum dikonfigurasi.',
      };
    }

    const candidateUrls = [
      `${baseUrl}/api/v1/task/${encodeURIComponent(taskId)}`,
      `${baseUrl}/api/v1/task?id=${encodeURIComponent(taskId)}`,
    ];

    for (const key of candidateKeys) {
      for (const url of candidateUrls) {
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'x-api-key': key,
              Accept: 'application/json',
            },
            cache: 'no-store',
          });
          if (res.ok) {
            const json = await res.json();
            const data = json.data || json;
            const audioUrl = data.audio_url || data.audioUrl;
            const streamAudioUrl = data.stream_audio_url || data.streamAudioUrl || audioUrl;
            const coverUrl = data.image_large_url || data.image_url || data.cover_url;
            const title = data.title;
            const duration = data.duration;
            const lyrics = data.prompt || data.lyrics;
            const taskStatus = String(data.status || json.status || '').toLowerCase();

            if (taskStatus === 'success' || taskStatus === 'completed' || (audioUrl && audioUrl.startsWith('http'))) {
              return {
                success: true,
                status: 'SUCCESS',
                taskId,
                audioUrl,
                streamAudioUrl,
                coverUrl,
                title,
                duration: duration ? Math.round(duration) : undefined,
                lyrics,
              };
            }
            if (taskStatus === 'failed' || taskStatus === 'error') {
              return {
                success: false,
                status: 'FAILED',
                taskId,
                errorMessage: data.fail_reason || 'Generasi lagu gagal di Sunor.',
              };
            }
            return {
              success: true,
              status: 'GENERATING',
              taskId,
              audioUrl,
              streamAudioUrl,
              coverUrl,
              title,
              duration,
              lyrics,
            };
          }
        } catch {
          // continue
        }
      }
    }

    return {
      success: false,
      status: 'GENERATING',
      taskId,
      errorMessage: 'Sedang memproses antrean tugas di Sunor...',
    };
  }

  async extendMusic(params: any, userId: string = 'user-default', customKey?: string): Promise<KieTaskSubmitResult> {
    return this.submitMusicTask(params, userId, customKey);
  }
}

export const sunorService = new SunorService();
