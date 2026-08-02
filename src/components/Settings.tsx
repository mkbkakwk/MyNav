import React, { useState } from 'react';
import { X, Github, Save, CheckCircle2, Download, AlertTriangle } from 'lucide-react';
import type { SyncSettings } from '../types';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsChange: (settings: SyncSettings) => void;
    onPullRemote: () => Promise<{ ok: boolean; message: string }>;
    onKeepLocal: () => void;
    syncAuthorized: boolean;
    /** Mobile: render as a bottom sheet so it fits small screens. */
    isMobile?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onSettingsChange, onPullRemote, onKeepLocal, syncAuthorized, isMobile = false }) => {
    const [settings, setSettings] = useState<SyncSettings>(() => {
        const saved = localStorage.getItem('nav_sync_settings');
        return saved ? JSON.parse(saved) : { token: '', owner: '', repo: '', enabled: false };
    });
    // Snapshot of whether sync was already enabled when the modal opened.
    // Used to detect "false → true" transitions and ask about pulling remote data.
    const [wasEnabled] = useState(() => {
        const saved = localStorage.getItem('nav_sync_settings');
        return saved ? JSON.parse(saved).enabled : false;
    });
    const [isSaved, setIsSaved] = useState(false);
    // First-enable dialog: ask user whether to pull remote or keep local.
    const [askPull, setAskPull] = useState(false);
    const [askResult, setAskResult] = useState<{ message: string; isError: boolean } | null>(null);
    const [askLoading, setAskLoading] = useState(false);
    // Always-available pull button state (two-step confirm + inline result).
    const [confirmPull, setConfirmPull] = useState(false);
    const [pullState, setPullState] = useState<{ loading: boolean; message: string; isError: boolean }>({ loading: false, message: '', isError: false });

    const handleSave = () => {
        localStorage.setItem('nav_sync_settings', JSON.stringify(settings));
        onSettingsChange(settings);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);

        // First time enabling cloud sync without authorization → ask how to proceed.
        // This prevents the local (possibly template) data from silently
        // overwriting existing remote data.
        if (settings.enabled && !wasEnabled && !syncAuthorized) {
            setAskPull(true);
            setAskResult(null);
        }
    };

    const handlePullNow = async () => {
        setAskLoading(true);
        setAskResult(null);
        const result = await onPullRemote();
        setAskLoading(false);
        setAskResult({ message: result.message, isError: !result.ok });
        if (result.ok) {
            // Pull succeeded or remote confirmed empty → close the dialog shortly.
            setTimeout(() => setAskPull(false), 1800);
        }
    };

    const handleKeepLocalNow = () => {
        onKeepLocal();
        setAskPull(false);
        setAskResult(null);
    };

    const handlePullClick = async () => {
        if (!confirmPull) {
            setConfirmPull(true);
            return;
        }
        setConfirmPull(false);
        setPullState({ loading: true, message: '', isError: false });
        const result = await onPullRemote();
        setPullState({ loading: false, message: result.message, isError: !result.ok });
    };

    const canPull = settings.enabled && settings.token && settings.owner && settings.repo;

    return (
        <>
            {/* Settings Modal */}
            {isOpen && (
                <div className={`fixed inset-0 z-[100] flex p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300 ${isMobile ? 'items-end' : 'items-center justify-center'}`}>
                    <div
                        className={`w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border border-white/20 dark:border-white/5 ${
                            isMobile
                                ? 'rounded-t-3xl max-h-[88vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-8 duration-300'
                                : 'rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500'
                        }`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative p-8">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-3 mb-8 pr-10">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                    <Github size={28} />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">GitHub 隐私云同步</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">建议存入另一个**私有仓库**以保护隐私</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                                        GitHub Token (PAT)
                                    </label>
                                    <input
                                        type="password"
                                        value={settings.token}
                                        onChange={e => setSettings({ ...settings, token: e.target.value })}
                                        placeholder="ghp_xxxxxxxxxxxx"
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                                    />
                                    <p className="mt-2 text-[10px] text-slate-400 ml-1">
                                        需要权限: repo (用于更新 src/constants.ts)
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                                            用户名 (Owner)
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.owner}
                                            onChange={e => setSettings({ ...settings, owner: e.target.value })}
                                            placeholder="你的 GitHub 账号"
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">
                                            仓库名 (Repo)
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.repo}
                                            onChange={e => setSettings({ ...settings, repo: e.target.value })}
                                            placeholder="MyNav"
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
                                    <div>
                                        <span className="block text-sm font-bold text-slate-900 dark:text-white">在线同步已激活</span>
                                        <span className="text-[10px] text-slate-400">仅在非本地环境生效</span>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.enabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enabled ? 'translate-x-6' : ''}`} />
                                    </button>
                                </div>

                                {/* Always-available pull button */}
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="block text-sm font-bold text-slate-900 dark:text-white">从 GitHub 拉取数据</span>
                                            <span className="text-[10px] text-slate-400">用远程数据覆盖当前页面(含未保存修改)</span>
                                        </div>
                                    </div>
                                    {confirmPull ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handlePullClick}
                                                disabled={!canPull || pullState.loading}
                                                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 disabled:opacity-40 transition-all"
                                            >
                                                {pullState.loading ? '拉取中...' : '确认覆盖当前数据'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmPull(false)}
                                                className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handlePullClick}
                                            disabled={!canPull || pullState.loading}
                                            className="w-full py-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-500/20 disabled:opacity-40 transition-all"
                                        >
                                            <Download size={16} />
                                            {pullState.loading ? '正在拉取...' : '立即拉取远程数据'}
                                        </button>
                                    )}
                                    {pullState.message && (
                                        <p className={`text-xs font-medium ${pullState.isError ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {pullState.message}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={handleSave}
                                    className={`w-full py-5 rounded-2xl flex items-center justify-center gap-2 font-bold text-lg shadow-xl transition-all active:scale-[0.98] ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-indigo-500 text-white shadow-indigo-500/20 hover:bg-indigo-600'}`}
                                >
                                    {isSaved ? <><CheckCircle2 size={22} /> 已保存配置</> : <><Save size={22} /> 保存设置</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* First-enable decision dialog */}
            {askPull && (
                <div className={`fixed inset-0 z-[120] flex p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300 ${isMobile ? 'items-end' : 'items-center justify-center'}`}>
                    <div className={`w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border border-white/20 dark:border-white/5 ${isMobile ? 'rounded-t-3xl max-h-[88vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-8 duration-300' : 'rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500'}`}>
                        <div className="relative p-8">
                            <button
                                onClick={() => setAskPull(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-3 mb-6 pr-10">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                    <AlertTriangle size={28} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">已开启 GitHub 云同步</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">远程仓库可能已存在数据</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                                为避免本页数据(可能是示例数据)覆盖你在其他设备上的收藏,请选择如何初始化:
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handlePullNow}
                                    disabled={askLoading}
                                    className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Download size={16} />
                                    {askLoading ? '正在拉取...' : '立即拉取远程数据(推荐)'}
                                </button>
                                <button
                                    onClick={handleKeepLocalNow}
                                    disabled={askLoading}
                                    className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"
                                >
                                    保留本地数据,之后上传覆盖远程
                                </button>
                            </div>

                            {askResult && (
                                <p className={`mt-4 text-xs font-medium text-center ${askResult.isError ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {askResult.message}
                                </p>
                            )}
                            {askResult?.isError && (
                                <p className="mt-1 text-[10px] text-slate-400 text-center">
                                    拉取失败不会覆盖远程数据;你可以修正 Token 后重试,或选择保留本地数据。
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Settings;
