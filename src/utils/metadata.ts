/**
 * Fetches website metadata (title, description, icon) using the Microlink API.
 * Microlink handles CORS and extracts Open Graph tags automatically.
 */
export interface WebsiteMetadata {
    title?: string;
    description?: string;
    icons: string[]; // List of candidate icons
}

export const fetchWebsiteMetadata = async (url: string): Promise<WebsiteMetadata | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Total 2s window

    try {
        // 1. Primary: Microlink
        try {
            const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
                signal: controller.signal
            });
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success' && data.data) {
                    const { title, description, logo, image } = data.data;
                    const discoveredIcons: string[] = [];
                    if (logo?.url) discoveredIcons.push(logo.url);
                    if (image?.url) discoveredIcons.push(image.url);

                    clearTimeout(timeoutId);
                    return {
                        title: title || undefined,
                        description: description || undefined,
                        icons: discoveredIcons
                    };
                }
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.warn('Microlink fetch timed out, trying fallback...');
            } else {
                console.warn('Microlink failed, trying fallback:', e);
            }
        }

        // 2. Secondary/Fallback: Unavatar
        const unavatarResponse = await fetch(`https://unavatar.io/${new URL(url).hostname}?json`, {
            signal: controller.signal
        });

        if (unavatarResponse.ok) {
            const data = await unavatarResponse.json();
            clearTimeout(timeoutId);
            return {
                icons: data.url ? [data.url] : [],
            };
        }

        return null;
    } catch (error: any) {
        clearTimeout(timeoutId);
        return null;
    }
};
