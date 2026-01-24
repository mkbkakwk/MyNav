import React, { useRef, useEffect, useState } from 'react';
import type { LinkItem } from '../types';

interface CardProps {
  item: LinkItem;
  index: number;
  isSortMode: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const Card: React.FC<CardProps> = ({ item, index, isSortMode, onContextMenu }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <a
      ref={cardRef}
      href={isSortMode ? undefined : item.url}
      target={isSortMode ? undefined : "_blank"}
      rel={isSortMode ? undefined : "noopener noreferrer"}
      onContextMenu={onContextMenu}
      onClick={(e) => isSortMode && e.preventDefault()}
      style={{ transitionDelay: isVisible ? `${(index % 8) * 50}ms` : '0ms' }}
      className={`group relative flex items-start h-full gap-4 p-4 rounded-2xl 
        backdrop-blur-xl border border-white/40 dark:border-white/10
        bg-glass-gradient dark:bg-slate-900/60 shadow-clay dark:shadow-clay-dark 
        hover:shadow-clay-hover dark:hover:shadow-indigo-500/20 
        z-10 hover:z-20 
        transform transition-all duration-500 ease-out
        ${isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-12 scale-95'}
        ${isSortMode
          ? 'cursor-move ring-2 ring-amber-500/50 scale-[0.98]'
          : 'hover:-translate-y-2 hover:scale-[1.03] hover:rotate-1'}
      `}
    >
      <div className="w-12 h-12 rounded-xl bg-white/40 dark:bg-slate-700/40 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300 overflow-hidden">
        {item.icon.startsWith('http') ? (
          <img src={item.icon} alt={item.title} className="w-full h-full object-contain p-2" />
        ) : (
          <span className="emoji-icon transition-transform duration-300 group-hover:rotate-6 text-2xl leading-none select-none">{item.icon}</span>
        )}
      </div>
      <div>
        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 line-clamp-2 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">
          {item.description}
        </p>
      </div>
    </a>
  );
};

export default Card;