'use client';

import { useState, useEffect, useRef } from 'react';
import { restaurantService, AutocompleteSuggestion, Restaurant } from '@/lib/services/restaurant-service';

interface RestaurantAutocompleteProps {
  onSelect: (restaurant: Restaurant) => void;
  initialValue?: string;
  placeholder?: string;
  className?: string;
  userLocation?: { latitude: number; longitude: number };
}

export default function RestaurantAutocomplete({
  onSelect,
  initialValue = '',
  placeholder = 'Search for a restaurant...',
  className = '',
  userLocation = { latitude: -15.7934, longitude: -47.8823 }, // Default: Brasília
}: RestaurantAutocompleteProps) {
  const [input, setInput] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch autocomplete suggestions with debouncing
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Don't search if input is too short
    if (input.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Debounce the API call
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
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Autocomplete error:', err);
        setError('Failed to search restaurants. Please try again.');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [input, userLocation]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Handle suggestion selection
  const handleSelect = async (suggestion: AutocompleteSuggestion) => {
    setInput(suggestion.name);
    setIsOpen(false);
    setIsCreating(true);
    setError(null);

    try {
      // Create restaurant in our database from Google Place ID
      const restaurant = await restaurantService.createRestaurantFromExternal(
        suggestion.id,
        'Brasília' // TODO: Get from user location or make dynamic
      );

      // Pass the created restaurant to parent component
      onSelect(restaurant);
    } catch (err) {
      console.error('Error creating restaurant:', err);
      setError('Failed to add restaurant. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={isCreating}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Restaurant search"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="autocomplete-dropdown"
        />

        {/* Loading Spinner */}
        {(isLoading || isCreating) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Search Icon (when not loading) */}
        {!isLoading && !isCreating && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 flex items-center">
          <svg
            className="w-4 h-4 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          id="autocomplete-dropdown"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="font-medium text-gray-900">
                {suggestion.name}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {suggestion.address}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper Text */}
      {!error && !isLoading && input.length > 0 && input.length < 2 && (
        <div className="mt-2 text-sm text-gray-500">
          Type at least 2 characters to search
        </div>
      )}

      {/* Creating Status */}
      {isCreating && (
        <div className="mt-2 text-sm text-blue-600 flex items-center">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
          Adding restaurant...
        </div>
      )}
    </div>
  );
}