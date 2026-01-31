// File: code/poc/frontend/next.config.js
// Updated with conditional static export for mobile builds

const withNextIntl = require('next-intl/plugin')('./i18n.ts');

// Check if this is a mobile build
const isMobileBuild = process.env.MOBILE_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export only for mobile builds
  ...(isMobileBuild && { output: 'export' }),
  
  // Trailing slash for static export compatibility (mobile builds)
  ...(isMobileBuild && { trailingSlash: true }),
  
  // TypeScript configuration
  typescript: {
    // Allow builds to complete even with type errors (can be removed later)
    ignoreBuildErrors: true,
  },
  
  // Cache headers - force fresh content during beta
  // This fixes "first login after update fails" issue
  async headers() {
    return [
      {
        // Apply to all JS/CSS chunks
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, must-revalidate',
          },
        ],
      },
      {
        // Apply to pages
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for crypto polyfills (IOTA Rebased blockchain support)
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
  },
  
  // Image configuration - ALL remote patterns in ONE place
  images: {
    // Disable optimization for mobile builds (static export doesn't support it)
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