// File: code/poc/frontend/app/layout.tsx
// Updated with next-intl for internationalization support
// FIXED: Added viewport-fit=cover for iOS safe areas in Capacitor

import '../globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/hooks/useAuth'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import { ThemeProvider } from '@/components/ThemeProvider';
import type { Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'BocaBoca',
  description: 'Trust-Based Recommendations Network',
}

// Add viewport configuration for iOS safe areas
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // This enables env(safe-area-inset-*) to work
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const locale = params.locale;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body className={inter.className}>
        {/* Wrap the entire app with i18n and AuthProvider */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            {/* Each page will handle its own header through CleanHeader */}
            {children}
            {/* Keep the Toaster for notifications */}
            <Toaster 
              position="top-right"
              reverseOrder={false}
              gutter={8}
              containerClassName=""
              containerStyle={{}}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  border: '1px solid #4a5568',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  maxWidth: '400px',
                },
                success: {
                  duration: 3000,
                  style: {
                    background: '#059669',
                    color: '#fff',
                    border: '1px solid #047857',
                  },
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: '#DC2626',
                    color: '#fff',
                    border: '1px solid #b91c1c',
                  },
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
                loading: {
                  style: {
                    background: '#374151',
                    color: '#f3f4f6',
                    border: '1px solid #4b5563',
                  },
                },
              }}
            />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

// Required for static export - defines all valid locales
export function generateStaticParams() {
  return [{ locale: 'pt-BR' }, { locale: 'en' }];
}
