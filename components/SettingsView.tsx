'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Copy,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Lock,
  Check,
  Zap,
} from 'lucide-react';
import { apiFetch, safeJson } from '@/lib/api';
import { MusicProvider } from '@/database/db';

interface KeyItem {
  id: string;
  index: number;
  maskedKey: string;
  key: string;
  provider: MusicProvider;
  credit: number;
  isEligible?: boolean;
  status: 'active' | 'error' | 'exhausted';
  errorMessage?: string;
  lastChecked?: string;
}

interface ProviderStat {
  keyCount: number;
  totalCredits: number;
  activeKeyCount: number;
}

interface SettingsViewProps {
  credits: number;
  isConnected: boolean;
  onRefreshCredit: () => void;
  activeProvider?: MusicProvider;
  onProviderChange?: (provider: MusicProvider) => void;
}

const PROVIDER_METADATA: Record<
  MusicProvider,
  {
    name: string;
    badge: string;
    badgeColor: string;
    website: string;
    minCredit: number;
    apiEndpoint: string;
    desc: string;
  }
> = {
  'kie.ai': {
    name: 'Kie.ai',
    badge: 'KIE.AI',
    badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    website: 'https://kie.ai/api-key',
    minCredit: 12,
    apiEndpoint: 'https://api.kie.ai/api/v1/jobs/createTask',
    desc: 'Provider resmi generasi musik Suno AI dengan dukungan Model V6, V4, dan V3.5.',
  },
  'fal.ai': {
    name: 'Fal.ai',
    badge: 'FAL.AI',
    badgeColor: 'bg-violet-400/20 text-violet-300 border-violet-400/30',
    website: 'https://fal.ai/dashboard/keys',
    minCredit: 1,
    apiEndpoint: 'https://queue.fal.run/fal-ai/minimax-music',
    desc: 'Cloud AI Music & MiniMax Music engine dengan latensi kilat dan vokal ultra-jernih.',
  },
  sunor: {
    name: 'Sunor',
    badge: 'SUNOR',
    badgeColor: 'bg-purple-400/20 text-purple-300 border-purple-400/30',
    website: 'https://sunor.cc',
    minCredit: 10,
    apiEndpoint: 'https://sunor.cc/api/v1/task',
    desc: 'Provider aransemen musik AI via sunor.cc dengan dukungan Suno V6, V4, dan V3.5.',
  },
  apiframe: {
    name: 'Apiframe',
    badge: 'APIFRAME',
    badgeColor: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
    website: 'https://apiframe.ai/dashboard',
    minCredit: 11,
    apiEndpoint: 'https://api.apiframe.ai/v1/suno/create',
    desc: 'Provider resmi aransemen musik AI via apiframe.ai dengan dukungan Suno V6 & V5.',
  },
};

