import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, X, Plus, Edit2, Trash2 } from 'lucide-react';
import type { SectionData, SearchEngine } from '../types';
import IconPreview from '../components/IconPreview';

interface MobileSearchProps {
    sections: SectionData[];
}

interface Match {
    sectionId: string;
    sectionTitle: string;
    sectionIcon: string;
    card: SectionData['items'][number];
}

// Read categories (name → engines) from shared storage, same structure as desktop.
interface SearchCategory {
    id?: string;
    name: string;
    engines: SearchEngine[];
}

// Same JSONP helper as the desktop header (dynamic <script> tag, avoids CORS).
const fetchJsonp = (url: string, callbackParam: string = 'callback'): Promise<any> => {
    return new Promise((resolve, reject) => {
        const callbackName = `jsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const script = document.createElement('script');
        let timeoutId: any;

        const cleanup = () => {
            if ((window as any)[callbackName]) {
                (window as any)[callbackName] = () => { };
                try { delete (window as any)[callbackName]; } catch (e) { }
            }
            if (document.body.contains(script)) document.body.removeChild(script);
            if (timeoutId) clearTimeout(timeoutId);
        };

        (window as any)[callbackName] = (data: any) => {
            cleanup();
            resolve(data);
        };

        script.src = `${url}${url.includes('?') ? '&' : '?'}${callbackParam}=${callbackName}`;
        script.onerror = () => {
            cleanup();
            reject(new Error('JSONP request failed'));
        };
        timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP timeout'));
        }, 5000);
        document.body.appendChild(script);
    });
};

const loadCategories = (): SearchCategory[] => {
    try {
        const raw = localStorage.getItem('nav_search_categories_v2');
        if (!raw) return [];
        return JSON.parse(raw) as SearchCategory[];
    } catch {
        return [];
    }
};

// Same brand-color mapping as the desktop header (Tailwind JIT needs the full
// class names spelled out — dynamic strings from data would not be detected).
const getThemeClasses = (bgClass: string = 'bg-blue-500') => {
    const map: Record<string, { ring: string; text: string; bg: string }> = {
        'bg-blue-500': { ring: 'ring-blue-500', text: 'text-blue-500', bg: 'bg-blue-500' },
        'bg-blue-600': { ring: 'ring-blue-600', text: 'text-blue-600', bg: 'bg-blue-600' },
        'bg-blue-700': { ring: 'ring-blue-700', text: 'text-blue-700', bg: 'bg-blue-700' },
        'bg-sky-500': { ring: 'ring-sky-500', text: 'text-sky-500', bg: 'bg-sky-500' },
        'bg-sky-600': { ring: 'ring-sky-600', text: 'text-sky-600', bg: 'bg-sky-600' },
        'bg-cyan-500': { ring: 'ring-cyan-500', text: 'text-cyan-500', bg: 'bg-cyan-500' },
        'bg-cyan-600': { ring: 'ring-cyan-600', text: 'text-cyan-600', bg: 'bg-cyan-600' },
        'bg-indigo-500': { ring: 'ring-indigo-500', text: 'text-indigo-500', bg: 'bg-indigo-500' },
        'bg-indigo-600': { ring: 'ring-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-600' },
        'bg-purple-500': { ring: 'ring-purple-500', text: 'text-purple-500', bg: 'bg-purple-500' },
        'bg-purple-600': { ring: 'ring-purple-600', text: 'text-purple-600', bg: 'bg-purple-600' },
        'bg-rose-500': { ring: 'ring-rose-500', text: 'text-rose-500', bg: 'bg-rose-500' },
        'bg-lime-500': { ring: 'ring-lime-500', text: 'text-lime-500', bg: 'bg-lime-500' },
        'bg-emerald-500': { ring: 'ring-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500' },
        'bg-red-400': { ring: 'ring-red-400', text: 'text-red-400', bg: 'bg-red-400' },
        'bg-red-500': { ring: 'ring-red-500', text: 'text-red-500', bg: 'bg-red-500' },
        'bg-red-600': { ring: 'ring-red-600', text: 'text-red-600', bg: 'bg-red-600' },
        'bg-orange-500': { ring: 'ring-orange-500', text: 'text-orange-500', bg: 'bg-orange-500' },
        'bg-orange-600': { ring: 'ring-orange-600', text: 'text-orange-600', bg: 'bg-orange-600' },
        'bg-amber-500': { ring: 'ring-amber-500', text: 'text-amber-500', bg: 'bg-amber-500' },
        'bg-teal-500': { ring: 'ring-teal-500', text: 'text-teal-500', bg: 'bg-teal-500' },
        'bg-teal-600': { ring: 'ring-teal-600', text: 'text-teal-600', bg: 'bg-teal-600' },
        'bg-emerald-600': { ring: 'ring-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-600' },
        'bg-green-500': { ring: 'ring-green-500', text: 'text-green-500', bg: 'bg-green-500' },
        'bg-green-600': { ring: 'ring-green-600', text: 'text-green-600', bg: 'bg-green-600' },
        'bg-pink-500': { ring: 'ring-pink-500', text: 'text-pink-500', bg: 'bg-pink-500' },
        'bg-slate-800': { ring: 'ring-slate-800', text: 'text-slate-800 dark:text-slate-100', bg: 'bg-slate-800' },
    };
    return map[bgClass] || { ring: 'ring-primary', text: 'text-primary', bg: 'bg-primary' };
};

// Full focus-within ring class names (static strings so Tailwind JIT emits them).
const getFocusRing = (bgClass?: string) => {
    const map: Record<string, string> = {
        'bg-blue-500': 'focus-within:ring-blue-500',
        'bg-blue-600': 'focus-within:ring-blue-600',
        'bg-blue-700': 'focus-within:ring-blue-700',
        'bg-sky-500': 'focus-within:ring-sky-500',
        'bg-sky-600': 'focus-within:ring-sky-600',
        'bg-cyan-500': 'focus-within:ring-cyan-500',
        'bg-cyan-600': 'focus-within:ring-cyan-600',
        'bg-indigo-500': 'focus-within:ring-indigo-500',
        'bg-indigo-600': 'focus-within:ring-indigo-600',
        'bg-purple-500': 'focus-within:ring-purple-500',
        'bg-purple-600': 'focus-within:ring-purple-600',
        'bg-rose-500': 'focus-within:ring-rose-500',
        'bg-lime-500': 'focus-within:ring-lime-500',
        'bg-emerald-500': 'focus-within:ring-emerald-500',
        'bg-red-400': 'focus-within:ring-red-400',
        'bg-red-500': 'focus-within:ring-red-500',
        'bg-red-600': 'focus-within:ring-red-600',
        'bg-orange-500': 'focus-within:ring-orange-500',
        'bg-orange-600': 'focus-within:ring-orange-600',
        'bg-amber-500': 'focus-within:ring-amber-500',
        'bg-teal-500': 'focus-within:ring-teal-500',
        'bg-teal-600': 'focus-within:ring-teal-600',
        'bg-emerald-600': 'focus-within:ring-emerald-600',
        'bg-green-500': 'focus-within:ring-green-500',
        'bg-green-600': 'focus-within:ring-green-600',
        'bg-pink-500': 'focus-within:ring-pink-500',
        'bg-slate-800': 'focus-within:ring-slate-800',
    };
    return map[bgClass || ''] || 'focus-within:ring-primary';
};

// Available brand colors for newly added engines (same pool as the desktop).
const AVAILABLE_COLORS = [
    'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-teal-500', 'bg-indigo-500',
    'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-cyan-500', 'bg-amber-500',
    'bg-slate-800', 'bg-emerald-500', 'bg-sky-500', 'bg-rose-500', 'bg-lime-500',
];

const nextColor = (engines: SearchEngine[]): string => {
    const used = new Set(engines.map(e => e.color));
    return AVAILABLE_COLORS.find(c => !used.has(c)) || AVAILABLE_COLORS[0];
};

const MobileSearch: React.FC<MobileSearchProps> = ({ sections }) => {
    const [query, setQuery] = useState('');
    const [categories, setCategories] = useState<SearchCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [selected, setSelected] = useState<SearchEngine | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    // Add / edit category-engine dialog state (add or edit, prefilled in edit mode)
    const [editor, setEditor] = useState<null | { mode: 'add' | 'edit'; type: 'category' | 'engine'; name?: string; url?: string }>(null);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');
    // Long-press action menu for category / engine chips
    const [chipMenu, setChipMenu] = useState<null | { type: 'category' | 'engine'; name: string }>(null);
    const chipPressTimer = useRef<any>(null);
    const chipLongPressed = useRef(false);

    const startChipPress = (fn: () => void) => {
        chipPressTimer.current = setTimeout(() => {
            chipLongPressed.current = true;
            fn();
            // Give the follow-up click (from releasing the press) a short window
            // to consume the flag, then force-reset it so the NEXT tap is not
            // silently swallowed (e.g. after closing the menu via the overlay).
            setTimeout(() => { chipLongPressed.current = false; }, 350);
        }, 400);
    };
    const clearChipPress = () => {
        if (chipPressTimer.current) clearTimeout(chipPressTimer.current);
    };

    const inputRef = useRef<HTMLInputElement>(null);
    const catRef = useRef<HTMLDivElement>(null);
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cats = loadCategories();
        setCategories(cats);
        if (cats.length > 0) {
            setActiveCategory(cats[0].name);
            setSelected(cats[0].engines[0] || null);
        }
    }, []);

    // Auto focus on tab switch (keyboard pops up).
    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 300);
        return () => clearTimeout(t);
    }, []);

    const activeEngines = categories.find(c => c.name === activeCategory)?.engines || [];

    const switchCategory = (name: string) => {
        setActiveCategory(name);
        const cat = categories.find(c => c.name === name);
        setSelected(cat?.engines[0] || null);
        setSuggestions([]);
    };

    // Live suggestions from the selected engine's source (debounced 200ms),
    // same logic as the desktop header. A `cancelled` flag drops stale JSONP
    // responses so clearing the input can never be reverted by a late reply.
    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            const q0 = query.trim();
            if (!q0 || !selected) return setSuggestions([]);
            const source = selected.suggestionSource || 'none';
            if (source === 'none') return setSuggestions([]);
            try {
                let url = '', callbackParam = 'callback';
                if (source === 'baidu') { url = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(q0)}&p=3`; callbackParam = 'cb'; }
                else if (source === 'google') { url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q0)}`; }
                else if (source === '360' || source === 'bing') { url = `https://sug.so.360.cn/suggest?word=${encodeURIComponent(q0)}&encodein=utf-8&encodeout=utf-8`; }
                else return setSuggestions([]);
                const data = await fetchJsonp(url, callbackParam);
                if (cancelled) return; // stale response — query changed or cleared
                const results = source === 'google' ? data[1] : data.s || [];
                setSuggestions(results.slice(0, 8));
            } catch {
                if (!cancelled) setSuggestions([]);
            }
        }, 200);
        return () => { clearTimeout(timer); cancelled = true; };
    }, [query, selected]);

    const q = query.trim().toLowerCase();
    const matches: Match[] = [];
    if (q) {
        sections.forEach(section => {
            section.items.forEach(card => {
                if (card.title.toLowerCase().includes(q) || card.description?.toLowerCase().includes(q)) {
                    matches.push({ sectionId: section.id, sectionTitle: section.title, sectionIcon: section.icon, card });
                }
            });
        });
    }

    const handleEngineSearch = (searchQuery?: string) => {
        const qText = (searchQuery ?? query).trim();
        if (!qText || !selected) return;
        window.open(selected.url.replace('{q}', encodeURIComponent(qText)), '_blank');
    };

    // Persist categories to the shared storage and notify the app (which syncs
    // to constants.ts / GitHub via the nav_search_updated listener).
    const persistCategories = (cats: SearchCategory[]) => {
        localStorage.setItem('nav_search_categories_v2', JSON.stringify(cats));
        window.dispatchEvent(new CustomEvent('nav_search_updated', { detail: cats }));
        setCategories(cats);
    };

    const saveNew = () => {
        if (!editor || !newName.trim()) return;
        const cats = [...categories];
        if (editor.type === 'category') {
            if (editor.mode === 'add') {
                cats.push({ id: `cat-${Date.now()}`, name: newName.trim(), engines: [] });
            } else {
                const cat = cats.find(c => c.name === editor.name);
                if (cat) cat.name = newName.trim();
            }
        } else {
            const cat = cats.find(c => c.name === activeCategory);
            if (!cat) return;
            if (editor.mode === 'add') {
                cat.engines.push({
                    name: newName.trim(),
                    color: nextColor(cat.engines),
                    url: newUrl.trim(),
                    suggestionSource: 'baidu',
                });
            } else {
                const eng = cat.engines.find(e => e.name === editor.name);
                if (eng) {
                    eng.name = newName.trim();
                    eng.url = newUrl.trim();
                }
            }
        }
        persistCategories(cats);
        // Keep selection consistent after renames
        if (editor.type === 'category' && editor.mode === 'edit' && activeCategory === editor.name) {
            setActiveCategory(newName.trim());
        }
        if (editor.type === 'category' && editor.mode === 'add') {
            setActiveCategory(newName.trim());
            setSelected(null);
        }
        if (editor.type === 'engine' && editor.mode === 'edit' && selected && selected.name === editor.name) {
            setSelected({ ...selected, name: newName.trim(), url: newUrl.trim() });
        }
        setEditor(null);
        setNewName('');
        setNewUrl('');
    };

    const removeChip = () => {
        if (!chipMenu) return;
        const cats = [...categories];
        if (chipMenu.type === 'category') {
            const idx = cats.findIndex(c => c.name === chipMenu.name);
            if (idx > -1) cats.splice(idx, 1);
            if (activeCategory === chipMenu.name) {
                setActiveCategory(cats[0]?.name || '');
                setSelected(cats[0]?.engines[0] || null);
            }
        } else {
            const cat = cats.find(c => c.name === activeCategory);
            if (cat) {
                cat.engines = cat.engines.filter(e => e.name !== chipMenu.name);
                if (selected?.name === chipMenu.name) setSelected(cat.engines[0] || null);
            }
        }
        persistCategories(cats);
        setChipMenu(null);
    };

    return (
        <div className="px-4 pt-6 pb-10 max-w-3xl mx-auto">
            {/* One group in normal flow from the top: categories → search bar → engines */}
            <div className="flex flex-col">
                {/* Categories: the + button stays visible even when empty */}
                <div ref={catRef}>
                    <div className="flex gap-2 flex-wrap justify-center">
                        {categories.map(cat => (
                            <button
                                key={cat.name}
                                onClick={(e) => {
                                    if (chipLongPressed.current) { e.preventDefault(); chipLongPressed.current = false; return; }
                                    switchCategory(cat.name);
                                }}
                                onTouchStart={() => startChipPress(() => setChipMenu({ type: 'category', name: cat.name }))}
                                onTouchEnd={clearChipPress}
                                onTouchMove={clearChipPress}
                                onMouseDown={() => startChipPress(() => setChipMenu({ type: 'category', name: cat.name }))}
                                onMouseUp={clearChipPress}
                                onMouseLeave={clearChipPress}
                                className={`shrink-0 px-4 py-2 rounded-xl whitespace-nowrap text-xs transition-all duration-300 active:scale-95 select-none ${
                                    activeCategory === cat.name
                                        ? 'text-primary bg-primary/10 font-bold shadow-sm ring-1 ring-primary/20 scale-105'
                                        : 'text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                        <button
                            onClick={() => { setEditor({ mode: 'add', type: 'category' }); setNewName(''); setNewUrl(''); }}
                            className="shrink-0 w-9 h-9 rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-400 flex items-center justify-center active:scale-90 transition-transform"
                            aria-label="添加分类"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Search bar (normal flow, right below the categories) */}
                <div ref={barRef} className="mt-6">
                    <div className={`relative flex flex-col overflow-hidden ${suggestions.length > 0 ? 'rounded-2xl' : 'rounded-full'} bg-white/95 dark:bg-slate-900/80 shadow-pill dark:shadow-pill-dark transition-[background-color,box-shadow,backdrop-filter] duration-300 focus-within:ring-4 ${getFocusRing(selected?.color)} focus-within:shadow-2xl`}>
                        <div className="relative flex items-center w-full">
                            <SearchIcon size={18} className="absolute left-4 text-slate-400 shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleEngineSearch()}
                                className="w-full pl-11 pr-24 py-4 bg-transparent border-none text-base text-slate-800 dark:text-slate-100 focus:ring-0 outline-none"
                            />
                            {query && (
                                <button onClick={() => { setQuery(''); setSuggestions([]); }} className="absolute right-16 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X size={18} />
                                </button>
                            )}
                            <button
                                onClick={() => handleEngineSearch()}
                                className={`absolute right-2 text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg transition-all ${selected?.color || 'bg-blue-500'}`}
                                aria-label="搜索"
                            >
                                <SearchIcon size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Bottom suggestions, expanding inside the same container (desktop spring animation) */}
                        <AnimatePresence mode="wait">
                            {suggestions.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 30, stiffness: 300, duration: 0.4 }}
                                    className="w-full border-t border-slate-100/50 dark:border-white/5 bg-inherit"
                                >
                                    <div className="pb-2">
                                        {suggestions.map((s, i) => (
                                            <motion.button
                                                key={s}
                                                initial={{ x: -10, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => { setQuery(s); handleEngineSearch(s); }}
                                                className="w-full text-left px-8 py-3 cursor-pointer flex items-center gap-3 text-xs transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            >
                                                <SearchIcon size={16} className="opacity-50 shrink-0" />
                                                <span className="truncate">{s}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Engines + search button + empty hint (the + stays visible even when empty) */}
                <div className="mt-6">
                    <div className="flex gap-2 flex-wrap justify-center">
                        {activeEngines.map(engine => {
                                const isSelected = selected?.name === engine.name;
                                const engineTheme = getThemeClasses(engine.color);
                                return (
                                    <button
                                        key={engine.name}
                                        onClick={(e) => {
                                            if (chipLongPressed.current) { e.preventDefault(); chipLongPressed.current = false; return; }
                                            setSelected(engine);
                                        }}
                                        onTouchStart={() => startChipPress(() => setChipMenu({ type: 'engine', name: engine.name }))}
                                        onTouchEnd={clearChipPress}
                                        onTouchMove={clearChipPress}
                                        onMouseDown={() => startChipPress(() => setChipMenu({ type: 'engine', name: engine.name }))}
                                        onMouseUp={clearChipPress}
                                        onMouseLeave={clearChipPress}
                                        className={`shrink-0 px-4 py-2 rounded-xl whitespace-nowrap text-xs transition-all duration-300 active:scale-95 flex items-center gap-2 relative select-none ${
                                            isSelected
                                                ? `bg-white dark:bg-slate-700 shadow-md ring-2 ${engineTheme.ring} ${engineTheme.text} font-bold scale-105`
                                                : 'bg-white/40 dark:bg-slate-800/40 text-slate-500'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${engine.color} shadow-[0_0_8px_rgba(0,0,0,0.3)] ${isSelected ? 'scale-125' : ''}`} />
                                        {engine.name}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => { setEditor({ mode: 'add', type: 'engine' }); setNewName(''); setNewUrl(''); }}
                                className="shrink-0 w-9 h-9 rounded-xl bg-white/40 dark:bg-slate-800/40 text-slate-500 flex items-center justify-center active:scale-90 transition-transform"
                                aria-label="添加搜索引擎"
                            >
                                <Plus size={16} />
                            </button>
                    </div>

                    {!q && (
                        <div className="mt-10 text-center text-xs text-slate-400 leading-relaxed">
                            <p className="text-2xl mb-2">🔍</p>
                            输入关键词:<br />本地匹配站点 · 选择引擎搜索网页
                        </div>
                    )}
                </div>
            </div>

            {/* Local results */}
            {q && (
                <div className="mt-5 space-y-4">
                    {matches.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-10">本地没有匹配的站点</p>
                    ) : (
                        <>
                            <p className="text-xs text-slate-400 font-medium">本地站点 · {matches.length} 个结果</p>
                            {matches.map(m => (
                                <a
                                    key={m.card.id}
                                    href={m.card.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl border border-white/40 dark:border-white/10 active:scale-[0.98] transition-transform"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
                                        <IconPreview icon={m.card.icon} siteUrl={m.card.url} size={20} className="w-full h-full" />
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
                        </>
                    )}
                </div>
            )}

            {/* Chip action menu (long-press a category/engine chip): edit / delete */}
            {chipMenu && createPortal(
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setChipMenu(null)}>
                    <div
                        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom-8 duration-300"
                        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="text-xs text-slate-400 mb-2 text-center">
                            {chipMenu.type === 'category' ? `分类「${chipMenu.name}」` : `引擎「${chipMenu.name}」`}
                        </p>
                        <button
                            onClick={() => {
                                if (chipMenu.type === 'category') {
                                    setEditor({ mode: 'edit', type: 'category', name: chipMenu.name });
                                } else {
                                    const cat = categories.find(c => c.name === activeCategory);
                                    const eng = cat?.engines.find(e => e.name === chipMenu.name);
                                    setEditor({ mode: 'edit', type: 'engine', name: chipMenu.name, url: eng?.url || '' });
                                    setNewUrl(eng?.url || '');
                                }
                                setNewName(chipMenu.name);
                                setChipMenu(null);
                            }}
                            className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-3"
                        >
                            <Edit2 size={18} className="text-slate-400" /> 编辑
                        </button>
                        <button
                            onClick={removeChip}
                            className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-medium flex items-center gap-3"
                        >
                            <Trash2 size={18} /> 删除
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Add / edit category-engine dialog (portal: above the bottom tab bar) */}
            {editor && createPortal(
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setEditor(null)}>
                    <div
                        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom-8 duration-300"
                        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                            {editor.type === 'category'
                                ? (editor.mode === 'add' ? '添加搜索引擎分类' : '编辑分类')
                                : (editor.mode === 'add' ? `添加搜索引擎到「${activeCategory}」` : '编辑搜索引擎')}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">名称 *</label>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder={editor.type === 'category' ? '如:学术、生活' : '如:谷歌'}
                                    autoFocus
                                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            {editor.type === 'engine' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">搜索链接(用 {`{q}`} 表示关键词)*</label>
                                    <input
                                        value={newUrl}
                                        onChange={e => setNewUrl(e.target.value)}
                                        placeholder="https://www.google.com/search?q={q}"
                                        inputMode="url"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => setEditor(null)}
                                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold"
                            >
                                取消
                            </button>
                            <button
                                onClick={saveNew}
                                disabled={!newName.trim() || (editor.type === 'engine' && !newUrl.trim())}
                                className="flex-1 py-3 rounded-xl bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-40"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MobileSearch;
