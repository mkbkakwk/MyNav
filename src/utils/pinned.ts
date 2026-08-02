import type { SectionData, LinkItem } from '../types';
import type { SortMode } from './clickStats';

export const PINNED_SECTION_ID = 'fav';

/** Same stats source as sortSections (localStorage). */
const loadStats = (): Record<string, { count: number; lastAt: number }> => {
    try {
        return JSON.parse(localStorage.getItem('nav_click_stats_v1') || '{}');
    } catch {
        return {};
    }
};

/** Pinned cards from all OTHER sections, ordered by pinnedIndex. */
export const collectPinnedItems = (sections: SectionData[]): LinkItem[] =>
    sections
        .filter(s => s.id !== PINNED_SECTION_ID)
        .flatMap(s => s.items.filter(i => i.pinned))
        .sort((a, b) => (a.pinnedIndex ?? 0) - (b.pinnedIndex ?? 0));

/**
 * Build the pinned view as a PURELY VIRTUAL section: the real fav section is
 * only a hidden data container — its items are treated as pinned — plus pinned
 * cards from other sections. No card can be dragged in/out (pin/unpin is done
 * via the context menu only).
 */
export const mergePinnedSection = (sections: SectionData[], sortMode: SortMode = 'default'): SectionData[] => {
    const fav = sections.find(s => s.id === PINNED_SECTION_ID);
    const favItems = fav?.items || [];
    const extra = collectPinnedItems(sections); // pinnedIndex-ordered
    const merged = [...favItems, ...extra];
    // In non-default sort modes the whole pinned view follows the SAME stats
    // ordering as every other section (frequent / recent); default keeps the
    // manual pinned order (fav items first, pinnedIndex for the rest).
    if (sortMode !== 'default') {
        const stats = loadStats();
        const field = sortMode === 'frequent' ? 'count' : 'lastAt';
        merged.sort((a, b) => (stats[b.id]?.[field] || 0) - (stats[a.id]?.[field] || 0));
    }
    const rest = sections.filter(s => s.id !== PINNED_SECTION_ID);
    if (merged.length === 0) return rest;
    return [{ id: PINNED_SECTION_ID, title: '常用站点', icon: '⭐', items: merged }, ...rest];
};

/** Pin/unpin a card. Pinning assigns the next pinnedIndex (appended to the pinned view). */
export const togglePin = (sections: SectionData[], cardId: string): SectionData[] => {
    const card = sections.flatMap(s => s.items).find(i => i.id === cardId);
    if (!card) return sections;
    if (card.pinned) {
        return sections.map(s => ({
            ...s,
            items: s.items.map(i => (i.id === cardId ? { ...i, pinned: false, pinnedIndex: undefined } : i)),
        }));
    }
    const maxIdx = sections.flatMap(s => s.items).reduce((m, i) => Math.max(m, i.pinnedIndex ?? -1), -1);
    return sections.map(s => ({
        ...s,
        items: s.items.map(i => (i.id === cardId ? { ...i, pinned: true, pinnedIndex: maxIdx + 1 } : i)),
    }));
};
