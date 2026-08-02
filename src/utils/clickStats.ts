import type { SectionData } from '../types';

interface ClickStat {
    count: number;
    lastAt: number;
}

export type SortMode = 'default' | 'frequent' | 'recent';

const STATS_KEY = 'nav_click_stats_v1';
const MODE_KEY = 'nav_sort_mode_v1';

const loadStats = (): Record<string, ClickStat> => {
    try {
        return JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    } catch {
        return {};
    }
};

/** Record a card click (count + timestamp). Pure localStorage, no data-model change. */
export const recordClick = (id: string) => {
    try {
        const stats = loadStats();
        const s = stats[id] || { count: 0, lastAt: 0 };
        stats[id] = { count: s.count + 1, lastAt: Date.now() };
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch { /* storage unavailable — ignore */ }
};

export const getSortMode = (): SortMode => {
    const m = localStorage.getItem(MODE_KEY);
    return m === 'frequent' || m === 'recent' ? m : 'default';
};

export const setSortMode = (mode: SortMode) => {
    try {
        localStorage.setItem(MODE_KEY, mode);
    } catch { /* ignore */ }
};

export const nextSortMode = (mode: SortMode): SortMode =>
    mode === 'default' ? 'frequent' : mode === 'frequent' ? 'recent' : 'default';

/** Display-level sort only: sections keep their order, cards are re-ordered
 *  by click count or last click time. Never mutates the input arrays. */
export const sortSections = (sections: SectionData[], mode: SortMode): SectionData[] => {
    if (mode === 'default') return sections;
    const stats = loadStats();
    const field = mode === 'frequent' ? 'count' : 'lastAt';
    return sections.map(s => ({
        ...s,
        items: [...s.items].sort((a, b) => (stats[b.id]?.[field] || 0) - (stats[a.id]?.[field] || 0)),
    }));
};
