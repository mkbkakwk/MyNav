import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Card from './components/Card';
import ThemeToggle from './components/ThemeToggle';
import { SECTIONS } from './constants';
import type { SectionData, SyncSettings } from './types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Trash2, Plus, X, Lock, Unlock, Settings as SettingsIcon } from 'lucide-react';
import { serializeConstants, saveToSource, fetchRemoteData } from './utils/serialization';
import Settings from './components/Settings';


const Background: React.FC = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute -top-[10%] -right-[10%] w-[800px] h-[800px] bg-gradient-to-br from-blue-300/40 to-purple-300/40 rounded-full blur-[80px] dark:from-indigo-600/20 dark:to-purple-800/20 animate-float mix-blend-multiply dark:mix-blend-screen"></div>
    <div className="absolute top-[40%] -left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-pink-300/40 to-rose-300/40 rounded-full blur-[80px] dark:from-violet-600/20 dark:to-fuchsia-800/20 animate-float-delayed mix-blend-multiply dark:mix-blend-screen"></div>
    <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-gradient-to-t from-cyan-300/40 to-teal-300/40 rounded-full blur-[80px] dark:from-blue-600/20 dark:to-cyan-800/20 animate-float-delayed-2 mix-blend-multiply dark:mix-blend-screen"></div>
  </div>
);

interface SortableWrapperProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const SortableWrapper: React.FC<SortableWrapperProps> = ({ id, children, className = '', disabled = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`${className} touch-none`}>
      {children}
    </div>
  );
};

