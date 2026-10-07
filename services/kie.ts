// Kie.ai API integration service
// Handles credit queries, asynchronous music generation tasks, polling, and extends.

import { db } from '@/database/db';
import { resolvePublicAudioUrl } from '@/lib/publicAudioHosting';

export interface KieCreditResponse {
  success: boolean;
  credits: number;
  message?: string;
  code?: number;
  raw?: unknown;
}

export interface KieTaskSubmitParams {
  title: string;
  prompt?: string;
  lyrics?: string;
  style: string;
  negative_tags?: string;
  model: string;
  instrumental: boolean;
  vocal_gender?: 'Male' | 'Female' | 'Any';
  duration?: number;
  style_weight?: number;
  weirdness_constraint?: number;
  audio_weight?: number;
  persona_id?: string;
  continue_at?: number;
  continue_clip_id?: string;
  mode?: 'create' | 'remix';
  is_remix?: boolean;
  audio_url?: string;
  original_audio_url?: string;
  remix_fidelity?: 'strict' | 'flexible';
}

export interface KieTaskSubmitResult {
  success: boolean;
  taskId?: string;
  status: 'QUEUED' | 'GENERATING' | 'SUCCESS' | 'FAILED';
  creditsLeft?: number;
  errorMessage?: string;
  usedKey?: string;
  data?: unknown;
}

export interface KieRecordResult {
  success: boolean;
  status: 'QUEUED' | 'GENERATING' | 'SUCCESS' | 'FAILED';
  taskId: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  coverUrl?: string;
  title?: string;
  duration?: number;
  lyrics?: string;
  progress?: number;
  errorMessage?: string;
  refundStatus?: string;
}

const DEFAULT_KIE_URL = 'https://api.kie.ai';

export class KieService {
  private getBaseUrl(): string {
    return (process.env.KIE_API_BASE_URL || DEFAULT_KIE_URL).replace(/\/+$/, '');
  }

