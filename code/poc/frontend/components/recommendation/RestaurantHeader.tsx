'use client';

import React from 'react';
import { MapPin, ChevronRight } from 'lucide-react';

// Brand colors from BocaBoca guidelines
const BRAND = {
  coral: '#FF644A',
  coralLight: '#FFE4E0',
  coralDark: '#E65441',
  navy: '#1F1E2A',
  cream: '#FFF4E1',
  mint: '#BFE2D9',
  plum: '#35273B',
  stone: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D1D5DB',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#1C1917',
  },
};

interface Restaurant {
  id: string | number;
  name: string;
  address?: string;
  city?: string;
  cuisine_type?: string;
  google_place_id?: string;
}

interface RestaurantHeaderProps {
  restaurant: Restaurant | null;
  onChangeRestaurant: () => void;

  /**
   * Translation function (e.g., from next-intl useTranslations).
   * Optional: component will fall back to basic English strings if omitted
   * or incorrectly passed.
   */
  t?: (key: string, params?: Record<string, any>) => string;
}

export function RestaurantHeader({
  restaurant,
  onChangeRestaurant,
  t,
}: RestaurantHeaderProps) {
  if (!restaurant) return null;

  // Defensive translation wrapper (prevents "t is not a function")
  const tt =
    typeof t === 'function'
      ? t
      : ((key: string) => {
          switch (key) {
            case 'singleScreen.restaurant.change':
              return 'Change';
            default:
              return key;
          }
        });

  const locationText = restaurant.address || restaurant.city || '';

  return (
    <button
      type="button"
      onClick={onChangeRestaurant}
      className="w-full text-left p-4 rounded-xl transition-all duration-200 group"
      style={{
        backgroundColor: BRAND.cream,
        border: `1px solid ${BRAND.stone[200]}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#FFF8ED';
        e.currentTarget.style.borderColor = BRAND.coral;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = BRAND.cream;
        e.currentTarget.style.borderColor = BRAND.stone[200];
      }}
    >
      <div className="flex items-start justify-between">
        {/* Restaurant Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" role="img" aria-label="Restaurant">
              🍽️
            </span>
            <h3 className="font-semibold text-lg truncate" style={{ color: BRAND.navy }}>
              {restaurant.name}
            </h3>
          </div>

          {locationText && (
            <div className="flex items-center gap-1 ml-7">
              <MapPin
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: BRAND.stone[500] }}
              />
              <span className="text-sm truncate" style={{ color: BRAND.stone[500] }}>
                {locationText}
              </span>
            </div>
          )}

          {restaurant.cuisine_type && (
            <div className="ml-7 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: BRAND.stone[100],
                  color: BRAND.stone[600],
                }}
              >
                {restaurant.cuisine_type}
              </span>
            </div>
          )}
        </div>

        {/* Change indicator */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <span
            className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: BRAND.coral }}
          >
            {tt('singleScreen.restaurant.change')}
          </span>
          <ChevronRight className="w-5 h-5" style={{ color: BRAND.stone[400] }} />
        </div>
      </div>
    </button>
  );
}

export default RestaurantHeader;