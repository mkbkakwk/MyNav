import React, { useRef } from 'react';
import type { LinkItem } from '../types';
import IconPreview from '../components/IconPreview';

interface MobileCardProps {
    card: LinkItem;
    onLongPress: () => void;
}

/**
 * Compact mobile card: vertical layout (icon on top, title, two-line
 * description). Tap opens the link, long-press (400ms) opens the edit sheet.
 * A long-press suppresses the following click.
 */
const MobileCard: React.FC<MobileCardProps> = ({ card, onLongPress }) => {
    const longPressed = useRef(false);
    const timer = useRef<any>(null);

    const startPress = () => {
        longPressed.current = false;
        timer.current = setTimeout(() => {
            longPressed.current = true;
            onLongPress();
            // Force-reset shortly after, so the next tap is never swallowed
            // (the follow-up click consumes the flag if it fires first).
            setTimeout(() => { longPressed.current = false; }, 350);
        }, 400);
    };
    const clearPress = () => {
        if (timer.current) clearTimeout(timer.current);
    };
    const handleClick = (e: React.MouseEvent) => {
        if (longPressed.current) {
            e.preventDefault();
            longPressed.current = false;
        }
    };

    return (
        <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            onTouchStart={startPress}
            onTouchEnd={clearPress}
            onTouchMove={clearPress}
            onMouseDown={startPress}
            onMouseUp={clearPress}
            onMouseLeave={clearPress}
            onClick={handleClick}
            className="flex flex-col gap-1.5 p-2.5 rounded-2xl backdrop-blur-xl border border-white/40 dark:border-white/10 bg-glass-gradient dark:bg-slate-900/60 shadow-clay dark:shadow-clay-dark active:scale-95 transition-transform select-none"
        >
            <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-4 h-4 rounded bg-white/50 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
                    <IconPreview icon={card.icon} siteUrl={card.url} size={12} className="w-full h-full" imgClassName="w-full h-full object-contain" />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-white truncate leading-snug min-w-0">
                    {card.title}
                </p>
            </div>
            {card.description && (
                <p className="text-[10px] text-slate-400 leading-tight truncate">
                    {card.description}
                </p>
            )}
        </a>
    );
};

export default MobileCard;
