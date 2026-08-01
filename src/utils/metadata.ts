/**
 * Fetches website metadata (title, description, icon).
 *
 * Strategy (parallel, fail-fast):
 *  1. Microlink API   — structured JSON, handles CORS (independent source)
 *  2. Jina AI Reader  — returns Markdown with Title:/Description: header lines
 *  3. HTML proxies    — any of {AllOrigins, Codetabs, Corsproxy} wins (Promise.any),
 *                       then the HTML is parsed locally with DOMParser
 *  4. Fallback        — domain-based icon services only
 *
 * Caching is tiered and persistent (localStorage): full results 7 days,
 * icons-only 1 hour, failures never cached.
 */

export interface WebsiteMetadata {
    title?: string;
    description?: string;
    icons: string[]; // List of candidate icons
}

// ---------------------------------------------------------------------------
// Cache layer (tiered, persistent)
// ---------------------------------------------------------------------------

//  - 'full':    title/description fetched successfully → long TTL (7 days)
//  - 'partial': only icons available → short TTL (1 hour), retry soon
//  - failures are NEVER cached (a failed fetch must be retried immediately)
interface CacheEntry {
    data: WebsiteMetadata;
    timestamp: number;
    quality: 'full' | 'partial';
}

const metadataCache = new Map<string, CacheEntry>();
const CACHE_KEY = 'nav_metadata_cache_v1';
const FULL_TTL = 7 * 24 * 60 * 60 * 1000;   // 7 days
const PARTIAL_TTL = 60 * 60 * 1000;         // 1 hour

// Load persisted cache once at startup.
try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
        const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
        Object.entries(parsed).forEach(([url, entry]) => metadataCache.set(url, entry));
    }
} catch (e) {
    console.warn('[Metadata] Failed to load cache:', e);
}

const persistCache = () => {
    try {
        const obj: Record<string, CacheEntry> = {};
        metadataCache.forEach((entry, url) => { obj[url] = entry; });
        localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
    } catch (e) {
        // localStorage full or unavailable — memory cache still works.
        console.warn('[Metadata] Failed to persist cache:', e);
    }
};

const getCached = (url: string): CacheEntry | null => {
    const cached = metadataCache.get(url);
    if (!cached) return null;
    const ttl = cached.quality === 'full' ? FULL_TTL : PARTIAL_TTL;
    if (Date.now() - cached.timestamp >= ttl) {
        metadataCache.delete(url);
        return null;
    }
    return cached;
};

const setCached = (url: string, data: WebsiteMetadata, quality: 'full' | 'partial') => {
    metadataCache.set(url, { data, timestamp: Date.now(), quality });
    persistCache();
};

// ---------------------------------------------------------------------------
// Fetch layer (parallel sources, fail-fast timeouts)
// ---------------------------------------------------------------------------

// Short timeouts: fail fast, prefer a quick retry over a long wait.
const TOTAL_TIMEOUT = 6000;   // 6s worst case across all sources
const PRIMARY_TIMEOUT = 4000; // 4s for Microlink
const PROXY_TIMEOUT = 3000;   // 3s per HTML proxy / Jina

// Combine an external abort signal with an internal timeout signal.
const mergeSignals = (a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined => {
    if (!a) return b;
    if (!b) return a;
    const combined = new AbortController();
    const onAbort = () => combined.abort();
    a.addEventListener('abort', onAbort);
    b.addEventListener('abort', onAbort);
    return combined.signal;
};

// Fetch a target URL's raw content through one proxy service. Throws on failure.
const fetchViaProxy = async (
    name: string,
    makeUrl: (target: string) => string,
    extract: (resp: Response) => Promise<string | null>,
    url: string,
    externalSignal?: AbortSignal,
    minLength = 50,
): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT);
    try {
        const resp = await fetch(makeUrl(url), { signal: mergeSignals(externalSignal, controller.signal) });
        if (!resp.ok) throw new Error(`${name}: HTTP ${resp.status}`);
        const text = await extract(resp);
        if (!text || text.trim().length < minLength) throw new Error(`${name}: empty body`);
        return text;
    } finally {
        clearTimeout(timer);
    }
};

