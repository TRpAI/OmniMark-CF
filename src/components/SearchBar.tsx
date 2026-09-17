import React, { useState } from 'react';
import { Search, X, Globe, ExternalLink, ArrowRight } from 'lucide-react';
import { useBookmarkStore } from '../stores/bookmark.store';

export const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery, settings, selectedEngineId, setSelectedEngine } = useBookmarkStore();
  const [isFocused, setIsFocused] = useState(false);

  const engines = settings.searchEngines || [];
  const currentEngine = engines.find((e) => e.id === selectedEngineId) || engines[0];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() && currentEngine) {
      const searchUrl = `${currentEngine.searchUrl}${encodeURIComponent(searchQuery.trim())}`;
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    } else if (e.key === 'Escape') {
      setSearchQuery('');
    }
  };

  const handleSearchClick = () => {
    if (searchQuery.trim() && currentEngine) {
      const searchUrl = `${currentEngine.searchUrl}${encodeURIComponent(searchQuery.trim())}`;
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8 px-4 sm:px-0">
      {/* Search Engine Switcher Tabs */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-3 overflow-x-auto py-1 scrollbar-none">
        {engines.map((engine) => {
          const isActive = engine.id === currentEngine?.id;
          return (
            <button
              key={engine.id}
              onClick={() => setSelectedEngine(engine.id)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {engine.name}
            </button>
          );
        })}
      </div>

      {/* Main Search Input */}
      <div
        className={`relative flex items-center w-full rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-200 shadow-sm ${
          isFocused
            ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-md'
            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
      >
        <div className="pl-4.5 pr-2 text-zinc-400">
          <Search className="w-5 h-5 text-indigo-500" />
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={currentEngine ? currentEngine.placeholder : '搜索书签或全网...'}
          className="w-full py-4 text-sm sm:text-base bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
        />

        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1.5 mr-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="清空搜索"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={handleSearchClick}
          className="mr-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span>搜索</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {searchQuery && (
        <div className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          正在过滤包含 <span className="font-semibold text-indigo-600 dark:text-indigo-400">"{searchQuery}"</span> 的书签，按 <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono">Enter</kbd> 可前往 {currentEngine?.name} 全网搜索
        </div>
      )}
    </div>
  );
};
