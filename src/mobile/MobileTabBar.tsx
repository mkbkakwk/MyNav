import React from 'react';
import { Home, Search, Settings as SettingsIcon } from 'lucide-react';

export type MobileTab = 'home' | 'search' | 'settings';

interface MobileTabBarProps {
    active: MobileTab;
    onChange: (tab: MobileTab) => void;
}

const TABS: { key: MobileTab; label: string; icon: React.ElementType }[] = [
    { key: 'home', label: '首页', icon: Home },
    { key: 'search', label: '搜索', icon: Search },
    { key: 'settings', label: '设置', icon: SettingsIcon },
];

const MobileTabBar: React.FC<MobileTabBarProps> = ({ active, onChange }) => (
    <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-700/50
            landscape:left-1/2 landscape:right-auto landscape:bottom-3 landscape:-translate-x-1/2 landscape:w-auto landscape:rounded-full
            landscape:border landscape:border-slate-200/60 dark:landscape:border-slate-700/50 landscape:shadow-xl"
        style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
        }}
    >
        <div className="flex">
            {TABS.map(t => (
                <button
                    key={t.key}
                    onClick={() => onChange(t.key)}
                    className={`flex-1 py-2.5 px-5 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors landscape:py-2 landscape:px-4 ${active === t.key ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    <t.icon size={22} />
                    <span className="landscape:hidden">{t.label}</span>
                </button>
            ))}
        </div>
    </nav>
);

export default MobileTabBar;
