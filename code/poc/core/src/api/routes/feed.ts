// File: code/poc/core/src/api/routes/feed.ts
//
// Feed Algorithm: Mixed Instagram-style feed with Trust Score 2.0
//
// Extracted from server.ts for maintainability during beta iteration.
// This file is the single source of truth for feed logic — adjust weights,
// sources, and scoring here without touching the rest of the backend.
//
// FEED SOURCES:
//   Source 0:  Own Content — user's own recs, lists, requests, reshares (NEW)
//   Source 1:  Following Feed — recommendations from followed users (35%)
//   Source 1B: Reshares from Following (20%)
//   Source 1C: Discovery Requests from Following (5%)
//   Source 2:  Taste Similarity — cuisine-matched content from non-followed users (25%)
//   Source 3:  Trending Content — high-rated recent content (15%)
//   Source 4:  Lists from Following (5%)
//
// INTERLEAVE STRATEGY:
//   Primary  (own + following): sorted by recency      → ~75% of feed
//   Discovery (taste + trending): sorted by trust score → ~25% of feed
//
// CHANGELOG:
//   Feb 2026 — Extracted from server.ts into standalone route file
//   Feb 2026 — Added Source 0: user's own content now appears in their feed
//   Feb 2026 — Added deduplication to prevent same item appearing twice

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../../middleware/auth';

// =============================================================================
// SETUP
// =============================================================================

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ [Feed] Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

// =============================================================================
// TYPES
// =============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Feed-specific Trust Score calculation.
 * Combines social proximity, taste alignment, and contextual match
 * weighted by the author's base trust score.
 */
function calculateTrustScore(
  item: any,
  userId: string,
  socialWeight: number,
  tasteAlignment: number,
  contextualMatch: number
) {
  const authorTrustScore = item.users?.trust_score || 5.0;

  const overallScore = (
    (socialWeight * 0.3) +
    (tasteAlignment * 0.5) +
    (contextualMatch * 0.2)
  ) * (authorTrustScore / 10);

  return {
    social_weight: socialWeight,
    taste_alignment: tasteAlignment,
    contextual_match: contextualMatch,
    overall_trust_score: Math.min(10, Math.max(0, overallScore * 10))
  };
}

/**
 * Extract user's top cuisine preferences from their recommendation history.
 * Returns up to 5 cuisine types the user has rated 7+ .
 */
function extractCuisinePreferences(userRecommendations: any[]): string[] {
  const cuisineMap = new Map<string, number>();

  userRecommendations.forEach(rec => {
    if (rec.restaurant?.cuisine_type && rec.overall_rating >= 7) {
      const count = cuisineMap.get(rec.restaurant.cuisine_type) || 0;
      cuisineMap.set(rec.restaurant.cuisine_type, count + 1);
    }
  });

  return Array.from(cuisineMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cuisine]) => cuisine);
}

/**
 * Interleave two sorted arrays with a target ratio.
 *   primary   = own + followed content, sorted by recency
 *   secondary = discovery content, sorted by trust score
 *
 * UPDATED: ratio check now counts both 'own' and 'following' as primary.
 */
function interleaveFeed(
  primary: any[],
  secondary: any[],
  primaryRatio: number = 0.75,
  maxItems: number = 40
): any[] {
  const result: any[] = [];
  let primaryIndex = 0;
  let secondaryIndex = 0;

  if (primary.length === 0) return secondary.slice(0, maxItems);
  if (secondary.length === 0) return primary.slice(0, maxItems);

  while (result.length < maxItems) {
    const currentRatio = result.length === 0
      ? 0
      : result.filter(i => i.source === 'following' || i.source === 'own').length / result.length;

    const needMorePrimary = currentRatio < primaryRatio;
    const primaryAvailable = primaryIndex < primary.length;
    const secondaryAvailable = secondaryIndex < secondary.length;

    if (!primaryAvailable && !secondaryAvailable) break;

    if (needMorePrimary && primaryAvailable) {
      result.push(primary[primaryIndex++]);
    } else if (secondaryAvailable) {
      result.push(secondary[secondaryIndex++]);
    } else if (primaryAvailable) {
      result.push(primary[primaryIndex++]);
    }
  }

  return result;
}

