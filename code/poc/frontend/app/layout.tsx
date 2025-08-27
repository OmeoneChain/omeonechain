// File: code/poc/frontend/app/layout.tsx
// Updated layout with correct AuthProvider import path

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
          
          {/* Keep the Toaster for notifications */}
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#059669',
                  color: '#fff',
                },
              },
              error: {
                style: {
                  background: '#DC2626',
                  color: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}