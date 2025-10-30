// Fixed combined likes route with correct column names
// File: code/poc/frontend/app/api/users/[userId]/likes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    console.log(`🔍 Combined Likes API called for user: ${userId}`);

    // Query 1: Get recommendation likes (table appears empty but keep for completeness)
    console.log('📋 Fetching recommendation likes...');
    const { data: recommendationLikes, error: recError } = await supabase
      .from('recommendation_likes')
      .select(`
        id,
        created_at,
        recommendations (
          id,
          title,
          content,
          author_id
        )
      `)
      .eq('user_id', userId);

    if (recError) {
      console.error('❌ Recommendation likes error:', recError);
    } else {
      console.log(`✅ Found ${recommendationLikes?.length || 0} recommendation likes`);
    }

    // Query 2: Get list likes - corrected query based on your table structure
    console.log('📋 Fetching list likes...');
    const { data: listLikes, error: listError } = await supabase
      .from('list_likes')
      .select(`
        id,
        created_at,
        list_id,
        curated_lists (
          id,
          title,
          description,
          author_id
        )
      `)
      .eq('user_id', userId);

    if (listError) {
      console.error('❌ List likes error:', listError);
      // If curated_lists join fails, try simpler query
      console.log('🔄 Trying simplified list likes query...');
      const { data: simpleListLikes, error: simpleError } = await supabase
        .from('list_likes')
        .select('*')
        .eq('user_id', userId);
      
      if (simpleError) {
        console.error('❌ Simple list likes error:', simpleError);
      } else {
        console.log('✅ Simple query result:', JSON.stringify(simpleListLikes, null, 2));
      }
    } else {
      console.log(`✅ Found ${listLikes?.length || 0} list likes`);
      if (listLikes && listLikes.length > 0) {
        console.log('📝 Sample list like:', JSON.stringify(listLikes[0], null, 2));
      }
    }

    // Combine and transform both types
    const combinedLikes = [];

    // Add recommendation likes
    if (recommendationLikes) {
      recommendationLikes.forEach((like: any) => {
        combinedLikes.push({
          id: `rec_${like.id}`,
          type: 'recommendation',
          title: like.recommendations?.title || 'Unknown Recommendation',
          content: like.recommendations?.content || 'No content available',
          category: 'recommendation',
          trustScore: 0,
          upvotes: 0,
          saves: 0,
          createdAt: like.recommendations?.created_at || like.created_at,
          updatedAt: like.recommendations?.created_at || like.created_at,
          liked_at: like.created_at,
          author: {
            id: like.recommendations?.author_id || 'unknown',
            username: 'unknown',
            display_name: 'Unknown User',
            avatar_url: null
          }
        });
      });
    }

    // Add list likes - handle both successful and failed join queries
    if (listLikes && !listError) {
      listLikes.forEach((like: any) => {
        combinedLikes.push({
          id: `list_${like.id}`,
          type: 'list',
          title: like.curated_lists?.title || 'Unknown List',
          content: like.curated_lists?.description || 'No description available',
          category: 'list',
          trustScore: 0,
          upvotes: 0,
          saves: 0,
          createdAt: like.created_at,
          updatedAt: like.created_at,
          liked_at: like.created_at,
          author: {
            id: like.curated_lists?.author_id || 'unknown',
            username: 'unknown',
            display_name: 'List Creator',
            avatar_url: null
          }
        });
      });
    }

    // Sort by liked_at (most recent first)
    combinedLikes.sort((a, b) => new Date(b.liked_at).getTime() - new Date(a.liked_at).getTime());

    console.log(`✅ Combined results: ${combinedLikes.length} total likes (${recommendationLikes?.length || 0} recommendations + ${listLikes?.length || 0} lists)`);

    return NextResponse.json({
      likes: combinedLikes,
      pagination: {
        page: 1,
        limit: 10,
        total: combinedLikes.length,
        hasMore: false,
        totalPages: 1
      },
      meta: {
        userId,
        timestamp: new Date().toISOString(),
        debug: 'combined_success_fixed',
        breakdown: {
          recommendations: recommendationLikes?.length || 0,
          lists: listLikes?.length || 0
        },
        errors: {
          recommendation_error: recError?.message || null,
          list_error: listError?.message || null
        }
      }
    });

  } catch (error) {
    console.error('💥 Unexpected error in combined likes API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: 'catch_block_error'
    }, { status: 500 });
  }
}