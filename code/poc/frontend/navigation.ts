// Simple navigation helper for next-intl
import { locales, defaultLocale } from './i18n';

export { locales, defaultLocale };

// Always include locale prefix for reliable switching
export function switchLocale(newLocale: string, currentPath: string): string {
  // Remove any existing locale prefix
  const pathWithoutLocale = currentPath.replace(/^\/(pt-BR|en|es)/, '') || '/';
  
  // Always add locale prefix (ensures middleware knows the locale)
  return `/${newLocale}${pathWithoutLocale}`;
}
