// File: app/api/social/users/[id]/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';

const EXPRESS_API_BASE = process.env.EXPRESS_API_URL || 'http://localhost:3001/api';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    
    console.log(`Proxying stats request for user ${id} to Express API`);
    
    // Forward the request to your Express API
    const expressUrl = `${EXPRESS_API_BASE}/social/users/${id}/stats`;
    
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
      
      // If Express API returns 404, return mock user stats
      if (response.status === 404) {
        return NextResponse.json({
          id: id,
          username: `user_${id.slice(0, 8)}`,
          display_name: 'Unknown User',
          avatar_url: null,
          followers_count: 0,
          following_count: 0,
          recommendations_count: 0,
          avg_trust_score: 0,
          verification_status: 'basic'
        });
      }
      
      return NextResponse.json(
        { error: `Backend API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Express API stats response:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Stats API proxy error:', error);
    
    // Return mock data as fallback for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Returning mock user stats as fallback');
      return NextResponse.json({
        id: id,
        username: `user_${id.slice(0, 8)}`,
        display_name: 'Test User',
        avatar_url: null,
        followers_count: 12,
        following_count: 8,
        recommendations_count: 5,
        avg_trust_score: 0.67,
        verification_status: 'basic'
      });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}