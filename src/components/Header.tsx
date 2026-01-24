import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { SEARCH_CATEGORIES } from '../constants';

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

const Header: React.FC = () => {
  // Constants
  const categories = Object.keys(SEARCH_CATEGORIES);

  // State
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [selectedEngineName, setSelectedEngineName] = useState(SEARCH_CATEGORIES[categories[0]][0].name);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isScrolled, setIsScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentEngines = SEARCH_CATEGORIES[activeCategory];
  const activeEngineObj = currentEngines.find(e => e.name === selectedEngineName) || currentEngines[0];
  const isDropdownOpen = showSuggestions && suggestions.length > 0;

  // Effects
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

  // Handlers
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    // Reset to the first engine of the new category
    setSelectedEngineName(SEARCH_CATEGORIES[category][0].name);
    setSuggestions([]);
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
          const source = activeEngineObj.suggestionSource;
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
            // Fallback to 360/Bing logic
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

  const colorBase = activeEngineObj.color.replace('bg-', '');
  const ringColorClass = `ring-${colorBase}/50`;
  const shadowColorClass = `shadow-${colorBase}/20`;

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
              ? `ring-2 ${ringColorClass} shadow-lg ${shadowColorClass} ${isFocused ? 'animate-breathe' : 'scale-[1.02]'}`
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
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all active:scale-95 active:shadow-inner bg-gradient-to-br ${isScrolled ? 'scale-90' : ''
              } ${selectedEngineName === 'GitHub'
                ? 'from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 shadow-slate-900/40'
                : 'from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shadow-indigo-500/40'
              }`}>
            <Search size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {isDropdownOpen && (
          <div className={`absolute top-full left-0 right-0 bg-white dark:bg-slate-800 rounded-b-3xl shadow-xl overflow-hidden transition-all border-t border-slate-100 dark:border-slate-700/50 ${isFocused ? `ring-2 ring-t-0 ${ringColorClass} scale-[1.02] animate-breathe origin-top` : ''
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
                    ? 'bg-slate-100 dark:bg-slate-700 text-primary dark:text-indigo-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  <Search size={16} className={`opacity-50 ${index === activeSuggestionIndex ? 'text-primary' : ''}`} />
                  <span dangerouslySetInnerHTML={{
                    __html: suggestion.replace(new RegExp(`(${inputValue})`, 'gi'), '<b>$1</b>')
                  }} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Engine Selection Pills */}
      <div className={`flex flex-wrap justify-center gap-4 text-sm font-medium transition-all duration-500 ease-in-out ${isScrolled ? 'mt-2 scale-90 origin-top' : 'mt-8'
        }`}>
        {currentEngines.map((engine) => {
          const isSelected = selectedEngineName === engine.name;
          return (
            <button
              key={engine.name}
              onClick={() => setSelectedEngineName(engine.name)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 duration-300 
                ${isSelected
                  ? 'bg-white dark:bg-slate-700 shadow-md ring-2 ring-indigo-500/30 text-indigo-600 dark:text-indigo-300 scale-105 font-bold'
                  : 'bg-white/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 hover:shadow-md hover:scale-105'
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${engine.color} shadow-[0_0_8px_rgba(0,0,0,0.3)] transition-transform duration-300 ${isSelected ? 'scale-125' : ''}`}
              ></span>{' '}
              {engine.name}
            </button>
          );
        })}
      </div>
    </header>
  );
};

export default Header;