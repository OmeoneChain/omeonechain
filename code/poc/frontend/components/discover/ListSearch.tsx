// File: code/poc/frontend/components/discover/ListSearch.tsx
// Search bar component for Curated Lists tab
// UPDATED: Dark mode support added

'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

interface ListSearchProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  resultCount?: number;
  isSearching?: boolean;
  placeholder?: string;
  className?: string;
}

const ListSearch = ({
  onSearch,
  onClear,
  resultCount,
  isSearching = false,
  placeholder,
  className = '',
}: ListSearchProps) => {
  const t = useTranslations('discover');
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search to avoid excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        onSearch(query.trim());
      } else {
        onClear();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch, onClear]);

  const handleClear = () => {
    setQuery('');
    onClear();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
      inputRef.current?.blur();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input Container */}
      <div
        className={`
          relative flex items-center bg-white dark:bg-[#2D2C3A] rounded-xl border-2 transition-all duration-200
          ${isFocused 
            ? 'border-[#FF644A] shadow-lg shadow-[#FF644A]/10' 
            : 'border-gray-200 dark:border-[#3D3C4A] hover:border-gray-300 dark:hover:border-[#4D4C5A]'
          }
        `}
      >
        {/* Search Icon */}
        <div className="pl-4 pr-2">
          <svg
            className={`w-5 h-5 transition-colors ${isFocused ? 'text-[#FF644A]' : 'text-gray-400 dark:text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('listSearch.placeholder')}
          className="flex-1 py-3.5 pr-4 bg-transparent text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-base"
        />

        {/* Loading Spinner */}
        {isSearching && (
          <div className="pr-3">
            <svg
              className="animate-spin h-5 w-5 text-[#FF644A]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}

        {/* Clear Button */}
        {query && !isSearching && (
          <button
            onClick={handleClear}
            className="pr-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t('listSearch.clear')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Lists Badge */}
        <div className="pr-3">
          <span className="px-2.5 py-1 bg-[#FF644A]/10 dark:bg-[#FF644A]/20 text-[#FF644A] text-xs font-medium rounded-full whitespace-nowrap">
            {t('listSearch.badge')}
          </span>
        </div>
      </div>

      {/* Search Scope Hint */}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 pl-1">
        {t('listSearch.scopeHint')}
      </p>

      {/* Search Results Count */}
      <AnimatePresence>
        {query && resultCount !== undefined && !isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-2"
          >
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {resultCount === 0 
                ? t('listSearch.noResults', { query })
                : t('listSearch.resultsCount', { count: resultCount, query })
              }
            </span>
            {resultCount === 0 && (
              <button
                onClick={handleClear}
                className="text-sm text-[#FF644A] hover:text-[#E65441] font-medium"
              >
                {t('listSearch.clearSearch')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListSearch;