import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import type { LinkItem, SectionData } from '../types';
import { fetchWebsiteMetadata } from '../utils/metadata';
import { getFaviconUrl } from '../utils/favicon';

export interface EditTarget {
    mode: 'add' | 'edit';
    type: 'section' | 'card';
    sectionId: string;
    card?: LinkItem;
    section?: SectionData; // carried when editing a section
}

interface MobileEditSheetProps {
    target: EditTarget;
    onClose: () => void;
    onSave: (data: { title: string; description: string; icon: string; url: string }) => void;
    onDelete?: () => void;
}

const MobileEditSheet: React.FC<MobileEditSheetProps> = ({ target, onClose, onSave, onDelete }) => {
    const isCard = target.type === 'card';
    const [title, setTitle] = useState(target.card?.title || target.section?.title || '');
    const [description, setDescription] = useState(target.card?.description || '');
    const [icon, setIcon] = useState(target.card?.icon || target.section?.icon || '🔗');
    const [url, setUrl] = useState(target.card?.url || '');
    // Desktop parity: once the user edits the icon manually, auto-fetched icons
    // must never overwrite it.
    const [iconManuallyEdited, setIconManuallyEdited] = useState(false);
    const [loading, setLoading] = useState(false);
    const [metadataNote, setMetadataNote] = useState('');
    const debounceRef = useRef<any>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Auto-fetch metadata when the URL settles (debounced, only for cards).
    useEffect(() => {
        if (!isCard) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (abortRef.current) abortRef.current.abort();
        if (!/^https?:\/\//.test(url)) return;

        setMetadataNote('');
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            const controller = new AbortController();
            abortRef.current = controller;
            const result = await fetchWebsiteMetadata(url, controller.signal);
            if (controller.signal.aborted) return;
            setLoading(false);
            if (result) {
                let changed = false;
                if (result.title) { setTitle(prev => prev || result.title!); changed = true; }
                if (result.description) { setDescription(prev => prev || result.description!); changed = true; }
                if (result.icons.length > 0 && !iconManuallyEdited) { setIcon(result.icons[0]); changed = true; }
                setMetadataNote(changed ? '已自动获取网站信息' : '未获取到信息,可手动填写');
            } else {
                // Fallback: domain favicon at least (unless the icon was edited manually).
                const favicon = getFaviconUrl(url);
                if (favicon && !iconManuallyEdited) setIcon(favicon);
                setMetadataNote('未获取到信息,可手动填写');
            }
        }, 700);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, [url, isCard]);

    const canSave = title.trim() !== '' && (!isCard || icon.trim() !== '') && (!isCard || url.trim() !== '');

    // Portal to body so the sheet escapes the parent stacking context and
    // always sits above the bottom tab bar.
    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}>
            <div
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl p-5 pb-8 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300"
                style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {target.mode === 'add' ? (isCard ? '添加站点' : '添加分区') : (isCard ? '编辑站点' : '编辑分区')}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">名称 *</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="站点/分区名称"
                            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>

                    {isCard && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">网址 *</label>
                                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" inputMode="url"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                {loading && (
                                    <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                                        <Loader2 size={12} className="animate-spin" /> 正在获取网站信息...
                                    </p>
                                )}
                                {metadataNote && !loading && (
                                    <p className="mt-1 text-[11px] text-emerald-500">{metadataNote}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">描述</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="一句话描述(可选)"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">图标 {isCard ? '(Emoji 或图片 URL)' : '(Emoji)'}</label>
                        <input value={icon} onChange={e => { setIcon(e.target.value); setIconManuallyEdited(true); }} placeholder="⭐"
                            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                </div>

                <div className="flex gap-3 mt-5">
                    {target.mode === 'edit' && onDelete && (
                        <button onClick={onDelete}
                            className="px-4 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold text-sm flex items-center gap-1.5">
                            <Trash2 size={16} /> 删除
                        </button>
                    )}
                    <button
                        onClick={() => canSave && onSave({ title: title.trim(), description: description.trim(), icon: icon.trim(), url: url.trim() })}
                        disabled={!canSave}
                        className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                        <Save size={16} /> 保存
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MobileEditSheet;
