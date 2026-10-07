// Fal.ai Music Generation API Service
// Supports MiniMax Music (fal-ai/minimax-music) and Stable Audio (fal-ai/stable-audio)
import { db, StoredApiKey } from '@/database/db';
import { resolvePublicAudioUrl } from '@/lib/publicAudioHosting';
import {
  KieCreditResponse,
  KieTaskSubmitParams,
  KieTaskSubmitResult,
  KieRecordResult,
} from './kie';

const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_API_BASE = 'https://api.fal.ai';

export class FalService {
  private formatKey(rawKey: string): string {
    const trimmed = rawKey.trim();
    if (trimmed.startsWith('Key ')) {
      return trimmed.substring(4).trim();
    }
    return trimmed;
  }

  private getEffectiveKey(userId: string = 'user-default', customKey?: string): string {
    if (customKey && customKey.trim().length > 0) {
      return this.formatKey(customKey);
    }
    const activeKeys = db.getOrderedActiveKeys(userId, 'fal.ai');
    if (activeKeys.length > 0 && activeKeys[0].key) {
      return this.formatKey(activeKeys[0].key);
    }
    return '';
  }

  private translateError(status: number, defaultMsg?: string): string {
    switch (status) {
      case 401:
      case 403:
        return 'API Key Fal.ai tidak valid atau unauthorized. Periksa kembali API Key Anda di fal.ai/dashboard/keys.';
      case 402:
        return 'Saldo kredit Fal.ai habis. Silakan top-up saldo akun Anda di fal.ai/dashboard/billing.';
      case 429:
        return 'Terlalu banyak permintaan ke Fal.ai (Rate Limit). Silakan tunggu sebentar.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server Fal.ai sedang sibuk atau mengalami antrean padat.';
      default:
        return defaultMsg || `Terjadi kendala pada server Fal.ai (Status ${status}).`;
    }
  }

