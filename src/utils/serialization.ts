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

            // 1. Check if repo exists and get file SHA
            let sha = '';
            try {
                const getFileResponse = await fetch(apiUrl, { headers });
                if (getFileResponse.status === 200) {
                    const fileData = await getFileResponse.json();
                    sha = fileData.sha;
                } else if (getFileResponse.status === 404) {
                    // File not found is OK for first sync, but if the REPO is 404 it's a problem
                    // We'll check the repo existence if the PUT fails
                    console.log('Target file not found, will create a new one.');
                } else {
                    const errData = await getFileResponse.json();
                    throw new Error(`GitHub API Error (GET): ${errData.message || getFileResponse.statusText}`);
                }
            } catch (e: any) {
                console.warn('Initial file check failed:', e.message);
            }

            // 2. Update/Create via PUT
            const commitResponse = await fetch(apiUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    message: 'update(nav): cloud sync data update',
                    content: btoa(unescape(encodeURIComponent(jsonData))),
                    sha: sha || undefined
                })
            });

            if (!commitResponse.ok) {
                const err = await commitResponse.json();
                // If PUT returns 404, it almost certainly means the REPO or BRANCH doesn't exist
                if (commitResponse.status === 404) {
                    throw new Error('仓库未找到或 Token 权限不足。请检查：1. 仓库名是否准确 2. Token 是否勾选了 repo 权限 3. 仓库是否已初始化(至少含有一个分支)。');
                }
                throw new Error(`GitHub API Error (PUT): ${err.message || commitResponse.statusText}`);
            }
            console.log('Successfully synced with private cloud storage');
        } catch (err: any) {
            console.error('同步失败:', err.message);
            // Re-throw to allow UI to catch if needed
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
