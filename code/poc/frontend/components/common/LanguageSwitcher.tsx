# BocaBoca Internationalization (i18n) Implementation Guide

## Overview

This guide implements multi-language support for BocaBoca using `next-intl`, supporting:
- 🇧🇷 Portuguese (pt-BR) - Default for Brazil launch
- 🇺🇸 English (en)
- 🇪🇸 Spanish (es) - Future

---

## Step 1: Install Dependencies

```bash
cd code/poc/frontend
npm install next-intl
```

---

## Step 2: Create Directory Structure

```
/frontend
├── locales/
│   ├── en/
│   │   ├── common.json       # Navigation, buttons, general UI
│   │   ├── auth.json         # Login, signup, wallet
│   │   ├── recommendations.json  # Creation flow, cards
│   │   ├── rewards.json      # Lottery, contests, bounties
│   │   └── errors.json       # Error messages
│   ├── pt-BR/
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── recommendations.json
│   │   ├── rewards.json
│   │   └── errors.json
│   └── es/                   # Future - Spanish
│       └── (same structure)
├── i18n.ts                   # i18n configuration
├── middleware.ts             # Locale detection middleware
└── next.config.js            # Updated config
```

---

## Step 3: Create i18n Configuration

### File: `/frontend/i18n.ts`

```typescript
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['pt-BR', 'en', 'es'] as const;
export const defaultLocale = 'pt-BR';

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: {
      ...(await import(`./locales/${locale}/common.json`)).default,
      ...(await import(`./locales/${locale}/auth.json`)).default,
      ...(await import(`./locales/${locale}/recommendations.json`)).default,
      ...(await import(`./locales/${locale}/rewards.json`)).default,
      ...(await import(`./locales/${locale}/errors.json`)).default,
    }
  };
});
```

---

## Step 4: Create Middleware

### File: `/frontend/middleware.ts`

```typescript
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
```

---

## Step 5: Update next.config.js

```javascript
const withNextIntl = require('next-intl/plugin')('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing config...
};

module.exports = withNextIntl(nextConfig);
```

---

## Step 6: Update Root Layout

### File: `/frontend/app/layout.tsx`

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## Step 7: Create Language Switcher Component

### File: `/frontend/components/common/LanguageSwitcher.tsx`

```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';

const languages = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  // { code: 'es', label: 'Español', flag: '🇪🇸' }, // Uncomment when ready
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages.find(l => l.code === locale) || languages[0];

  const switchLocale = (newLocale: string) => {
    // Remove current locale from pathname if present
    const pathWithoutLocale = pathname.replace(/^\/(pt-BR|en|es)/, '');
    const newPath = newLocale === 'pt-BR' 
      ? pathWithoutLocale || '/'
      : `/${newLocale}${pathWithoutLocale || ''}`;
    
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Change language"
      >
        <Globe size={18} style={{ color: '#666' }} />
        <span className="text-sm hidden sm:inline">{currentLang.flag}</span>
        <ChevronDown size={14} style={{ color: '#999' }} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-1 z-50"
            style={{ border: '1px solid #E5E5E5' }}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLocale(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  locale === lang.code ? 'font-semibold' : ''
                }`}
                style={{ 
                  color: locale === lang.code ? '#FF644A' : '#666',
                  backgroundColor: locale === lang.code ? '#FFF5F3' : 'transparent'
                }}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Step 8: How to Use Translations in Components

### In Server Components:

```typescript
import { useTranslations } from 'next-intl';

export default function MyPage() {
  const t = useTranslations('common');
  
  return (
    <h1>{t('navigation.discover')}</h1>
  );
}
```

### In Client Components:

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('recommendations');
  
  return (
    <button>{t('creation.submit')}</button>
  );
}
```

### With Variables:

```typescript
// In JSON: "welcome": "Welcome, {name}!"
t('welcome', { name: user.name })

// In JSON: "items": "{count, plural, =0 {No items} =1 {1 item} other {# items}}"
t('items', { count: 5 })
```

---

## Step 9: Add LanguageSwitcher to CleanHeader

In `CleanHeader.tsx`, add the import and component:

```typescript
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

// In the header JSX, add before the search button:
<LanguageSwitcher />
```

---

## Migration Checklist

### Priority 1 - Core Pages (Week 1)
- [ ] CleanHeader.tsx
- [ ] RecommendationCreationFlow.tsx
- [ ] app/page.tsx (Home)
- [ ] app/discover/page.tsx
- [ ] app/feed/page.tsx

### Priority 2 - Auth & Profile (Week 1-2)
- [ ] AuthModal.tsx
- [ ] EmailAuth.tsx
- [ ] WalletConnect.tsx
- [ ] UserProfile.tsx
- [ ] ProfileEditor.tsx

### Priority 3 - Features (Week 2)
- [ ] RecommendationCard.tsx
- [ ] CommentSection.tsx
- [ ] SaveToListModal.tsx
- [ ] NotificationBell.tsx

### Priority 4 - Rewards (Week 2-3)
- [ ] Lottery components
- [ ] Photo Contest components
- [ ] Bounty components

---

## Testing Checklist

- [ ] Default locale (pt-BR) loads correctly
- [ ] Language switcher changes locale
- [ ] URL updates correctly (/en/discover vs /discover)
- [ ] All strings display in correct language
- [ ] No hardcoded strings visible
- [ ] Forms validate with localized error messages
- [ ] Date/time formatting respects locale
- [ ] Number formatting respects locale (R$ vs $)

---

## Notes

1. **Default Locale**: Portuguese (pt-BR) is default - no prefix in URL
2. **URL Structure**: 
   - `bocaboca.app/discover` → Portuguese
   - `bocaboca.app/en/discover` → English
   - `bocaboca.app/es/discover` → Spanish (future)
3. **Persistence**: User's language preference stored in cookie
4. **SEO**: Each language version is indexable with proper hreflang tags