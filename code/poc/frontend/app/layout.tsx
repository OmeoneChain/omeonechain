import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'OmeoneChain - Trust-Based Recommendations',
  description: 'Discover amazing places through your social network. Get recommendations from people you trust, not anonymous crowds.',
  keywords: ['recommendations', 'social trust', 'blockchain', 'IOTA', 'reviews', 'social network'],
  authors: [{ name: 'OmeoneChain Team' }],
  creator: 'OmeoneChain',
  publisher: 'OmeoneChain',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://omeonechain.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'OmeoneChain',
    title: 'OmeoneChain - Trust-Based Recommendations',
    description: 'Discover amazing places through your social network. Get recommendations from people you trust, not anonymous crowds.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OmeoneChain - Trust-Based Recommendations Network'
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OmeoneChain - Trust-Based Recommendations',
    description: 'Discover amazing places through your social network. Get recommendations from people you trust, not anonymous crowds.',
    images: ['/og-image.png'],
    creator: '@omeonechain',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  category: 'technology',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}