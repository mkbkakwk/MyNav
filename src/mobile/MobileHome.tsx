import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Edit2, ListOrdered, Flame, Clock } from 'lucide-react';
import type { SectionData } from '../types';
import ThemeToggle from '../components/ThemeToggle';
import MobileCard from './MobileCard';
import MobileEditSheet from './MobileEditSheet';
import type { EditTarget } from './MobileEditSheet';
import { useWindowSize } from '../hooks/useWindowSize';
import { sortSections, getSortMode, setSortMode, nextSortMode } from '../utils/clickStats';
import type { SortMode } from '../utils/clickStats';
import { togglePin, mergePinnedSection } from '../utils/pinned';

interface MobileHomeProps {
    sections: SectionData[];
    setSections: React.Dispatch<React.SetStateAction<SectionData[]>>;
}

const MobileHome: React.FC<MobileHomeProps> = ({ sections, setSections }) => {
    const { width } = useWindowSize();
    // Columns adapt to screen width: narrow phones 2, phones 3,
    // small tablets 4, larger screens 5.
    const cols = width < 360 ? 2 : width < 520 ? 3 : width < 680 ? 4 : 5;
    const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'section' | 'card'; sectionId: string; cardId?: string; name: string } | null>(null);
    // Long-press menu on section titles
    const [sectionMenu, setSectionMenu] = useState<{ sectionId: string } | null>(null);
    const pressTimer = useRef<any>(null);
    // Card display sort: default / frequent / recent
    const [sortMode, setSortModeState] = useState<SortMode>(() => getSortMode());
    const [sortTip, setSortTip] = useState('');
    const displaySections = mergePinnedSection(sortSections(sections, sortMode));

    const cycleSortMode = () => {
        const next = nextSortMode(sortMode);
        setSortModeState(next);
        setSortMode(next);
        // Same hint as the desktop title tooltip, as a toast on mobile.
        setSortTip(next === 'default' ? '卡片排序:默认' : next === 'frequent' ? '卡片排序:常用优先' : '卡片排序:最近使用');
        setTimeout(() => setSortTip(''), 2000);
    };

    const startSectionPress = (sectionId: string) => {
        pressTimer.current = setTimeout(() => setSectionMenu({ sectionId }), 400);
    };
    const clearSectionPress = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
    };

    const handleSave = (data: { title: string; description: string; icon: string; url: string }) => {
        if (!editTarget) return;
        setSections(prev => {
            if (editTarget.type === 'section') {
                if (editTarget.mode === 'add') {
                    return [...prev, { id: `sec-${Date.now()}`, title: data.title, icon: data.icon, items: [] }];
                }
                return prev.map(s => s.id === editTarget.sectionId ? { ...s, title: data.title, icon: data.icon } : s);
            }
            if (editTarget.mode === 'add') {
                return prev.map(s => s.id === editTarget.sectionId
                    ? { ...s, items: [...s.items, { id: `item-${Date.now()}`, title: data.title, description: data.description, icon: data.icon, url: data.url }] }
                    : s);
            }
            const cardId = editTarget.card?.id;
            return prev.map(s => s.id === editTarget.sectionId
                ? { ...s, items: s.items.map(i => i.id === cardId ? { ...i, title: data.title, description: data.description, icon: data.icon, url: data.url } : i) }
                : s);
        });
        setEditTarget(null);
    };

    const handleDelete = () => {
        if (!confirmDelete) return;
        setSections(prev => confirmDelete.type === 'section'
            ? prev.filter(s => s.id !== confirmDelete.sectionId)
            : prev.map(s => s.id === confirmDelete.sectionId
                ? { ...s, items: s.items.filter(i => i.id !== confirmDelete.cardId) }
                : s));
        setConfirmDelete(null);
        setEditTarget(null);
    };

    return (
        <div className="px-4 pt-6 pb-10 space-y-8 max-w-3xl mx-auto">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">MyNav</h1>
                    <p className="text-xs text-slate-400 mt-0.5">你的专属导航站</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={cycleSortMode}
                        className={`w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center transition-colors ${sortMode !== 'default' ? 'text-primary' : 'text-slate-500'}`}
                        title={sortMode === 'default' ? '卡片排序:默认' : sortMode === 'frequent' ? '卡片排序:常用优先' : '卡片排序:最近使用'}
                    >
                        {sortMode === 'default' ? <ListOrdered size={18} /> : sortMode === 'frequent' ? <Flame size={18} /> : <Clock size={18} />}
                    </button>
                    <ThemeToggle />
                </div>
            </header>

            {/* Sections */}
            {sections.length === 0 && (
                <div className="text-center py-16 text-slate-400 text-sm">
                    还没有分区
                    <div className="mt-3">
                        <button
                            onClick={() => setEditTarget({ mode: 'add', type: 'section', sectionId: '' })}
                            className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 mx-auto"
                        >
                            <Plus size={16} /> 添加分区
                        </button>
                    </div>
                </div>
            )}

            {displaySections.map(section => (
                <section key={section.id}>
                    {/* Section title: long-press for actions (add / edit / delete) */}
                    <h2
                        onTouchStart={() => startSectionPress(section.id)}
                        onTouchEnd={clearSectionPress}
                        onTouchMove={clearSectionPress}
                        onMouseDown={() => startSectionPress(section.id)}
                        onMouseUp={clearSectionPress}
                        onMouseLeave={clearSectionPress}
                        className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-base mb-3 select-none"
                    >
                        <span className="text-xl">{section.icon}</span>
                        <span className="truncate">{section.title}</span>
                    </h2>

                    {section.items.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 bg-white/40 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300/60 dark:border-slate-600/40">
                            暂无站点,长按分区标题可添加
                        </p>
                    ) : (
                        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                            {section.items.map(card => (
                                <MobileCard
                                    key={card.id}
                                    card={card}
                                    onLongPress={() => setEditTarget({ mode: 'edit', type: 'card', sectionId: section.id, card })}
                                />
                            ))}
                        </div>
                    )}
                </section>
            ))}

            {/* Add section — same style as the desktop "添加分类" button */}
            <div className="flex justify-center pt-8">
                <button
                    onClick={() => setEditTarget({ mode: 'add', type: 'section', sectionId: '' })}
                    className="px-8 py-3 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 backdrop-blur-md shadow-clay dark:shadow-clay-dark hover:shadow-clay-hover hover:scale-105 transition-all text-slate-800 dark:text-white font-bold flex items-center gap-3 active:scale-95"
                >
                    <Plus size={22} /> 添加分区
                </button>
            </div>

            {/* Sort-mode toast (same wording as the desktop tooltip) */}
            {sortTip && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full bg-slate-800/90 text-white text-xs font-medium shadow-lg backdrop-blur animate-in fade-in pointer-events-none whitespace-nowrap">
                    {sortTip}
                </div>
            )}

            {/* Edit / Add sheet */}
            {editTarget && (
                <MobileEditSheet
                    key={`${editTarget.mode}-${editTarget.type}-${editTarget.card?.id || editTarget.section?.id || 'new'}`}
                    target={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={handleSave}
                    onTogglePin={editTarget.type === 'card' && editTarget.card
                        ? () => setSections(prev => togglePin(prev, editTarget.card!.id))
                        : undefined}
                    pinned={editTarget.type === 'card' ? !!editTarget.card?.pinned : false}
                    onDelete={editTarget.mode === 'edit'
                        ? () => setConfirmDelete({
                            type: editTarget.type,
                            sectionId: editTarget.sectionId,
                            cardId: editTarget.type === 'card' ? editTarget.card?.id : undefined,
                            name: editTarget.card?.title || '',
                        })
                        : undefined}
                />
            )}

            {/* Section action menu (long-press on a section title) */}
            {sectionMenu && createPortal(
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSectionMenu(null)}>
                    <div
                        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom-8 duration-300"
                        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="text-xs text-slate-400 mb-2 text-center">分区操作</p>
                        <button
                            onClick={() => {
                                setEditTarget({ mode: 'add', type: 'card', sectionId: sectionMenu.sectionId });
                                setSectionMenu(null);
                            }}
                            className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-3"
                        >
                            <Plus size={18} className="text-indigo-500" /> 添加站点
                        </button>
                        <button
                            onClick={() => {
                                const s = sections.find(x => x.id === sectionMenu.sectionId);
                                setEditTarget({ mode: 'edit', type: 'section', sectionId: sectionMenu.sectionId, section: s });
                                setSectionMenu(null);
                            }}
                            className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-3"
                        >
                            <Edit2 size={18} className="text-slate-400" /> 编辑分区
                        </button>
                        <button
                            onClick={() => {
                                const s = sections.find(x => x.id === sectionMenu.sectionId);
                                setConfirmDelete({ type: 'section', sectionId: sectionMenu.sectionId, name: s?.title || '' });
                                setSectionMenu(null);
                            }}
                            className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-medium flex items-center gap-3"
                        >
                            <Trash2 size={18} /> 删除分区
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete confirmation (portal: above the bottom tab bar) */}
            {confirmDelete && createPortal(
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6" onClick={() => setConfirmDelete(null)}>
                    <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">确认删除</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                            删除 <span className="font-bold text-slate-800 dark:text-white">{confirmDelete.name}</span>?此操作无法撤销。
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold">
                                取消
                            </button>
                            <button onClick={handleDelete}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/25">
                                删除
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MobileHome;
