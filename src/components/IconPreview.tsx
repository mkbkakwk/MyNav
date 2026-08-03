import React, { useState, useEffect } from 'react';
import { getCachedIcon, setCachedIcon } from '../utils/faviconCache';

interface IconPreviewProps {
    icon: string;
    siteUrl?: string;
    className?: string;
    imgClassName?: string;
    size?: number;
}

const IconPreview: React.FC<IconPreviewProps> = ({
    icon,
    siteUrl,
    className = "",
    imgClassName = "w-full h-full object-contain p-2",
    size = 24
}) => {
    const [imgErrorCount, setImgErrorCount] = useState(0);

    const handleImageError = () => {
        setImgErrorCount(prev => prev + 1);
    };

    if (!icon) return <span className="text-xl">🔗</span>;

    if (icon.startsWith('http')) {
        // Stage-based fallback URLs
        let displayUrl = icon;

        if (imgErrorCount > 0 && siteUrl) {
            try {
                const urlObj = new URL(siteUrl);
                const domain = urlObj.hostname;

                if (imgErrorCount === 1) {
                    // Fallback 1: Google (Most reliable)
                    displayUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`;
                } else if (imgErrorCount === 2) {
                    // Fallback 2: FaviconKit
                    displayUrl = `https://api.faviconkit.com/${domain}/64`;
                } else if (imgErrorCount === 3) {
                    // Fallback 3: Unavatar
                    displayUrl = `https://unavatar.io/${domain}`;
                }
            } catch (e) {
                // If siteUrl is invalid, we'll hit imgErrorCount >= 4 faster
            }
        }

        if (imgErrorCount >= 4) {
            return <span className="emoji-icon transition-transform duration-300 group-hover:rotate-6 select-none" style={{ fontSize: `${size}px` }}>🔗</span>;
        }

        return (
            <div className={`flex items-center justify-center overflow-hidden ${className}`}>
                <IconImage displayUrl={displayUrl} imgClassName={imgClassName} onError={handleImageError} />
            </div>
        );
    }

    // Handle Emoji or single char
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <span className="emoji-icon transition-transform duration-300 group-hover:rotate-6 select-none" style={{ fontSize: `${size}px` }}>
                {icon}
            </span>
        </div>
    );
};

/** Image with IndexedDB-cache-first loading (shared by desktop & mobile). */
const IconImage: React.FC<{
    displayUrl: string;
    imgClassName: string;
    onError: () => void;
}> = ({ displayUrl, imgClassName, onError }) => {
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
    const [cacheMiss, setCacheMiss] = useState(false);

    // Try the cache first; fall back to network when missing/expired.
    useEffect(() => {
        let cancelled = false;
        setResolvedSrc(null);
        setCacheMiss(false);
        getCachedIcon(displayUrl).then(cached => {
            if (cancelled) {
                if (cached) URL.revokeObjectURL(cached);
                return;
            }
            if (cached) {
                setResolvedSrc(cached);
            } else {
                setCacheMiss(true);
            }
        });
        return () => { cancelled = true; };
    }, [displayUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    // Revoke object URLs we created (both unused probes and the active one).
    useEffect(() => {
        const active = resolvedSrc;
        return () => {
            if (active && active.startsWith('blob:')) URL.revokeObjectURL(active);
        };
    }, [resolvedSrc]);

    const src = resolvedSrc ?? displayUrl;

    return (
        <img
            src={src}
            alt=""
            className={imgClassName}
            onError={onError}
            onLoad={() => {
                // Cache successful network loads for next time (blob copy).
                if (cacheMiss && !src.startsWith('blob:')) {
                    fetch(displayUrl)
                        .then(r => r.blob())
                        .then(b => setCachedIcon(displayUrl, b))
                        .catch(() => { /* non-fatal */ });
                }
            }}
        />
    );
};

export default IconPreview;
