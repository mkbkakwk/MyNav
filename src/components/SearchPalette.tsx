import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import type { SectionData } from '../types';
import IconPreview from './IconPreview';

interface SearchPaletteProps {
    sections: SectionData[];
    onClose: () => void;
}

interface Match {
    card: SectionData['items'][number];
    sectionTitle: string;
    sectionIcon: string;
}

/** Desktop command palette (Ctrl+K): filters local sites in real time. */
const SearchPalette: React.FC<SearchPaletteProps> = ({ sections, onClose }) => {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const q = query.trim().toLowerCase();
    const matches: Match[] = [];
    if (q) {
        sections.forEach(s => s.items.forEach(card => {
            if (card.title.toLowerCase().includes(q) || card.description?.toLowerCase().includes(q)) {
                matches.push({ card, sectionTitle: s.title, sectionIcon: s.icon });
            }
        }));
    }

    // Reset the selection whenever the query changes.
    useEffect(() => setActiveIndex(0), [q]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (matches.length) setActiveIndex(i => (i + 1) % matches.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (matches.length) setActiveIndex(i => (i - 1 + matches.length) % matches.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = matches[activeIndex];
            if (target) {
                window.open(target.card.url, '_blank');
                onClose();
            }
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Input row */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <SearchIcon size={20} className="text-slate-400 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="搜索本地站点..."
                        className="flex-1 bg-transparent outline-none text-base text-slate-800 dark:text-white placeholder:text-sm placeholder-slate-400"
                    />
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="关闭">
                        <X size={18} />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto p-2">
                    {!q && (
                        <p className="text-center text-xs text-slate-400 py-8">输入关键词搜索本地站点 · Esc 关闭</p>
                    )}
                    {q && matches.length === 0 && (
                        <p className="text-center text-sm text-slate-400 py-8">没有匹配的站点</p>
                    )}
                    {matches.map((m, i) => (
                        <a
                            key={m.card.id}
                            href={m.card.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            onMouseEnter={() => setActiveIndex(i)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                                i === activeIndex ? 'bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
                                <IconPreview icon={m.card.icon} siteUrl={m.card.url} size={16} className="w-full h-full" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{m.card.title}</p>
                                <p className="text-[11px] text-slate-400 truncate">
                                    {m.sectionIcon} {m.sectionTitle}
                                    {m.card.description ? ` · ${m.card.description}` : ''}
                                </p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SearchPalette;
