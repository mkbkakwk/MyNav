import type { SectionData, LinkItem } from '../types';

export const PINNED_SECTION_ID = 'fav';

/** Pinned cards from all OTHER sections, ordered by pinnedIndex. */
export const collectPinnedItems = (sections: SectionData[]): LinkItem[] =>
    sections
        .filter(s => s.id !== PINNED_SECTION_ID)
        .flatMap(s => s.items.filter(i => i.pinned))
        .sort((a, b) => (a.pinnedIndex ?? 0) - (b.pinnedIndex ?? 0));

/**
 * Merge the pinned view: the "常用站点" section shows its own items first
 * (user-ordered, drag-sortable), then pinned cards from other sections
 * (pinnedIndex order). If no fav section exists, a virtual one is created
 * when there are pinned cards.
 */
export const mergePinnedSection = (sections: SectionData[]): SectionData[] => {
    const extra = collectPinnedItems(sections);
    const fav = sections.find(s => s.id === PINNED_SECTION_ID);
    if (!fav) {
        if (extra.length === 0) return sections;
        return [{ id: PINNED_SECTION_ID, title: '常用站点', icon: '⭐', items: extra }, ...sections];
    }
    if (extra.length === 0) return sections;
    return sections.map(s => (s.id === PINNED_SECTION_ID ? { ...s, items: [...s.items, ...extra] } : s));
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
