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

interface SortableEngineItemProps {
  engine: SearchEngine;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const SortableEngineItem: React.FC<SortableEngineItemProps> = ({ engine, isSelected, onClick, onContextMenu }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: engine.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  // Derive classes from engine.color (e.g. bg-blue-500 => ring-blue-500, text-blue-600)
  const engineColorBase = engine.color.replace('bg-', '');
  const ringClass = `ring-${engineColorBase}`;
  const textClass = `text-${engineColorBase}`;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`px-4 py-2 rounded-xl flex items-center gap-2 relative group touch-none
        ${isDragging ? '' : 'transition-colors duration-300 ease-in-out'}
        ${isSelected
          ? `bg-white dark:bg-slate-700 shadow-md ring-2 ${ringClass} ${textClass} font-bold scale-105`
          : 'bg-white/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 hover:shadow-md hover:scale-105'
        }`}
      title="拖拽可排序，右键点击进行编辑或删除"
    >
      <span
        className={`w-2 h-2 rounded-full ${engine.color} shadow-[0_0_8px_rgba(0,0,0,0.3)] transition-transform duration-300 ${isSelected ? 'scale-125' : ''}`}
      ></span>{' '}
      {engine.name}
    </button>
  );
};

const Header: React.FC = () => {
  // Constants initialize from localStorage if available
  const [categoriesData, setCategoriesData] = useState<Record<string, SearchEngine[]>>(() => {
    const saved = localStorage.getItem('nav_search_categories');
    return saved ? JSON.parse(saved) : SEARCH_CATEGORIES;
  });

  const categories = Object.keys(categoriesData);

  // State
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [selectedEngineName, setSelectedEngineName] = useState(() => {
    return categoriesData[categories[0]][0].name;
  });

  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isScrolled, setIsScrolled] = useState(false);

  // Add/Edit Engine Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingEngineName, setEditingEngineName] = useState(''); // Original name for lookup
  const [engineName, setEngineName] = useState('');
  const [engineUrl, setEngineUrl] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [engineToDelete, setEngineToDelete] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; engineName: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentEngines = categoriesData[activeCategory] || [];
  const activeEngineObj = currentEngines.find(e => e.name === selectedEngineName) || currentEngines[0];
  const isDropdownOpen = showSuggestions && suggestions.length > 0;

  // Derive dynamic classes from the bg- color
  const activeColorBase = activeEngineObj.color.replace('bg-', '');
  const activeRingClass = `ring-${activeColorBase}`;
  const activeTextClass = `text-${activeColorBase}`;

  // Tailwind Safelist (Keep this for JIT)
  // ring-blue-500 text-blue-500 ring-teal-500 text-teal-500 ring-red-500 text-red-500 
  // ring-green-500 text-green-500 ring-orange-500 text-orange-500 ring-slate-800 text-slate-800
  // ring-indigo-600 text-indigo-600 ring-blue-600 text-blue-600 ring-cyan-600 text-cyan-600
  // ring-emerald-600 text-emerald-600 ring-purple-600 text-purple-600 ring-blue-700 text-blue-700
  // ring-orange-600 text-orange-600 ring-red-600 text-red-600 ring-sky-600 text-sky-600
  // ring-green-600 text-green-600 ring-indigo-500 text-indigo-500 ring-pink-500 text-pink-500
  // ring-red-400 text-red-400

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require movement of 8px to start drag, prevents accidental drags on clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Effects
  useEffect(() => {
    localStorage.setItem('nav_search_categories', JSON.stringify(categoriesData));
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

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Ensure selected engine is valid when category changes or engines deleted
  useEffect(() => {
    const engines = categoriesData[activeCategory];
    if (!engines.find(e => e.name === selectedEngineName)) {
      if (engines.length > 0) {
        setSelectedEngineName(engines[0].name);
      }
    }
  }, [activeCategory, categoriesData, selectedEngineName]);

  // Handlers
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setSuggestions([]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCategoriesData((items) => {
        const engines = items[activeCategory];
        const oldIndex = engines.findIndex((e) => e.name === active.id);
        const newIndex = engines.findIndex((e) => e.name === over.id);

        return {
          ...items,
          [activeCategory]: arrayMove(engines, oldIndex, newIndex),
        };
      });
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setEngineName('');
    setEngineUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (!contextMenu) return;
    const engine = categoriesData[activeCategory].find(e => e.name === contextMenu.engineName);
    if (engine) {
      setModalMode('edit');
      setEditingEngineName(engine.name);
      setEngineName(engine.name);
      setEngineUrl(engine.url);
      setIsModalOpen(true);
    }
    setContextMenu(null);
  };

  const handleSaveEngine = () => {
    if (!engineName.trim() || !engineUrl.trim()) return;

    // Basic URL check
    const formattedUrl = engineUrl.trim().includes('{q}') ? engineUrl.trim() : `${engineUrl.trim()}/search?q={q}`;

    if (modalMode === 'add') {
      // Auto-select unique color
      const usedColors = new Set(categoriesData[activeCategory].map(e => e.color));
      const nextColor = AVAILABLE_COLORS.find(c => !usedColors.has(c)) ||
        AVAILABLE_COLORS[Math.floor(Math.random() * AVAILABLE_COLORS.length)];

      const newEngine: SearchEngine = {
        name: engineName.trim(),
        url: formattedUrl,
        color: nextColor,
        suggestionSource: 'none'
      };

      setCategoriesData(prev => ({
        ...prev,
        [activeCategory]: [...prev[activeCategory], newEngine]
      }));
      setSelectedEngineName(newEngine.name);

    } else {
      // Edit Mode
      setCategoriesData(prev => ({
        ...prev,
        [activeCategory]: prev[activeCategory].map(eng =>
          eng.name === editingEngineName
            ? { ...eng, name: engineName.trim(), url: formattedUrl }
            : eng
        )
      }));
      if (selectedEngineName === editingEngineName) {
        setSelectedEngineName(engineName.trim());
      }
    }

    setIsModalOpen(false);
  };

  const onRightClickEngine = (e: React.MouseEvent, engineName: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      engineName
    });
  };

  // Open delete confirmation modal
  const handleDeleteClick = () => {
    if (!contextMenu) return;

    // Don't delete if it's the last one
    if (categoriesData[activeCategory].length <= 1) {
      alert("至少需要保留一个搜索引擎。");
      setContextMenu(null);
      return;
    }

    setEngineToDelete(contextMenu.engineName);
    setIsDeleteModalOpen(true);
    setContextMenu(null);
  };

  const confirmDeleteEngine = () => {
    if (engineToDelete) {
      setCategoriesData(prev => ({
        ...prev,
        [activeCategory]: prev[activeCategory].filter(eng => eng.name !== engineToDelete)
      }));
      setEngineToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const performSearch = (query: string) => {
    if (!query.trim()) return;
    const encodedQuery = encodeURIComponent(query);
    const url = activeEngineObj.url.replace('{q}', encodedQuery);
    window.open(url, '_blank');
    setShowSuggestions(false);
  };

  // Fetch suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!inputValue.trim() || !isFocused) {
        setSuggestions([]);
        return;
      }

      const fetchSuggestions = async () => {
        try {
          const source = activeEngineObj?.suggestionSource || 'none';
          if (source === 'none') return;

          let url = '';
          let callbackParam = 'callback';

          if (source === 'baidu') {
            url = `https://sp0.baidu.com/5a1Fazu8AA54nxGko9WTAnF6hhy/su?wd=${encodeURIComponent(inputValue)}`;
            callbackParam = 'cb';
          } else if (source === 'google') {
            url = `https://suggestqueries.google.com/complete/search?client=youtube&q=${encodeURIComponent(inputValue)}`;
            callbackParam = 'jsonp';
          } else if (source === '360' || source === 'bing') {
            url = `https://sug.so.360.cn/suggest?word=${encodeURIComponent(inputValue)}&encodein=utf-8&encodeout=utf-8`;
            callbackParam = 'callback';
          }

          const data = await fetchJsonp(url, callbackParam);
          let results: string[] = [];

          if (source === 'baidu') {
            results = data.s || [];
          } else if (source === 'google') {
            results = data[1] || [];
          } else if (source === '360' || source === 'bing') {
            results = data.s || [];
          }

          setSuggestions(results.slice(0, 8));
          if (results.length > 0) setShowSuggestions(true);
        } catch (error) {
          setSuggestions([]);
        }
      };

      fetchSuggestions();
    }, 200);

    return () => clearTimeout(timer);
  }, [inputValue, selectedEngineName, isFocused, activeEngineObj]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        setInputValue(suggestions[activeSuggestionIndex]);
        performSearch(suggestions[activeSuggestionIndex]);
      } else {
        performSearch(inputValue);
      }
      setActiveSuggestionIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 w-full px-6 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${isScrolled
        ? 'pt-4 pb-4 bg-background-light/85 dark:bg-background-dark/85 backdrop-blur-md shadow-sm border-b border-white/20 dark:border-slate-700/30'
        : 'pt-16 pb-10 border-b border-transparent'
        }`}
    >
      {/* Category Nav */}
      <nav className={`flex space-x-2 md:space-x-8 text-base font-medium flex-wrap justify-center gap-y-2 transition-all duration-500 ease-in-out ${isScrolled ? 'mb-3 scale-90 origin-bottom' : 'mb-10'
        }`}>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`transition-all duration-300 px-4 py-2 rounded-xl ${activeCategory === category
              ? 'text-primary bg-primary/10 font-bold shadow-sm ring-1 ring-primary/20 scale-105'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-primary hover:scale-110 hover:shadow-sm'
              }`}
          >
            {category}
          </button>
        ))}
      </nav>

      {/* Search Bar */}
      <div
        ref={containerRef}
        className={`w-full max-w-2xl relative group perspective-1000 z-50 transition-all duration-500 ease-in-out ${isScrolled ? 'scale-95' : 'scale-100'
          }`}
      >
        <div
          className={`relative flex items-center bg-white dark:bg-slate-800 transition-all duration-500 ease-out 
          ${isFocused || isDropdownOpen
              ? `ring-2 ${activeRingClass} shadow-lg ${isFocused ? 'animate-breathe' : 'scale-[1.02]'}`
              : 'shadow-pill dark:shadow-pill-dark group-hover:scale-[1.01]'
            } ${isDropdownOpen ? 'rounded-t-3xl rounded-b-none' : 'rounded-full'}`}
        >
          <input
            className={`w-full pl-8 pr-20 bg-transparent border-none text-lg text-slate-800 dark:text-white placeholder-slate-400 focus:ring-0 rounded-full outline-none transition-all duration-500 ${isScrolled ? 'py-3' : 'py-5'
              }`}
            placeholder={`在 ${selectedEngineName} 中搜索...`}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (inputValue && suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
          />

          {inputValue && (
            <button
              onClick={() => {
                setInputValue('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-16 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          )}

          <button
            onClick={() => performSearch(inputValue)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all active:scale-95 active:shadow-inner ${isScrolled ? 'scale-90' : ''
              } ${activeEngineObj.color.replace('bg-', 'bg-')} shadow-indigo-500/40`}
          >
            <Search size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {isDropdownOpen && (
          <div className={`absolute top-full left-0 right-0 bg-white dark:bg-slate-800 rounded-b-3xl shadow-xl overflow-hidden transition-all border-t border-slate-100 dark:border-slate-700/50 ${isFocused ? `ring-2 ring-t-0 ${activeRingClass} scale-[1.02] animate-breathe origin-top` : ''
            }`}>
            <ul>
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setInputValue(suggestion);
                    performSearch(suggestion);
                  }}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  className={`px-8 py-3 cursor-pointer text-base flex items-center gap-3 transition-colors ${index === activeSuggestionIndex
                    ? `bg-slate-100 dark:bg-slate-700 ${activeTextClass}`
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  <Search size={16} className={`opacity-50 ${index === activeSuggestionIndex ? activeTextClass : ''}`} />
                  <span dangerouslySetInnerHTML={{
                    __html: suggestion.replace(new RegExp(`(${inputValue})`, 'gi'), '<b>$1</b>')
                  }} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Engine Selection Pills (Sortable) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex flex-wrap justify-center gap-4 text-sm font-medium transition-all duration-500 ease-in-out ${isScrolled ? 'mt-2 scale-90 origin-top' : 'mt-8'
          }`}>
          <SortableContext
            items={currentEngines.map(e => e.name)}
            strategy={horizontalListSortingStrategy}
          >
            {currentEngines.map((engine) => (
              <SortableEngineItem
                key={engine.name}
                engine={engine}
                isSelected={selectedEngineName === engine.name}
                onClick={() => setSelectedEngineName(engine.name)}
                onContextMenu={(e) => onRightClickEngine(e, engine.name)}
              />
            ))}
          </SortableContext>

          {/* Add Engine Button (Not sortable) */}
          <button
            onClick={openAddModal}
            className="px-3 py-2 rounded-xl bg-white/40 dark:bg-slate-800/40 text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary transition-all duration-300 hover:shadow-md hover:scale-105 flex items-center justify-center"
            title="添加新搜索引擎"
          >
            <Plus size={16} />
          </button>
        </div>
      </DndContext>

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-slate-100 dark:border-slate-600 py-1 min-w-[120px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={openEditModal}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"
          >
            <Edit2 size={14} /> 编辑
          </button>
          <button
            onClick={handleDeleteClick}
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
          >
            <Trash2 size={14} /> 删除
          </button>
        </div>
      )}

      {/* Add/Edit Engine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md p-6 transform transition-all scale-100 ring-1 ring-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {modalMode === 'add' ? '添加搜索引擎' : '编辑搜索引擎'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">名称</label>
                <input
                  type="text"
                  value={engineName}
                  onChange={(e) => setEngineName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border-none outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white"
                  placeholder="例如：我的搜索"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">链接 (使用 {'{q}'} 代表搜索词)</label>
                <input
                  type="text"
                  value={engineUrl}
                  onChange={(e) => setEngineUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 border-none outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white"
                  placeholder="https://example.com/search?q={q}"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEngine}
                disabled={!engineName.trim() || !engineUrl.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-white font-medium hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalMode === 'add' ? '添加' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 ring-1 ring-white/20">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">确认删除</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              你确定要删除 <span className="font-bold text-slate-800 dark:text-white">"{engineToDelete}"</span> 吗? 此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteEngine}
                className="px-5 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;