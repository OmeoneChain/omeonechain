// File: code/poc/frontend/src/components/onboarding/TastePreferencesStep.tsx
// Step 3: Rate restaurants to build taste profile
// UPDATED: Internationalized with next-intl

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Search, MapPin, Loader2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating?: number;
  userRating?: number;
}

interface TastePreferencesStepProps {
  userLocation?: string;
  onComplete: (count: number) => void;
  onSkip: () => void;
}

const POPULAR_RESTAURANTS = [
  { id: '1', name: 'Trattoria Moderna', address: 'Downtown, São Paulo', rating: 4.5 },
  { id: '2', name: 'Sushi Master', address: 'Jardins, São Paulo', rating: 4.7 },
  { id: '3', name: 'La Parrilla Argentina', address: 'Vila Madalena, São Paulo', rating: 4.6 },
  { id: '4', name: 'Café Boutique', address: 'Pinheiros, São Paulo', rating: 4.4 },
  { id: '5', name: 'Thai Garden', address: 'Itaim Bibi, São Paulo', rating: 4.3 },
  { id: '6', name: 'Pizza Napoletana', address: 'Moema, São Paulo', rating: 4.8 },
];

const TastePreferencesStep: React.FC<TastePreferencesStepProps> = ({
  userLocation,
  onComplete,
  onSkip
}) => {
  const t = useTranslations('onboarding.taste');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [ratedRestaurants, setRatedRestaurants] = useState<Map<string, number>>(new Map());
  const [showSearch, setShowSearch] = useState(false);

  const minRatingsRequired = 3;
  const canContinue = ratedRestaurants.size >= minRatingsRequired;

  // Simulate Google Places API search
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock search results (in production, use Google Places API)
    const mockResults: Restaurant[] = [
      { id: `search-1`, name: `${query} Restaurant`, address: `${userLocation || 'Your City'}` },
      { id: `search-2`, name: `${query} Bistro`, address: `${userLocation || 'Your City'}` },
      { id: `search-3`, name: `${query} Kitchen`, address: `${userLocation || 'Your City'}` },
    ];

    setSearchResults(mockResults);
    setIsSearching(false);
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleRateRestaurant = (restaurantId: string, rating: number) => {
    setRatedRestaurants(prev => {
      const newMap = new Map(prev);
      newMap.set(restaurantId, rating);
      return newMap;
    });

    // Provide immediate feedback
    if (ratedRestaurants.size + 1 === minRatingsRequired) {
      toast.success(t('toast.canContinue'), {
        icon: '🎉'
      });
    }
  };

  const handleRemoveRating = (restaurantId: string) => {
    setRatedRestaurants(prev => {
      const newMap = new Map(prev);
      newMap.delete(restaurantId);
      return newMap;
    });
  };

  const handleContinue = () => {
    if (!canContinue) {
      toast.error(t('toast.rateMinimum', { count: minRatingsRequired }));
      return;
    }

    // In production, save these ratings to your backend
    console.log('Rated restaurants:', Array.from(ratedRestaurants.entries()));
    
    toast.success(t('toast.saved'));
    onComplete(ratedRestaurants.size);
  };

  const RatingStars = ({ restaurantId, currentRating }: { restaurantId: string; currentRating?: number }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const userRating = ratedRestaurants.get(restaurantId);

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRateRestaurant(restaurantId, star * 2)} // Convert to 0-10 scale
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                (hoverRating || userRating ? (hoverRating >= star || (userRating && userRating >= star * 2)) : false)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {userRating && (
          <button
            onClick={() => handleRemoveRating(restaurantId)}
            className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => {
    const userRating = ratedRestaurants.get(restaurant.id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 border-2 rounded-xl transition-all ${
          userRating
            ? 'border-green-500 bg-green-50'
            : 'border-gray-200 hover:border-orange-300'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              {restaurant.name}
              {userRating && <Check className="w-4 h-4 text-green-600" />}
            </h3>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {restaurant.address}
            </p>
          </div>
          {restaurant.rating && (
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {restaurant.rating}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-600 mb-2">
            {userRating ? t('rating.yourRating') : t('rating.rateThis')}
          </p>
          <RatingStars restaurantId={restaurant.id} currentRating={userRating} />
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto">
          <Star className="w-8 h-8 text-white fill-white" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full">
          <span className="text-sm font-medium text-orange-800">
            {t('progress', { current: ratedRestaurants.size, required: minRatingsRequired })}
          </span>
          {canContinue && <Check className="w-4 h-4 text-green-600" />}
        </div>
      </motion.div>

      {/* Search Toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          {showSearch ? t('search.hide') : t('search.show')}
        </button>
      </div>

      {/* Search Box */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search.placeholder')}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popular Restaurants */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 text-center">
          {showSearch ? t('popular.orPick') : t('popular.nearYou')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {POPULAR_RESTAURANTS.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onSkip}
          className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
        >
          {t('skip')}
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {t('continue')}
        </button>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
      >
        <h3 className="text-sm font-medium text-yellow-900 mb-1">
          {t('info.title')}
        </h3>
        <p className="text-sm text-yellow-800">
          {t('info.description')}
        </p>
      </motion.div>
    </div>
  );
};

export default TastePreferencesStep;