const App: React.FC = () => {
  // State initialization
  const [sections, setSections] = useState<SectionData[]>(() => {
    const saved = localStorage.getItem('nav_sections_v1');
    let baseData: SectionData[] = saved ? JSON.parse(saved) : SECTIONS;

    // 1. Sync existing items: Update placeholders with real URLs from constants
    const updatedData = baseData.map(savedSection => {
      const defaultSection = SECTIONS.find(s => s.id === savedSection.id);
      if (!defaultSection) return savedSection;

      const mergedItems = [...savedSection.items];
      defaultSection.items.forEach(defaultItem => {
        const existingIndex = mergedItems.findIndex(i => i.id === defaultItem.id);
        if (existingIndex > -1) {
          const item = mergedItems[existingIndex];
          // Update placeholder URL or specific renamed items
          if (!item.url || item.url === '#' || item.url === '') {
            mergedItems[existingIndex] = {
              ...item,
              url: defaultItem.url,
              description: (item.description.includes('聚合搜索平台') || item.description === '') ? defaultItem.description : item.description,
              title: item.title === '纳诺 AI' ? '秘塔 AI' : item.title,
              icon: item.icon === '📁' ? defaultItem.icon : item.icon
            };
          }
        } else {
          // Add missing default item
          mergedItems.push(defaultItem);
        }
      });
      return { ...savedSection, items: mergedItems };
    });

    // 2. Add entirely missing sections from constants
    SECTIONS.forEach(defaultSec => {
      if (!updatedData.find(s => s.id === defaultSec.id)) {
        updatedData.push(defaultSec);
      }
    });

    return updatedData;
  });

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    type: 'section' | 'card';
    targetId?: string; // id for section or card
    parentId?: string; // section id for cards
    title: string;
    description: string;
    icon: string;
    url: string;
  }>({
    open: false, mode: 'add', type: 'section', title: '', description: '', icon: '', url: ''
  });

  // Delete Confirmation State
  const [deleteConfig, setDeleteConfig] = useState<{
    open: boolean;
    type: 'section' | 'card';
    id: string;
    name: string;
    parentId?: string;
  } | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; type: 'section' | 'card'; id: string; parentId?: string;
  } | null>(null);

  // Sync Settings State
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(() => {
    const saved = localStorage.getItem('nav_sync_settings');
    return saved ? JSON.parse(saved) : { token: '', owner: '', repo: '', enabled: false };
  });

  // Sort Mode State
  const [isSortMode, setIsSortMode] = useState(false);

  // Modal & Menu States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Persistence & Source Sync
  useEffect(() => {
    localStorage.setItem('nav_sections_v1', JSON.stringify(sections));
    window.dispatchEvent(new CustomEvent('nav_sections_updated', { detail: sections }));

    const categoriesJson = localStorage.getItem('nav_search_categories_v2');
    if (categoriesJson) {
      const categories = JSON.parse(categoriesJson);
      const sourceCode = serializeConstants(sections, categories);
      saveToSource(sourceCode, syncSettings, sections, categories);
    }
  }, [sections, syncSettings]);

  // Initial Remote Data Sync
  useEffect(() => {
    const initRemoteData = async () => {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocal && syncSettings.enabled) {
        const remoteData = await fetchRemoteData(syncSettings);
        if (remoteData) {
          setSections(remoteData.sections);
          localStorage.setItem('nav_search_categories_v2', JSON.stringify(remoteData.categories));
          window.dispatchEvent(new CustomEvent('nav_search_remote_synced', { detail: remoteData.categories }));
        }
      }
    };
    initRemoteData();
  }, []); // Run once on mount

  // Listen for Header updates to trigger total source sync
  useEffect(() => {
    const handleHeaderUpdate = () => {
      const categoriesJson = localStorage.getItem('nav_search_categories_v2');
      if (categoriesJson) {
        const categories = JSON.parse(categoriesJson);
        const sourceCode = serializeConstants(sections, categories);
        saveToSource(sourceCode, syncSettings, sections, categories);
      }
    };
    window.addEventListener('nav_search_updated', handleHeaderUpdate);
    return () => window.removeEventListener('nav_search_updated', handleHeaderUpdate);
  }, [sections, syncSettings]);

  // Click outside listener for context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent, type: 'section' | 'card', sectionId?: string) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections(prev => {
        if (type === 'section') {
          const oldIndex = prev.findIndex(s => s.id === active.id);
          const newIndex = prev.findIndex(s => s.id === over.id);
          return arrayMove(prev, oldIndex, newIndex);
        } else {
          return prev.map(section => {
            if (section.id === sectionId) {
              const oldIndex = section.items.findIndex(i => i.id === active.id);
              const newIndex = section.items.findIndex(i => i.id === over.id);
              return { ...section, items: arrayMove(section.items, oldIndex, newIndex) };
            }
            return section;
          });
        }
      });
    }
  };

  const handleSave = () => {
    const { mode, type, title, description, icon, url, targetId, parentId } = modalConfig;
    if (!title.trim() || !icon.trim()) return;

    setSections(prev => {
      if (type === 'section') {
        if (mode === 'add') {
          return [...prev, { id: `sec-${Date.now()}`, title, icon, items: [] }];
        } else {
          return prev.map(s => s.id === targetId ? { ...s, title, icon } : s);
        }
      } else {
        if (mode === 'add') {
          return prev.map(s => s.id === parentId ? {
            ...s, items: [...s.items, { id: `item-${Date.now()}`, title, description, icon, url }]
          } : s);
        } else {
          return prev.map(s => s.id === parentId ? {
            ...s, items: s.items.map(i => i.id === targetId ? { ...i, title, description, icon, url } : i)
          } : s);
        }
      }
    });
    setModalConfig(prev => ({ ...prev, open: false }));
  };

  const onRightClick = (e: React.MouseEvent, type: 'section' | 'card', id: string, parentId?: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id, parentId });
  };

  const handleDelete = () => {
    if (!deleteConfig) return;
    const { type, id, parentId } = deleteConfig;
    setSections(prev => {
      if (type === 'section') return prev.filter(s => s.id !== id);
      return prev.map(s => s.id === parentId ? { ...s, items: s.items.filter(i => i.id !== id) } : s);
    });
    setDeleteConfig(null);
  };

  return (
    <>
      <Background />
      <Header />

      <div className="relative z-10 flex max-w-[1800px] mx-auto px-6 pb-40 gap-8 pt-[340px]">
        <Sidebar externalSections={sections} />

        <main className="flex-1 min-w-0 space-y-12">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, 'section')}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-60">
                  <SortableWrapper id={section.id} disabled={!isSortMode}>
                    <div
                      onContextMenu={(e) => onRightClick(e, 'section', section.id)}
                      className={`flex items-center justify-between mb-6 group ${isSortMode ? 'cursor-move' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl filter drop-shadow-md">{section.icon}</span>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                          {section.title}
                        </h2>
                      </div>
                      <button
                        onClick={() => setModalConfig({ open: true, mode: 'add', type: 'card', parentId: section.id, title: '', description: '', icon: '🔗', url: '' })}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-white/40 dark:bg-slate-800/40 text-primary hover:bg-white dark:hover:bg-slate-700 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </SortableWrapper>

                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, 'card', section.id)}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
                      <SortableContext items={section.items.map(i => i.id)} strategy={horizontalListSortingStrategy}>
                        {section.items.map((item, index) => (
                          <SortableWrapper key={item.id} id={item.id} disabled={!isSortMode}>
                            <Card
                              item={item}
                              index={index}
                              isSortMode={isSortMode}
                              onContextMenu={(e) => onRightClick(e, 'card', item.id, section.id)}
                            />
                          </SortableWrapper>
                        ))}
                      </SortableContext>
                    </div>
                  </DndContext>
                </section>
              ))}
            </SortableContext>
          </DndContext>

          {/* Add Section Entry */}
          <div className="flex justify-center pt-8">
            <button
              onClick={() => setModalConfig({ open: true, mode: 'add', type: 'section', title: '', description: '', icon: '📁', url: '' })}
              className="px-8 py-3 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 backdrop-blur-md shadow-clay dark:shadow-clay-dark hover:shadow-clay-hover hover:scale-105 transition-all text-slate-800 dark:text-white font-bold flex items-center gap-3"
            >
              <Plus size={22} /> 添加分类
            </button>
          </div>
        </main>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-slate-100 dark:border-slate-600 py-1 min-w-[120px] animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const data = contextMenu.type === 'section'
                ? sections.find(s => s.id === contextMenu.id)
                : sections.find(s => s.id === contextMenu.parentId)?.items.find(i => i.id === contextMenu.id);
              if (data) {
                setModalConfig({
                  open: true, mode: 'edit', type: contextMenu.type, targetId: contextMenu.id, parentId: contextMenu.parentId,
                  title: data.title, description: (data as any).description || '', icon: data.icon, url: (data as any).url || ''
                });
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"
          >
            <Edit2 size={14} /> 编辑
          </button>
          <button
            onClick={() => {
              const data = contextMenu.type === 'section'
                ? sections.find(s => s.id === contextMenu.id)
                : sections.find(s => s.id === contextMenu.parentId)?.items.find(i => i.id === contextMenu.id);
              setDeleteConfig({ open: true, type: contextMenu.type, id: contextMenu.id, name: data?.title || '', parentId: contextMenu.parentId });
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
          >
            <Trash2 size={14} /> 删除
          </button>
        </div>
      )}

      {/* CRUD Modal */}
      {modalConfig.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md p-6 ring-1 ring-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {modalConfig.mode === 'add' ? '添加' : '编辑'}
                {modalConfig.type === 'section' ? '分类' : '站点'}
              </h3>
              <button onClick={() => setModalConfig(p => ({ ...p, open: false }))} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-20">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">图标</label>
                  <div className="relative group/icon">
                    <input
                      type="text"
                      value={modalConfig.icon}
                      onChange={e => setModalConfig(p => ({ ...p, icon: e.target.value }))}
                      className="w-full px-2 py-2 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white text-center text-xl shrink-0"
                      placeholder="⭐ 或 URL"
                    />
                    <div className="absolute -bottom-10 left-0 hidden group-hover/icon:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-[70]">
                      输入 Emoji 或 图片链接
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">名称</label>
                  <input type="text" value={modalConfig.title} onChange={e => setModalConfig(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-2 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white" placeholder="输入名称..." />
                </div>
              </div>
              {modalConfig.type === 'card' && (
                <>
                  <div className="flex justify-between items-center bg-primary/5 p-2 rounded-xl border border-primary/10 mb-2">
                    <span className="text-xs text-primary font-bold">图标预览:</span>
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center overflow-hidden">
                      {modalConfig.icon.startsWith('http') ? (
                        <img src={modalConfig.icon} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-xl">{modalConfig.icon || '🔗'}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">链接 URL</label>
                    <input type="text" value={modalConfig.url} onChange={e => setModalConfig(p => ({ ...p, url: e.target.value }))} className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述</label>
                    <textarea value={modalConfig.description} onChange={e => setModalConfig(p => ({ ...p, description: e.target.value }))} className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white resize-none" rows={3} placeholder="输入描述..." />
                  </div>
                </>
              )}
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setModalConfig(p => ({ ...p, open: false }))} className="px-5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">取消</button>
              <button onClick={handleSave} disabled={!modalConfig.title.trim() || !modalConfig.icon.trim()} className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfig && deleteConfig.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-sm p-6 ring-1 ring-white/20">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">确认删除</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">你确定要删除 <span className="font-bold text-slate-800 dark:text-white">"{deleteConfig.name}"</span> 吗? 此操作无法撤销。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfig(null)} className="px-5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">取消</button>
              <button onClick={handleDelete} className="px-5 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 🧈 Butter Menu: Expandable Vertical utility list */}
      <div className="fixed bottom-8 right-8 z-[60] group">
        {/* Expanded Stack */}
        <div className="flex flex-col gap-4 mb-4 items-center transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) opacity-0 translate-y-10 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
          {/* Sort Mode Toggle Button */}
          <button
            onClick={() => setIsSortMode(!isSortMode)}
            className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-500 delay-100 transform scale-50 group-hover:scale-100 hover:scale-110 active:scale-95 ring-1 ring-slate-900/5 dark:ring-white/10 ${isSortMode ? 'bg-amber-500 text-white animate-pulse' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            title={isSortMode ? '退出排序模式' : '进入排序模式'}
          >
            {isSortMode ? <Unlock size={24} /> : <Lock size={24} />}
          </button>

          {/* Theme Toggle Button */}
          <div className="transform transition-transform duration-500 delay-75 scale-50 group-hover:scale-100">
            <ThemeToggle />
          </div>
        </div>

        {/* Main Trigger Button (Settings) */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-14 h-14 rounded-full bg-indigo-500 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all ring-4 ring-indigo-500/20 group-hover:rotate-90"
          aria-label="Toggle Menu"
        >
          <SettingsIcon size={24} />
        </button>
      </div>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChange={setSyncSettings}
      />

      {isSortMode && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full bg-amber-500 text-white font-bold shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4">
          <Unlock size={18} /> 排序模式已开启：此时可拖拽，点击跳转已禁用
        </div>
      )}
    </>
  );
};

export default App;