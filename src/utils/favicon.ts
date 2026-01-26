/**
 * Returns an array of favicon service URLs for a given domain/URL.
 * This allows the frontend to try multiple services if one is blocked (e.g., Google in some regions).
 */
export const getFaviconUrls = (url: string): string[] => {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;

        return [
            // 1. Google (High quality, but might be blocked)
            `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
            // 2. FaviconKit (Good alternative)
            `https://api.faviconkit.com/${domain}/64`,
            // 3. Unavatar (Aggregates multiple sources)
            `https://unavatar.io/${domain}?fallback=https://www.google.com/s2/favicons?domain=${domain}%26sz=64`
        ];
    } catch (e) {
        return [];
    }
};

// For backward compatibility or single-use cases
export const getFaviconUrl = (url: string): string => {
    const urls = getFaviconUrls(url);
    return urls.length > 0 ? urls[0] : '';
};
