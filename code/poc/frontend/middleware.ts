import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed' // Don't show /pt-BR for default locale
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - Static files
    // - _next internals
    '/((?!api|_next|.*\\..*).*)'
  ]
};