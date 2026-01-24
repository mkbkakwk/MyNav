import type { SectionData, Category, SyncSettings } from '../types';

/**
 * Converts current application state into a clean TypeScript source file string.
 */
export const serializeConstants = (
    sections: SectionData[],
    categories: Category[]
): string => {
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
 * Converts state to a simple JSON object for cloud storage.
 */
export const serializeToJson = (sections: SectionData[], categories: Category[]) => {
    return JSON.stringify({ sections, categories }, null, 2);
};

/**
 * Utility to send updated content to either the local Vite bridge or GitHub API.
 */
export const saveToSource = async (content: string, settings?: SyncSettings, sections?: SectionData[], categories?: Category[]) => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 1. Local Persistence (Vite Bridge)
    if (isLocal) {
        try {
            const response = await fetch('/api/save-constants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            console.log('Successfully synced with local constants.ts');
            return;
        } catch (err) {
            console.error('Failed to sync with local source files:', err);
        }
    }

    // 2. Cloud Persistence (GitHub API - To Private JSON Data)
    if (settings?.enabled && settings.token && settings.owner && settings.repo && sections && categories) {
        try {
            const filePath = 'nav-data.json';
            const apiUrl = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${filePath}`;
            const headers = {
                'Authorization': `token ${settings.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            };

            const jsonData = serializeToJson(sections, categories);

            // 1. Force fetch the LATEST SHA every time to prevent Mismatch errors
            let latestSha = '';
            try {
                const getFileResponse = await fetch(apiUrl, { headers });
                if (getFileResponse.status === 200) {
                    const latestFileData = await getFileResponse.json();
                    latestSha = latestFileData.sha;
                }
            } catch (e: any) {
                console.warn('Failed to fetch latest SHA, will attempt without it:', e.message);
            }

            // 2. Perform Commit (Force Overwrite using the fresh SHA)
            const commitResponse = await fetch(apiUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    message: 'update(nav): robust cloud sync update',
                    content: btoa(unescape(encodeURIComponent(jsonData))),
                    sha: latestSha || undefined // Always use the most recent fingerprint
                })
            });

            if (!commitResponse.ok) {
                const err = await commitResponse.json();
                if (commitResponse.status === 404) {
                    throw new Error('仓库未找到或没有权限。请检查仓库名、Token 权限及仓库是否已初始化。');
                }
                throw new Error(`GitHub API Commit Error (PUT): ${err.message || commitResponse.statusText}`);
            }
            console.log('Successfully synced with private cloud storage (SHA refreshed)');
        } catch (err: any) {
            console.error('同步失败:', err.message);
        }
    }
};

/**
 * Fetches data from the remote private repository.
 */
export const fetchRemoteData = async (settings: SyncSettings): Promise<{ sections: SectionData[], categories: Category[] } | null> => {
    if (!settings.enabled || !settings.token || !settings.owner || !settings.repo) return null;

    try {
        const filePath = 'nav-data.json';
        const apiUrl = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${filePath}`;
        const headers = {
            'Authorization': `token ${settings.token}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        const response = await fetch(apiUrl, { headers });
        if (response.status === 404) {
            console.log('远程数据文件尚未创建。');
            return null;
        }

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message);
        }

        const data = await response.json();
        const content = decodeURIComponent(escape(atob(data.content)));
        return JSON.parse(content);
    } catch (err: any) {
        console.error('获取远程数据失败:', err.message);
        return null;
    }
};
