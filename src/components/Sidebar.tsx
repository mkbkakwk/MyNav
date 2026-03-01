import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { smoothScrollTo } from '../utils/scroll';
import type { SectionData } from '../types';

interface SidebarViewProps {
  active: string;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  handleNavClick: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
  sections: SectionData[];
  indicatorStyle?: { top: number; height: number; opacity: number };
  navListRef?: React.RefObject<HTMLDivElement | null>;
  asideRef?: React.RefObject<HTMLElement | null>;
  style?: React.CSSProperties;
  className?: string;
  isGhost?: boolean;
}

const SidebarView: React.FC<SidebarViewProps> = ({
  active,
  isCollapsed,
  setIsCollapsed,
  handleNavClick,
  sections,
  indicatorStyle,
  navListRef,
  asideRef,
  style,
  className = '',
  isGhost = false,
}) => {
  return (
    <aside
      ref={asideRef as any}
      className={`hidden lg:block shrink-0 h-[calc(100vh-250px)] w-fit ${className}`}
      style={style}
      aria-hidden={isGhost}
    >
      <nav
        className={`flex flex-col h-full rounded-3xl ${isGhost ? '' : 'bg-glass-gradient dark:bg-slate-900/40 shadow-clay dark:shadow-clay-dark backdrop-blur-md border border-white/40 dark:border-white/10'} overflow-hidden transition-all duration-500 p-3`}
      >
        <div
          ref={navListRef}
          className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar relative"
        >
          {!isGhost && indicatorStyle && (
            <div
              className="absolute left-0 w-full transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] pointer-events-none z-0"
              style={{
                transform: `translateY(${indicatorStyle.top}px)`,
                height: `${indicatorStyle.height}px`,
                opacity: indicatorStyle.opacity,
              }}
            >
              <div className="mx-0 h-full w-full rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200/50 dark:border-indigo-700/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]" />
            </div>
          )}

          <div className="space-y-2">
            {sections.map((item, index) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                data-sidebar-id={item.id}
                onClick={(e) => handleNavClick(e, item.id)}
                className={`group flex items-center relative rounded-2xl transition-all duration-300 py-3 px-4 z-10 ${active === item.id
                  ? 'text-indigo-600 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:text-primary'
                  } ${index === 0 ? 'mb-6' : ''}`}
                title={isCollapsed ? item.title : undefined}
                tabIndex={isGhost ? -1 : 0}
              >
                <span className={`flex items-center justify-center w-6 h-6 shrink-0 transition-transform duration-300 ${active === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <span className="text-xl leading-none select-none">{item.icon}</span>
                </span>

                <span
                  className={`whitespace-nowrap overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isCollapsed
                    ? 'max-w-0 opacity-0 ml-0'
                    : 'max-w-[300px] opacity-100 ml-3'
                    }`}
                >
                  <span className={`block font-medium ${index === 0 ? 'text-base font-bold' : 'text-sm'}`}>
                    {item.title}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-200/50 dark:border-slate-700/50 w-full flex justify-center z-10 relative bg-inherit">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="group flex items-center justify-center w-full py-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-300"
            tabIndex={isGhost ? -1 : 0}
          >
            <div className={`transition-transform duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}>
              <ChevronLeft size={20} />
            </div>

            <span
              className={`whitespace-nowrap overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] text-xs font-medium ${isCollapsed
                ? 'max-w-0 opacity-0 ml-0'
                : 'max-w-[100px] opacity-100 ml-2'
                }`}
            >
              收起导航
            </span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

interface SidebarProps {
  externalSections: SectionData[];
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ externalSections, isCollapsed, setIsCollapsed }) => {
  const [active, setActive] = useState(externalSections[0]?.id || 'fav');
  const [isManualScroll, setIsManualScroll] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 48, opacity: 0 });

  const navListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (isManualScroll) return;
      const headerHeight = 220;
      let currentId = externalSections[0]?.id || 'fav';
      for (const section of externalSections) {
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= headerHeight + 100) {
            currentId = section.id;
          }
        }
      }
      setActive(currentId);
    };
    let timeoutId: any = null;
    const onScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 100);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [isManualScroll, externalSections]);

  useEffect(() => {
    const updateIndicator = () => {
      if (navListRef.current) {
        const activeElement = navListRef.current.querySelector(`[data-sidebar-id="${active}"]`) as HTMLElement;
        if (activeElement) {
          setIndicatorStyle({
            top: activeElement.offsetTop,
            height: activeElement.offsetHeight,
            opacity: 1
          });
        }
      }
    };
    const timeout = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [active, isCollapsed, externalSections]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setActive(id);
    setIsManualScroll(true);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 180;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      smoothScrollTo(offsetPosition, 800);
      try {
        window.history.pushState(null, '', `#${id}`);
      } catch (e) { }
      setTimeout(() => setIsManualScroll(false), 800);
    }
  };

  const sharedProps = {
    active,
    isCollapsed,
    setIsCollapsed,
    handleNavClick,
    sections: externalSections
  };

  return (
    <SidebarView
      {...sharedProps}
      navListRef={navListRef}
      indicatorStyle={indicatorStyle}
      className="sticky top-56 z-20"
    />
  );
};

export default Sidebar;