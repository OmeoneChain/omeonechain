// components/restaurant/RestaurantSearchModal.tsx
// Full-screen restaurant search overlay for mobile-friendly UX
// Replaces inline autocomplete dropdown in RecommendationCreationFlow
// Created: Feb 1, 2026

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search, MapPin, X, Utensils } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { restaurantService, AutocompleteSuggestion, Restaurant } from '@/lib/services/restaurant-service';

interface RestaurantSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (restaurant: Restaurant) => void;
  userLocation?: { latitude: number; longitude: number };
}

const DEFAULT_LOCATION = { latitude: -15.7934, longitude: -47.8823 };

export default function RestaurantSearchModal({
  isOpen,
  onClose,
  onSelect,
  userLocation = DEFAULT_LOCATION,
}: RestaurantSearchModalProps) {
  const t = useTranslations('create.restaurants.autocomplete');

  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus input when modal opens & reset state when closing
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the modal render, then focus
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setInput('');
      setSuggestions([]);
      setError(null);
      setIsCreating(false);
      setCreatingId(null);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (input.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await restaurantService.autocompleteRestaurants(
          input,
          userLocation.latitude,
          userLocation.longitude
        );
        setSuggestions(results);
      } catch (err) {
        console.error('Restaurant search error:', err);
        setError(t('errors.searchFailed') || 'Failed to search restaurants');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [input, userLocation.latitude, userLocation.longitude]);

  const handleSelect = useCallback(
    async (suggestion: AutocompleteSuggestion) => {
      if (isCreating) return;

      setIsCreating(true);
      setCreatingId(suggestion.id);
      setError(null);

      try {
        const restaurant = await restaurantService.createRestaurantFromExternal(
          suggestion.id,
          'Brasília'
        );
        onSelect(restaurant);
        onClose();
      } catch (err) {
        console.error('Error creating restaurant:', err);
        setError(t('errors.addFailed') || 'Failed to add restaurant. Please try again.');
      } finally {
        setIsCreating(false);
        setCreatingId(null);
      }
    },
    [isCreating, onSelect, onClose, t]
  );

  const handleClearInput = () => {
    setInput('');
    setSuggestions([]);
    setError(null);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#1F1E2A] flex flex-col">
      {/* ── Sticky search header ── */}
      <div className="flex-shrink-0 bg-white dark:bg-[#2D2C3A] border-b border-gray-200 dark:border-[#3D3C4A] shadow-sm safe-area-top">
        {/* Title row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-[#FF644A] active:text-[#E65441] transition-colors rounded-lg"
            aria-label="Close search"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-[#1F1E2A] dark:text-white">
            {t('modalTitle') || 'Find Restaurant'}
          </h2>
        </div>

        {/* Search input */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('placeholder') || 'Search by name or address...'}
              className="w-full pl-11 pr-10 py-3.5 bg-gray-100 dark:bg-[#353444] border-0 rounded-xl text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:bg-white dark:focus:bg-[#2D2C3A] transition-all text-base"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
            />
            {/* Clear button */}
            {input.length > 0 && (
              <button
                onClick={handleClearInput}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 active:text-[#FF644A] transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable results area ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Loading spinner */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-[#3D3C4A] border-t-[#FF644A]" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t('searching') || 'Searching...'}
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && !isLoading && (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <X className="h-6 w-6 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-3 text-sm text-[#FF644A] hover:underline"
            >
              {t('tryAgain') || 'Try again'}
            </button>
          </div>
        )}

        {/* Empty state — before user starts typing */}
        {!isLoading && !error && input.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-[#FFF4E1] dark:bg-[#FF644A]/10 rounded-full flex items-center justify-center mb-4">
              <Utensils className="h-8 w-8 text-[#FF644A]" />
            </div>
            <p className="text-[#1F1E2A] dark:text-white font-semibold text-base mb-1">
              {t('searchPrompt') || 'Search for a restaurant'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-[260px]">
              {t('searchHint') || 'Type the restaurant name or address to find it'}
            </p>
          </div>
        )}

        {/* Hint — typed but fewer than 2 chars */}
        {!isLoading && !error && input.length > 0 && input.length < 2 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t('minCharsHint') || 'Type at least 2 characters to search'}
            </p>
          </div>
        )}

        {/* No results */}
        {!isLoading && !error && input.length >= 2 && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-[#353444] rounded-full flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-[#1F1E2A] dark:text-white font-medium mb-1">
              {t('noResults') || 'No restaurants found'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-[260px]">
              {t('tryDifferent') || 'Try a different name or check the spelling'}
            </p>
          </div>
        )}

        {/* ── Results list ── */}
        {!isLoading && suggestions.length > 0 && (
          <div>
            {/* Results count */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-[#252434]">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('resultsCount', { count: suggestions.length }) ||
                  `${suggestions.length} result${suggestions.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-[#3D3C4A]">
              {suggestions.map((suggestion) => {
                const isSelectingThis = isCreating && creatingId === suggestion.id;

                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelect(suggestion)}
                    disabled={isCreating}
                    className={`w-full px-4 py-4 text-left transition-colors disabled:opacity-50 ${
                      isSelectingThis
                        ? 'bg-[#FF644A]/5 dark:bg-[#FF644A]/10'
                        : 'hover:bg-gray-50 dark:hover:bg-[#2D2C3A] active:bg-[#FF644A]/10 dark:active:bg-[#FF644A]/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 bg-[#FFF4E1] dark:bg-[#FF644A]/10 rounded-lg flex items-center justify-center mt-0.5">
                        {isSelectingThis ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 dark:border-[#3D3C4A] border-t-[#FF644A]" />
                        ) : (
                          <MapPin className="h-5 w-5 text-[#FF644A]" />
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1F1E2A] dark:text-white text-[15px] leading-tight">
                          {suggestion.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug line-clamp-2">
                          {suggestion.address}
                        </p>
                        {isSelectingThis && (
                          <p className="text-xs text-[#FF644A] mt-1.5 font-medium">
                            {t('adding') || 'Adding restaurant...'}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom safe area padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}