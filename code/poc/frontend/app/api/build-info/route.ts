// File: code/poc/frontend/app/api/build-info/route.ts
// Returns current build ID for cache-busting version checks
// The BUILD_ID changes with each Vercel deployment

import { NextResponse } from 'next/server';

export async function GET() {
  // Vercel automatically sets these environment variables at build time
  // VERCEL_GIT_COMMIT_SHA is the git commit hash
  // If not available, fall back to a build timestamp from env or current time
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA 
    || process.env.NEXT_PUBLIC_BUILD_ID 
    || process.env.BUILD_ID
    || 'development';
  
  return NextResponse.json(
    { 
      buildId,
      timestamp: Date.now()
    },
    {
      headers: {
        // Never cache this endpoint
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  );
}