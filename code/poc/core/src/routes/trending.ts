// File: code/poc/core/src/routes/trending.ts
// Unified Trending Endpoint - Returns mixed content (recommendations, guides, requests)
// sorted by engagement metrics
//
// Returns mixed content types based on engagement:
//   - Recommendations: sorted by likes + comments
//   - Guides/Lists: sorted by likes + saves
//   - Discovery Requests: sorted by responses + bounty amount
//
// Engagement Scoring:
//   - Recommendations: likes + (comments × 2)
//   - Guides: likes + (saves × 2)
//   - Requests: bounty_amount + (responses × 3)

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration for trending routes');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// TYPES
// =============================================================================

interface TrendingItem {
  id: string;
  type: 'recommendation' | 'guide' | 'request';
  title: string;
  subtitle?: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  engagement: {
    likes?: number;
    comments?: number;
    responses?: number;
    saves?: number;
    views?: number;
  };
  created_at: string;
  restaurant_name?: string;
  location?: string;
  restaurant_count?: number;
  has_bounty?: boolean;
  bounty_amount?: number;
  _score?: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    address?: string;
    email?: string;
    accountTier?: string;
    authMethod?: string;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getTimeframeDate = (timeframe: string): Date => {
  const days: Record<string, number> = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  
  const date = new Date();
  date.setDate(date.getDate() - (days[timeframe] || 7));
  return date;
};

// =============================================================================
// ROUTES
// =============================================================================

// GET /api/trending
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      limit = '5', 
      types = 'all',
      timeframe = '7d' 
    } = req.query as { limit?: string; types?: string; timeframe?: string };

    const itemLimit = Math.min(parseInt(limit) || 5, 20);
    const dateThreshold = getTimeframeDate(timeframe);

    const allowedTypes = types === 'all' 
      ? ['recommendation', 'guide', 'request']
      : types.split(',').filter(t => ['recommendation', 'guide', 'request'].includes(t));

    const results: TrendingItem[] = [];

    // -------------------------------------------------------------------------
    // Fetch trending recommendations
    // -------------------------------------------------------------------------
    if (allowedTypes.includes('recommendation')) {
      try {
        const { data: recommendations, error: recError } = await supabase
          .from('recommendations')
          .select(`
            id,
            title,
            created_at,
            likes_count,
            comments_count,
            author_id,
            restaurant_id,
            restaurants (
              id,
              name
            ),
            users!recommendations_author_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .gte('created_at', dateThreshold.toISOString())
          .order('likes_count', { ascending: false })
          .limit(itemLimit);

        if (recError) {
          console.error('[Trending] Error fetching recommendations:', recError);
        } else if (recommendations) {
          recommendations.forEach((rec: any) => {
            const likesCount = rec.likes_count || 0;
            const commentsCount = rec.comments_count || 0;
            const engagementScore = likesCount + (commentsCount * 2);

            results.push({
              id: rec.id,
              type: 'recommendation',
              title: rec.title,
              subtitle: rec.restaurants?.name || undefined,
              author: {
                id: rec.users?.id || rec.author_id,
                username: rec.users?.username || 'user',
                display_name: rec.users?.display_name || rec.users?.username || 'User',
                avatar_url: rec.users?.avatar_url || null
              },
              engagement: {
                likes: likesCount,
                comments: commentsCount
              },
              created_at: rec.created_at,
              restaurant_name: rec.restaurants?.name || undefined,
              _score: engagementScore
            });
          });
          console.log(`[Trending] Fetched ${recommendations.length} recommendations`);
        }
      } catch (err) {
        console.error('[Trending] Error fetching recommendations:', err);
      }
    }

    // -------------------------------------------------------------------------
    // Fetch trending guides/lists
    // -------------------------------------------------------------------------
    if (allowedTypes.includes('guide')) {
      try {
        const { data: lists, error: listError } = await supabase
          .from('lists')
          .select(`
            id,
            title,
            created_at,
            likes_count,
            saves_count,
            restaurant_count,
            created_by,
            is_public,
            users!lists_created_by_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .gte('created_at', dateThreshold.toISOString())
          .or('is_public.eq.true,is_public.is.null')
          .order('likes_count', { ascending: false })
          .limit(itemLimit);

        if (listError) {
          console.error('[Trending] Error fetching lists:', listError);
        } else if (lists) {
          lists.forEach((list: any) => {
            const likesCount = list.likes_count || 0;
            const savesCount = list.saves_count || 0;
            const engagementScore = likesCount + (savesCount * 2);

            results.push({
              id: list.id,
              type: 'guide',
              title: list.title,
              subtitle: `${list.restaurant_count || 0} places`,
              author: {
                id: list.users?.id || list.created_by,
                username: list.users?.username || 'user',
                display_name: list.users?.display_name || list.users?.username || 'User',
                avatar_url: list.users?.avatar_url || null
              },
              engagement: {
                likes: likesCount,
                saves: savesCount
              },
              created_at: list.created_at,
              restaurant_count: list.restaurant_count || 0,
              _score: engagementScore
            });
          });
          console.log(`[Trending] Fetched ${lists.length} guides`);
        }
      } catch (err) {
        console.error('[Trending] Error fetching guides:', err);
      }
    }

    // -------------------------------------------------------------------------
    // Fetch trending discovery requests
    // -------------------------------------------------------------------------
    if (allowedTypes.includes('request')) {
      try {
        const { data: requests, error: reqError } = await supabase
          .from('discovery_requests')
          .select(`
            id,
            title,
            created_at,
            location,
            bounty_amount,
            stake_amount,
            status,
            response_count,
            creator_id,
            users!discovery_requests_creator_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .gte('created_at', dateThreshold.toISOString())
          .eq('status', 'open')
          .order('bounty_amount', { ascending: false, nullsFirst: false })
          .limit(itemLimit);

        if (reqError) {
          console.error('[Trending] Error fetching requests:', reqError);
        } else if (requests) {
          requests.forEach((req: any) => {
            const bountyAmount = req.bounty_amount || req.stake_amount || 0;
            const responseCount = req.response_count || 0;
            const engagementScore = bountyAmount + (responseCount * 3);

            results.push({
              id: req.id,
              type: 'request',
              title: req.title,
              subtitle: req.location || undefined,
              author: {
                id: req.users?.id || req.creator_id,
                username: req.users?.username || 'user',
                display_name: req.users?.display_name || req.users?.username || 'User',
                avatar_url: req.users?.avatar_url || null
              },
              engagement: {
                responses: responseCount
              },
              created_at: req.created_at,
              location: req.location,
              has_bounty: bountyAmount > 0,
              bounty_amount: bountyAmount,
              _score: engagementScore
            });
          });
          console.log(`[Trending] Fetched ${requests.length} requests`);
        }
      } catch (err) {
        console.error('[Trending] Error fetching requests:', err);
      }
    }

    // -------------------------------------------------------------------------
    // Sort all results by engagement score, then by recency
    // -------------------------------------------------------------------------
    results.sort((a, b) => {
      const aScore = a._score || 0;
      const bScore = b._score || 0;
      
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Remove internal _score and take top items
    const finalItems = results.slice(0, itemLimit).map(item => {
      const { _score, ...rest } = item;
      return rest;
    });

    console.log(`[Trending] Returning ${finalItems.length} items (from ${results.length} total)`);

    res.json({
      success: true,
      items: finalItems,
      meta: {
        total: results.length,
        returned: finalItems.length,
        timeframe
      }
    });

  } catch (error) {
    console.error('[Trending] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending content'
    });
  }
});

export default router;