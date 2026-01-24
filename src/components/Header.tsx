import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Edit2, Trash2 } from 'lucide-react';
import { SEARCH_CATEGORIES } from '../constants';
import type { SearchEngine } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Robust JSONP helper with timeout and cleanup
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

    document.body.appendChild(script);

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timed out'));
    }, 5000);
  });
};

const AVAILABLE_COLORS = [
  'bg-blue-500', 'bg-teal-500', 'bg-red-500', 'bg-green-500', 'bg-orange-500',
  'bg-slate-800', 'bg-indigo-600', 'bg-blue-600', 'bg-cyan-600', 'bg-emerald-600',
  'bg-purple-600', 'bg-blue-700', 'bg-orange-600', 'bg-red-600', 'bg-sky-600',
  'bg-green-600', 'bg-indigo-500', 'bg-pink-500', 'bg-red-400'
];

interface Category {
  id: string;
  name: string;
  engines: SearchEngine[];
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      {children}
    </div>
  );
};

const Header: React.FC = () => {
  // Constants initialize from localStorage if available
  const [categoriesData, setCategoriesData] = useState<Category[]>(() => {
    const saved = localStorage.getItem('nav_search_categories_v2');
    let baseData: Category[];

    if (saved) {
      baseData = JSON.parse(saved);
    } else {
      const oldSaved = localStorage.getItem('nav_search_categories');
      const sourceData = oldSaved ? JSON.parse(oldSaved) : SEARCH_CATEGORIES;

      if (Array.isArray(sourceData)) {
        baseData = sourceData;
      } else {
        baseData = Object.entries(sourceData).map(([name, engines]) => ({
          id: `cat-${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          engines: engines as SearchEngine[]
        }));
      }
    }

    // Smart Merge: Sync with constants and add missing defaults
    const updatedData = baseData.map(category => {
      const defaultCategoryEngines = SEARCH_CATEGORIES[category.name];
      if (!defaultCategoryEngines) return category;

      const mergedEngines = [...category.engines];
      defaultCategoryEngines.forEach(defaultEngine => {
        const existingIndex = mergedEngines.findIndex(e => e.name === defaultEngine.name);
        if (existingIndex > -1) {
          // Sync URL if it's a placeholder
          if (mergedEngines[existingIndex].url === '#' || !mergedEngines[existingIndex].url) {
            mergedEngines[existingIndex] = { ...mergedEngines[existingIndex], url: defaultEngine.url };
          }
        } else {
          // Add missing engine from constants
          mergedEngines.push(defaultEngine);
        }
      });
      return { ...category, engines: mergedEngines };
    });

    // Add entirely missing categories
    Object.keys(SEARCH_CATEGORIES).forEach(catName => {
      if (!updatedData.find(c => c.name === catName)) {
        updatedData.push({
          id: `cat-${catName}-${Date.now()}`,
          name: catName,
          engines: SEARCH_CATEGORIES[catName]
        });
      }
    });

    return updatedData;
  });

  // State
  const [activeCategoryId, setActiveCategoryId] = useState(categoriesData[0].id);
  const [selectedEngineName, setSelectedEngineName] = useState(() => {
    return categoriesData[0].engines[0]?.name || '';
  });

  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isScrolled, setIsScrolled] = useState(false);

  // General Modal State
  const [modalConfig, setModalConfig] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    type: 'engine' | 'category';
    targetId?: string; // id for category, name for engine
    parentCategoryId?: string;
    name: string;
    url: string;
  }>({
    open: false,
    mode: 'add',
    type: 'engine',
    name: '',
    url: ''
  });

  // Delete Modal State
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    open: boolean;
    type: 'engine' | 'category';
    name: string;
    id: string;
    parentId?: string;
  } | null>(null);

  // Notice/Alert Modal State
  const [noticeModalConfig, setNoticeModalConfig] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: ''
  });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: 'engine' | 'category';
    id: string; // id for category, name for engine
    parentId?: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Derived state
  const activeCategory = categoriesData.find(c => c.id === activeCategoryId) || categoriesData[0];
  const activeEngineObj = activeCategory.engines.find(e => e.name === selectedEngineName) || activeCategory.engines[0];
  const isDropdownOpen = showSuggestions && suggestions.length > 0;

  // Derive dynamic classes from the bg- color
  const activeColorBase = activeEngineObj?.color.replace('bg-', '') || 'blue-500';
  const activeRingClass = `ring-${activeColorBase}`;
  const activeTextClass = `text-${activeColorBase}`;

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Effects
  useEffect(() => {
    localStorage.setItem('nav_search_categories_v2', JSON.stringify(categoriesData));
    window.dispatchEvent(new CustomEvent('nav_search_updated', { detail: categoriesData }));
  }, [categoriesData]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Ensure selected engine/category is valid
  useEffect(() => {
    if (!categoriesData.find(c => c.id === activeCategoryId)) {
      setActiveCategoryId(categoriesData[0].id);
    }
    const cat = categoriesData.find(c => c.id === activeCategoryId);
    if (cat && !cat.engines.find(e => e.name === selectedEngineName)) {
      if (cat.engines.length > 0) {
        setSelectedEngineName(cat.engines[0].name);
      }
    }
  }, [categoriesData, activeCategoryId, selectedEngineName]);

  // Handlers
  const handleDragEnd = (event: DragEndEvent, type: 'category' | 'engine') => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCategoriesData((items) => {
        if (type === 'category') {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        } else {
          return items.map(cat => {
            if (cat.id === activeCategoryId) {
              const oldIndex = cat.engines.findIndex(e => e.name === active.id);
              const newIndex = cat.engines.findIndex(e => e.name === over.id);
              return { ...cat, engines: arrayMove(cat.engines, oldIndex, newIndex) };
            }
            return cat;
          });
        }
      });
    }
  };

  const handleSave = () => {
    const { mode, type, name, url, targetId, parentCategoryId } = modalConfig;
    if (!name.trim()) return;
    if (type === 'engine' && !url.trim()) return;

    if (type === 'category') {
      if (mode === 'add') {
        const newCat: Category = {
          id: `cat-${Date.now()}`,
          name: name.trim(),
          engines: [{ name: '百度', color: 'bg-blue-500', url: 'https://www.baidu.com/s?wd={q}', suggestionSource: 'baidu' }]
        };
        setCategoriesData(prev => [...prev, newCat]);
        setActiveCategoryId(newCat.id);
      } else {
        setCategoriesData(prev => prev.map(c => c.id === targetId ? { ...c, name: name.trim() } : c));
      }
    } else {
      const formattedUrl = url.trim().includes('{q}') ? url.trim() : `${url.trim()}/search?q={q}`;
      if (mode === 'add') {
        setCategoriesData(prev => prev.map(cat => {
          if (cat.id === activeCategoryId) {
            const usedColors = new Set(cat.engines.map(e => e.color));
            const nextColor = AVAILABLE_COLORS.find(c => !usedColors.has(c)) || AVAILABLE_COLORS[0];
            const newEngine = { name: name.trim(), url: formattedUrl, color: nextColor, suggestionSource: 'none' as const };
            return { ...cat, engines: [...cat.engines, newEngine] };
          }
          return cat;
        }));
        setSelectedEngineName(name.trim());
      } else {
        setCategoriesData(prev => prev.map(cat => {
          if (cat.id === parentCategoryId) {
            return {
              ...cat,
              engines: cat.engines.map(e => e.name === targetId ? { ...e, name: name.trim(), url: formattedUrl } : e)
            };
          }
          return cat;
        }));
        if (selectedEngineName === targetId) setSelectedEngineName(name.trim());
      }
    }
    setModalConfig(prev => ({ ...prev, open: false }));
  };

  const confirmDelete = () => {
    if (!deleteModalConfig) return;
    const { type, id, parentId } = deleteModalConfig;

    if (type === 'category') {
      if (categoriesData.length <= 1) {
        setNoticeModalConfig({
          open: true,
          title: '提示',
          message: '至少需要保留一个分类。'
        });
        return;
      }
      setCategoriesData(prev => prev.filter(c => c.id !== id));
    } else {
      let shouldDelete = true;
      setCategoriesData(prev => prev.map(cat => {
        if (cat.id === parentId) {
          if (cat.engines.length <= 1) {
            setNoticeModalConfig({
              open: true,
              title: '提示',
              message: '至少需要保留一个搜索引擎。'
            });
            shouldDelete = false;
            return cat;
          }
          return { ...cat, engines: cat.engines.filter(e => e.name !== id) };
        }
        return cat;
      }));
      if (!shouldDelete) return;
    }
    setDeleteModalConfig(null);
  };

  const performSearch = (query: string) => {
    if (!query.trim() || !activeEngineObj) return;
    window.open(activeEngineObj.url.replace('{q}', encodeURIComponent(query)), '_blank');
    setShowSuggestions(false);
  };

  // Suggestion fetching (reused)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!inputValue.trim() || !isFocused) return setSuggestions([]);
      const fetchSuggestions = async () => {
        try {
          const source = activeEngineObj?.suggestionSource || 'none';
          if (source === 'none') return;
          let url = '', callbackParam = 'callback';
          if (source === 'baidu') { url = `https://sp0.baidu.com/5a1Fazu8AA54nxGko9WTAnF6hhy/su?wd=${encodeURIComponent(inputValue)}`; callbackParam = 'cb'; }
          else if (source === 'google') { url = `https://suggestqueries.google.com/complete/search?client=youtube&q=${encodeURIComponent(inputValue)}`; callbackParam = 'jsonp'; }
          else if (source === '360' || source === 'bing') { url = `https://sug.so.360.cn/suggest?word=${encodeURIComponent(inputValue)}&encodein=utf-8&encodeout=utf-8`; }
          const data = await fetchJsonp(url, callbackParam);
          const results = source === 'google' ? data[1] : data.s || [];
          setSuggestions(results.slice(0, 8));
          if (results.length > 0) setShowSuggestions(true);
        } catch { setSuggestions([]); }
      };
      fetchSuggestions();
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue, selectedEngineName, isFocused, activeEngineObj]);

  const onRightClick = (e: React.MouseEvent, type: 'category' | 'engine', id: string, parentId?: string) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type, id, parentId });
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 w-full px-6 flex flex-col items-center justify-center transition-all duration-500 ${isScrolled ? 'pt-4 pb-4 bg-background-light/85 dark:bg-background-dark/85 backdrop-blur-md shadow-sm border-white/20' : 'pt-16 pb-10'}`}>
      {/* Category Nav */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, 'category')}>
        <nav className={`flex items-center space-x-2 md:space-x-4 flex-wrap justify-center transition-all duration-500 ${isScrolled ? 'mb-3 scale-90' : 'mb-10'}`}>
          <SortableContext items={categoriesData.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {categoriesData.map(cat => (
              <SortableItem key={cat.id} id={cat.id}>
                <button
                  onClick={() => { setActiveCategoryId(cat.id); setSuggestions([]); }}
                  onContextMenu={(e) => onRightClick(e, 'category', cat.id)}
                  className={`transition-all duration-300 px-4 py-2 rounded-xl whitespace-nowrap ${activeCategoryId === cat.id ? 'text-primary bg-primary/10 font-bold shadow-sm ring-1 ring-primary/20 scale-105' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-primary hover:scale-105'}`}
                >
                  {cat.name}
                </button>
              </SortableItem>
            ))}
          </SortableContext>
          <button
            onClick={() => setModalConfig({ open: true, mode: 'add', type: 'category', name: '', url: '' })}
            className="p-2 rounded-xl text-slate-400 hover:bg-white/50 hover:text-primary transition-all"
            title="添加分类"
          >
            <Plus size={20} />
          </button>
        </nav>
      </DndContext>

      {/* Search Bar (kept same) */}
      <div ref={containerRef} className={`w-full max-w-2xl relative group transition-all duration-500 ${isScrolled ? 'scale-95' : ''}`}>
        <div className={`relative flex items-center bg-white dark:bg-slate-900/80 transition-all duration-500 ${isFocused || isDropdownOpen ? `ring-2 ${activeRingClass} shadow-lg ${isFocused ? 'animate-breathe' : 'scale-[1.02]'}` : 'shadow-pill dark:shadow-pill-dark group-hover:scale-[1.01]'} ${isDropdownOpen ? 'rounded-t-3xl rounded-b-none' : 'rounded-full hover:ring-1 hover:ring-primary/30'}`}>
          <input
            className={`w-full pl-8 pr-20 bg-transparent border-none text-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-0 rounded-full outline-none py-5 ${isScrolled ? 'py-3' : ''}`}
            placeholder={`在 ${selectedEngineName} 中搜索...`}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => { setIsFocused(true); if (inputValue && suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { performSearch(activeSuggestionIndex >= 0 ? suggestions[activeSuggestionIndex] : inputValue); setActiveSuggestionIndex(-1); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestionIndex(p => p > -1 ? p - 1 : p); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestionIndex(p => p < suggestions.length - 1 ? p + 1 : p); }
              else if (e.key === 'Escape') setShowSuggestions(false);
            }}
          />
          {inputValue && <button onClick={() => { setInputValue(''); setSuggestions([]); setShowSuggestions(false); }} className="absolute right-16 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>}
          <button onClick={() => performSearch(inputValue)} className={`absolute right-2 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all ${isScrolled ? 'scale-90' : ''} ${activeEngineObj?.color || 'bg-blue-500'}`}><Search size={24} strokeWidth={3} /></button>
        </div>
        {isDropdownOpen && (
          <div className={`absolute top-full left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-b-3xl shadow-xl overflow-hidden border-t dark:border-slate-700/50 ${isFocused ? `ring-2 ring-t-0 ${activeRingClass} scale-[1.02] animate-breathe origin-top` : ''}`}>
            <ul>
              {suggestions.map((s, i) => (
                <li key={i} onMouseDown={(e) => { e.preventDefault(); setInputValue(s); performSearch(s); }} onMouseEnter={() => setActiveSuggestionIndex(i)} className={`px-8 py-3 cursor-pointer flex items-center gap-3 transition-colors ${i === activeSuggestionIndex ? `bg-primary/10 dark:bg-primary/20 ${activeTextClass}` : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <Search size={16} className="opacity-50" />
                  <span dangerouslySetInnerHTML={{ __html: s.replace(new RegExp(`(${inputValue})`, 'gi'), '<b>$1</b>') }} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Engines (Sortable) */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, 'engine')}>
        <div className={`flex flex-wrap justify-center gap-4 text-sm font-medium transition-all duration-500 ${isScrolled ? 'mt-2 scale-90 origin-top' : 'mt-8'}`}>
          <SortableContext items={activeCategory.engines.map(e => e.name)} strategy={horizontalListSortingStrategy}>
            {activeCategory.engines.map(engine => {
              const itemIsSelected = selectedEngineName === engine.name;
              const colorBase = engine.color.replace('bg-', '');
              return (
                <SortableItem key={engine.name} id={engine.name}>
                  <button
                    onClick={() => setSelectedEngineName(engine.name)}
                    onContextMenu={(e) => onRightClick(e, 'engine', engine.name, activeCategoryId)}
                    className={`px-4 py-2 rounded-xl flex items-center gap-2 relative transition-all duration-300 ${itemIsSelected ? `bg-white dark:bg-slate-700 shadow-md ring-2 ring-${colorBase} text-${colorBase} font-bold scale-105` : 'bg-white/40 dark:bg-slate-800/40 text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:scale-105'}`}
                    title="右键点击进行编辑或删除"
                  >
                    <span className={`w-2 h-2 rounded-full ${engine.color} shadow-[0_0_8px_rgba(0,0,0,0.3)] ${itemIsSelected ? 'scale-125' : ''}`}></span>
                    {engine.name}
                  </button>
                </SortableItem>
              );
            })}
          </SortableContext>
          <button onClick={() => setModalConfig({ open: true, mode: 'add', type: 'engine', name: '', url: '' })} className="px-3 py-2 rounded-xl bg-white/40 dark:bg-slate-800/40 text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary transition-all"><Plus size={16} /></button>
        </div>
      </DndContext>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed z-50 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-slate-100 py-1 min-w-[120px] animate-in fade-in zoom-in-95" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
          <button onClick={() => {
            const data = contextMenu.type === 'category' ? categoriesData.find(c => c.id === contextMenu.id) : activeCategory.engines.find(e => e.name === contextMenu.id);
            setModalConfig({ open: true, mode: 'edit', type: contextMenu.type, targetId: contextMenu.id, parentCategoryId: contextMenu.parentId, name: data?.name || '', url: (data as any)?.url || '' });
            setContextMenu(null);
          }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"><Edit2 size={14} /> 编辑</button>
          <button onClick={() => {
            const data = contextMenu.type === 'category' ? categoriesData.find(c => c.id === contextMenu.id) : activeCategory.engines.find(e => e.name === contextMenu.id);
            setDeleteModalConfig({ open: true, type: contextMenu.type, id: contextMenu.id, name: data?.name || contextMenu.id, parentId: contextMenu.parentId });
            setContextMenu(null);
          }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 size={14} /> 删除</button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalConfig.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md p-6 ring-1 ring-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{modalConfig.mode === 'add' ? '添加' : '编辑'}{modalConfig.type === 'category' ? '分类' : '搜索引擎'}</h3>
              <button onClick={() => setModalConfig(prev => ({ ...prev, open: false }))} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">名称</label>
                <input type="text" value={modalConfig.name} onChange={e => setModalConfig(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white" placeholder="例如：我的分类" autoFocus />
              </div>
              {modalConfig.type === 'engine' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">链接 (使用 {'{q}'} 代表搜索词)</label>
                  <input type="text" value={modalConfig.url} onChange={e => setModalConfig(p => ({ ...p, url: e.target.value }))} className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white" placeholder="https://example.com/search?q={q}" />
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setModalConfig(prev => ({ ...prev, open: false }))} className="px-5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">取消</button>
              <button onClick={handleSave} disabled={!modalConfig.name.trim() || (modalConfig.type === 'engine' && !modalConfig.url.trim())} className="px-5 py-2 rounded-xl bg-primary text-white font-medium hover:bg-indigo-600 transition-all shadow-lg disabled:opacity-50">{modalConfig.mode === 'add' ? '添加' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-sm p-6 ring-1 ring-white/20">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">确认删除</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">你确定要删除 <span className="font-bold text-slate-800 dark:text-white">"{deleteModalConfig.name}"</span> 吗? 此操作无法撤销。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModalConfig(null)} className="px-5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">取消</button>
              <button onClick={confirmDelete} className="px-5 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all shadow-lg">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Modal */}
      {noticeModalConfig.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 ring-1 ring-white/20">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{noticeModalConfig.title}</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{noticeModalConfig.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setNoticeModalConfig(prev => ({ ...prev, open: false }))}
                className="px-6 py-2 rounded-xl bg-primary text-white font-medium hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/30 font-bold"
              >
                好的
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;