// HTML proxies, raced with Promise.any — the fastest successful one wins.
const fetchHtmlParallel = async (url: string, externalSignal?: AbortSignal): Promise<{ source: string; html: string } | null> => {
    const jobs: { source: string; p: Promise<string> }[] = [
        {
            source: 'allorigins',
            p: fetchViaProxy('allorigins', t => `https://api.allorigins.win/get?url=${encodeURIComponent(t)}`, async r => (await r.json()).contents ?? null, url, externalSignal),
        },
        {
            source: 'codetabs',
            p: fetchViaProxy('codetabs', t => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(t)}`, r => r.text(), url, externalSignal),
        },
        {
            source: 'corsproxy',
            p: fetchViaProxy('corsproxy', t => `https://corsproxy.io/?url=${encodeURIComponent(t)}`, r => r.text(), url, externalSignal),
        },
    ];
    try {
        return await Promise.any(jobs.map(j => j.p.then(html => ({ source: j.source, html }))));
    } catch {
        return null;
    }
};

// Microlink API: structured JSON, handles CORS and anti-scraping itself.
const fetchMicrolink = async (url: string, externalSignal?: AbortSignal): Promise<WebsiteMetadata | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PRIMARY_TIMEOUT);
    try {
        const resp = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
            signal: mergeSignals(externalSignal, controller.signal),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data.status !== 'success' || !data.data) return null;
        const { title, description, logo, image } = data.data;
        if (!title && !description) return null;
        const discoveredIcons: string[] = [];
        if (logo?.url) discoveredIcons.push(logo.url);
        if (image?.url) discoveredIcons.push(image.url);
        return {
            title: title || undefined,
            description: description || undefined,
            icons: Array.from(new Set(discoveredIcons)),
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
};

// Jina AI Reader: returns Markdown whose header lines carry Title:/Description:.
const fetchJina = async (url: string, externalSignal?: AbortSignal): Promise<WebsiteMetadata | null> => {
    try {
        const text = await fetchViaProxy('jina', t => `https://r.jina.ai/${t}`, r => r.text(), url, externalSignal);
        const title = text.match(/^Title:\s*(.+)$/m)?.[1]?.trim();
        const description = text.match(/^Description:\s*(.+)$/m)?.[1]?.trim();
        if (!title && !description) return null;
        return { title: title || undefined, description: description || undefined, icons: domainIcons(url) };
    } catch {
        return null;
    }
};

// ---------------------------------------------------------------------------
// Parse layer (local DOMParser on proxy-fetched HTML)
// ---------------------------------------------------------------------------

