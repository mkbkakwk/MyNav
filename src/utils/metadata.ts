/**
 * Fetches website metadata (title, description, icon) using the Microlink API.
 * Microlink handles CORS and extracts Open Graph tags automatically.
 */
export interface WebsiteMetadata {
    title?: string;
    description?: string;
    icons: string[]; // List of candidate icons
}

// In-memory cache for metadata with 5-minute expiration
interface CacheEntry {
    data: WebsiteMetadata;
    timestamp: number;
}

const metadataCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const fetchWebsiteMetadata = async (url: string, externalSignal?: AbortSignal): Promise<WebsiteMetadata | null> => {
    // Check cache first
    const cached = metadataCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 15000); // 15s total maximum for prod

    // Helper to combine external signal and internal timeout
    const getSignal = (internalSignal: AbortSignal) => {
        if (!externalSignal) return internalSignal;

        // Create a combined controller
        const combined = new AbortController();
        const onAbort = () => combined.abort();

        externalSignal.addEventListener('abort', onAbort);
        internalSignal.addEventListener('abort', onAbort);

        return combined.signal;
    };

    try {
        // 1. PRIMARY: Microlink API (has better anti-scraping capabilities)
        try {
            const mcController = new AbortController();
            const mcTimeout = setTimeout(() => mcController.abort(), 10000); // 10s timeout for scraper
            const signal = getSignal(mcController.signal);

            console.log(`[Metadata] Trying Microlink API...`);
            const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
                signal
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success' && data.data && (data.data.title || data.data.description)) {
                    const { title, description, logo, image } = data.data;
                    const discoveredIcons: string[] = [];
                    if (logo?.url) discoveredIcons.push(logo.url);
                    if (image?.url) discoveredIcons.push(image.url);

                    clearTimeout(mcTimeout);
                    clearTimeout(timeoutId);

                    const metadata = {
                        title: title || undefined,
                        description: description || undefined,
                        icons: Array.from(new Set(discoveredIcons))
                    };
                    console.log(`[Metadata] Success via Microlink:`, metadata);
                    metadataCache.set(url, { data: metadata, timestamp: Date.now() });
                    return metadata;
                }
            } else {
                console.warn(`[Metadata] Microlink API returned ${response.status}: ${response.statusText}`);
            }
            clearTimeout(mcTimeout);
        } catch (e: any) {
            if (e.name === 'AbortError' && externalSignal?.aborted) throw e;
            console.warn('[Metadata] Microlink failed:', e.message);
        }

        // 1.5. SECONDARY FALLBACK: AllOrigins + DOMParser
        // This works if Microlink is rate-limited or blocked for our origin
        try {
            console.log(`[Metadata] Trying AllOrigins fallback...`);
            const aoController = new AbortController();
            const aoTimeout = setTimeout(() => aoController.abort(), 5000); // 5s timeout
            const signal = getSignal(aoController.signal);

            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
                signal
            });

            if (response.ok) {
                const data = await response.json();
                const html = data.contents;
                if (html) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    const title = doc.querySelector('title')?.textContent ||
                        doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                        undefined;

                    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                        undefined;

                    const hostname = new URL(url).hostname;
                    const metadata: WebsiteMetadata = {
                        title: title?.trim() || undefined,
                        description: description?.trim() || undefined,
                        icons: [
                            `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
                            `https://unavatar.io/${hostname}`
                        ]
                    };

                    if (metadata.title || metadata.description) {
                        console.log(`[Metadata] Success via AllOrigins:`, metadata);

                        clearTimeout(aoTimeout);
                        clearTimeout(timeoutId);
                        metadataCache.set(url, { data: metadata, timestamp: Date.now() });
                        return metadata;
                    }
                }
            }
            clearTimeout(aoTimeout);
        } catch (e: any) {
            console.warn('[Metadata] AllOrigins fallback failed:', e.message);
        }

        // 2. FINAL FALLBACK: Domain-based icon services (for sites with anti-scraping)
        // These work even when we can't fetch the HTML
        console.log(`[Metadata] Falling back to domain-based icon services...`);

        const hostname = new URL(url).hostname;
        const iconCandidates: string[] = [
            `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
            `https://unavatar.io/${hostname}`,
            `https://icons.duckduckgo.com/ip3/${hostname}.ico`
        ];

        const metadata = {
            icons: iconCandidates,
            title: undefined,
            description: undefined
        };

        console.log(`[Metadata] Using domain-based icons:`, metadata);
        clearTimeout(timeoutId);
        metadataCache.set(url, { data: metadata, timestamp: Date.now() });
        return metadata;

    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('[Metadata] Fatal error:', error);
        return null;
    }
};