export default function SettingsView({
  credits,
  isConnected,
  onRefreshCredit,
  activeProvider: initialActiveProvider = 'kie.ai',
  onProviderChange,
}: SettingsViewProps) {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [apiRouteProvider, setApiRouteProvider] = useState<MusicProvider>(initialActiveProvider);
  const [addKeyTargetProvider, setAddKeyTargetProvider] = useState<MusicProvider>(initialActiveProvider);
  const [filterProvider, setFilterProvider] = useState<'all' | MusicProvider>('all');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showTextareaPassword, setShowTextareaPassword] = useState(false);
  const [showAllSavedKeys, setShowAllSavedKeys] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeDocSection, setActiveDocSection] = useState<number>(1);
  const [providerStats, setProviderStats] = useState<Record<MusicProvider, ProviderStat>>({
    'kie.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
    'fal.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
    sunor: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
    apiframe: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
  });

  const [prevInitialProvider, setPrevInitialProvider] = useState(initialActiveProvider);
  if (initialActiveProvider && initialActiveProvider !== prevInitialProvider) {
    setPrevInitialProvider(initialActiveProvider);
    setApiRouteProvider(initialActiveProvider);
    setAddKeyTargetProvider(initialActiveProvider);
  }

  useEffect(() => {
    let ignore = false;
    apiFetch('/api/kie/key')
      .then((res) => safeJson<Record<string, any>>(res))
      .then((data) => {
        if (!ignore && data.success) {
          if (Array.isArray(data.keys)) {
            setKeys(data.keys);
          }
          if (data.provider) {
            setApiRouteProvider(data.provider);
            setAddKeyTargetProvider(data.provider);
          }
          if (data.providerStats) {
            setProviderStats(data.providerStats);
          }
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const handleProviderChange = async (newProvider: MusicProvider) => {
    setApiRouteProvider(newProvider);
    setAddKeyTargetProvider(newProvider);
    if (onProviderChange) {
      onProviderChange(newProvider);
    }
    try {
      const res = await apiFetch('/api/kie/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-provider', provider: newProvider }),
      });
      const data = await safeJson<Record<string, any>>(res);
      if (data.success) {
        if (data.providerStats) setProviderStats(data.providerStats);
        if (Array.isArray(data.keys)) setKeys(data.keys);
        setStatusMsg({
          type: 'success',
          text: `Jalur API aktif diubah ke ${PROVIDER_METADATA[newProvider]?.name || newProvider}.`,
        });
      }
    } catch {
      // ignore
    }
  };

  const handleCheckAllBalance = async () => {
    setIsCheckingAll(true);
    setStatusMsg(null);
    try {
      const res = await apiFetch('/api/kie/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-all',
          targetProvider: filterProvider === 'all' ? undefined : filterProvider,
        }),
      });
      const data = await safeJson<Record<string, any>>(res);
      if (data.success) {
        if (Array.isArray(data.keys)) setKeys(data.keys);
        if (data.providerStats) setProviderStats(data.providerStats);
        setStatusMsg({
          type: 'success',
          text: data.message || `Saldo semua kunci berhasil diperbarui!`,
        });
        onRefreshCredit();
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Gagal mengecek saldo.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi gagal';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setIsCheckingAll(false);
    }
  };

  const handleAddAndSave = async () => {
    if (!apiKeyInput.trim()) {
      setStatusMsg({
        type: 'error',
        text: `Harap tempel setidaknya satu API Key untuk ${PROVIDER_METADATA[addKeyTargetProvider]?.name || addKeyTargetProvider} (satu per baris).`,
      });
      return;
    }
    setIsAdding(true);
    setStatusMsg(null);
    try {
      const res = await apiFetch('/api/kie/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          keys: apiKeyInput,
          provider: addKeyTargetProvider,
        }),
      });
      const data = await safeJson<Record<string, any>>(res);
      if (data.success) {
        if (Array.isArray(data.keys)) setKeys(data.keys);
        if (data.providerStats) setProviderStats(data.providerStats);
        setApiKeyInput('');
        setStatusMsg({
          type: 'success',
          text: data.message || `API Key berhasil ditambahkan! Saldo aktif: ${data.totalCredits} kredit.`,
        });
        onRefreshCredit();
      } else {
        setStatusMsg({
          type: 'error',
          text: data.message || 'Gagal menambahkan API Key.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan API Key';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const res = await apiFetch('/api/kie/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await safeJson<Record<string, any>>(res);
      if (data.success) {
        if (Array.isArray(data.keys)) setKeys(data.keys);
        if (data.providerStats) setProviderStats(data.providerStats);
        setStatusMsg({ type: 'success', text: 'API Key berhasil dihapus.' });
        onRefreshCredit();
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus SEMUA API Key yang tersimpan?')) return;
    try {
      const res = await apiFetch('/api/kie/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-all' }),
      });
      const data = await safeJson<Record<string, any>>(res);
      if (data.success) {
        setKeys([]);
        setProviderStats({
          'kie.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
          'fal.ai': { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
          sunor: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
          apiframe: { keyCount: 0, totalCredits: 0, activeKeyCount: 0 },
        });
        setStatusMsg({ type: 'success', text: 'Semua API Key telah dihapus.' });
        onRefreshCredit();
      }
    } catch {
      // ignore
    }
  };

  const handleCopySingleKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleCopyAllKeys = () => {
    const targetKeys = filterProvider === 'all' ? keys : keys.filter((k) => k.provider === filterProvider);
    if (targetKeys.length === 0) return;
    const all = targetKeys.map((k) => k.key).join('\n');
    navigator.clipboard.writeText(all);
    setStatusMsg({ type: 'success', text: `${targetKeys.length} API Key berhasil disalin ke clipboard!` });
  };

  const filteredKeys = filterProvider === 'all' ? keys : keys.filter((k) => k.provider === filterProvider);
  const activeMeta = PROVIDER_METADATA[apiRouteProvider] || PROVIDER_METADATA['kie.ai'];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28">
      {(() => {
        const currentProviderKeyCount = providerStats[apiRouteProvider]?.keyCount || keys.filter(k => k.provider === apiRouteProvider).length;
        const currentProviderCredits = providerStats[apiRouteProvider]?.totalCredits ?? (typeof credits === 'number' ? credits : 0);
        const isCurrentConnected = currentProviderKeyCount > 0;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Status Mesin
                </span>
                <span className={`text-sm font-bold ${isCurrentConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isCurrentConnected ? 'Connected' : 'Disconnected'}
                </span>
                <span className="text-[10px] text-zinc-400 block font-mono mt-0.5">
                  Provider: {activeMeta.name}
                </span>
              </div>
              <span
                className={`w-3 h-3 rounded-full ${
                  isCurrentConnected
                    ? 'bg-emerald-500 shadow-md shadow-emerald-500/50'
                    : 'bg-rose-500 shadow-md shadow-rose-500/50'
                }`}
              />
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Saldo {activeMeta.name}
                </span>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-xl font-black font-mono text-amber-400">
                    {currentProviderCredits}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">Credits</span>
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  Min. {activeMeta.minCredit} cr / 1x lagu
                </span>
              </div>
              <button
                onClick={onRefreshCredit}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 transition-colors cursor-pointer"
                title="Refresh saldo"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                  Total Kunci Tersimpan
                </span>
                <span className="text-xl font-black font-mono text-white pt-0.5 block">
                  {keys.length} <span className="text-xs text-zinc-400 font-normal">kunci ({activeMeta.name}: {currentProviderKeyCount})</span>
                </span>
              </div>
              <Key className="w-5 h-5 text-amber-400/60" />
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {(['kie.ai', 'fal.ai', 'sunor', 'apiframe'] as MusicProvider[]).map((p) => {
          const meta = PROVIDER_METADATA[p];
          const stat = providerStats[p] || { keyCount: 0, totalCredits: 0, activeKeyCount: 0 };
          const isSelected = apiRouteProvider === p;
          return (
            <div
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-400/50 shadow-md shadow-amber-500/10'
                  : 'bg-[#121217] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${meta.badgeColor}`}>
                  {meta.badge}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-amber-400" /> Aktif
                  </span>
                )}
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold text-white">{meta.name}</p>
                <div className="flex items-baseline justify-between mt-1 text-xs">
                  <span className="font-mono font-bold text-amber-300">{stat.totalCredits} cr</span>
                  <span className="text-[11px] text-zinc-400 font-mono">{stat.keyCount} key</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-5 sm:p-7 rounded-2xl bg-[#0e0e11] border border-white/10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Pengaturan API Key & Multi-Provider
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Dukungan multi-provider: Kie.ai, Fal.ai, Sunor, dan Apiframe
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-zinc-900 text-zinc-300 border border-white/10">
            {keys.length} key
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium block">
            Jalur API Musik Aktif
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {(['kie.ai', 'fal.ai', 'sunor', 'apiframe'] as MusicProvider[]).map((p) => {
              const meta = PROVIDER_METADATA[p];
              const isSelected = apiRouteProvider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderChange(p)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400/10 border-amber-400/60 shadow-sm'
                      : 'bg-[#16161b] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                      {meta.name}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{meta.desc}</p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
            Jalur aktif saat ini: <strong className="text-amber-300">{activeMeta.name}</strong>. Endpoint aktif:{' '}
            <code className="text-amber-300/90 font-mono bg-zinc-900 px-1 py-0.5 rounded text-[10px]">
              {activeMeta.apiEndpoint}
            </code>
          </p>
          <div className="text-[11px] text-zinc-400 space-y-0.5 pt-1">
            <p>
              Dapatkan API Key:
              <a
                href={activeMeta.website}
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:text-purple-300 underline font-medium ml-1.5"
              >
                {activeMeta.website}
              </a>
            </p>
            <p>Kunci dapat ditambahkan per baris (multi-key). Setiap kunci diverifikasi secara otomatis.</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              Ketentuan Saldo Pembuatan Musik ({activeMeta.name} - Min. {activeMeta.minCredit} Kredit / Kunci):
            </p>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Provider <strong>{activeMeta.name}</strong> mengenakan biaya minimal <strong>{activeMeta.minCredit} kredit per 1x request</strong> pembuatan lagu.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-sm">Daftar Key Tersimpan</span>
              <button
                type="button"
                onClick={() => setShowAllSavedKeys(!showAllSavedKeys)}
                className="text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer"
              >
                {showAllSavedKeys ? 'Sembunyikan' : 'Tampilkan'}
              </button>
              <button
                type="button"
                onClick={handleCheckAllBalance}
                disabled={isCheckingAll}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingAll ? 'animate-spin' : ''}`} />
                <span>Cek saldo</span>
              </button>
              <button
                type="button"
                onClick={handleCopyAllKeys}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy semua</span>
              </button>
            </div>
            {keys.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="text-rose-400 hover:text-rose-300 font-semibold transition-colors ml-auto cursor-pointer"
              >
                Hapus semua
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-zinc-500">Filter:</span>
            {(['all', 'kie.ai', 'fal.ai', 'sunor', 'apiframe'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterProvider(p)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterProvider === p
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {p === 'all' ? 'Semua' : PROVIDER_METADATA[p]?.name || p}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredKeys.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#16161b] border border-white/5 text-center text-xs text-zinc-500">
                {keys.length === 0
                  ? 'Belum ada API Key yang tersimpan. Tempel kunci Anda di bawah lalu klik + Tambah & Simpan.'
                  : 'Tidak ada kunci untuk filter provider yang dipilih.'}
              </div>
            ) : (
              filteredKeys.map((item, idx) => {
                const meta = PROVIDER_METADATA[item.provider || 'kie.ai'] || PROVIDER_METADATA['kie.ai'];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 sm:px-4 rounded-xl bg-[#16161b] border border-white/5 hover:border-white/10 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <span className="text-zinc-500 font-mono text-xs w-6 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border shrink-0 ${meta.badgeColor}`}>
                        {meta.badge}
                      </span>
                      <span className="font-mono text-zinc-300 truncate tracking-wide">
                        {showAllSavedKeys ? item.key : item.maskedKey}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.status === 'error' ? (
                        <span
                          className="text-rose-400 font-mono text-xs font-semibold cursor-help"
                          title={item.errorMessage || 'Gagal koneksi'}
                        >
                          error
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-mono text-xs font-bold">
                          {item.credit > 0 ? `${item.credit} cr` : '0 cr'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopySingleKey(item.key, item.id)}
                        className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Salin kunci"
                      >
                        {copiedKeyId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(item.id)}
                        className="p-1 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Hapus kunci ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-zinc-400">
            <Check className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <p>
              Semua key pada provider aktif dicoba berurutan dari kredit terbanyak. Bila satu key limit (429) atau habis (401/402), sistem otomatis memakai key berikutnya.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">
              Tambah API Key Baru
            </h3>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-zinc-400 mr-1">Tujuan:</span>
              {(['kie.ai', 'fal.ai', 'sunor', 'apiframe'] as MusicProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAddKeyTargetProvider(p)}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
                    addKeyTargetProvider === p
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {PROVIDER_METADATA[p]?.name || p}
                </button>
              ))}
            </div>
          </div>
          <label className="text-xs text-zinc-400 block">
            API Key untuk <strong className="text-amber-300">{PROVIDER_METADATA[addKeyTargetProvider]?.name}</strong> (satu per baris, bisa beberapa sekaligus)
          </label>
          <div className="relative">
            <textarea
              rows={4}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                addKeyTargetProvider === 'fal.ai'
                  ? 'Key xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\nKey yyyyyyyy-...'
                  : addKeyTargetProvider === 'sunor'
                  ? 'sk_live_xxxxxxxx\nsk_live_yyyyyyyy'
                  : 'sk-xxxxxxxx\nsk-yyyyyyyy'
              }
              style={{ WebkitTextSecurity: showTextareaPassword ? 'none' : 'disc' } as React.CSSProperties}
              className="w-full bg-[#16161b] border border-white/10 rounded-xl p-3.5 pr-20 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/80 transition-colors resize-y min-h-[100px]"
            />
            <button
              type="button"
              onClick={() => setShowTextareaPassword(!showTextareaPassword)}
              className="absolute right-3 top-3 px-3 py-1 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {showTextareaPassword ? 'Sembunyikan' : 'Lihat'}
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleAddAndSave}
              disabled={isAdding}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
            >
              {isAdding ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>+ Tambah & Simpan ke {PROVIDER_METADATA[addKeyTargetProvider]?.name}</span>
              )}
            </button>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center gap-2.5 border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="p-4 rounded-xl bg-[#16161b] border border-white/5 flex items-start gap-3">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Semua request generasi musik dijalankan tertutup via Backend Proxy Server ke masing-masing provider (Kie.ai, Fal.ai, Sunor). Kunci Anda tersimpan aman dan tidak pernah dibocorkan ke browser.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-xl space-y-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">
            Panduan Multi-Provider & Integrasi
          </h3>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {[
            { id: 1, label: '1. Perbandingan Provider' },
            { id: 2, label: '2. Multi-Key Rotation' },
            { id: 3, label: '3. Format & Endpoint' },
            { id: 4, label: '4. Prompt & Lirik' },
            { id: 5, label: '5. Error Code 401/402' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDocSection(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeDocSection === tab.id
                  ? 'bg-amber-400 text-black font-bold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-zinc-300 leading-relaxed space-y-3">
          {activeDocSection === 1 && (
            <div className="space-y-3">
              <p className="font-semibold text-white">Perbandingan Provider Musik AI:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 space-y-1">
                  <span className="font-bold text-amber-400 text-xs">Kie.ai</span>
                  <p className="text-zinc-400 text-[11px]">Biaya: 12 kredit / request</p>
                  <p className="text-zinc-400 text-[11px]">Model: Suno V6, V4, V3.5</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 space-y-1">
                  <span className="font-bold text-violet-400 text-xs">Fal.ai</span>
                  <p className="text-zinc-400 text-[11px]">Biaya: ~$0.03 - $0.05 / request</p>
                  <p className="text-zinc-400 text-[11px]">Model: MiniMax Music, Stable Audio</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 space-y-1">
                  <span className="font-bold text-purple-400 text-xs">Sunor</span>
                  <p className="text-zinc-400 text-[11px]">Biaya: ~10 kredit / request</p>
                  <p className="text-zinc-400 text-[11px]">Model: Suno V6, V4, V3.5</p>
                </div>
              </div>
            </div>
          )}
          {activeDocSection === 2 && (
            <div className="space-y-2">
              <p className="font-semibold text-white">Mekanisme Rotasi Kunci (Load Balancing):</p>
              <p className="text-zinc-400">
                Sistem secara otomatis mengurutkan semua API Key untuk provider aktif berdasarkan saldo kredit terbanyak. Jika satu kunci mengalami limit (HTTP 429) atau kehabisan saldo (HTTP 401/402), sistem otomatis beralih ke kunci berikutnya tanpa memutus alur produksi musik.
              </p>
            </div>
          )}
          {activeDocSection === 3 && (
            <div className="space-y-2">
              <p className="font-semibold text-white">Endpoint & Polling Asynchronous:</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 font-mono text-[11px]">
                <li>Kie.ai: POST https://api.kie.ai/api/v1/jobs/createTask | GET .../recordInfo</li>
                <li>Fal.ai: POST https://queue.fal.run/fal-ai/minimax-music | GET .../requests/{'{request_id}'}</li>
                <li>Sunor: POST https://sunor.cc/api/v1/task | GET .../api/v1/task/{'{task_id}'}</li>
              </ul>
            </div>
          )}
          {activeDocSection === 4 && (
            <div className="space-y-2">
              <p className="font-semibold text-white">Struktur Tag Lirik Suno AI:</p>
              <p className="text-zinc-400">
                Gunakan tag metatag seperti <code className="text-amber-300 font-mono">[Verse 1]</code>, <code className="text-amber-300 font-mono">[Chorus]</code>, <code className="text-amber-300 font-mono">[Guitar Solo]</code>, dan <code className="text-amber-300 font-mono">[Outro]</code> untuk mengarahkan aransemen musik AI.
              </p>
            </div>
          )}
          {activeDocSection === 5 && (
            <div className="space-y-2">
              <p className="font-semibold text-white">Penanganan Kode Kendala:</p>
              <p className="text-zinc-400">
                <span className="text-amber-400 font-semibold">401 Unauthorized:</span> Periksa token API key Anda di dashboard provider terkait.<br />
                <span className="text-amber-400 font-semibold">402 Payment Required:</span> Saldo kredit akun habis. Tambahkan kunci baru atau isi ulang saldo di dashboard provider Anda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
