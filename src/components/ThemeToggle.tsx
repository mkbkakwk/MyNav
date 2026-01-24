import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial preference
    if (
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <button
        className="w-16 h-16 rounded-full bg-white dark:bg-slate-700 shadow-xl flex items-center justify-center text-slate-800 dark:text-white hover:scale-110 active:scale-95 transition-all ring-1 ring-slate-900/5 dark:ring-white/10"
        onClick={toggleTheme}
        aria-label="Toggle Dark Mode"
      >
        {isDark ? <Sun size={28} /> : <Moon size={28} />}
      </button>
    </div>
  );
};

export default ThemeToggle;
