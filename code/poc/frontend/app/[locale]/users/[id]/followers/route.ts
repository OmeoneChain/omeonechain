// File: app/api/social/users/[id]/followers/route.ts
import { NextRequest, NextResponse } from 'next/server';

// This should match your Express server URL
const EXPRESS_API_BASE = process.env.EXPRESS_API_URL || 'http://localhost:3001/api';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const page = searchParams.get('page') || '1';
    const per_page = searchParams.get('per_page') || '20';
    
    console.log(`Proxying followers request for user ${id} to Express API`);
    
    // Forward the request to your Express API
    const expressUrl = `${EXPRESS_API_BASE}/social/users/${id}/followers?page=${page}&per_page=${per_page}`;
    
    const response = await fetch(expressUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      }
    });

    if (!response.ok) {
      console.error(`Express API error: ${response.status} ${response.statusText}`);
      
      // If Express API returns 404, return empty followers list
      if (response.status === 404) {
        return NextResponse.json({
          followers: [],
          total: 0,
          page: parseInt(page),
          per_page: parseInt(per_page),
          has_more: false
        });
      }
      
      return NextResponse.json(
        { error: `Backend API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Express API response:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API proxy error:', error);
    
    // Return mock data as fallback for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Returning mock data as fallback');
      return NextResponse.json({
        followers: [
          {
            id: '1',
            user: {
              id: '1',
              username: 'alice_foodie',
              display_name: 'Alice Chen',
              avatar_url: null,
              followers_count: 245,
              recommendations_count: 89,
              avg_trust_score: 0.85,
              verification_status: 'verified',
              is_following: false
            }
          },
          {
            id: '2',
            user: {
              id: '2',
              username: 'bob_explorer',
              display_name: 'Bob Martinez',
              avatar_url: null,
              followers_count: 156,
              recommendations_count: 34,
              avg_trust_score: 0.72,
              verification_status: 'basic',
              is_following: true
            }
          }
        ],
        total: 2,
        page: 1,
        per_page: 20,
        has_more: false
      });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}