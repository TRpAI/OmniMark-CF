import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useThemeStore, ThemeMode } from '../stores/theme.store';

interface ThemeSwitcherProps {
  className?: string;
  showText?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className = '', showText = false }) => {
  const { mode, resolvedTheme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions: { value: ThemeMode; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      value: 'light',
      label: '明亮模式',
      desc: '清新素雅明朗视觉',
      icon: Sun,
    },
    {
      value: 'dark',
      label: '暗黑模式',
      desc: '护眼深邃极客黑夜',
      icon: Moon,
    },
    {
      value: 'auto',
      label: '自动切换',
      desc: '跟随设备系统设定',
      icon: Laptop,
    },
  ];

  // Current active icon to display on the button
  const CurrentIcon = mode === 'auto' ? Laptop : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`切换主题模式 (当前: ${mode === 'auto' ? '自动跟随系统' : mode === 'dark' ? '暗黑模式' : '明亮模式'})`}
        className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-2.5 sm:py-2 rounded-full bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/90 dark:hover:bg-zinc-700/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs transition-all cursor-pointer select-none"
        aria-label="选择色彩主题"
        aria-expanded={isOpen}
      >
        <CurrentIcon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
        {showText && (
          <span className="text-xs font-medium hidden sm:inline">
            {mode === 'auto' ? '自动' : mode === 'dark' ? '暗黑' : '明亮'}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
            外观与配色
          </div>
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <div className="truncate">
                    <div className="leading-tight">{opt.label}</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5">{opt.desc}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
