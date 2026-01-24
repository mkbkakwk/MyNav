import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Github, Save, CheckCircle2 } from 'lucide-react';
import type { SyncSettings } from '../types';

interface SettingsProps {
    onSettingsChange: (settings: SyncSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ onSettingsChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState<SyncSettings>(() => {
        const saved = localStorage.getItem('nav_sync_settings');
        return saved ? JSON.parse(saved) : { token: '', owner: '', repo: '', enabled: false };
    });
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        localStorage.setItem('nav_sync_settings', JSON.stringify(settings));
        onSettingsChange(settings);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return (
        <>
            {/* Floating Gear Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-28 right-8 z-50 w-12 h-12 rounded-full bg-white dark:bg-slate-700 shadow-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-110 active:scale-95 transition-all ring-1 ring-slate-900/5 dark:ring-white/10"
                aria-label="Open Settings"
            >
                <SettingsIcon size={24} className={isOpen ? 'animate-spin' : ''} />
            </button>

            {/* Settings Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative p-8">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <Github size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">GitHub 隐私云同步</h2>
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
                                        <span className="text-[10px] text-slate-500">仅在非本地环境生效</span>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.enabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enabled ? 'translate-x-6' : ''}`} />
                                    </button>
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
        </>
    );
};

export default Settings;