// Domain-based icon fallback shared by every layer.
const domainIcons = (url: string): string[] => {
    const hostname = new URL(url).hostname;
    return [
        `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
        `https://unavatar.io/${hostname}`,
        `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    ];
};

const absoluteUrl = (href: string, base: string): string | null => {
    try {
        return new URL(href, base).href;
    } catch {
        return null;
    }
};

// First non-empty content among the given meta selectors.
const metaContent = (doc: Document, selectors: string[]): string | undefined => {
    for (const sel of selectors) {
        const content = doc.querySelector(sel)?.getAttribute('content');
        if (content && content.trim()) return content.trim();
    }
    return undefined;
};

const parseHtml = (html: string, url: string): WebsiteMetadata | null => {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 1. Title: <title> → og:title → twitter:title → itemprop=name
    const title = doc.querySelector('title')?.textContent?.trim() ||
        metaContent(doc, [
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            'meta[itemprop="name"]',
        ]);

    // 2. Description: meta[name=description] → og:description → twitter:description → itemprop=description
    const description = metaContent(doc, [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
        'meta[itemprop="description"]',
    ]);

    // 3. JSON-LD: WebSite / Organization / SoftwareApplication nodes carry the
    //    canonical name & description (Next.js/Nuxt sites nearly always emit it).
    let jsonLdTitle: string | undefined;
    let jsonLdDescription: string | undefined;
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        if (jsonLdTitle && jsonLdDescription) return;
        try {
            const parsed = JSON.parse(script.textContent || '');
            const nodes = Array.isArray(parsed) ? parsed : [parsed];
            for (const node of nodes) {
                const type = String(node?.['@type'] || '');
                if (/WebSite|Organization|SoftwareApplication/i.test(type)) {
                    if (!jsonLdTitle && node?.name) jsonLdTitle = String(node.name).trim();
                    if (!jsonLdDescription && node?.description) jsonLdDescription = String(node.description).trim();
                }
            }
        } catch { /* invalid JSON-LD block, skip it */ }
    });

    // 4. Real icons declared by the site (better than domain guessing).
    const icons: string[] = [];
    doc.querySelectorAll('link[rel~="icon"], link[rel~="apple-touch-icon"]').forEach(link => {
        const href = link.getAttribute('href');
        const abs = href ? absoluteUrl(href, url) : null;
        if (abs) icons.push(abs);
    });

    const finalTitle = title || jsonLdTitle;
    const finalDescription = description || jsonLdDescription;
    if (!finalTitle && !finalDescription && icons.length === 0) return null;

    return {
        title: finalTitle,
        description: finalDescription,
        icons: Array.from(new Set([...icons, ...domainIcons(url)])),
    };
};

// ---------------------------------------------------------------------------
// Structured endpoints (oEmbed / RSS): the site declares its own metadata
// protocol — higher quality than guessing meta tags.
// ---------------------------------------------------------------------------

const STRUCTURED_PROXY = (t: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(t)}`;

const fetchStructured = async (url: string, html: string, externalSignal?: AbortSignal): Promise<WebsiteMetadata | null> => {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 1. oEmbed — the site declares a JSON endpoint that returns { title, ... }.
    const oembedHref = doc.querySelector('link[type="application/json+oembed"]')?.getAttribute('href');
    if (oembedHref) {
        const abs = absoluteUrl(oembedHref, url);
        if (abs) {
            try {
                const sep = abs.includes('?') ? '&' : '?';
                const reqUrl = abs.includes('url=') ? abs : `${abs}${sep}url=${encodeURIComponent(url)}`;
                const text = await fetchViaProxy('oembed', STRUCTURED_PROXY, r => r.text(), reqUrl, externalSignal, 10);
                const data = JSON.parse(text);
                if (data?.title) {
                    const icons = data.thumbnail_url ? [String(data.thumbnail_url)] : [];
                    return {
                        title: String(data.title).trim(),
                        description: data.provider_name ? String(data.provider_name).trim() : undefined,
                        icons: Array.from(new Set([...icons, ...domainIcons(url)])),
                    };
                }
            } catch { /* oEmbed failed — fall through to RSS */ }
        }
    }

    // 2. RSS / Atom — channel title & description are the site's official ones.
    const feedHref = doc.querySelector('link[type="application/rss+xml"], link[type="application/atom+xml"]')?.getAttribute('href');
    if (feedHref) {
        const abs = absoluteUrl(feedHref, url);
        if (abs) {
            try {
                const xml = await fetchViaProxy('feed', STRUCTURED_PROXY, r => r.text(), abs, externalSignal, 10);
                const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
                const title = xmlDoc.querySelector('channel > title')?.textContent?.trim();
                const description = xmlDoc.querySelector('channel > description')?.textContent?.trim();
                if (title || description) {
                    return { title: title || undefined, description: description || undefined, icons: domainIcons(url) };
                }
            } catch { /* give up */ }
        }
    }

    return null;
};

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export const fetchWebsiteMetadata = async (url: string, externalSignal?: AbortSignal): Promise<WebsiteMetadata | null> => {
    // Check cache first (tiered TTL: full 7d, partial 1h, failures never cached)
    const cached = getCached(url);
    if (cached) {
        return cached.data;
    }

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), TOTAL_TIMEOUT);

    try {
        // Fire every source in parallel — first usable result wins the tier order.
        const [microlink, htmlFetch, jina] = await Promise.all([
            fetchMicrolink(url, timeoutController.signal),
            fetchHtmlParallel(url, timeoutController.signal),
            fetchJina(url, timeoutController.signal),
        ]);

        if (microlink) {
            console.log('[Metadata] Success via Microlink');
            setCached(url, microlink, 'full');
            return microlink;
        }

        if (jina) {
            console.log('[Metadata] Success via Jina Reader');
            setCached(url, jina, 'full');
            return jina;
        }

        if (htmlFetch) {
            const html = htmlFetch.html;
            const parsed = parseHtml(html, url);
            if (parsed && (parsed.title || parsed.description)) {
                console.log(`[Metadata] Success via ${htmlFetch.source} + DOMParser (full)`);
                setCached(url, parsed, 'full');
                return parsed;
            }

            // No title/description from HTML — ask the site's own structured
            // endpoints (oEmbed / RSS) before giving up on the content.
            const structured = await fetchStructured(url, html, timeoutController.signal);
            if (structured) {
                console.log(`[Metadata] Success via oEmbed/RSS (${htmlFetch.source})`);
                setCached(url, structured, 'full');
                return structured;
            }

            if (parsed) {
                // Icons only — short cache so it can retry soon.
                console.log(`[Metadata] Icons only via ${htmlFetch.source} (partial)`);
                setCached(url, parsed, 'partial');
                return parsed;
            }
        }

        // Final fallback: domain icons only (short cache so it can retry soon).
        console.log('[Metadata] Falling back to domain-based icons...');
        const metadata: WebsiteMetadata = { icons: domainIcons(url), title: undefined, description: undefined };
        setCached(url, metadata, 'partial');
        return metadata;
    } catch (error: any) {
        console.error('[Metadata] Fatal error:', error);
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
};
