import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Github } from 'lucide-react';
import type { SectionData, SyncSettings } from '../types';
import MobileHome from './MobileHome';
import MobileSearch from './MobileSearch';
import MobileTabBar from './MobileTabBar';
import type { MobileTab } from './MobileTabBar';
import SettingsModal from '../components/Settings';

interface MobileAppProps {
    sections: SectionData[];
    setSections: React.Dispatch<React.SetStateAction<SectionData[]>>;
    syncSettings: SyncSettings;
    setSyncSettings: React.Dispatch<React.SetStateAction<SyncSettings>>;
    onPullRemote: () => Promise<{ ok: boolean; message: string }>;
    onKeepLocal: () => void;
    syncAuthorized: boolean;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    lastSyncAt: number | null;
    syncError: string | null;
    onRetrySync: () => void;
}

/** Fixed soft gradient background, matching the desktop look. */
const MobileBackground: React.FC = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[10%] w-[400px] h-[400px] bg-gradient-to-br from-blue-300/40 to-purple-300/40 rounded-full blur-[80px] dark:from-indigo-600/20 dark:to-purple-800/20" />
        <div className="absolute top-[40%] -left-[10%] w-[300px] h-[300px] bg-gradient-to-tr from-pink-300/40 to-rose-300/40 rounded-full blur-[80px] dark:from-violet-600/20 dark:to-fuchsia-800/20" />
    </div>
);

const MobileApp: React.FC<MobileAppProps> = ({
    sections, setSections, syncSettings, setSyncSettings,
    onPullRemote, onKeepLocal, syncAuthorized,
    syncStatus, lastSyncAt, syncError, onRetrySync,
}) => {
    const [tab, setTab] = useState<MobileTab>('home');
    const [settingsOpen, setSettingsOpen] = useState(false);

    const formatAgo = (ts: number | null): string => {
        if (!ts) return '';
        const s = Math.floor((Date.now() - ts) / 1000);
        if (s < 60) return `${s} 秒前`;
        if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
        if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
        return `${Math.floor(s / 86400)} 天前`;
    };

    return (
        <div className="relative min-h-screen pb-16 landscape:pb-14 text-slate-900 dark:text-white">
            <MobileBackground />

            <div className="relative z-10">
                {tab === 'home' && (
                    <MobileHome
                        sections={sections}
                        setSections={setSections}
                    />
                )}
                {tab === 'search' && <MobileSearch sections={sections} />}
                {tab === 'settings' && (
                    <div className="px-4 pt-6 pb-10 max-w-3xl mx-auto">
                        <h1 className="text-2xl font-bold mb-5">设置</h1>
                        <div className="space-y-3">
                            <button
                                onClick={() => setSettingsOpen(true)}
                                className="w-full h-[72px] flex items-center gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl border border-white/40 dark:border-white/10 active:scale-[0.98] transition-transform"
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                    <Github size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-bold">GitHub 云同步</p>
                                    <p className="text-[11px] text-slate-400">
                                        {syncSettings.enabled ? '已开启' : '未开启'}
                                        {syncSettings.enabled && syncSettings.owner ? ` · ${syncSettings.owner}/${syncSettings.repo}` : ''}
                                    </p>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </button>

                            {/* Sync status (text form, same height as the GitHub card) */}
                            <div className="w-full h-[72px] px-4 rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl border border-white/40 dark:border-white/10 flex items-center gap-3">
                                <span className={`w-3 h-3 rounded-full shrink-0 ${syncStatus === 'idle' ? 'bg-slate-400'
                                    : syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse'
                                        : syncStatus === 'success' ? 'bg-emerald-500'
                                            : 'bg-red-500 animate-pulse'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold ${syncStatus === 'error' ? 'text-red-500'
                                        : syncStatus === 'syncing' ? 'text-amber-500'
                                            : syncStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-slate-500 dark:text-slate-400'
                                        }`}>
                                        {syncStatus === 'idle' ? '尚未同步' : syncStatus === 'syncing' ? '同步中...' : syncStatus === 'success' ? '已同步' : '同步失败'}
                                    </p>
                                    {syncStatus === 'error' ? (
                                        <p className="text-[11px] text-red-500 truncate">{syncError || '未知错误'}</p>
                                    ) : syncStatus === 'success' ? (
                                        <p className="text-[11px] text-slate-400">上次同步 {formatAgo(lastSyncAt)}</p>
                                    ) : (
                                        <p className="text-[11px] text-slate-400">&nbsp;</p>
                                    )}
                                </div>
                                {syncStatus === 'error' && (
                                    <button
                                        onClick={onRetrySync}
                                        className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold active:scale-95 transition-transform"
                                    >
                                        重试同步
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="mt-6 text-[11px] text-slate-400 text-center">MyNav · 长按卡片可编辑</p>
                    </div>
                )}
            </div>

            <MobileTabBar active={tab} onChange={setTab} />

            {/* Settings modal — portaled to body so it escapes the z-10 stacking
                context and stays above the bottom tab bar */}
            {createPortal(
                <SettingsModal
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    onSettingsChange={setSyncSettings}
                    onPullRemote={onPullRemote}
                    onKeepLocal={onKeepLocal}
                    syncAuthorized={syncAuthorized}
                    isMobile
                />,
                document.body
            )}
        </div>
    );
};

export default MobileApp;
