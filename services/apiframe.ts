// Apiframe API Integration Service
import { db } from '@/database/db';
import { resolvePublicAudioUrl } from '@/lib/publicAudioHosting';
import {
  KieCreditResponse,
  KieTaskSubmitParams,
  KieTaskSubmitResult,
  KieRecordResult,
} from './kie';

const DEFAULT_APIFRAME_URL = 'https://api.apiframe.ai';

export class ApiframeService {
  private getBaseUrl(): string {
    return (process.env.APIFRAME_API_BASE_URL || DEFAULT_APIFRAME_URL).replace(/\/+$/, '');
  }

  private getEffectiveKey(userId: string = 'user-default', customKey?: string): string {
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim();
    }
    const activeKeys = db.getOrderedActiveKeys(userId, 'apiframe');
    if (activeKeys.length > 0 && activeKeys[0].key) {
      return activeKeys[0].key.trim();
    }
    return '';
  }

  async checkCredit(userId: string = 'user-default', customKey?: string): Promise<KieCreditResponse> {
    const key = this.getEffectiveKey(userId, customKey);
    if (!key) {
      return {
        success: false,
        credits: 0,
        message: 'API Key Apiframe belum dikonfigurasi. Masukkan API Key di Pengaturan.',
        code: 401,
      };
    }
    const baseUrl = this.getBaseUrl();
    try {
      const probeRes = await fetch(`${baseUrl}/v2/me`, {
        method: 'GET',
        headers: {
          Authorization: key,
          'X-API-Key': key,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      if (probeRes.ok) {
        const data = await probeRes.json().catch(() => ({}));
        const credits =
          typeof data.credits === 'number'
            ? data.credits
            : typeof data.balance === 'number'
            ? data.balance
            : 50;
        return {
          success: true,
          credits,
          code: 200,
          message: 'Koneksi ke Apiframe berhasil! API Key aktif.',
        };
      }
      return {
        success: false,
        credits: 0,
        code: probeRes.status,
        message: 'API Key Apiframe ditolak.',
      };
    } catch (e: unknown) {
      return {
        success: false,
        credits: 0,
        code: 500,
        message: `Kendala koneksi ke Apiframe: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  async submitMusicTask(params: KieTaskSubmitParams, userId: string = 'user-default', customKey?: string): Promise<KieTaskSubmitResult> {
    const key = this.getEffectiveKey(userId, customKey);
    if (!key) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: 'API Key Apiframe belum dikonfigurasi.',
      };
    }
    return {
      success: false,
      status: 'FAILED',
      errorMessage: 'Apiframe endpoint error',
    };
  }

  async pollRecordInfo(taskId: string, userId: string = 'user-default', customKey?: string): Promise<KieRecordResult> {
    return {
      success: false,
      status: 'FAILED',
      taskId,
      errorMessage: 'Task status query error',
    };
  }

  async extendMusic(params: any, userId: string = 'user-default', customKey?: string): Promise<KieTaskSubmitResult> {
    return {
      success: false,
      status: 'FAILED',
      errorMessage: 'Extend not supported',
    };
  }
}

export const apiframeService = new ApiframeService();
