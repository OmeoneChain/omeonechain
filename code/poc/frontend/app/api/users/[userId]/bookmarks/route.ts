// Combined bookmarks route - shows both recommendations and lists
// File: code/poc/frontend/app/api/users/[userId]/bookmarks/route.ts

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
    console.log(`🔍 Combined Bookmarks API called for user: ${userId}`);

    // Query 1: Get recommendation bookmarks
    console.log('📋 Fetching recommendation bookmarks...');
    const { data: recommendationBookmarks, error: recError } = await supabase
      .from('recommendation_bookmarks')
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
      console.error('❌ Recommendation bookmarks error:', recError);
    } else {
      console.log(`✅ Found ${recommendationBookmarks?.length || 0} recommendation bookmarks`);
    }

    // Query 2: Get list bookmarks - using same pattern as likes
    console.log('📋 Fetching list bookmarks...');
    const { data: listBookmarks, error: listError } = await supabase
      .from('list_bookmarks')
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
      console.error('❌ List bookmarks error:', listError);
      // If curated_lists join fails, try simpler query
      console.log('🔄 Trying simplified list bookmarks query...');
      const { data: simpleListBookmarks, error: simpleError } = await supabase
        .from('list_bookmarks')
        .select('*')
        .eq('user_id', userId);
      
      if (simpleError) {
        console.error('❌ Simple list bookmarks error:', simpleError);
      } else {
        console.log('✅ Simple query result:', JSON.stringify(simpleListBookmarks, null, 2));
      }
    } else {
      console.log(`✅ Found ${listBookmarks?.length || 0} list bookmarks`);
      if (listBookmarks && listBookmarks.length > 0) {
        console.log('📝 Sample list bookmark:', JSON.stringify(listBookmarks[0], null, 2));
      }
    }

    // Combine and transform both types
    const combinedBookmarks = [];

    // Add recommendation bookmarks
    if (recommendationBookmarks) {
      recommendationBookmarks.forEach((bookmark: any) => {
        combinedBookmarks.push({
          id: `rec_${bookmark.id}`,
          type: 'recommendation',
          title: bookmark.recommendations?.title || 'Unknown Recommendation',
          content: bookmark.recommendations?.content || 'No content available',
          category: 'recommendation',
          trustScore: 0,
          upvotes: 0,
          saves: 0,
          createdAt: bookmark.recommendations?.created_at || bookmark.created_at,
          updatedAt: bookmark.recommendations?.created_at || bookmark.created_at,
          bookmarked_at: bookmark.created_at,
          author: {
            id: bookmark.recommendations?.author_id || 'unknown',
            username: 'unknown',
            display_name: 'Unknown User',
            avatar_url: null
          }
        });
      });
    }

    // Add list bookmarks - handle both successful and failed join queries
    if (listBookmarks && !listError) {
      listBookmarks.forEach((bookmark: any) => {
        combinedBookmarks.push({
          id: `list_${bookmark.id}`,
          type: 'list',
          title: bookmark.curated_lists?.title || 'Unknown List',
          content: bookmark.curated_lists?.description || 'No description available',
          category: 'list',
          trustScore: 0,
          upvotes: 0,
          saves: 0,
          createdAt: bookmark.created_at,
          updatedAt: bookmark.created_at,
          bookmarked_at: bookmark.created_at,
          author: {
            id: bookmark.curated_lists?.author_id || 'unknown',
            username: 'unknown',
            display_name: 'List Creator',
            avatar_url: null
          }
        });
      });
    }

    // Sort by bookmarked_at (most recent first)
    combinedBookmarks.sort((a, b) => new Date(b.bookmarked_at).getTime() - new Date(a.bookmarked_at).getTime());

    console.log(`✅ Combined bookmarks results: ${combinedBookmarks.length} total bookmarks (${recommendationBookmarks?.length || 0} recommendations + ${listBookmarks?.length || 0} lists)`);

    return NextResponse.json({
      bookmarks: combinedBookmarks,
      pagination: {
        page: 1,
        limit: 10,
        total: combinedBookmarks.length,
        hasMore: false,
        totalPages: 1
      },
      meta: {
        userId,
        timestamp: new Date().toISOString(),
        debug: 'combined_success_fixed',
        private: true,
        breakdown: {
          recommendations: recommendationBookmarks?.length || 0,
          lists: listBookmarks?.length || 0
        },
        errors: {
          recommendation_error: recError?.message || null,
          list_error: listError?.message || null
        }
      }
    });

  } catch (error) {
    console.error('💥 Unexpected error in combined bookmarks API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: 'catch_block_error'
    }, { status: 500 });
  }
}