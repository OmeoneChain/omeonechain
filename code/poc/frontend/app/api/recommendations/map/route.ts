/**
 * Next.js API Route - Proxy to Express backend
 * Location: code/poc/frontend/src/app/api/recommendations/map/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Forward auth header only if it's a valid token
    const authHeader = request.headers.get('authorization');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Only forward auth if it's a real token (not "Bearer null" or "Bearer undefined")
    if (authHeader && !authHeader.includes('null') && !authHeader.includes('undefined')) {
      headers['Authorization'] = authHeader;
    }

    // Proxy to Express backend
    const backendUrl = `${BACKEND_URL}/api/recommendations/map${queryString ? `?${queryString}` : ''}`;
    
    console.log('[Next.js Proxy] Forwarding to:', backendUrl);
    console.log('[Next.js Proxy] Auth header:', authHeader ? 'present' : 'none');
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[Next.js Proxy] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch map data', details: error.message },
      { status: 500 }
    );
  }
}