  async checkCredit(userId: string = 'user-default', customKey?: string): Promise<KieCreditResponse> {
    const key = this.getEffectiveKey(userId, customKey);
    if (!key) {
      return {
        success: false,
        credits: 0,
        message: 'API Key Fal.ai belum dikonfigurasi. Masukkan API Key di Pengaturan.',
        code: 401,
      };
    }
    try {
      const billingRes = await fetch(`${FAL_API_BASE}/v1/account/billing`, {
        method: 'GET',
        headers: {
          Authorization: `Key ${key}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      if (billingRes.ok) {
        const data = await billingRes.json();
        let balance = typeof data.balance === 'number' ? data.balance : 10;
        balance = Math.round(balance * 100) / 100;
        const matchingKey = db.getAllKeys(userId, 'fal.ai').find((k) => this.formatKey(k.key) === key);
        if (matchingKey) {
          db.updateKey(matchingKey.id, {
            credit: balance,
            status: balance <= 0 ? 'exhausted' : 'active',
            errorMessage: undefined,
            lastChecked: new Date().toISOString(),
          });
        }
        return {
          success: true,
          credits: balance,
          message: `API Key Fal.ai aktif! Saldo akun: $${balance} USD.`,
          code: 200,
        };
      }

      const modelsRes = await fetch(`${FAL_API_BASE}/v1/models`, {
        method: 'GET',
        headers: {
          Authorization: `Key ${key}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (modelsRes.status === 401) {
        const matchingKey = db.getAllKeys(userId, 'fal.ai').find((k) => this.formatKey(k.key) === key);
        if (matchingKey) {
          db.updateKey(matchingKey.id, {
            status: 'error',
            errorMessage: 'API Key Fal.ai tidak valid atau unauthorized (401).',
            lastChecked: new Date().toISOString(),
          });
        }
        return {
          success: false,
          credits: 0,
          message: 'API Key Fal.ai tidak valid atau ditolak (401).',
          code: 401,
        };
      }

      const existingKey = db.getAllKeys(userId, 'fal.ai').find((k) => this.formatKey(k.key) === key);
      const currentCredit = (existingKey?.credit && existingKey.credit > 0) ? existingKey.credit : 10;
      if (existingKey) {
        db.updateKey(existingKey.id, {
          status: 'active',
          credit: currentCredit,
          errorMessage: undefined,
          lastChecked: new Date().toISOString(),
        });
      }
      return {
        success: true,
        credits: currentCredit,
        message: 'API Key Fal.ai aktif dan siap digunakan untuk pembuatan musik.',
        code: 200,
      };
    } catch (e: unknown) {
      const err = e as Error;
      return {
        success: false,
        credits: 0,
        message: `Gagal memverifikasi Fal.ai: ${err.message}`,
        code: 500,
      };
    }
  }

  async submitMusicTask(
    params: KieTaskSubmitParams,
    userId: string = 'user-default',
    customKey?: string,
    customOrigin?: string
  ): Promise<KieTaskSubmitResult> {
    const keysToTry: string[] = [];
    if (customKey && customKey.trim()) {
      keysToTry.push(this.formatKey(customKey));
    } else {
      const activeKeys = db.getOrderedActiveKeys(userId, 'fal.ai');
      for (const k of activeKeys) {
        if (k.key) {
          keysToTry.push(this.formatKey(k.key));
        }
      }
    }

    if (keysToTry.length === 0) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: 'Tidak ada API Key Fal.ai aktif. Silakan tambahkan API Key Fal.ai di menu Pengaturan.',
      };
    }

    let modelId = 'fal-ai/minimax-music';
    if (params.model && params.model.includes('stable-audio')) {
      modelId = 'fal-ai/stable-audio';
    }

    let lyricsPrompt = params.prompt || '';
    if (params.instrumental) {
      lyricsPrompt = '[Instrumental - No Vocals]';
    }

    const payload: Record<string, unknown> = {
      prompt: params.style || 'Modern Pop Song, melodic, high quality studio recording',
      lyrics_prompt: lyricsPrompt || 'La la la, wonderful melodies echoing in the rhythm of life',
    };

    let lastErrorMessage = '';
    for (let i = 0; i < keysToTry.length; i++) {
      const activeKey = keysToTry[i];
      try {
        const res = await fetch(`${FAL_QUEUE_BASE}/${modelId}`, {
          method: 'POST',
          headers: {
            Authorization: `Key ${activeKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && (json.request_id || json.id)) {
          return {
            success: true,
            status: 'QUEUED',
            taskId: json.request_id || json.id,
            usedKey: activeKey,
          };
        }
        lastErrorMessage = json.detail || json.message || this.translateError(res.status);
      } catch (err: unknown) {
        lastErrorMessage = `Koneksi ke Fal.ai gagal: ${(err as Error).message}`;
      }
    }

    return {
      success: false,
      status: 'FAILED',
      errorMessage: lastErrorMessage || 'Gagal memproses pembuatan lagu di Fal.ai.',
    };
  }

  async pollRecordInfo(taskId: string, userId: string = 'user-default', customKey?: string): Promise<KieRecordResult> {
    const candidateKeys: string[] = [];
    if (customKey && customKey.trim()) {
      candidateKeys.push(this.formatKey(customKey));
    }
    const falKeys = db.getOrderedActiveKeys(userId, 'fal.ai');
    for (const k of falKeys) {
      if (k.key) candidateKeys.push(this.formatKey(k.key));
    }

    if (candidateKeys.length === 0) {
      return {
        success: false,
        status: 'FAILED',
        taskId,
        errorMessage: 'API Key Fal.ai belum dikonfigurasi.',
      };
    }

    const modelCandidates = ['fal-ai/minimax-music', 'fal-ai/stable-audio'];
    for (const key of candidateKeys) {
      for (const modelId of modelCandidates) {
        try {
          const statusRes = await fetch(`${FAL_QUEUE_BASE}/${modelId}/requests/${encodeURIComponent(taskId)}/status`, {
            method: 'GET',
            headers: {
              Authorization: `Key ${key}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
          });
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            const falStatus = String(statusJson.status || '').toUpperCase();
            if (falStatus === 'IN_QUEUE' || falStatus === 'IN_PROGRESS') {
              return {
                success: true,
                status: 'GENERATING',
                taskId,
              };
            }
            if (falStatus === 'COMPLETED') {
              const resultRes = await fetch(`${FAL_QUEUE_BASE}/${modelId}/requests/${encodeURIComponent(taskId)}`, {
                method: 'GET',
                headers: {
                  Authorization: `Key ${key}`,
                  Accept: 'application/json',
                },
                cache: 'no-store',
              });
              if (resultRes.ok) {
                const resJson = await resultRes.json();
                const audioObj = resJson.audio || resJson.output?.audio || resJson.data?.audio;
                const audioUrl = typeof audioObj === 'string' ? audioObj : audioObj?.url;
                if (audioUrl) {
                  return {
                    success: true,
                    status: 'SUCCESS',
                    taskId,
                    audioUrl,
                    streamAudioUrl: `/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`,
                    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
                    duration: resJson.duration || 180,
                    title: resJson.title || 'Fal.ai MiniMax Music',
                  };
                }
              }
            }
            if (falStatus === 'FAILED' || falStatus === 'ERROR') {
              return {
                success: false,
                status: 'FAILED',
                taskId,
                errorMessage: statusJson.error || statusJson.detail || 'Fal.ai gagal memproses lagu.',
              };
            }
          }
        } catch (e) {
          console.warn('Fal poll error:', e);
        }
      }
    }

    return {
      success: true,
      status: 'GENERATING',
      taskId,
    };
  }

  async extendMusic(params: any, userId: string = 'user-default', customKey?: string): Promise<KieTaskSubmitResult> {
    return this.submitMusicTask(params, userId, customKey);
  }
}

export const falService = new FalService();
