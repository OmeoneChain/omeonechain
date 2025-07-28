// app/layout.tsx - FIXED VERSION (Remove NavigationWrapper duplication)

import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'

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
        {/* REMOVED: NavigationWrapper component that was causing duplication */}
        
        {/* Keep only the children - each page will handle its own header */}
        {children}
        
        {/* Keep the Toaster for notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  )
}