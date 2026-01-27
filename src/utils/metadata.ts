/**
 * Fetches website metadata (title, description, icon) using the Microlink API.
 * Microlink handles CORS and extracts Open Graph tags automatically.
 */
export interface WebsiteMetadata {
    title?: string;
    description?: string;
    icons: string[]; // List of candidate icons
}

/**
 * Resolves a potentially relative URL against a base URL.
 */
const resolveUrl = (base: string, relative: string): string => {
    try {
        return new URL(relative, base).href;
    } catch (e) {
        return relative;
    }
};

/**
 * Extracts metadata from an HTML string with deep scanning for OG, Twitter, and standard tags.
 */
const extractMetadataFromHtml = (html: string, baseUrl: string): WebsiteMetadata => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const getMeta = (names: string[]) => {
        for (const name of names) {
            const content = doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
                doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
            if (content) return content;
        }
        return undefined;
    };

    const title = getMeta(['og:title', 'twitter:title']) || doc.title || undefined;
    const description = getMeta(['og:description', 'twitter:description', 'description']) || undefined;

    const iconCandidates: string[] = [];

    // 1. Social Images (OG/Twitter) - Good quality
    const socialImage = getMeta(['og:image', 'twitter:image', 'twitter:image:src']);
    if (socialImage) iconCandidates.push(resolveUrl(baseUrl, socialImage));

    // 2. High Quality Favicons / Apple Touch Icons
    const highQualitySelectors = [
        'link[rel="apple-touch-icon"]',
        'link[rel="apple-touch-icon-precomposed"]',
        'link[rel="fluid-icon"]',
        'link[rel="icon"][sizes="192x192"]',
        'link[rel="icon"][sizes="180x180"]',
        'link[rel="icon"][sizes="152x152"]',
        'link[rel="icon"][sizes="120x120"]',
        'link[rel="icon"][sizes="96x96"]',
        'link[rel="icon"][sizes="48x48"]',
        'link[rel="icon"][sizes="32x32"]'
    ];

    highQualitySelectors.forEach(selector => {
        doc.querySelectorAll(selector).forEach(el => {
            const href = el.getAttribute('href');
            if (href) iconCandidates.push(resolveUrl(baseUrl, href));
        });
    });

    // 3. Fallback Icons (Standard rel="icon" or "shortcut icon")
    const fallbackSelectors = ['link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="mask-icon"]'];
    fallbackSelectors.forEach(selector => {
        doc.querySelectorAll(selector).forEach(el => {
            const href = el.getAttribute('href');
            if (href) iconCandidates.push(resolveUrl(baseUrl, href));
        });
    });

    // Unique and Sort: Prioritize PNG/SVG over ICO
    const uniqueIcons = Array.from(new Set(iconCandidates));
    const sortedIcons = uniqueIcons.sort((a, b) => {
        const isHighQuality = (url: string) => url.toLowerCase().includes('png') || url.toLowerCase().includes('svg') || url.toLowerCase().includes('apple-touch-icon');
        const aHigh = isHighQuality(a);
        const bHigh = isHighQuality(b);
        if (aHigh && !bHigh) return -1;
        if (!aHigh && bHigh) return 1;
        return 0;
    });

    return { title, description, icons: sortedIcons };
};

export const fetchWebsiteMetadata = async (url: string, externalSignal?: AbortSignal): Promise<WebsiteMetadata | null> => {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 4000); // 4s total maximum for all fallback attempts

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
        // 1. Primary: Microlink
        try {
            const mcController = new AbortController();
            const mcTimeout = setTimeout(() => mcController.abort(), 2000);
            const signal = getSignal(mcController.signal);

            const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
                signal
            });
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success' && data.data) {
                    const { title, description, logo, image } = data.data;
                    const discoveredIcons: string[] = [];
                    if (logo?.url) discoveredIcons.push(logo.url);
                    if (image?.url) discoveredIcons.push(image.url);
                    clearTimeout(mcTimeout);
                    clearTimeout(timeoutId);
                    return {
                        title: title || undefined,
                        description: description || undefined,
                        icons: Array.from(new Set(discoveredIcons))
                    };
                }
            }
        } catch (e: any) {
            if (e.name === 'AbortError' && externalSignal?.aborted) throw e;
            console.warn('Microlink failed/timeout, trying manual crawl...');
        }

        // 2. Secondary: Manual Crawl via Multi-Proxy
        const proxies = [
            (target: string) => `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
            (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`
        ];

        for (const getProxyUrl of proxies) {
            if (externalSignal?.aborted) break;

            const pController = new AbortController();
            const pTimeout = setTimeout(() => pController.abort(), 2000);
            const signal = getSignal(pController.signal);

            try {
                const proxyUrl = getProxyUrl(url);
                const response = await fetch(proxyUrl, { signal });

                if (response.ok) {
                    const data = await response.json();
                    const html = data.contents || (typeof data === 'string' ? data : null);
                    if (html) {
                        clearTimeout(pTimeout);
                        clearTimeout(timeoutId);
                        return extractMetadataFromHtml(html, url);
                    }
                }
            } catch (e: any) {
                if (e.name === 'AbortError' && externalSignal?.aborted) throw e;
                console.warn(`Proxy failed, trying next...`);
            } finally {
                clearTimeout(pTimeout);
            }
        }

        // 3. Last Resort: Unavatar
        if (externalSignal?.aborted) throw new Error('Aborted');
        const signal = getSignal(timeoutController.signal);
        const unavatarResponse = await fetch(`https://unavatar.io/${new URL(url).hostname}?json`, { signal });
        if (unavatarResponse.ok) {
            const data = await unavatarResponse.json();
            clearTimeout(timeoutId);
            return { icons: data.url ? [data.url] : [] };
        }

        return null;
    } catch (error: any) {
        clearTimeout(timeoutId);
        return null;
    }
};
