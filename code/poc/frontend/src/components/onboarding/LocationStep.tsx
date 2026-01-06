// File: code/poc/frontend/src/components/onboarding/LocationStep.tsx
// Step 2: Location selection for better recommendations
// UPDATED: Internationalized with next-intl

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Check, Loader2, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';

interface LocationStepProps {
  onComplete: (location: { location_city: string; location_country: string }) => void;
  onSkip: () => void;
}

const POPULAR_CITIES = [
  { city: 'São Paulo', country: 'Brazil', flag: '🇧🇷' },
  { city: 'Rio de Janeiro', country: 'Brazil', flag: '🇧🇷' },
  { city: 'Brasília', country: 'Brazil', flag: '🇧🇷' },
  { city: 'New York', country: 'USA', flag: '🇺🇸' },
  { city: 'Los Angeles', country: 'USA', flag: '🇺🇸' },
  { city: 'London', country: 'UK', flag: '🇬🇧' },
  { city: 'Paris', country: 'France', flag: '🇫🇷' },
  { city: 'Tokyo', country: 'Japan', flag: '🇯🇵' },
];

const LocationStep: React.FC<LocationStepProps> = ({ onComplete, onSkip }) => {
  const t = useTranslations('onboarding.location');
  const { updateProfile } = useAuth();
  const [customCity, setCustomCity] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ city: string; country: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const handleSelectCity = (city: string, country: string) => {
    setSelectedLocation({ city, country });
    setShowCustom(false);
  };

  const handleSave = async () => {
    const location = selectedLocation || 
      (customCity && customCountry ? { city: customCity, country: customCountry } : null);

    if (!location) {
      toast.error(t('toast.selectLocation'));
      return;
    }

    setIsSaving(true);

    try {
      await updateProfile({
        location_city: location.city,
        location_country: location.country,
        profileCompletion: 45 // Location = +10%
      });

      toast.success(t('toast.saved'));
      onComplete({
        location_city: location.city,
        location_country: location.country
      });

    } catch (error: any) {
      console.error('Failed to save location:', error);
      toast.error(error.message || t('toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto">
          <MapPin className="w-8 h-8 text-white" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </motion.div>

      {/* Popular Cities Grid */}
      {!showCustom && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h3 className="text-sm font-medium text-gray-700 text-center">
            {t('selectPopular')}
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {POPULAR_CITIES.map((location) => (
              <button
                key={`${location.city}-${location.country}`}
                onClick={() => handleSelectCity(location.city, location.country)}
                className={`p-4 border-2 rounded-xl transition-all text-left hover:shadow-md ${
                  selectedLocation?.city === location.city && selectedLocation?.country === location.country
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl mb-1">{location.flag}</div>
                    <div className="font-medium text-gray-900">{location.city}</div>
                    <div className="text-sm text-gray-500">{location.country}</div>
                  </div>
                  {selectedLocation?.city === location.city && selectedLocation?.country === location.country && (
                    <Check className="w-5 h-5 text-orange-500" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowCustom(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto"
            >
              <Globe className="w-4 h-4" />
              {t('cityNotListed')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Custom Location Input */}
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <button
            onClick={() => setShowCustom(false)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {t('backToPopular')}
          </button>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('custom.cityLabel')}
              </label>
              <input
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder={t('custom.cityPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('custom.countryLabel')}
              </label>
              <input
                type="text"
                value={customCountry}
                onChange={(e) => setCustomCountry(e.target.value)}
                placeholder={t('custom.countryPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onSkip}
          className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
        >
          {t('skip')}
        </button>
        
        <button
          onClick={handleSave}
          disabled={isSaving || (!selectedLocation && (!customCity || !customCountry))}
          className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('continue')
          )}
        </button>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
      >
        <h3 className="text-sm font-medium text-blue-900 mb-1">
          {t('info.title')}
        </h3>
        <p className="text-sm text-blue-800">
          {t('info.description')}
        </p>
      </motion.div>
    </div>
  );
};

export default LocationStep;