/**
 * Transform IPFS hashes (or full URLs) into usable photo objects.
 */
function transformPhotos(photos: any, imageUrl?: string): Array<{ url: string; ipfsHash?: string }> {
  if (photos && Array.isArray(photos) && photos.length > 0) {
    return photos.map((hash: any) => {
      if (typeof hash === 'string' && hash.startsWith('http')) return { url: hash };
      if (typeof hash === 'object' && hash.url) return { url: hash.url, ipfsHash: hash.ipfsHash };
      return { url: `${IPFS_GATEWAY}${hash}`, ipfsHash: hash };
    });
  }
  if (imageUrl) return [{ url: imageUrl }];
  return [];
}

/**
 * Format a raw feed item for frontend consumption.
 * Handles four item types: recommendation, reshare, list, request.
 */
function formatFeedItem(item: any): any {
  try {
    // ── List ──
    if (item.type === 'list') {
      return {
        type: 'list',
        id: item.id,
        title: item.title,
        description: item.description || '',
        category: item.category || '',
        city: item.city || '',
        tags: item.tags || [],
        best_for: item.best_for || '',
        cover_image_url: item.cover_image_url || null,
        cover_image_source: item.cover_image_source || null,
        creator: {
          id: item.author_id,
          username: item.creator?.username || item.users?.username || 'Unknown User',
          display_name: item.creator?.display_name || item.users?.display_name || item.creator?.username || item.users?.username || 'Unknown User',
          avatar_url: item.creator?.avatar_url || item.users?.avatar_url || null
        },
        restaurants: (item.restaurants || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          cuisine_type: r.cuisine_type || 'Restaurant',
          location: r.location || '',
          image_url: r.image_url || null,
          average_rating: r.average_rating || 0
        })),
        restaurant_count: item.restaurants?.length || 0,
        created_at: item.created_at,
        like_count: item.like_count || 0,
        save_count: item.save_count || 0,
        is_liked: item.is_liked || false,
        is_saved: item.is_saved || false
      };
    }

    // ── Reshare ──
    if (item.type === 'reshare') {
      return {
        type: 'reshare',
        reshare_id: item.reshare_id,
        reshare_user_id: item.reshare_user_id,
        reshare_comment: item.reshare_comment,
        reshare_created_at: item.reshare_created_at,
        resharer: {
          id: item.resharer?.id || item.reshare_user_id,
          username: item.resharer?.username,
          display_name: item.resharer?.display_name || item.resharer?.username,
          avatar_url: item.resharer?.avatar_url,
          reputation_score: item.resharer?.reputation_score
        },
        id: item.id,
        title: item.title,
        content: item.description || item.content || '',
        overall_rating: item.overall_rating || item.rating || 0,
        location: {
          restaurant_id: item.restaurant_id,
          name: item.restaurants?.name || 'Unknown Restaurant',
          address: item.restaurants?.formatted_address || item.restaurants?.address || '',
          city: item.restaurants?.location_city || ''
        },
        author: {
          id: item.author_id || item.user_id,
          name: item.users?.display_name || item.users?.username || 'Unknown User',
          avatar: item.users?.avatar_url || '/default-avatar.png',
          reputation: item.users?.reputation_score || item.users?.trust_score || 5,
          isFollowing: false,
          socialDistance: 1
        },
        category: item.restaurants?.cuisine_type || item.category || '',
        photos: transformPhotos(item.photos, item.image_url),
        engagement: {
          saves: item.saves_count || 0,
          upvotes: item.likes_count || 0,
          comments: item.comments_count || 0,
          reshares: item.reshares_count || 0
        },
        createdAt: item.created_at,
        tags: item.context_tags || [],
        isBookmarked: item.is_saved || false,
        hasUpvoted: item.is_liked || false,
        hasReshared: item.has_reshared || false,
        aspects: item.restaurant_aspects?.[0] ? {
          ambiance: item.restaurant_aspects[0].ambiance,
          service: item.restaurant_aspects[0].service,
          value_for_money: item.restaurant_aspects[0].value_for_money,
          noise_level: item.restaurant_aspects[0].noise_level
        } : undefined,
        is_edited: item.is_edited || false,
        edited_at: item.edited_at || null
      };
    }

    // ── Discovery Request ──
    if (item.type === 'request') {
      return {
        type: 'request',
        id: item.id,
        title: item.title,
        description: item.description,
        location: item.location,
        cuisine_type: item.cuisine_type,
        occasion: item.occasion,
        budget_range: item.budget_range,
        dietary_restrictions: item.dietary_restrictions,
        bounty_amount: item.bounty_amount || 0,
        status: item.status || 'open',
        response_count: item.response_count || 0,
        view_count: item.view_count || 0,
        created_at: item.created_at,
        expires_at: item.expires_at,
        creator: item.creator ? {
          id: item.creator.id,
          username: item.creator.username,
          display_name: item.creator.display_name,
          avatar_url: item.creator.avatar_url,
          reputation_score: item.creator.reputation_score || 0
        } : null,
        source: item.source,
        trust_context: item.trust_context
      };
    }

    // ── Recommendation (default) ──
    if (item.type === 'recommendation' || !item.type) {
      return {
        type: 'recommendation',
        id: item.id,
        title: item.title,
        content: item.description || item.content || '',
        overall_rating: item.overall_rating || item.rating || 0,
        location: {
          restaurant_id: item.restaurant_id,
          name: item.restaurants?.name || 'Unknown Restaurant',
          address: item.restaurants?.formatted_address || item.restaurants?.address || '',
          city: item.restaurants?.location_city || ''
        },
        author: {
          id: item.author_id || item.user_id,
          name: item.users?.display_name || item.users?.username || 'Unknown User',
          avatar: item.users?.avatar_url || '/default-avatar.png',
          reputation: item.users?.reputation_score || item.users?.trust_score || 5,
          isFollowing: false,
          socialDistance: 1
        },
        category: item.restaurants?.cuisine_type || item.category || '',
        photos: transformPhotos(item.photos, item.image_url),
        engagement: {
          saves: item.saves_count || 0,
          upvotes: item.likes_count || 0,
          comments: item.comments_count || 0,
          reshares: item.reshares_count || 0
        },
        createdAt: item.created_at,
        tags: item.context_tags || [],
        isBookmarked: item.is_saved || false,
        hasUpvoted: item.is_liked || false,
        hasReshared: item.has_reshared || false,
        aspects: item.restaurant_aspects?.[0] ? {
          ambiance: item.restaurant_aspects[0].ambiance,
          service: item.restaurant_aspects[0].service,
          value_for_money: item.restaurant_aspects[0].value_for_money,
          noise_level: item.restaurant_aspects[0].noise_level
        } : undefined,
        is_edited: item.is_edited || false,
        edited_at: item.edited_at || null
      };
    }

    console.warn('⚠️ [Feed] Unknown item type:', item.type);
    return null;
  } catch (error) {
    console.error('❌ [Feed] Error formatting feed item:', error);
    console.error('   Item data:', JSON.stringify(item, null, 2));
    return null;
  }
}

