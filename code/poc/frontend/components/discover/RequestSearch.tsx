// File: code/poc/frontend/components/discover/RequestSearch.tsx
// Search and filter component for Discovery Requests tab
// Searches across: title, description, location, cuisine, occasion, creator name
// Filters: status, has bounty, budget range
// UPDATED: Added dark mode support throughout

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Filter,
  Sparkles,
  CircleDot,
  CheckCircle2,
  XCircle,
  DollarSign,
  ChevronDown
} from 'lucide-react';

// Status filter options
type RequestStatus = 'all' | 'open' | 'answered' | 'closed';

// Budget filter options
type BudgetFilter = 'all' | '$' | '$$' | '$$$' | '$$$$';

export interface RequestFilters {
  query: string;
  status: RequestStatus;
  hasBounty: boolean | null; // null = show all, true = only bounty, false = no bounty
  budget: BudgetFilter;
}

interface RequestSearchProps {
  onFilterChange: (filters: RequestFilters) => void;
  resultCount?: number;
  isSearching?: boolean;
  totalCount?: number;
  className?: string;
}

const RequestSearch = ({
  onFilterChange,
  resultCount,
  isSearching = false,
  totalCount,
  className = '',
}: RequestSearchProps) => {
  const t = useTranslations('discover');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<RequestStatus>('all');
  const [hasBounty, setHasBounty] = useState<boolean | null>(null);
  const [budget, setBudget] = useState<BudgetFilter>('all');
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        query: query.trim(),
        status,
        hasBounty,
        budget,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, status, hasBounty, budget, onFilterChange]);

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const handleClearAll = useCallback(() => {
    setQuery('');
    setStatus('all');
    setHasBounty(null);
    setBudget('all');
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
      inputRef.current?.blur();
    }
  };

  // Check if any filters are active
  const hasActiveFilters = status !== 'all' || hasBounty !== null || budget !== 'all' || query.trim() !== '';
  const filterCount = [
    status !== 'all',
    hasBounty !== null,
    budget !== 'all',
  ].filter(Boolean).length;

  // Status options with icons
  const statusOptions: { value: RequestStatus; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: t('requestSearch.status.all'), icon: <CircleDot size={14} /> },
    { value: 'open', label: t('requestSearch.status.open'), icon: <Sparkles size={14} /> },
    { value: 'answered', label: t('requestSearch.status.answered'), icon: <CheckCircle2 size={14} /> },
    { value: 'closed', label: t('requestSearch.status.closed'), icon: <XCircle size={14} /> },
  ];

  // Budget options
  const budgetOptions: { value: BudgetFilter; label: string }[] = [
    { value: 'all', label: t('requestSearch.budget.all') },
    { value: '$', label: '$' },
    { value: '$$', label: '$$' },
    { value: '$$$', label: '$$$' },
    { value: '$$$$', label: '$$$$' },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Search Bar */}
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
          <Search 
            className={`w-5 h-5 transition-colors ${isFocused ? 'text-[#FF644A]' : 'text-gray-400 dark:text-gray-500'}`}
          />
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
          placeholder={t('requestSearch.placeholder')}
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

        {/* Clear Query Button */}
        {query && !isSearching && (
          <button
            onClick={handleClear}
            className="pr-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t('requestSearch.clear')}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            mr-3 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all
            ${showFilters || filterCount > 0
              ? 'bg-[#FF644A] text-white'
              : 'bg-gray-100 dark:bg-[#353444] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#404050]'
            }
          `}
        >
          <Filter size={14} />
          <span>{t('requestSearch.filters')}</span>
          {filterCount > 0 && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
              {filterCount}
            </span>
          )}
          <ChevronDown 
            size={14} 
            className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Requests Badge */}
        <div className="pr-3">
          <span className="px-2.5 py-1 bg-[#FF644A]/10 text-[#FF644A] text-xs font-medium rounded-full whitespace-nowrap">
            {t('requestSearch.badge')}
          </span>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] space-y-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                  {t('requestSearch.statusLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatus(option.value)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all
                        ${status === option.value
                          ? option.value === 'open' 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : option.value === 'answered'
                            ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                            : option.value === 'closed'
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                            : 'bg-[#FF644A] text-white border border-[#FF644A]'
                          : 'bg-gray-50 dark:bg-[#353444] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3D3C4A] hover:bg-gray-100 dark:hover:bg-[#404050]'
                        }
                      `}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bounty Filter */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                  {t('requestSearch.bountyLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setHasBounty(null)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${hasBounty === null
                        ? 'bg-[#FF644A] text-white border border-[#FF644A]'
                        : 'bg-gray-50 dark:bg-[#353444] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3D3C4A] hover:bg-gray-100 dark:hover:bg-[#404050]'
                      }
                    `}
                  >
                    {t('requestSearch.bounty.all')}
                  </button>
                  <button
                    onClick={() => setHasBounty(true)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all
                      ${hasBounty === true
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-gray-50 dark:bg-[#353444] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3D3C4A] hover:bg-gray-100 dark:hover:bg-[#404050]'
                      }
                    `}
                  >
                    <DollarSign size={14} />
                    {t('requestSearch.bounty.withBounty')}
                  </button>
                  <button
                    onClick={() => setHasBounty(false)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${hasBounty === false
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                        : 'bg-gray-50 dark:bg-[#353444] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3D3C4A] hover:bg-gray-100 dark:hover:bg-[#404050]'
                      }
                    `}
                  >
                    {t('requestSearch.bounty.noBounty')}
                  </button>
                </div>
              </div>

              {/* Budget Filter */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                  {t('requestSearch.budgetLabel')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {budgetOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setBudget(option.value)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[48px]
                        ${budget === option.value
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-gray-50 dark:bg-[#353444] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3D3C4A] hover:bg-gray-100 dark:hover:bg-[#404050]'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear All Filters */}
              {hasActiveFilters && (
                <div className="pt-2 border-t border-gray-100 dark:border-[#3D3C4A]">
                  <button
                    onClick={handleClearAll}
                    className="text-sm text-[#FF644A] hover:text-[#E65441] font-medium"
                  >
                    {t('requestSearch.clearAll')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Scope Hint */}
      <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">
        {t('requestSearch.scopeHint')}
      </p>

      {/* Search Results Count */}
      <AnimatePresence>
        {hasActiveFilters && resultCount !== undefined && !isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {resultCount === 0 
                ? t('requestSearch.noResults')
                : t('requestSearch.resultsCount', { 
                    count: resultCount, 
                    total: totalCount || resultCount 
                  })
              }
            </span>
            {resultCount === 0 && (
              <button
                onClick={handleClearAll}
                className="text-sm text-[#FF644A] hover:text-[#E65441] font-medium"
              >
                {t('requestSearch.clearSearch')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RequestSearch;