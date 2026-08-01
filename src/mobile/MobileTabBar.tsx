import React from 'react';
import { motion } from 'framer-motion';
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

/**
 * iPhone-Dock-style floating pill. The icons never move; the elliptical
 * selection background glides between tabs via framer-motion layoutId.
 */
const MobileTabBar: React.FC<MobileTabBarProps> = ({ active, onChange }) => (
    <nav
        className="fixed left-1/2 -translate-x-1/2 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-full shadow-xl border border-white/40 dark:border-white/10"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
    >
        <div className="relative flex items-center gap-4 px-2.5 py-1 overflow-hidden">
            {TABS.map(t => {
                const isActive = active === t.key;
                return (
                    <button
                        key={t.key}
                        onClick={() => onChange(t.key)}
                        aria-label={t.label}
                        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                    >
                        {isActive && (
                            <motion.div
                                layoutId="tab-pill"
                                transition={{ type: 'tween', duration: 0.45, ease: [0.68, -0.55, 0.265, 1.55] }}
                                className="absolute -inset-x-1 inset-y-0.5 rounded-full bg-primary/10 ring-1 ring-primary/20 shadow-sm"
                            />
                        )}
                        <t.icon
                            size={18}
                            className={`relative z-10 transition-colors ${
                                isActive ? 'text-primary font-bold' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        />
                    </button>
                );
            })}
        </div>
    </nav>
);

export default MobileTabBar;
