// File: code/poc/frontend/components/auth/PhoneEntry.tsx
// Phone number entry with country code selector for BocaBoca onboarding
// Updated: Jan 31, 2026 - Better handling of iOS autofill with country codes

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ChevronDown, Phone, AlertCircle, Loader2 } from 'lucide-react';

// Country codes for supported regions
const COUNTRY_CODES = [
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brasil', placeholder: '(11) 99999-9999', digits: '55' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States', placeholder: '(555) 555-5555', digits: '1' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom', placeholder: '7911 123456', digits: '44' },
  { code: '+351', country: 'PT', flag: '🇵🇹', name: 'Portugal', placeholder: '912 345 678', digits: '351' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'España', placeholder: '612 34 56 78', digits: '34' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'México', placeholder: '55 1234 5678', digits: '52' },
  { code: '+54', country: 'AR', flag: '🇦🇷', name: 'Argentina', placeholder: '11 1234-5678', digits: '54' },
];

interface PhoneEntryProps {
  onSubmit: (phoneNumber: string, countryCode: string) => Promise<void>;
  onBack?: () => void;
  isLoading?: boolean;
  error?: string | null;
  defaultCountryCode?: string;
}

export default function PhoneEntry({
  onSubmit,
  onBack,
  isLoading = false,
  error: externalError,
  defaultCountryCode = '+55'
}: PhoneEntryProps) {
  const t = useTranslations('auth');
  
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRY_CODES.find(c => c.code === defaultCountryCode) || COUNTRY_CODES[0]
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Detects if a phone number string contains a country code and extracts the national part.
   * Returns { countryCode, nationalNumber } or null if no country code detected.
   */
  const parsePhoneWithCountryCode = (value: string): { country: typeof COUNTRY_CODES[0], nationalNumber: string } | null => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Check each country code (sorted by length descending to match longest first)
    const sortedCountries = [...COUNTRY_CODES].sort((a, b) => b.digits.length - a.digits.length);
    
    for (const country of sortedCountries) {
      if (digits.startsWith(country.digits)) {
        const nationalNumber = digits.slice(country.digits.length);
        // Only consider it a match if there are remaining digits after the country code
        if (nationalNumber.length >= 6) {
          return { country, nationalNumber };
        }
      }
    }
    
    return null;
  };

  // Format phone number based on country
  const formatPhoneNumber = (value: string, countryCode: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    if (countryCode === '+55') {
      // Brazilian format: (XX) XXXXX-XXXX
      if (digits.length <= 2) return digits;
      if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    
    if (countryCode === '+1') {
      // US format: (XXX) XXX-XXXX
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    // Default: just return digits with spaces every 3
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const digits = rawValue.replace(/\D/g, '');
    
    // Check if this looks like an autofilled international number
    // iOS often autofills the full number including country code
    const parsed = parsePhoneWithCountryCode(digits);
    
    if (parsed && digits.length > 11) {
      // Autofill detected with country code - extract national number
      // and optionally switch to the detected country
      console.log('📱 Detected autofill with country code:', parsed.country.code);
      
      // Update country selector if different
      if (parsed.country.code !== selectedCountry.code) {
        setSelectedCountry(parsed.country);
      }
      
      // Format and set just the national number
      const formatted = formatPhoneNumber(parsed.nationalNumber, parsed.country.code);
      setPhoneNumber(formatted);
    } else {
      // Normal input - just format it
      const formatted = formatPhoneNumber(rawValue, selectedCountry.code);
      setPhoneNumber(formatted);
    }
    
    setInternalError(null);
  };

  const handleCountrySelect = (country: typeof COUNTRY_CODES[0]) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setPhoneNumber(''); // Reset phone when country changes
    inputRef.current?.focus();
  };

  const validatePhoneNumber = (): boolean => {
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Minimum length check
    if (digits.length < 8) {
      setInternalError(t('phoneEntry.errorTooShort') || 'Phone number is too short');
      return false;
    }
    
    // Brazil specific validation
    if (selectedCountry.code === '+55' && digits.length !== 11) {
      setInternalError(t('phoneEntry.errorInvalidBrazil') || 'Brazilian numbers must have 11 digits');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhoneNumber()) {
      return;
    }
    
    // Extract just the digits for the API
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    try {
      await onSubmit(digitsOnly, selectedCountry.code);
    } catch (err) {
      // Error handling is done by parent
    }
  };

  const displayError = externalError || internalError;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <span className="mr-2">←</span>
          {t('common.back') || 'Back'}
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-coral-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-coral-500" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">
          {t('phoneEntry.title') || "What's your number?"}
        </h1>
        <p className="text-gray-600">
          {t('phoneEntry.subtitle') || "We'll send an SMS code to verify your number"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Phone Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('phoneEntry.label') || 'Phone number'}
          </label>
          
          <div className="flex gap-2">
            {/* Country Code Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-3 bg-white border border-gray-300 rounded-xl hover:border-gray-400 transition-colors min-w-[100px]"
                disabled={isLoading}
              >
                <span className="text-xl">{selectedCountry.flag}</span>
                <span className="text-gray-900 font-medium">{selectedCountry.code}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown */}
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
                >
                  {COUNTRY_CODES.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedCountry.code === country.code ? 'bg-coral-50' : ''
                      }`}
                    >
                      <span className="text-xl">{country.flag}</span>
                      <span className="flex-1 text-left text-gray-900">{country.name}</span>
                      <span className="text-gray-500">{country.code}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Phone Number Input */}
            <input
              ref={inputRef}
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder={selectedCountry.placeholder}
              className={`flex-1 px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all ${
                displayError ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
              autoComplete="tel"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-2 text-red-600 text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              {displayError}
            </motion.div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || phoneNumber.replace(/\D/g, '').length < 8}
          className="w-full py-4 bg-coral-500 hover:bg-coral-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('phoneEntry.sending') || 'Sending...'}
            </>
          ) : (
            <>
              <Phone className="w-5 h-5" />
              {t('phoneEntry.submit') || 'Send SMS Code'}
            </>
          )}
        </button>

        {/* Terms */}
        <p className="text-center text-xs text-gray-500">
          {t('phoneEntry.terms') || 'By continuing, you authorize BocaBoca to send SMS messages to this number'}
        </p>
      </form>
    </div>
  );
}