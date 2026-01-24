import type { SectionData, Category } from '../types';

/**
 * Converts current application state into a clean TypeScript source file string.
 */
export const serializeConstants = (
    sections: SectionData[],
    categories: Category[]
): string => {
    // Convert Category array back to SEARCH_CATEGORIES record if needed, 
    // but we migrated to Category[] for better order/management.
    // We'll export the Category[] as the primary data source.

    const sidebarItems = sections.map(s => ({
        id: s.id,
        title: s.title,
        icon: s.icon,
        href: `#${s.id}`
    }));

    const searchCategoriesRecord: Record<string, any[]> = {};
    categories.forEach(c => {
        searchCategoriesRecord[c.name] = c.engines;
    });

    return `import type { SectionData, SidebarItem, SearchEngine } from './types';

export const SIDEBAR_ITEMS: SidebarItem[] = ${JSON.stringify(sidebarItems, null, 2)};

export const SEARCH_CATEGORIES: Record<string, SearchEngine[]> = ${JSON.stringify(searchCategoriesRecord, null, 2)};

// Flatten for backwards compatibility if needed
export const SEARCH_ENGINES: SearchEngine[] = SEARCH_CATEGORIES['常用'] || [];

export const SECTIONS: SectionData[] = ${JSON.stringify(sections, null, 2)};
`;
};

/**
 * Utility to send updated content to the Vite bridge.
 */
export const saveToSource = async (content: string) => {
    try {
        const response = await fetch('/api/save-constants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        console.log('Successfully synced with constants.ts');
    } catch (err) {
        console.error('Failed to sync with local source files:', err);
    }
};
