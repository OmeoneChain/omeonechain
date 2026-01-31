// File: code/poc/frontend/next.config.js
// Updated with conditional static export for mobile builds
// Updated: Added build ID for deployment cache-busting (Jan 31, 2026)

const withNextIntl = require('next-intl/plugin')('./i18n.ts');

// Check if this is a mobile build
const isMobileBuild = process.env.MOBILE_BUILD === 'true';

// Generate a build ID - Vercel provides VERCEL_GIT_COMMIT_SHA automatically
// For local dev, use a timestamp
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || `dev-${Date.now()}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export only for mobile builds
  ...(isMobileBuild && { output: 'export' }),
  
  // Trailing slash for static export compatibility (mobile builds)
  ...(isMobileBuild && { trailingSlash: true }),
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Cache headers to help with stale code issues
  async headers() {
    return [
      {
        // HTML pages should always be revalidated
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // Static assets can be cached but with revalidation
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for crypto polyfills
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
      };
    }
    
    return config;
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    IS_MOBILE_BUILD: isMobileBuild ? 'true' : 'false',
    // Expose build ID to client for version checking
    NEXT_PUBLIC_BUILD_ID: buildId,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || '',
  },
  
  // Image configuration
  images: {
    ...(isMobileBuild && { unoptimized: true }),
    
    remotePatterns: [
      // IPFS Gateways
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'dweb.link',
        pathname: '/ipfs/**',
      },
      // Other external sources
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = withNextIntl(nextConfig);