  private getEffectiveKey(userId: string = 'user-default', customKey?: string): string {
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim();
    }
    return db.getKieApiKey(userId, 'kie.ai');
  }

  private translateError(status: number, defaultMsg?: string): string {
    switch (status) {
      case 401:
        return 'API Key Kie.ai tidak valid atau kedaluwarsa. Periksa kembali API key di Pengaturan.';
      case 402:
        return 'Kredit Kie.ai tidak mencukupi untuk membuat lagu. Silakan isi ulang kredit di kie.ai.';
      case 429:
        return 'Server Kie.ai sedang menerima terlalu banyak permintaan (Rate Limit). Silakan tunggu sebentar.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server Kie.ai sedang sibuk atau mengalami kendala. Silakan coba lagi.';
      default:
        return defaultMsg || `Terjadi kesalahan dari Kie.ai (Status ${status}).`;
    }
  }

  async resolveHostedAudioUrl(audioUrl: string, activeKey: string, baseUrl: string, customOrigin?: string): Promise<string> {
    if (!audioUrl || typeof audioUrl !== 'string') return '';
    if (audioUrl.startsWith('blob:')) {
      return '';
    }
    try {
      const publicUrl = await resolvePublicAudioUrl(audioUrl, activeKey);
      if (
        publicUrl &&
        (publicUrl.startsWith('http://') || publicUrl.startsWith('https://')) &&
        !publicUrl.includes('localhost') &&
        !publicUrl.includes('run.app') &&
        !publicUrl.includes('127.0.0.1')
      ) {
        return publicUrl;
      }
    } catch (e) {
      console.warn('Error resolving public audio URL:', e);
    }

    const appUrl = (customOrigin || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
    if (audioUrl.startsWith('/')) {
      return appUrl && !appUrl.includes('localhost') && !appUrl.includes('run.app')
        ? `${appUrl}${audioUrl}`
        : audioUrl;
    }
    return audioUrl.startsWith('blob:') ? '' : audioUrl;
  }

  async checkCredit(userId: string = 'user-default', customKey?: string): Promise<KieCreditResponse> {
    const key = this.getEffectiveKey(userId, customKey);
    if (!key) {
      return {
        success: false,
        credits: 0,
        message: 'API Key Kie.ai belum dikonfigurasi. Masukkan API Key di menu Pengaturan.',
        code: 401,
      };
    }

    const baseUrl = this.getBaseUrl();
    const candidateEndpoints = [
      `${baseUrl}/api/v1/chat/credit`,
      `${baseUrl}/api/v1/generate/credit`,
    ];

    let lastError = '';
    let lastCode = 500;

    for (const url of candidateEndpoints) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.code && data.code !== 200) {
            return {
              success: false,
              credits: 0,
              code: data.code,
              message: data.msg || data.message || `Kie.ai Code ${data.code}`,
              raw: data,
            };
          }

          let creditVal = 0;
          if (typeof data.data === 'number') {
            creditVal = data.data;
          } else if (data.data && typeof data.data.credit === 'number') {
            creditVal = data.data.credit;
          } else if (typeof data.credit === 'number') {
            creditVal = data.credit;
          } else if (data.balance !== undefined) {
            creditVal = Number(data.balance);
          } else if (data.data?.balance !== undefined) {
            creditVal = Number(data.data.balance);
          }

          return {
            success: true,
            credits: creditVal,
            code: 200,
            raw: data,
          };
        } else {
          lastCode = res.status;
          const errText = await res.text().catch(() => '');
          lastError = this.translateError(res.status, errText);
          if (res.status === 401) {
            return {
              success: false,
              credits: 0,
              code: 401,
              message: 'API Key ditolak oleh Kie.ai (Status 401: Unauthorized). Pastikan key valid dan aktif.',
            };
          }
        }
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : 'Gagal menghubungi server Kie.ai';
      }
    }

    return {
      success: false,
      credits: 0,
      code: lastCode,
      message: lastError || 'Gagal memverifikasi saldo kredit ke Kie.ai.',
    };
  }

  async submitMusicTask(params: KieTaskSubmitParams, userId: string = 'user-default', customKey?: string, customOrigin?: string): Promise<KieTaskSubmitResult> {
    const keysToTry: string[] = [];
    if (customKey && customKey.trim()) {
      keysToTry.push(customKey.trim());
    } else {
      const activeKeys = db.getOrderedActiveKeys(userId, 'kie.ai');
      if (activeKeys.length > 0) {
        for (const k of activeKeys) {
          if (k.key && k.key.trim()) {
            keysToTry.push(k.key.trim());
          }
        }
      } else {
        const fallback = db.getKieApiKey(userId, 'kie.ai');
        if (fallback) keysToTry.push(fallback);
      }
    }

    if (keysToTry.length === 0) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: 'API Key Kie.ai belum dikonfigurasi. Silakan masukkan API Key di menu Pengaturan.',
      };
    }

    const baseUrl = this.getBaseUrl();
    const appUrl = (customOrigin || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
    const callbackUrl = appUrl && !appUrl.includes('localhost')
      ? `${appUrl}/api/webhooks/kie/music`
      : undefined;

    const lyricsOrPrompt = params.lyrics ? params.lyrics.trim() : (params.prompt || params.title).trim();
    const customMode = Boolean(params.lyrics && params.lyrics.trim().length > 0);

    const rawModel = params.model || 'V6';
    const subModel = rawModel.includes('V4') ? 'V4' : rawModel.includes('V3') ? 'V3_5' : 'V4';
    const isRemix = Boolean(params.is_remix || (params.audio_url && params.audio_url.trim().length > 0));
    const rawAudioRef = params.audio_url || params.original_audio_url || '';

    let lastErrorMessage = '';

    for (const activeKey of keysToTry) {
      let hostedAudioUrl = '';
      if (isRemix && rawAudioRef) {
        hostedAudioUrl = await this.resolveHostedAudioUrl(rawAudioRef, activeKey, baseUrl, customOrigin);
      }

      const vocalDesc = params.vocal_gender === 'Female'
        ? 'female vocals'
        : params.vocal_gender === 'Male'
        ? 'male vocals'
        : '';
      const strictCoverStyle = [
        params.style.trim(),
        vocalDesc,
        'authentic musical genre re-arrangement, strict cover style'
      ].filter(Boolean).join(', ');

      const strictCoverPrompt = params.lyrics && params.lyrics.trim().length > 0
        ? params.lyrics.trim()
        : `[Strict cover version of the uploaded reference track. Keep original melody, vocal notes, pitch, tempo BPM, and rhythm from the original reference audio strictly preserved. Adapt only the musical genre and arrangement to ${params.style}.]`;

      const strictNegativeTags = [
        params.negative_tags?.trim(),
        'out of tune, changed melody, wrong lyrics, different rhythm, changed tempo, altered melody, distorted pitch, modified bpm'
      ].filter(Boolean).join(', ');

      const attempts = isRemix && hostedAudioUrl ? [
        {
          url: `${baseUrl}/api/v1/jobs/createTask`,
          body: {
            model: 'ai-music-api/upload-and-cover-audio',
            ...(callbackUrl ? { callBackUrl: callbackUrl } : {}),
            input: {
              uploadUrl: hostedAudioUrl,
              upload_url: hostedAudioUrl,
              audio_url: hostedAudioUrl,
              audioUrl: hostedAudioUrl,
              style: strictCoverStyle,
              prompt: strictCoverPrompt,
              title: params.title.trim().slice(0, 80),
              customMode: true,
              custom_mode: true,
              instrumental: Boolean(params.instrumental),
              model: subModel,
              negative_tags: strictNegativeTags,
              negativeTags: strictNegativeTags,
            },
          },
        },
        {
          url: `${baseUrl}/api/v1/jobs/createTask`,
          body: {
            model: 'suno/music-cover',
            ...(callbackUrl ? { callBackUrl: callbackUrl } : {}),
            input: {
              audio_url: hostedAudioUrl,
              audioUrl: hostedAudioUrl,
              upload_url: hostedAudioUrl,
              uploadUrl: hostedAudioUrl,
              style: strictCoverStyle,
              tags: strictCoverStyle,
              prompt: strictCoverPrompt,
              title: params.title.trim().slice(0, 80),
              customMode: true,
              custom_mode: true,
              instrumental: Boolean(params.instrumental),
              model: subModel,
              negative_tags: strictNegativeTags,
              negativeTags: strictNegativeTags,
            },
          },
        },
      ] : [
        {
          url: `${baseUrl}/api/v1/jobs/createTask`,
          body: {
            model: 'ai-music-api/generate',
            ...(callbackUrl ? { callBackUrl: callbackUrl } : {}),
            input: {
              prompt: lyricsOrPrompt,
              style: params.style.trim(),
              title: params.title.trim().slice(0, 80),
              custom_mode: customMode,
              instrumental: Boolean(params.instrumental),
              model: subModel,
              ...(params.negative_tags?.trim() ? { negative_tags: params.negative_tags.trim() } : {}),
            },
          },
        },
      ];

      let keyFailedDueToAuth = false;
      for (const attempt of attempts) {
        try {
          const res = await fetch(attempt.url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(attempt.body),
          });

          if (res.ok) {
            const json = await res.json();
            const taskId =
              json.data?.taskId ||
              json.taskId ||
              json.data?.task_id ||
              json.task_id ||
              json.data?.id ||
              json.id ||
              json.job_id;

            if (taskId) {
              return {
                success: true,
                taskId: String(taskId),
                status: 'QUEUED',
                usedKey: activeKey,
                data: json,
              };
            }

            if (json.code && json.code !== 200) {
              if (json.code === 401 || json.code === 403 || json.code === 429) {
                keyFailedDueToAuth = true;
                lastErrorMessage = `API Key ditolak (${json.code}: ${json.msg || 'Auth failed'}).`;
                db.updateKey(activeKey, {
                  status: 'error',
                  errorMessage: `Kie.ai Code ${json.code}: ${json.msg || 'Auth failed'}`,
                });
                break;
              }
              if (json.code === 402 || (json.msg && json.msg.toLowerCase().includes('credit'))) {
                lastErrorMessage = `Kredit akun Kie.ai tidak mencukupi untuk membuat musik (memerlukan minimal 12 kredit).`;
                db.updateKey(activeKey, {
                  errorMessage: 'Saldo kurang dari 12 kredit',
                });
                break;
              }
              lastErrorMessage = json.msg || json.message || `Kie.ai error (code: ${json.code})`;
              continue;
            }
          } else {
            const errText = await res.text().catch(() => '');
            if (res.status === 401 || res.status === 403 || res.status === 429) {
              keyFailedDueToAuth = true;
              lastErrorMessage = `API Key ditolak (${res.status}).`;
              db.updateKey(activeKey, {
                status: 'error',
                errorMessage: `HTTP ${res.status}: Auth failed`,
              });
              break;
            }
            lastErrorMessage = this.translateError(res.status, errText);
          }
        } catch (e: unknown) {
          lastErrorMessage = e instanceof Error ? e.message : 'Koneksi jaringan ke Kie.ai terputus.';
        }
      }

      if (!keyFailedDueToAuth) {
        break;
      }
    }

    return {
      success: false,
      status: 'FAILED',
      errorMessage: lastErrorMessage || 'Gagal mengirim tugas generasi musik ke Kie.ai. Silakan periksa kembali API Key Anda.',
    };
  }

  async pollRecordInfo(taskId: string, userId: string = 'user-default', customKey?: string): Promise<KieRecordResult> {
    const baseUrl = this.getBaseUrl();
    const candidateKeys: string[] = [];
    if (customKey && customKey.trim()) {
      candidateKeys.push(customKey.trim());
    }
    const userKeys = db.getOrderedActiveKeys(userId, 'kie.ai');
    for (const k of userKeys) {
      if (k.key && k.key.trim() && !candidateKeys.includes(k.key.trim())) {
        candidateKeys.push(k.key.trim());
      }
    }
    const effectiveKey = this.getEffectiveKey(userId, customKey);
    if (effectiveKey && !candidateKeys.includes(effectiveKey)) {
      candidateKeys.push(effectiveKey);
    }

    if (candidateKeys.length === 0) {
      return {
        success: false,
        status: 'FAILED',
        taskId,
        errorMessage: 'API Key Kie.ai belum dikonfigurasi.',
      };
    }

    const candidateUrls = [
      `${baseUrl}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      `${baseUrl}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    ];

    let lastFailMsg: string | undefined;

    for (const key of candidateKeys) {
      for (const url of candidateUrls) {
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${key}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
          });

          if (res.ok) {
            const json = await res.json();
            if (json.code && json.code !== 200) {
              if (json.code === 401 || json.code === 403) break;
              if (json.code === 402) {
                return {
                  success: false,
                  status: 'FAILED',
                  taskId,
                  errorMessage: 'Kredit akun Kie.ai tidak mencukupi untuk memproses lagu ini.',
                  refundStatus: 'Tidak terpotong (Kredit kurang)',
                };
              }
              continue;
            }

            const info = json.data || json;
            interface RawTrackItem {
              id?: string;
              audio_url?: string;
              audioUrl?: string;
              stream_audio_url?: string;
              streamAudioUrl?: string;
              image_url?: string;
              cover_url?: string;
              title?: string;
              duration?: number;
              prompt?: string;
            }

            let trackList: RawTrackItem[] = [];
            if (Array.isArray(info)) {
              trackList = info;
            } else if (Array.isArray(info.response?.data)) {
              trackList = info.response.data;
            } else if (Array.isArray(info.data)) {
              trackList = info.data;
            } else if (info.audio_url || info.audioUrl) {
              trackList = [info];
            }

            const firstTrack: RawTrackItem = trackList[0] || {};
            const audioUrl =
              firstTrack.audio_url ||
              firstTrack.audioUrl ||
              firstTrack.stream_audio_url ||
              firstTrack.streamAudioUrl ||
              info.audio_url ||
              info.audioUrl;
            const streamAudioUrl =
              firstTrack.stream_audio_url ||
              firstTrack.streamAudioUrl ||
              audioUrl;
            const coverUrl =
              firstTrack.image_url ||
              firstTrack.cover_url ||
              info.cover_url ||
              info.image_url;
            const title = firstTrack.title || info.title;
            const duration = firstTrack.duration || info.duration;
            const lyrics = firstTrack.prompt || info.prompt;

            const rawState = String(info.state || '').toLowerCase();
            const rawStatus = String(info.status || '').toUpperCase();
            const hasCompleteAudio = Boolean(audioUrl && audioUrl.startsWith('http'));

            const isSuccess =
              hasCompleteAudio ||
              rawState === 'success' ||
              rawState === 'completed' ||
              rawStatus === 'SUCCESS';

            const isFailed =
              !hasCompleteAudio &&
              (rawState === 'failed' || rawStatus === 'FAILED');

            if (isSuccess && audioUrl) {
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

            if (isFailed) {
              return {
                success: false,
                status: 'FAILED',
                taskId,
                errorMessage: info.failMsg || info.message || 'Generasi lagu gagal di Kie.ai.',
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
      errorMessage: lastFailMsg || 'Sedang memproses antrean tugas di Kie.ai...',
    };
  }

  async extendMusic(
    params: {
      audioId: string;
      continueAt: number;
      title: string;
      style: string;
      prompt?: string;
      lyrics?: string;
      model?: string;
    },
    userId: string = 'user-default',
    customKey?: string
  ): Promise<KieTaskSubmitResult> {
    const key = this.getEffectiveKey(userId, customKey);
    const baseUrl = this.getBaseUrl();
    if (!key) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: 'API Key Kie.ai belum dikonfigurasi.',
      };
    }
    const lyricsOrPrompt = params.lyrics ? params.lyrics.trim() : (params.prompt || params.title).trim();
    try {
      const res = await fetch(`${baseUrl}/api/v1/jobs/createTask`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: 'ai-music-api/extend',
          input: {
            audio_id: params.audioId,
            continue_at: params.continueAt,
            prompt: lyricsOrPrompt,
            title: `${params.title} (Part 2)`,
            model: 'V4',
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const taskId = json.data?.taskId || json.taskId;
        if (taskId) {
          return {
            success: true,
            taskId: String(taskId),
            status: 'QUEUED',
            data: json,
          };
        }
      }
    } catch (e) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: e instanceof Error ? e.message : 'Gagal mengirim tugas extend musik ke Kie.ai.',
      };
    }
    return {
      success: false,
      status: 'FAILED',
      errorMessage: 'Gagal mengirim tugas extend musik ke Kie.ai.',
    };
  }
}

export const kieService = new KieService();