// =============================================================================
// MAIN FEED ENDPOINT
// =============================================================================

router.get('/mixed', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    console.log(`🎯 [Feed] Generating mixed feed for user ${userId}`);

    // ── 1. Social graph ──
    const { data: followingData, error: followingError } = await supabase
      .from('social_connections')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('is_active', 'true');

    if (followingError) {
      console.error('[Feed] Error fetching following:', followingError);
      return res.status(500).json({ success: false, error: 'Failed to fetch social graph' });
    }

    const followingIds = followingData?.map(f => f.following_id) || [];
    console.log(`👥 [Feed] User follows ${followingIds.length} people`);

    // ── 2. Taste profile ──
    const { data: userRecommendations, error: userRecsError } = await supabase
      .from('recommendations')
      .select('restaurant_id, overall_rating, context_tags')
      .eq('author_id', userId)
      .limit(50);

    if (userRecsError) {
      console.error('[Feed] Error fetching user taste profile:', userRecsError);
    }

    // ── 3. Collect feed items from all sources ──
    const feedItems: any[] = [];
    const seenRecIds = new Set<string>();   // Dedup recommendations by ID
    const seenListIds = new Set<string>();  // Dedup lists by ID
    const seenReqIds = new Set<string>();   // Dedup discovery requests by ID

    // ─────────────────────────────────────────────────────────────────────────
    // SOURCE 0: OWN CONTENT (NEW)
    // The user's own recommendations, lists, requests, and reshares
    // appear in their feed so they can see their posts in context.
    // ─────────────────────────────────────────────────────────────────────────
    console.log('👤 [Feed] Fetching user\'s own content...');

    // 0A: Own Recommendations
    const { data: ownRecs, error: ownRecsError } = await supabase
      .from('recommendations')
      .select(`
        *,
        likes_count,
        saves_count,
        reshares_count,
        users:author_id(id, username, display_name, avatar_url, reputation_score),
        restaurants:restaurant_id(id, name, cuisine_type, address, formatted_address, category),
        restaurant_aspects(ambiance, service, value_for_money, noise_level)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!ownRecsError && ownRecs) {
      console.log(`  ✓ Own recommendations: ${ownRecs.length}`);
      ownRecs.forEach(item => {
        seenRecIds.add(item.id);
        feedItems.push({
          ...item,
          type: 'recommendation',
          source: 'own',
          trust_context: calculateTrustScore(item, userId, 1.0, 1.0, 1.0)
        });
      });
    }

    // 0B: Own Lists (include private — it's the user's own content)
    const { data: ownLists, error: ownListsError } = await supabase
      .from('food_guides')
      .select(`
        id, title, description, author_id, category, city, tags, best_for,
        likes_count, bookmarks_count, created_at, is_public,
        cover_image_url, cover_image_source,
        users!author_id(id, username, display_name, avatar_url, trust_score)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!ownListsError && ownLists && ownLists.length > 0) {
      console.log(`  ✓ Own lists: ${ownLists.length}`);

      for (const list of ownLists) {
        seenListIds.add(list.id);

        // Fetch restaurants for this list
        const { data: listItems, error: itemsError } = await supabase
          .from('guide_items')
          .select(`restaurant_id, restaurants(id, name, cuisine_type, address)`)
          .eq('list_id', list.id);

        const restaurants = (!itemsError && listItems)
          ? listItems.map(item => item.restaurants).filter(Boolean)
          : [];

        feedItems.push({
          ...list,
          type: 'list',
          source: 'own',
          creator: list.users,
          restaurants,
          restaurant_count: restaurants.length,
          like_count: list.likes_count || 0,
          save_count: list.bookmarks_count || 0,
          is_liked: false,
          is_saved: false,
          trust_context: calculateTrustScore(list, userId, 1.0, 1.0, 1.0)
        });
      }
    }

    // 0C: Own Discovery Requests (active only)
    const { data: ownRequests, error: ownRequestsError } = await supabase
      .from('discovery_requests')
      .select(`
        id, title, description, location, cuisine_type, occasion, budget_range,
        dietary_restrictions, bounty_amount, status, response_count, view_count,
        created_at, expires_at,
        creator:creator_id(id, username, display_name, avatar_url, reputation_score)
      `)
      .eq('creator_id', userId)
      .in('status', ['open', 'answered'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (!ownRequestsError && ownRequests && ownRequests.length > 0) {
      console.log(`  ✓ Own discovery requests: ${ownRequests.length}`);
      ownRequests.forEach(request => {
        seenReqIds.add(request.id);
        feedItems.push({
          ...request,
          type: 'request',
          source: 'own',
          trust_context: calculateTrustScore(request, userId, 1.0, 1.0, 1.0)
        });
      });
    }

    // 0D: Own Reshares
    const { data: ownReshares, error: ownResharesError } = await supabase
      .from('recommendation_reshares')
      .select(`
        id, user_id, recommendation_id, comment, created_at,
        resharer:user_id(id, username, display_name, avatar_url, reputation_score),
        recommendations:recommendation_id(
          *,
          likes_count, saves_count, reshares_count, comments_count,
          original_author:author_id(id, username, display_name, avatar_url, reputation_score),
          restaurants:restaurant_id(id, name, cuisine_type, address, formatted_address, category),
          restaurant_aspects(ambiance, service, value_for_money, noise_level)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!ownResharesError && ownReshares && ownReshares.length > 0) {
      console.log(`  ✓ Own reshares: ${ownReshares.length}`);
      ownReshares.forEach(reshare => {
        if (reshare.recommendations) {
          seenRecIds.add(reshare.recommendations.id);
          feedItems.push({
            type: 'reshare',
            source: 'own',
            reshare_id: reshare.id,
            reshare_user_id: reshare.user_id,
            reshare_comment: reshare.comment,
            reshare_created_at: reshare.created_at,
            resharer: reshare.resharer,
            ...reshare.recommendations,
            users: reshare.recommendations.original_author,
            trust_context: calculateTrustScore(reshare.recommendations, userId, 1.0, 1.0, 1.0)
          });
        }
      });
    }

    console.log(`👤 [Feed] Own content total: ${feedItems.length} items`);

    // ─────────────────────────────────────────────────────────────────────────
    // SOURCE 1: Following Feed — Original Recommendations (35% weight)
    // ─────────────────────────────────────────────────────────────────────────
    if (followingIds.length > 0) {
      const { data: followingContent, error: followingContentError } = await supabase
        .from('recommendations')
        .select(`
          *,
          likes_count,
          saves_count,
          reshares_count,
          users:author_id(id, username, display_name, avatar_url, reputation_score),
          restaurants:restaurant_id(id, name, cuisine_type, address, formatted_address, category),
          restaurant_aspects(ambiance, service, value_for_money, noise_level)
        `)
        .in('author_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (followingContent && followingContent.length > 0) {
        console.log('🔍 [Feed] RAW QUERY KEYS:', Object.keys(followingContent[0]));
      }

      console.log('[Feed] Following recommendations:', {
        error: followingContentError,
        count: followingContent?.length
      });

      if (!followingContentError && followingContent) {
        followingContent.forEach(item => {
          if (!seenRecIds.has(item.id)) {
            seenRecIds.add(item.id);
            feedItems.push({
              ...item,
              type: 'recommendation',
              source: 'following',
              trust_context: calculateTrustScore(item, userId, 0.8, 0.7, 0.6)
            });
          }
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SOURCE 1B: Reshares from Following (20% weight)
    // ─────────────────────────────────────────────────────────────────────────
    if (followingIds.length > 0) {
      console.log('🔄 [Feed] Fetching reshares from followed users...');

      const { data: resharesData, error: resharesError } = await supabase
        .from('recommendation_reshares')
        .select(`
          id, user_id, recommendation_id, comment, created_at,
          resharer:user_id(id, username, display_name, avatar_url, reputation_score),
          recommendations:recommendation_id(
            *,
            likes_count, saves_count, reshares_count, comments_count,
            original_author:author_id(id, username, display_name, avatar_url, reputation_score),
            restaurants:restaurant_id(id, name, cuisine_type, address, formatted_address, category),
            restaurant_aspects(ambiance, service, value_for_money, noise_level)
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(15);

      console.log('[Feed] Reshares result:', { error: resharesError, count: resharesData?.length });

      if (!resharesError && resharesData && resharesData.length > 0) {
        console.log(`✅ [Feed] Found ${resharesData.length} reshares from followed users`);

        resharesData.forEach(reshare => {
          if (reshare.recommendations && !seenRecIds.has(reshare.recommendations.id)) {
            seenRecIds.add(reshare.recommendations.id);
            feedItems.push({
              type: 'reshare',
              source: 'following',
              reshare_id: reshare.id,
              reshare_user_id: reshare.user_id,
              reshare_comment: reshare.comment,
              reshare_created_at: reshare.created_at,
              resharer: reshare.resharer,
              ...reshare.recommendations,
              users: reshare.recommendations.original_author,
              trust_context: calculateTrustScore(reshare.recommendations, userId, 0.8, 0.7, 0.6)
            });
            console.log(`  ✓ Added reshare by ${reshare.resharer?.username || 'unknown'}`);
          }
        });
      } else {
        console.log('ℹ️ [Feed] No reshares found from followed users');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SOURCE 1C: Discovery Requests from Following (5% weight)
    // ─────────────────────────────────────────────────────────────────────────
    if (followingIds.length > 0) {
      console.log('❓ [Feed] Fetching discovery requests from followed users...');

      const { data: requestsData, error: requestsError } = await supabase
        .from('discovery_requests')
        .select(`
          id, title, description, location, cuisine_type, occasion, budget_range,
          dietary_restrictions, bounty_amount, status, response_count, view_count,
          created_at, expires_at,
          creator:creator_id(id, username, display_name, avatar_url, reputation_score)
        `)
        .in('creator_id', followingIds)
        .in('status', ['open', 'answered'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (!requestsError && requestsData && requestsData.length > 0) {
        console.log(`✅ [Feed] Found ${requestsData.length} requests from followed users`);
        requestsData.forEach(request => {
          if (!seenReqIds.has(request.id)) {
            seenReqIds.add(request.id);
            feedItems.push({
              ...request,
              type: 'request',
              source: 'following',
              trust_context: calculateTrustScore(request, userId, 0.8, 0.5, 0.6)
            });
          }
        });
      } else {
        console.log('ℹ️ [Feed] No discovery requests found from followed users');
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SOURCE 2: Taste Similarity (25% weight)
    // ─────────────────────────────────────────────────────────────────────────
    if (userRecommendations && userRecommendations.length > 0) {
      const userCuisinePrefs = extractCuisinePreferences(userRecommendations);

      const { data: similarContent, error: similarContentError } = await supabase
        .from('recommendations')
        .select(`
          id, title, description, overall_rating, created_at, context_tags,
          likes_count, saves_count, reshares_count,
          author_id, restaurant_id,
          users!recommendations_author_id_fkey(id, username, display_name, avatar_url, trust_score),
          restaurants(id, name, cuisine_type, location_city, location_address, image_url),
          restaurant_aspects(ambiance, service, value_for_money, noise_level),
          recommendation_interactions(count)
        `)
        .not('author_id', 'eq', userId)
        .not('author_id', 'in', `(${followingIds.join(',')})`)
        .in('restaurants.cuisine_type', userCuisinePrefs)
        .gte('overall_rating', 7)
        .order('created_at', { ascending: false })
        .limit(15);

      if (!similarContentError && similarContent) {
        similarContent.forEach(item => {
          if (!seenRecIds.has(item.id)) {
            seenRecIds.add(item.id);
            feedItems.push({
              ...item,
              type: 'recommendation',
              source: 'taste_similarity',
              trust_context: calculateTrustScore(item, userId, 0.3, 0.9, 0.8)
            });
          }
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SOURCE 3: Trending Content (15% weight)
    // ─────────────────────────────────────────────────────────────────────────
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: trendingContent, error: trendingError } = await supabase
      .from('recommendations')
      .select(`
        id, title, description, overall_rating, created_at, context_tags,
        likes_count, saves_count, reshares_count,
        author_id, restaurant_id,
        users!recommendations_author_id_fkey(id, username, display_name, avatar_url, trust_score),
        restaurants(id, name, cuisine_type, location_city, location_address, image_url),
        restaurant_aspects(ambiance, service, value_for_money, noise_level),
        recommendation_interactions(count)
      `)
      .gte('created_at', oneDayAgo)
      .gte('overall_rating', 8)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!trendingError && trendingContent) {
      trendingContent.forEach(item => {
        if (!seenRecIds.has(item.id)) {
          seenRecIds.add(item.id);
          feedItems.push({
            ...item,
            type: 'recommendation',
            source: 'trending',
            trust_context: calculateTrustScore(item, userId, 0.5, 0.6, 0.9)
          });
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SOURCE 4: Lists from Following (5% weight)
    // ─────────────────────────────────────────────────────────────────────────
    if (followingIds.length > 0) {
      console.log('📋 [Feed] Fetching lists from followed users...');

      const { data: listsData, error: listsError } = await supabase
        .from('food_guides')
        .select(`
          id, title, description, author_id, category, city, tags, best_for,
          likes_count, bookmarks_count, created_at, is_public,
          cover_image_url, cover_image_source,
          users!author_id(id, username, display_name, avatar_url, trust_score)
        `)
        .in('author_id', followingIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('📋 [Feed] Lists result:', { error: listsError, count: listsData?.length });

      if (!listsError && listsData && listsData.length > 0) {
        console.log(`✅ [Feed] Found ${listsData.length} lists from followed users`);

        for (const list of listsData) {
          if (seenListIds.has(list.id)) continue;
          seenListIds.add(list.id);

          const { data: listItems, error: itemsError } = await supabase
            .from('guide_items')
            .select(`restaurant_id, restaurants(id, name, cuisine_type, address)`)
            .eq('list_id', list.id);

          const restaurants = (!itemsError && listItems)
            ? listItems.map(item => item.restaurants).filter(Boolean)
            : [];

          feedItems.push({
            ...list,
            type: 'list',
            source: 'following',
            creator: list.users,
            restaurants,
            restaurant_count: restaurants.length,
            like_count: list.likes_count || 0,
            save_count: list.bookmarks_count || 0,
            is_liked: false,
            is_saved: false,
            trust_context: calculateTrustScore(list, userId, 0.8, 0.5, 0.6)
          });

          console.log(`  ✓ Added list "${list.title}" with ${restaurants.length} restaurants`);
        }
      }
    }

    // ── 4. Separate primary from discovery content ──
    // Primary = own + following (sorted by recency)
    // Discovery = taste similarity + trending (sorted by trust score)
    const primaryContent = feedItems.filter(item => item.source === 'following' || item.source === 'own');
    const discoveryContent = feedItems.filter(item => item.source !== 'following' && item.source !== 'own');

    console.log(`📊 [Feed] Composition: ${primaryContent.length} primary (own+following), ${discoveryContent.length} discovery`);

    // Sort primary by recency (reshares use reshare time)
    primaryContent.sort((a, b) => {
      const aTime = a.type === 'reshare' ? a.reshare_created_at : a.created_at;
      const bTime = b.type === 'reshare' ? b.reshare_created_at : b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    // Sort discovery by trust score, tiebreaker: recency
    discoveryContent.sort((a, b) => {
      const trustDiff = b.trust_context.overall_trust_score - a.trust_context.overall_trust_score;
      if (Math.abs(trustDiff) > 0.1) return trustDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Interleave: ~75% primary, ~25% discovery
    const rankedFeed = interleaveFeed(primaryContent, discoveryContent, 0.75, 40);

    const ownCount = rankedFeed.filter(i => i.source === 'own').length;
    const followingCount = rankedFeed.filter(i => i.source === 'following').length;
    const discoveryCount = rankedFeed.filter(i => i.source !== 'following' && i.source !== 'own').length;
    console.log(`📱 [Feed] Final feed: ${rankedFeed.length} items (${ownCount} own, ${followingCount} following, ${discoveryCount} discovery)`);

    // ── 5. Get user's interaction status ──
    const { data: statusData } = await supabase
      .from('recommendation_likes')
      .select('recommendation_id')
      .eq('user_id', userId);

    const { data: bookmarkData } = await supabase
      .from('recommendation_bookmarks')
      .select('recommendation_id')
      .eq('user_id', userId);

    const { data: reshareData } = await supabase
      .from('recommendation_reshares')
      .select('recommendation_id')
      .eq('user_id', userId);

    const likedIds = new Set((statusData || []).map(l => l.recommendation_id));
    const bookmarkedIds = new Set((bookmarkData || []).map(b => b.recommendation_id));
    const resharedIds = new Set((reshareData || []).map(r => r.recommendation_id));

    console.log(`✅ [Feed] User has ${likedIds.size} likes, ${bookmarkedIds.size} bookmarks, ${resharedIds.size} reshares`);

    // ── 6. Format for frontend ──
    const formattedFeed = rankedFeed.map(item => {
      const formatted = formatFeedItem(item);
      if (formatted && (formatted.type === 'recommendation' || formatted.type === 'reshare')) {
        const recId = formatted.id;
        formatted.hasUpvoted = likedIds.has(recId);
        formatted.isBookmarked = bookmarkedIds.has(recId);
        formatted.hasReshared = resharedIds.has(recId);
      }
      return formatted;
    }).filter(Boolean);

    console.log(`📱 [Feed] Generated ${formattedFeed.length} formatted items`);
    console.log('📊 [Feed] Breakdown:', {
      recommendations: formattedFeed.filter(item => item.type === 'recommendation').length,
      reshares: formattedFeed.filter(item => item.type === 'reshare').length,
      lists: formattedFeed.filter(item => item.type === 'list').length,
      requests: formattedFeed.filter(item => item.type === 'request').length
    });

    if (formattedFeed.length > 0) {
      console.log('🔍 [Feed] First item:', JSON.stringify(formattedFeed[0], null, 2));
    }

    res.json({
      success: true,
      feed: formattedFeed,
      metadata: {
        total_items: formattedFeed.length,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Feed] Generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate feed'
    });
  }
});

// =============================================================================
// FEED INTERACTION ENDPOINTS
// =============================================================================

// POST /items/:itemId/like — Toggle like from feed card
router.post('/items/:itemId/like', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { data: existingLike, error: checkError } = await supabase
      .from('recommendation_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('recommendation_id', itemId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Feed] Error checking existing like:', checkError);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('recommendation_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('[Feed] Error removing like:', deleteError);
        return res.status(500).json({ success: false, error: 'Failed to unlike' });
      }

      const { data: recommendation } = await supabase
        .from('recommendations')
        .select('likes_count')
        .eq('id', itemId)
        .single();

      const newCount = Math.max(0, (recommendation?.likes_count || 0) - 1);

      await supabase
        .from('recommendations')
        .update({ likes_count: newCount })
        .eq('id', itemId);

      console.log(`💔 [Feed] Unliked, new count: ${newCount}`);
      res.json({ success: true, action: 'unliked', is_liked: false, newCount });

    } else {
      // Like
      const { error: insertError } = await supabase
        .from('recommendation_likes')
        .insert({
          user_id: userId,
          recommendation_id: itemId,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('[Feed] Error adding like:', insertError);
        return res.status(500).json({ success: false, error: 'Failed to like' });
      }

      const { data: recommendation } = await supabase
        .from('recommendations')
        .select('likes_count')
        .eq('id', itemId)
        .single();

      const newCount = (recommendation?.likes_count || 0) + 1;

      await supabase
        .from('recommendations')
        .update({ likes_count: newCount })
        .eq('id', itemId);

      console.log(`❤️ [Feed] Liked, new count: ${newCount}`);
      res.json({ success: true, action: 'liked', is_liked: true, newCount });
    }

  } catch (error) {
    console.error('❌ [Feed] Like error:', error);
    res.status(500).json({ success: false, error: 'Failed to process like' });
  }
});

// POST /items/:itemId/save — Toggle save/bookmark from feed card
router.post('/items/:itemId/save', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { data: existingSave, error: checkError } = await supabase
      .from('recommendation_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('recommendation_id', itemId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Feed] Error checking existing save:', checkError);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (existingSave) {
      // Unsave
      const { error: deleteError } = await supabase
        .from('recommendation_bookmarks')
        .delete()
        .eq('id', existingSave.id);

      if (deleteError) {
        console.error('[Feed] Error removing save:', deleteError);
        return res.status(500).json({ success: false, error: 'Failed to unsave' });
      }

      const { data: recommendation } = await supabase
        .from('recommendations')
        .select('saves_count')
        .eq('id', itemId)
        .single();

      const newCount = Math.max(0, (recommendation?.saves_count || 0) - 1);

      await supabase
        .from('recommendations')
        .update({ saves_count: newCount })
        .eq('id', itemId);

      console.log(`📑 [Feed] Unsaved, new count: ${newCount}`);
      res.json({ success: true, action: 'unsaved', is_saved: false, newCount });

    } else {
      // Save
      const { error: insertError } = await supabase
        .from('recommendation_bookmarks')
        .insert({
          user_id: userId,
          recommendation_id: itemId,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('[Feed] Error adding save:', insertError);
        return res.status(500).json({ success: false, error: 'Failed to save' });
      }

      const { data: recommendation } = await supabase
        .from('recommendations')
        .select('saves_count')
        .eq('id', itemId)
        .single();

      const newCount = (recommendation?.saves_count || 0) + 1;

      await supabase
        .from('recommendations')
        .update({ saves_count: newCount })
        .eq('id', itemId);

      console.log(`🔖 [Feed] Saved, new count: ${newCount}`);
      res.json({ success: true, action: 'saved', is_saved: true, newCount });
    }

  } catch (error) {
    console.error('❌ [Feed] Save error:', error);
    res.status(500).json({ success: false, error: 'Failed to process save' });
  }
});

// =============================================================================
// EXPORT
// =============================================================================

export default router;