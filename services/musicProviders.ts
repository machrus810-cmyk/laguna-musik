// Unified Music Provider Manager
// Coordinates Kie.ai, Fal.ai, Sunor, and Apiframe providers

import { db, MusicProvider } from '@/database/db';
import {
  KieCreditResponse,
  KieTaskSubmitParams,
  KieTaskSubmitResult,
  KieRecordResult,
  kieService,
} from './kie';
import { falService } from './fal';
import { sunorService } from './sunor';
import { apiframeService } from './apiframe';

export interface ProviderMeta {
  id: MusicProvider;
  name: string;
  badge: string;
  badgeColor: string;
  website: string;
  getKeyUrl: string;
  keyPlaceholder: string;
  costPerSong: string;
  defaultModel: string;
  models: string[];
  description: string;
}

export const PROVIDER_REGISTRY: Record<MusicProvider, ProviderMeta> = {
  'kie.ai': {
    id: 'kie.ai',
    name: 'Kie.ai',
    badge: 'KIE',
    badgeColor: 'amber',
    website: 'https://kie.ai',
    getKeyUrl: 'https://kie.ai/api-key',
    keyPlaceholder: 'sk-xxxxxxxx\nsk-yyyyyyyy',
    costPerSong: '12 Kredit / lagu (2 variasi)',
    defaultModel: 'V6',
    models: ['V6', 'V6 MINI', 'V6 WILD', 'V4', 'V3_5'],
    description: 'API resmi Kie.ai Studio dengan rotasi multi-key & load balancing.',
  },
  'fal.ai': {
    id: 'fal.ai',
    name: 'Fal.ai',
    badge: 'FAL.AI',
    badgeColor: 'violet',
    website: 'https://fal.ai',
    getKeyUrl: 'https://fal.ai/dashboard/keys',
    keyPlaceholder: 'Key xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\nKey yyyyyyyy-...',
    costPerSong: '~$0.03 - $0.05 / request (MiniMax)',
    defaultModel: 'fal-ai/minimax-music',
    models: ['fal-ai/minimax-music', 'fal-ai/stable-audio'],
    description: 'Cloud AI Music & MiniMax Music engine dengan latensi cepat & kualitas vocal jernih.',
  },
  sunor: {
    id: 'sunor',
    name: 'Sunor',
    badge: 'SUNOR',
    badgeColor: 'emerald',
    website: 'https://sunor.cc',
    getKeyUrl: 'https://sunor.cc/login',
    keyPlaceholder: 'sk_live_xxxxxxxx\nsk_live_yyyyyyyy',
    costPerSong: 'Pay-as-you-go (~10 cr)',
    defaultModel: 'V6',
    models: ['V6', 'V4'],
    description: 'Unofficial Suno & Udio REST API dengan arsitektur Suno V6 terbaru.',
  },
  apiframe: {
    id: 'apiframe',
    name: 'Apiframe',
    badge: 'APIFRAME',
    badgeColor: 'cyan',
    website: 'https://apiframe.ai',
    getKeyUrl: 'https://apiframe.ai/dashboard',
    keyPlaceholder: 'api_key_xxxxxxxx\napi_key_yyyyyyyy',
    costPerSong: '11 Kredit / request (Suno Engine)',
    defaultModel: 'V6',
    models: ['V6', 'V5', 'V4'],
    description: 'Unified AI Cloud Platform resmi dengan dukungan Suno V6 & V5 high-fidelity audio.',
  },
};

export class MusicProviderManager {
  getService(provider: MusicProvider = 'kie.ai') {
    switch (provider) {
      case 'fal.ai':
        return falService;
      case 'sunor':
        return sunorService;
      case 'apiframe':
        return apiframeService;
      case 'kie.ai':
      default:
        return kieService;
    }
  }

  async checkCredit(
    userId: string = 'user-default',
    customKey?: string,
    provider?: MusicProvider
  ): Promise<KieCreditResponse & { provider: MusicProvider }> {
    const activeProvider = provider || db.getApiRouteProvider();
    const service = this.getService(activeProvider);
    const res = await service.checkCredit(userId, customKey);
    return {
      ...res,
      provider: activeProvider,
    };
  }

  async submitMusicTask(
    params: KieTaskSubmitParams,
    userId: string = 'user-default',
    customKey?: string,
    provider?: MusicProvider,
    origin?: string
  ): Promise<KieTaskSubmitResult & { provider: MusicProvider }> {
    const activeProvider = provider || db.getApiRouteProvider();
    const service = this.getService(activeProvider);
    const res = await service.submitMusicTask(params, userId, customKey, origin);
    return {
      ...res,
      provider: activeProvider,
    };
  }

  async pollRecordInfo(
    taskId: string,
    userId: string = 'user-default',
    customKey?: string,
    provider?: MusicProvider
  ): Promise<KieRecordResult & { provider: MusicProvider }> {
    const activeProvider = provider || db.getApiRouteProvider();
    const service = this.getService(activeProvider);
    const res = await service.pollRecordInfo(taskId, userId, customKey);
    return {
      ...res,
      provider: activeProvider,
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
    customKey?: string,
    provider?: MusicProvider
  ): Promise<KieTaskSubmitResult & { provider: MusicProvider }> {
    const activeProvider = provider || db.getApiRouteProvider();
    const service = this.getService(activeProvider);
    const res = await service.extendMusic(params, userId, customKey);
    return {
      ...res,
      provider: activeProvider,
    };
  }
}

export const musicProviderManager = new MusicProviderManager();
