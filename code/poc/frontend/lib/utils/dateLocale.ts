// File: code/poc/frontend/lib/utils/dateLocale.ts
// Utility for localized date formatting with date-fns
// Ensures formatDistanceToNow and other date functions use the correct locale

import { formatDistanceToNow as fnsFormatDistanceToNow, format as fnsFormat } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

// Map of supported locales to date-fns locale objects
const localeMap: Record<string, Locale> = {
  'pt-BR': ptBR,
  'pt': ptBR,
  'en': enUS,
  'en-US': enUS,
};

/**
 * Get the date-fns locale object for a given locale string
 */
export const getDateLocale = (locale: string): Locale => {
  return localeMap[locale] || localeMap[locale.split('-')[0]] || enUS;
};

/**
 * Localized version of formatDistanceToNow
 * Automatically uses the correct locale for the output string
 */
export const formatDistanceToNowLocalized = (
  date: Date | number | string,
  locale: string,
  options?: { addSuffix?: boolean; includeSeconds?: boolean }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateLocale = getDateLocale(locale);
  
  return fnsFormatDistanceToNow(dateObj, {
    ...options,
    locale: dateLocale,
  });
};

/**
 * Localized version of format
 */
export const formatLocalized = (
  date: Date | number | string,
  formatStr: string,
  locale: string
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateLocale = getDateLocale(locale);
  
  return fnsFormat(dateObj, formatStr, {
    locale: dateLocale,
  });
};

/**
 * Format a relative time string for display
 * Returns "X ago" for past dates, handles edge cases
 */
export const formatRelativeTime = (
  dateString: string,
  locale: string
): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return locale.startsWith('pt') ? 'data inválida' : 'invalid date';
    }
    
    // If the date is in the future (possibly due to timezone issues),
    // treat it as "just now" to avoid confusing "in X hours" messages
    if (date > now) {
      return locale.startsWith('pt') ? 'agora mesmo' : 'just now';
    }
    
    return formatDistanceToNowLocalized(date, locale, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', error);
    return locale.startsWith('pt') ? 'recentemente' : 'recently';
  }
};