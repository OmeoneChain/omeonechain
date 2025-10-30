// File: code/poc/frontend/app/layout.tsx
// Fixed layout with correct AuthProvider import path

import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../hooks/useAuth'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'OmeoneChain',
  description: 'Trust-Based Recommendations Network',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap the entire app with AuthProvider */}
        <AuthProvider>
          {/* Each page will handle its own header through CleanHeader */}
          {children}
          
          {/* Keep the Toaster for notifications - ENHANCED styling for better UX */}
          <Toaster 
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerClassName=""
            containerStyle={{}}
            toastOptions={{
              // Default styling for all toasts
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
      </body>
    </html>
  )
}