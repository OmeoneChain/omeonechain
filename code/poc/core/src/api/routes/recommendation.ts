// File: code/poc/core/src/api/routes/recommendation.ts
// White Paper v1.02 Token Rewards - Two-Tier Integration
// 
// REWARD STRUCTURE (White Paper v1.02):
// - Create recommendation (wallet tier): 5.0 BOCA → on-chain mint
// - Create recommendation (email tier):  2.5 BOCA → pending_tokens
// - Receive like:                         1.0 BOCA base × engager tier weight
// - Receive save/bookmark:                1.0 BOCA base × engager tier weight
//
// NOTE: Validation bonus (+10.0 BOCA at 3.0 engagement points) handled separately
// NOTE: First reviewer bonus (+10.0 BOCA) handled by database trigger
//
// UPDATED: January 6, 2025 - Integrated rewardService for two-tier token distribution

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { RecommendationEngine } from '../../recommendation/engine';
import { AdapterFactory, AdapterType } from '../../adapters/adapter-factory';
import { IPFSStorageProvider } from '../../storage/ipfs-storage';
import { authenticateToken } from '../../middleware/auth';

// NEW: Import reward service for two-tier token distribution
import { getRewardService, RewardResult, UserAuthTier } from '../../services/reward-service';

/**
 * Update engagement points on a recommendation and check for validation bonus
 * White Paper v1.02: +10.0 BOCA when recommendation reaches 3.0 engagement points
 */
async function updateEngagementPoints(
  recommendationId: string, 
  engagerId: string, 
  actionType: 'like' | 'save' | 'comment'
): Promise<void> {
  try {
    // Get engager's tier weight
    const { data: engager } = await supabase
      .from('users')
      .select('reputation_tier')
      .eq('id', engagerId)
      .single();
    
    const tierWeights: Record<string, number> = {
      'new': 0.5,
      'established': 1.0,
      'trusted': 1.5
    };
    const tierWeight = tierWeights[engager?.reputation_tier || 'established'] || 1.0;
    
    // Calculate points based on action type
    const basePoints: Record<string, number> = {
      'like': 1.0,
      'save': 1.0,
      'comment': 0.5
    };
    const pointsToAdd = basePoints[actionType] * tierWeight;
    
    // Get current recommendation state
    const { data: rec } = await supabase
      .from('recommendations')
      .select('engagement_points, validation_bonus_awarded, author_id')
      .eq('id', recommendationId)
      .single();
    
    if (!rec) return;
    
    const currentPoints = rec.engagement_points || 0;
    const newPoints = currentPoints + pointsToAdd;
    
    // Update engagement points
    await supabase
      .from('recommendations')
      .update({ engagement_points: newPoints })
      .eq('id', recommendationId);
    
    console.log(`📊 Engagement points: ${currentPoints.toFixed(2)} → ${newPoints.toFixed(2)} (+${pointsToAdd.toFixed(2)} from ${actionType})`);
    
    // Check if validation bonus threshold reached (3.0 points)
    if (newPoints >= 3.0 && !rec.validation_bonus_awarded) {
      console.log(`🎯 [VALIDATION] Recommendation reached 3.0 points! Awarding +10.0 BOCA bonus...`);
      
      try {
        const validationResult = await rewardService.awardValidationBonus(
          rec.author_id,
          recommendationId
        );
        
        if (validationResult.success) {
          // Mark as awarded to prevent double-awarding
          await supabase
            .from('recommendations')
            .update({
              validation_bonus_awarded: true,
              validation_bonus_awarded_at: new Date().toISOString()
            })
            .eq('id', recommendationId);
          
          console.log(`✅ [VALIDATION] Bonus awarded: ${validationResult.displayAmount} BOCA`);
          if (validationResult.txDigest) {
            console.log(`   TX: ${validationResult.txDigest}`);
          }
        } else {
          console.error(`❌ [VALIDATION] Bonus failed: ${validationResult.error}`);
        }
      } catch (validationError) {
        console.error('❌ [VALIDATION] Exception:', validationError);
      }
    }
  } catch (error) {
    console.error('⚠️ Error updating engagement points:', error);
  }
}

const router = Router();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// NEW: Initialize reward service singleton
const rewardService = getRewardService();

// =============================================================================
// WHITE PAPER v1.02 TOKEN REWARD CONSTANTS (for reference/logging)
// =============================================================================

/** Flat reward for creating a recommendation (wallet-tier users) */
const CREATION_REWARD_WALLET = 5.0;

/** Flat reward for creating a recommendation (email-tier users) */
const CREATION_REWARD_EMAIL = 2.5;

/** Base reward when someone likes your recommendation */
const LIKE_REWARD_BASE = 1.0;

/** Base reward when someone saves/bookmarks your recommendation */
const SAVE_REWARD_BASE = 1.0;

/** Tier multipliers for engagement rewards */
const TIER_MULTIPLIERS: Record<string, number> = {
  'new': 0.5,
  'established': 1.0,
  'trusted': 1.5
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Dish {
  name: string;
  rating: number;
  notes?: string;
  would_order_again?: boolean;
  estimated_price?: number;
  dietary_tags?: string[];
}

interface RestaurantAspects {
  ambiance: number;
  service: number;
  value_for_money: number;
  noise_level?: string;
  wait_time_minutes?: number;
}

interface ContextualFactors {
  occasion: string;
  party_size: number;
  time_of_visit?: string;
  meal_type?: string;
  day_of_week?: string;
  total_spent?: number;
  visit_duration_minutes?: number;
}

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

interface PhotoTag {
  cid: string;
  tag: string;  // 'skip' | 'vibe' | 'menu' | 'drink' | 'other' | 'dish:{id}'
  description?: string;
}

interface EnhancedRecommendationSubmission {
  restaurantName: string;
  restaurantAddress?: string;
  latitude?: number;
  longitude?: number;
  overall_rating: number;
  dishes?: Dish[];
  aspects?: RestaurantAspects;
  context?: ContextualFactors;
  title: string;
  content: string;
  category: string;
  photos?: string[];
  photo_tagging?: PhotoTag[]; 
  tags?: string[];
  context_tags?: string[];
  cuisine_type?: string;
}

let recommendationEngine: RecommendationEngine | null = null;

async function getRecommendationEngine(): Promise<RecommendationEngine> {
  if (!recommendationEngine) {
    try {
      const factory = AdapterFactory.getInstance();
      const adapter = factory.createAdapterSimple(AdapterType.REBASED, {
        useProductionAdapter: true
      });
      const storage = new IPFSStorageProvider();
      recommendationEngine = new RecommendationEngine(adapter, storage);
      await recommendationEngine.initialize();
      console.log('✅ RecommendationEngine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RecommendationEngine:', error);
      throw new Error('Failed to initialize blockchain engine');
    }
  }
  return recommendationEngine;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function calculateTrustScore(
  supabase: any, 
  recommendationId: string, 
  userId?: string
): Promise<number> {
  try {
    const { data: recommendation } = await supabase
      .from('recommendations')
      .select('trust_score, likes_count, saves_count, author_id')
      .eq('id', recommendationId)
      .single();

    if (!recommendation) return 0;

    let trustScore = recommendation.trust_score || 0;

    if (userId && userId !== recommendation.author_id) {
      const { data: socialConnections } = await supabase
        .from('social_connections')
        .select('trust_weight, connection_type')
        .eq('follower_id', userId)
        .eq('following_id', recommendation.author_id)
        .eq('is_active', true);

      if (socialConnections && socialConnections.length > 0) {
        const connection = socialConnections[0];
        trustScore = trustScore * (connection.trust_weight || 0.75) * 0.3;
      }

      if (!socialConnections || socialConnections.length === 0) {
        const { data: friendOfFriend } = await supabase
          .from('social_connections')
          .select(`
            following:social_connections!following_id (
              following_id,
              trust_weight
            )
          `)
          .eq('follower_id', userId)
          .eq('is_active', true);

        if (friendOfFriend && friendOfFriend.length > 0) {
          trustScore = trustScore * 0.25 * 0.3;
        }
      }
    }

    const engagementBoost = Math.min(0.2, (recommendation.likes_count * 0.1 + recommendation.saves_count * 0.05));
    trustScore = Math.min(1.0, trustScore + engagementBoost);

    return Math.round(trustScore * 1000) / 1000;
  } catch (error) {
    console.error('Error calculating trust score:', error);
    return 0;
  }
}

async function calculateAverageRestaurantTrustScore(supabase: any, restaurantId: number): Promise<number> {
  try {
    const { data } = await supabase
      .from('recommendations')
      .select('trust_score')
      .eq('restaurant_id', restaurantId)
      .eq('verification_status', 'verified');

    if (!data || data.length === 0) return 0;

    const average = data.reduce((sum: number, rec: any) => sum + (rec.trust_score || 0), 0) / data.length;
    return Math.round(average * 1000) / 1000;
  } catch (error) {
    console.error('Error calculating average trust score:', error);
    return 0;
  }
}

/**
 * 🎯 Calculate and update user's reputation tier
 */
async function updateUserReputationTier(userId: string): Promise<'new' | 'established' | 'trusted'> {
  // Fetch user stats
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('created_at, spam_flags')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    console.warn('⚠️ Could not fetch user for tier calculation:', userError);
    return 'new'; // Default to 'new' if error
  }

  // Calculate account age in days
  const accountAge = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Count validated recommendations (3+ engagement points)
  const { data: validatedRecs } = await supabase
    .from('recommendations')
    .select('id, likes_count, saves_count')
    .eq('author_id', userId);

  let validatedCount = 0;
  if (validatedRecs) {
    validatedCount = validatedRecs.filter(rec => {
      const engagementPoints = (rec.likes_count || 0) + (rec.saves_count || 0);
      return engagementPoints >= 3;
    }).length;
  }

  // Check for spam flags
  const hasSpamFlags = (user.spam_flags || 0) > 0;

  // Determine tier (White Paper v1.02 simplified tiers)
  let tier: 'new' | 'established' | 'trusted' = 'new';

  if (hasSpamFlags) {
    tier = 'new'; // Spam flags = always 'new'
  } else if (accountAge >= 30 && validatedCount >= 3) {
    tier = 'trusted';
  } else if (accountAge >= 7) {
    tier = 'established';
  } else {
    tier = 'new';
  }

  // Update user's reputation_tier in database
  const { error: updateError } = await supabase
    .from('users')
    .update({ reputation_tier: tier })
    .eq('id', userId);

  if (updateError) {
    console.error('❌ Failed to update reputation tier:', updateError);
  } else {
    console.log(`🎯 Updated user ${userId} tier: ${tier} (age: ${accountAge}d, validated recs: ${validatedCount})`);
  }

  return tier;
}

/**
 * 💰 Get expected creation reward based on account tier (for logging/response)
 */
function getExpectedCreationReward(accountTier: string): number {
  if (accountTier === 'wallet_full') {
    return CREATION_REWARD_WALLET;
  } else {
    return CREATION_REWARD_EMAIL;
  }
}

/**
 * 💰 Get tier multiplier for engagement rewards (for logging/response)
 */
function getTierMultiplier(reputationTier: string): number {
  return TIER_MULTIPLIERS[reputationTier] || TIER_MULTIPLIERS['established'];
}

// =============================================================================
// CRUD ENDPOINTS
// =============================================================================

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    const {
      title,
      content,
      category,
      restaurantName,
      restaurantAddress,
      latitude,
      longitude,
      overall_rating,
      dishes = [],
      aspects,
      context,
      photos = [],
      photo_tagging = [],
      tags = [],
      context_tags = [],
      cuisine_type
    } = req.body as EnhancedRecommendationSubmission;

    // -------------------------------
    // Normalize optional fields safely
    // -------------------------------
    const safeTitle = typeof title === 'string' ? title.trim() : '';
    const safeContent = typeof content === 'string' ? content.trim() : '';
    const safeCategory = typeof category === 'string' ? category.trim() : '';
    const safeRestaurantName = typeof restaurantName === 'string' ? restaurantName.trim() : '';

    const finalTitle =
      safeTitle.length > 0 ? safeTitle : `Recommendation for ${safeRestaurantName || 'restaurant'}`;

    // If you truly want to allow empty content, keep as ''.
    // (But your UI/backend currently still expects 10+ chars sometimes; see note below.)
    const finalContent = safeContent;

    const finalCategory = safeCategory.length > 0 ? safeCategory : 'restaurant';

    const authorId = req.user!.id;
    const authorName = req.user!.display_name || req.user!.username || 'User';
    const accountTier = (req.user!.accountTier || 'email_basic') as UserAuthTier;

    console.log('🔵 Creating Trust Score 2.0 recommendation:', {
      title,
      restaurantName,
      overall_rating,
      dishCount: dishes.length,
      hasAspects: !!aspects,
      hasContext: !!context,
      authorId,
      accountTier
    });

    // Validation - Basic fields
    if (title != null && title !== '') {
      if (typeof title !== 'string' || title.trim().length < 3 || title.length > 200) {
        return res.status(400).json({
          error: 'Title must be between 3 and 200 characters (if provided)'
        });
      }
    }

    if (!restaurantName || typeof restaurantName !== 'string') {
      return res.status(400).json({
        error: 'Restaurant name is required'
      });
    }

    // Validation - Trust Score 2.0 fields
    if (overall_rating !== undefined) {
      if (typeof overall_rating !== 'number' || overall_rating < 0 || overall_rating > 10) {
        return res.status(400).json({
          error: 'overall_rating must be a number between 0 and 10'
        });
      }
    }

    if (dishes && !Array.isArray(dishes)) {
      return res.status(400).json({
        error: 'dishes must be an array'
      });
    }

    for (const dish of dishes) {
      if (!dish.name || typeof dish.name !== 'string') {
        return res.status(400).json({
          error: 'Each dish must have a name'
        });
      }
      if (typeof dish.rating !== 'number' || dish.rating < 0 || dish.rating > 10) {
        return res.status(400).json({
          error: 'Each dish rating must be between 0 and 10'
        });
      }
    }

    if (aspects) {
      const { ambiance, service, value_for_money } = aspects;
      if (ambiance !== undefined && (typeof ambiance !== 'number' || ambiance < 0 || ambiance > 10)) {
        return res.status(400).json({ error: 'ambiance must be between 0 and 10' });
      }
      if (service !== undefined && (typeof service !== 'number' || service < 0 || service > 10)) {
        return res.status(400).json({ error: 'service must be between 0 and 10' });
      }
      if (value_for_money !== undefined && (typeof value_for_money !== 'number' || value_for_money < 0 || value_for_money > 10)) {
        return res.status(400).json({ error: 'value_for_money must be between 0 and 10' });
      }
    }

    if (context) {
      if (!context.occasion || typeof context.occasion !== 'string') {
        return res.status(400).json({ error: 'context.occasion is required when providing context' });
      }
      if (typeof context.party_size !== 'number' || context.party_size < 1) {
        return res.status(400).json({ error: 'context.party_size must be a positive number' });
      }
    }

    console.log('✅ Validation passed');

    // Step 1: Verify authenticated user exists
    console.log('🔵 Verifying user:', authorId);
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authorId)
      .single();

    let user;
    if (!existingUser) {
      console.log('🔵 Creating user record...');
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: authorId,
          wallet_address: req.user!.address,
          display_name: authorName,
          username: req.user!.username || authorName.toLowerCase().replace(/\s+/g, '_'),
          location_city: 'Brasília',
          verification_status: req.user!.verification_status || 'basic',
          account_tier: accountTier
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ Error creating user:', userError);
        return res.status(500).json({
          error: 'Failed to create user record: ' + userError.message
        });
      }
      user = newUser;
      console.log('✅ Created user');
    } else {
      user = existingUser;
      console.log('✅ Found user');
    }

    // Step 2: Find or create restaurant
    console.log('🔍 Searching for restaurant:', restaurantName);
    
    const { data: existingRestaurants, error: searchError } = await supabase
      .rpc('find_restaurants_by_name_and_location', {
        restaurant_name: restaurantName,
        lat: latitude || null,
        lng: longitude || null,
        radius_meters: 100
      });

    if (searchError) {
      console.error('❌ Restaurant search failed:', searchError);
      return res.status(500).json({
        error: 'Failed to search restaurants: ' + searchError.message
      });
    }

    let restaurantId: number;
    let restaurant;

    if (existingRestaurants && existingRestaurants.length > 0) {
      restaurantId = existingRestaurants[0].id;
      console.log(`🏪 Found existing restaurant: ID ${restaurantId}`);
      
      const { data: existingRestaurant, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();
        
      if (fetchError) {
        console.error('❌ Error fetching restaurant:', fetchError);
        return res.status(500).json({
          error: 'Failed to fetch restaurant: ' + fetchError.message
        });
      }
      restaurant = existingRestaurant;
    } else {
      console.log('🏪 Creating new restaurant');
      const { data: newRestaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: restaurantName,
          address: restaurantAddress || 'Address not provided',
          city: 'Brasília',
          latitude: latitude || null,
          longitude: longitude || null,
          category: category,
          cuisine_type: cuisine_type || category,
          created_by: user.id,
          verification_status: 'unverified'
        })
        .select()
        .single();

      if (restaurantError) {
        console.error('❌ Error creating restaurant:', restaurantError);
        return res.status(500).json({
          error: 'Failed to create restaurant: ' + restaurantError.message
        });
      }
      
      restaurantId = newRestaurant.id;
      restaurant = newRestaurant;
      console.log(`✅ Restaurant created: ID ${restaurantId}`);
    }

    // Step 3: Calculate expected token reward (for response/logging)
    const userAccountTier = (user.account_tier || accountTier) as UserAuthTier;
    const expectedTokenReward = getExpectedCreationReward(userAccountTier);

    // Step 4: Submit to blockchain (optional)
    console.log('🔗 Submitting to blockchain...');
    let blockchainRecommendation;
    
    try {
      const engine = await getRecommendationEngine();
      
      const recommendationData = {
        serviceId: restaurant.id.toString(),
        category: finalCategory,
        location: {
          latitude: latitude || 0,
          longitude: longitude || 0,
          address: restaurantAddress,
          city: 'Brasília'
        },
        rating: overall_rating || 7,
        content: {
          title: finalTitle,
          body: finalContent,
          media: photos.map(photo => ({
            type: 'image' as const,
            url: photo,
            description: ''
          }))
        },
        tags: tags || []
      };
      
      blockchainRecommendation = await engine.submitRecommendation(user.id, recommendationData);
      console.log('✅ Blockchain submission successful');
      
    } catch (blockchainError) {
      console.error('⚠️ Blockchain submission failed:', blockchainError);
      blockchainRecommendation = null;
    }

    // Step 5: Create recommendation in database
    console.log('🔵 Creating recommendation in database...');
    
    const { data: recommendation, error: recommendationError } = await supabase
      .from('recommendations')
      .insert({
        restaurant_id: restaurant.id,
        author_id: user.id,
        title: finalTitle,
        content: finalContent,
        category: finalCategory,
        overall_rating: overall_rating,
        cuisine_type: cuisine_type || finalCategory,
        photos: photos,
        tags: tags,
        context_tags: context_tags,
        trust_score: blockchainRecommendation ? 0.25 : 0.15,
        base_reward: expectedTokenReward,
        location_data: {
          address: restaurantAddress,
          coordinates: latitude && longitude ? { lat: latitude, lng: longitude } : null
        },
        verification_status: blockchainRecommendation ? 'blockchain_verified' : 'unverified',
        verified_visit: blockchainRecommendation ? true : false,
        visit_date: context?.time_of_visit ? new Date(context.time_of_visit).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        blockchain_tx_id: blockchainRecommendation?.tangle?.objectId || null,
        content_hash: blockchainRecommendation?.contentHash || null,
        blockchain_status: blockchainRecommendation ? 'confirmed' : 'pending'
      })
      .select()
      .single();

    if (recommendationError) {
      console.error('❌ Error creating recommendation:', recommendationError);
      return res.status(500).json({
        error: 'Failed to create recommendation: ' + recommendationError.message
      });
    }

    console.log('✅ Recommendation created:', recommendation.id);

    // Step 5b: Increment user's recommendation count
    const { error: countUpdateError } = await supabase
      .from('users')
      .update({ total_recommendations: (user.total_recommendations || 0) + 1 })
      .eq('id', user.id);

    if (countUpdateError) {
      console.error('⚠️ Error updating recommendation count:', countUpdateError);
    } else {
      console.log('✅ User recommendation count updated');
    }

    // Step 6: Insert dishes (if provided)
    if (dishes && dishes.length > 0) {
      console.log(`🍽️ Creating ${dishes.length} dishes...`);
      
      const dishInserts = dishes.map(dish => ({
        recommendation_id: recommendation.id,
        name: dish.name,
        rating: dish.rating,
        notes: dish.notes || null,
        would_order_again: dish.would_order_again !== undefined ? dish.would_order_again : true,
        estimated_price: dish.estimated_price || null,
        dietary_tags: dish.dietary_tags || null
      }));

      const { error: dishError } = await supabase
        .from('dishes')
        .insert(dishInserts);

      if (dishError) {
        console.error('⚠️ Error inserting dishes:', dishError);
      } else {
        console.log('✅ Dishes created');
      }
    }

    // Step 6b: Insert photos into restaurant_photos table
    if (photo_tagging && photo_tagging.length > 0) {
      console.log(`📷 Creating ${photo_tagging.length} photo records...`);
      console.log(`📷 Photo tagging payload:`, JSON.stringify(photo_tagging, null, 2));
  
      const photoInserts = photo_tagging.map(pt => {
        let tagType = 'other';  // Default for untagged/skipped photos
        let dishName: string | null = null;
        
        // Handle 'skip' - still save the photo, just as 'other' type
        if (pt.tag === 'skip' || !pt.tag) {
          tagType = 'other';
          console.log(`📷 Photo untagged, saving as "other"`);
        }
        // Handle dish tags - check for both formats
        else if (pt.tag === 'dish' && (pt as any).dish_name) {
          tagType = 'dish';
          dishName = (pt as any).dish_name;
          console.log(`📷 Photo tagged as dish: "${dishName}"`);
        } else if (pt.tag.startsWith('dish:')) {
          tagType = 'dish';
          const dishId = pt.tag.replace('dish:', '');
          const dish = dishes?.find((d: any) => 
            d.id === dishId || d.name === dishId
          );
          dishName = dish?.name || pt.description || dishId;
          console.log(`📷 Photo tagged as dish (legacy format): "${dishName}"`);
        } else if (['vibe', 'menu', 'drink', 'food', 'other'].includes(pt.tag)) {
          tagType = pt.tag;
          console.log(`📷 Photo tagged as category: "${tagType}"`);
        } else {
          console.log(`📷 Photo has unknown tag "${pt.tag}", defaulting to "other"`);
        }
    
        return {
          restaurant_id: restaurant.id,
          recommendation_id: recommendation.id,
          user_id: user.id,
          ipfs_hash: pt.cid,
          tag_type: tagType,
          dish_name: dishName,
          caption: pt.description || (pt as any).other || null
        };
      });

      console.log(`📷 Inserting ${photoInserts.length} photos`);

      if (photoInserts.length > 0) {
        const { data: insertedPhotos, error: photoError } = await supabase
          .from('restaurant_photos')
          .insert(photoInserts)
          .select();

        if (photoError) {
          console.error('⚠️ Error inserting photos:', photoError);
          console.error('⚠️ Photo inserts that failed:', JSON.stringify(photoInserts, null, 2));
        } else {
          console.log(`✅ ${insertedPhotos?.length || photoInserts.length} photos created in restaurant_photos`);
        }
      }
    }
  
    // Step 7: Insert restaurant aspects (if provided)
    if (aspects) {
      console.log('🏢 Creating restaurant aspects...');
      
      const { error: aspectsError } = await supabase
        .from('restaurant_aspects')
        .insert({
          recommendation_id: recommendation.id,
          ambiance: aspects.ambiance,
          service: aspects.service,
          value_for_money: aspects.value_for_money,
          noise_level: aspects.noise_level || null,
          wait_time_minutes: aspects.wait_time_minutes || null
        });

      if (aspectsError) {
        console.error('⚠️ Error inserting aspects:', aspectsError);
      } else {
        console.log('✅ Aspects created');
      }
    }

    // Step 8: Insert contextual factors (if provided)
    if (context) {
      console.log('📅 Creating contextual factors...');
      
      const { error: contextError } = await supabase
        .from('contextual_factors')
        .insert({
          recommendation_id: recommendation.id,
          occasion: context.occasion,
          party_size: context.party_size,
          time_of_visit: context.time_of_visit ? new Date(context.time_of_visit).toISOString() : null,
          meal_type: context.meal_type || null,
          day_of_week: context.day_of_week || null,
          total_spent: context.total_spent || null,
          visit_duration_minutes: context.visit_duration_minutes || null
        });

      if (contextError) {
        console.error('⚠️ Error inserting context:', contextError);
      } else {
        console.log('✅ Context created');
      }
    }

    // =========================================================================
    // Step 9: Award tokens via TWO-TIER REWARD SERVICE (NEW INTEGRATION)
    // =========================================================================
    console.log(`💰 [TWO-TIER] Awarding recommendation reward to user ${user.id}...`);
    console.log(`💰 [TWO-TIER] Account tier: ${userAccountTier}, Expected: ${expectedTokenReward} BOCA`);
    
    let rewardResult: RewardResult;
    let firstReviewerResult: RewardResult | null = null;
    
    try {
      rewardResult = await rewardService.awardRecommendation(
        user.id,
        recommendation.id,
        userAccountTier
      );
      
      if (rewardResult.success) {
        console.log(`✅ [TWO-TIER] Reward successful!`);
        console.log(`   Method: ${rewardResult.method}`);
        console.log(`   Amount: ${rewardResult.displayAmount} BOCA`);
        if (rewardResult.txDigest) {
          console.log(`   TX Digest: ${rewardResult.txDigest}`);
        }
        if (rewardResult.pendingRewardId) {
          console.log(`   Pending ID: ${rewardResult.pendingRewardId}`);
        }
        console.log(`   New Balance: ${rewardResult.newBalance?.toFixed(2)} BOCA`);
      } else {
        console.error(`❌ [TWO-TIER] Reward failed: ${rewardResult.error}`);
      }
      
      // =========================================================================
      // Step 9b: Check for FIRST REVIEWER BONUS (+10.0 BOCA)
      // =========================================================================
      // Check if this is the first recommendation for this restaurant
      const { count: existingRecommendationCount, error: countError } = await supabase
        .from('recommendations')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id);
      
      // If count is 1, this IS the first recommendation (the one we just created)
      const isFirstReviewer = !countError && existingRecommendationCount === 1;
      
      if (isFirstReviewer) {
        console.log(`🏆 [FIRST REVIEWER] This is the first review for restaurant ${restaurant.name}!`);
        console.log(`🏆 [FIRST REVIEWER] Awarding +10.0 BOCA first reviewer bonus...`);
        
        try {
          firstReviewerResult = await rewardService.awardFirstReviewer(
            user.id,
            restaurant.id,
            recommendation.id
          );
          
          if (firstReviewerResult.success) {
            console.log(`✅ [FIRST REVIEWER] Bonus awarded successfully!`);
            console.log(`   Method: ${firstReviewerResult.method}`);
            console.log(`   Amount: ${firstReviewerResult.displayAmount} BOCA`);
            if (firstReviewerResult.txDigest) {
              console.log(`   TX Digest: ${firstReviewerResult.txDigest}`);
            }
            console.log(`   New Balance: ${firstReviewerResult.newBalance?.toFixed(2)} BOCA`);
            
            // Optionally update restaurant to track first reviewer
            await supabase
              .from('restaurants')
              .update({ first_reviewer_id: user.id })
              .eq('id', restaurant.id);
          } else {
            console.error(`❌ [FIRST REVIEWER] Bonus failed: ${firstReviewerResult.error}`);
          }
        } catch (firstReviewerError) {
          console.error('❌ [FIRST REVIEWER] Exception:', firstReviewerError);
        }
      }
      
    } catch (rewardError) {
      console.error('❌ [TWO-TIER] Exception during reward:', rewardError);
      rewardResult = {
        success: false,
        action: userAccountTier === 'wallet_full' ? 'recommendation' : 'recommendation_email',
        amount: 0,
        displayAmount: 0,
        method: 'pending',
        error: rewardError instanceof Error ? rewardError.message : 'Unknown error'
      };
    }

    // Step 10: Update user reputation tier
    await updateUserReputationTier(user.id);

    // Step 11: Update restaurant metrics
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        total_recommendations: (restaurant.total_recommendations || 0) + 1,
        average_overall_rating: overall_rating
      })
      .eq('id', restaurant.id);

    if (updateError) {
      console.warn('⚠️ Failed to update restaurant metrics:', updateError);
    }

    // Fetch complete recommendation with all relationships
    const { data: completeRecommendation } = await supabase
      .from('recommendations')
      .select(`
        *,
        restaurants!inner(name, address, category, latitude, longitude),
        users!inner(display_name, username, wallet_address),
        dishes(*),
        restaurant_aspects(*),
        contextual_factors(*)
      `)
      .eq('id', recommendation.id)
      .single();

    // Fetch updated user for response
    const { data: updatedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('✅ Trust Score 2.0 recommendation complete!');

    // Calculate total reward (base + first reviewer bonus if applicable)
    const totalRewardAmount = rewardResult.displayAmount + (firstReviewerResult?.displayAmount || 0);
    const finalBalance = firstReviewerResult?.newBalance || rewardResult.newBalance;

    return res.json({
      success: true,
      recommendation: completeRecommendation || recommendation,
      restaurant,
      user: updatedUser || user,
      tokens_earned: totalRewardAmount,
      reward_info: {
        amount: rewardResult.displayAmount,
        account_tier: userAccountTier,
        method: rewardResult.method,              // 'on_chain' or 'pending'
        tx_digest: rewardResult.txDigest || null, // Only for wallet users
        pending_id: rewardResult.pendingRewardId || null, // Only for email users
        new_balance: finalBalance,
        success: rewardResult.success,
        error: rewardResult.error || null,
        // First reviewer bonus info (if applicable)
        first_reviewer_bonus: firstReviewerResult ? {
          awarded: firstReviewerResult.success,
          amount: firstReviewerResult.displayAmount,
          method: firstReviewerResult.method,
          tx_digest: firstReviewerResult.txDigest || null,
        } : null
      },
      trustScore2_0: {
        dishCount: dishes.length,
        hasAspects: !!aspects,
        hasContext: !!context,
        overallRating: overall_rating
      },
      blockchain: blockchainRecommendation ? {
        id: blockchainRecommendation.id,
        txId: blockchainRecommendation.tangle?.objectId,
        contentHash: blockchainRecommendation.contentHash,
        trustScore: blockchainRecommendation.trust_score || 0.25
      } : null,
      message: rewardResult.success 
        ? firstReviewerResult?.success
          ? `Recommendation created! Earned ${totalRewardAmount.toFixed(1)} BOCA (${rewardResult.displayAmount.toFixed(1)} base + ${firstReviewerResult.displayAmount.toFixed(1)} first reviewer bonus).`
          : `Recommendation created! Earned ${rewardResult.displayAmount.toFixed(1)} BOCA (${rewardResult.method === 'on_chain' ? 'minted on-chain' : 'pending claim'}).`
        : `Recommendation created! Token reward pending.`
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Extract query parameters
    const author = req.query.author as string;
    const category = req.query.category as string;
    const restaurantId = req.query.restaurantId as string;
    const cuisine = req.query.cuisine as string;
    const occasion = req.query.occasion as string;
    const minRating = req.query.minRating as string;
    const minTrustScore = req.query.minTrustScore as string;
    const nearLat = req.query.nearLat as string;
    const nearLng = req.query.nearLng as string;
    const nearRadius = req.query.nearRadius as string;
    const hasDishes = req.query.hasDishes === 'true';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const limit = Math.min(100, parseInt((req.query.limit as string) || '20', 10));
    const sort = (req.query.sort as string) || 'created_at';
    const direction = req.query.direction === 'asc' ? 'asc' : 'desc';
    const userId = req.query.userId as string;
    const search = req.query.q as string;

    console.log('📋 Fetching recommendations with filters:', {
      category, cuisine, occasion, hasDishes, limit, offset
    });

    // GET /status - Get user's like/bookmark status for all recommendations
    router.get('/status', authenticateToken, async (req: Request, res: Response) => {
      try {
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
        const userId = req.user!.id;

        console.log('📊 Fetching recommendation interaction status for user:', userId);

        // Fetch user's likes
        const { data: likes, error: likesError } = await supabase
          .from('recommendation_likes')
          .select('recommendation_id')
          .eq('user_id', userId);

        if (likesError) {
          console.error('❌ Error fetching likes:', likesError);
          return res.status(500).json({
            error: 'Failed to fetch likes: ' + likesError.message
          });
        }

        // Fetch user's bookmarks
        const { data: bookmarks, error: bookmarksError } = await supabase
          .from('recommendation_bookmarks')
          .select('recommendation_id')
          .eq('user_id', userId);

        if (bookmarksError) {
          console.error('❌ Error fetching bookmarks:', bookmarksError);
          return res.status(500).json({
            error: 'Failed to fetch bookmarks: ' + bookmarksError.message
          });
        }

        const likedIds = likes?.map(l => l.recommendation_id) || [];
        const bookmarkedIds = bookmarks?.map(b => b.recommendation_id) || [];

        console.log(`✅ Status fetched: ${likedIds.length} likes, ${bookmarkedIds.length} bookmarks`);

        return res.json({
          success: true,
          liked: likedIds,
          bookmarked: bookmarkedIds
        });

      } catch (error) {
        console.error('❌ Status endpoint error:', error);
        return res.status(500).json({
          error: 'Internal server error: ' + (error as Error).message
        });
      }
    });

    // Build query with Trust Score 2.0 relationships
    let query = supabase
      .from('recommendations')
      .select(`
        *,
        restaurants!inner(
          id, name, address, category, cuisine_type, latitude, longitude,
          average_overall_rating, total_recommendations
        ),
        users!inner(
          id, display_name, username, wallet_address,
          reputation_score, verification_level
        ),
        dishes(id, name, rating, notes, would_order_again, dietary_tags),
        restaurant_aspects(ambiance, service, value_for_money, noise_level),
        contextual_factors(occasion, party_size, meal_type, day_of_week, total_spent)
      `, { count: 'exact' });

    // Apply filters
    if (author) {
      query = query.eq('author_id', author);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (cuisine) {
      query = query.eq('cuisine_type', cuisine);
    }

    if (restaurantId) {
      const numRestaurantId = parseInt(restaurantId, 10);
      if (!isNaN(numRestaurantId)) {
        query = query.eq('restaurant_id', numRestaurantId);
      }
    }

    if (minRating) {
      const minScore = parseFloat(minRating);
      query = query.gte('overall_rating', minScore);
    }

    if (minTrustScore) {
      const minScore = Math.max(0, Math.min(1, parseFloat(minTrustScore)));
      query = query.gte('trust_score', minScore);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', new Date(endDate).toISOString());
    }

    if (search && search.trim().length >= 2) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Apply sorting
    if (sort === 'trust_score') {
      query = query.order('trust_score', { ascending: direction === 'asc' });
    } else if (sort === 'overall_rating') {
      query = query.order('overall_rating', { ascending: direction === 'asc' });
    } else if (sort === 'created_at') {
      query = query.order('created_at', { ascending: direction === 'asc' });
    } else if (sort === 'likes_count') {
      query = query.order('likes_count', { ascending: direction === 'asc' });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: recommendations, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching recommendations:', error);
      return res.status(500).json({
        error: 'Failed to fetch recommendations: ' + error.message
      });
    }

    // Filter by dishes if requested
    let filteredRecommendations = recommendations || [];
    if (hasDishes) {
      filteredRecommendations = filteredRecommendations.filter(rec => 
        rec.dishes && rec.dishes.length > 0
      );
    }

    // Filter by occasion if provided
    if (occasion) {
      filteredRecommendations = filteredRecommendations.filter(rec =>
        rec.contextual_factors?.[0]?.occasion === occasion
      );
    }

    // Calculate personalized Trust Scores and enrich data
    const enhancedRecommendations = await Promise.all(
      filteredRecommendations.map(async (rec) => {
        const personalizedTrustScore = userId 
          ? await calculateTrustScore(supabase, rec.id, userId)
          : rec.trust_score;

        // Calculate distance if location provided
        let distance = null;
        if (nearLat && nearLng && rec.restaurants.latitude && rec.restaurants.longitude) {
          distance = calculateDistance(
            parseFloat(nearLat),
            parseFloat(nearLng),
            rec.restaurants.latitude,
            rec.restaurants.longitude
          );
        }

        // Calculate average dish rating
        const avgDishRating = rec.dishes && rec.dishes.length > 0
          ? rec.dishes.reduce((sum: number, dish: any) => sum + dish.rating, 0) / rec.dishes.length
          : null;

        return {
          ...rec,
          personalizedTrustScore,
          distance,
          engagementScore: (rec.likes_count * 0.7) + (rec.saves_count * 0.3),
          isRecent: new Date(rec.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          isBlockchainVerified: !!rec.blockchain_tx_id,
          blockchainStatus: rec.blockchain_status || 'none',
          hasDishData: rec.dishes && rec.dishes.length > 0,
          dishCount: rec.dishes?.length || 0,
          avgDishRating,
          hasAspects: !!rec.restaurant_aspects?.[0],
          hasContext: !!rec.contextual_factors?.[0],
          occasion: rec.contextual_factors?.[0]?.occasion || null
        };
      })
    );

    // Apply location filter if provided
    if (nearLat && nearLng && nearRadius) {
      const maxDistance = Math.max(0.1, Math.min(100, parseFloat(nearRadius)));
      enhancedRecommendations.filter(rec => 
        rec.distance === null || rec.distance <= maxDistance
      );
    }

    console.log(`✅ Fetched ${enhancedRecommendations.length} recommendations`);

    return res.json({
      success: true,
      recommendations: enhancedRecommendations,
      total: count || enhancedRecommendations.length,
      pagination: {
        offset,
        limit,
        hasMore: enhancedRecommendations.length === limit
      },
      filters: {
        category,
        cuisine,
        occasion,
        hasDishes,
        minRating,
        minTrustScore,
        search,
        nearLocation: nearLat && nearLng ? { 
          lat: nearLat, 
          lng: nearLng, 
          radius: nearRadius 
        } : null
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { id } = req.params;
    const userId = req.query.userId as string;

    const { data: recommendation, error } = await supabase
      .from('recommendations')
      .select(`
        *,
        restaurants!inner(*),
        users!recommendations_author_id_fkey(id, username, display_name, avatar_url, trust_score),
        dishes(*),
        restaurant_aspects(*),
        contextual_factors(*),
        restaurant_photos!recommendation_id (
          id,
          ipfs_hash,
          tag_type,
          dish_name,
          caption,
          helpful_count
        )
      `)
      .eq('id', id)
      .single();

    if (error || !recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found'
      });
    }

    // Calculate personalized trust score
    const personalizedTrustScore = userId
      ? await calculateTrustScore(supabase, id, userId)
      : recommendation.trust_score;

    // Calculate average dish rating
    const avgDishRating = recommendation.dishes && recommendation.dishes.length > 0
      ? recommendation.dishes.reduce((sum: number, dish: any) => sum + dish.rating, 0) / recommendation.dishes.length
      : null;

    return res.json({
      success: true,
      recommendation: {
        ...recommendation,
        // Map Supabase join names to what frontend expects
        author: recommendation.users,
        restaurant: recommendation.restaurants,
        personalizedTrustScore,
        avgDishRating,
        hasDishData: recommendation.dishes && recommendation.dishes.length > 0,
        dishCount: recommendation.dishes?.length || 0,
        hasAspects: !!recommendation.restaurant_aspects?.[0],
        hasContext: !!recommendation.contextual_factors?.[0]
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.status(501).json({
      error: 'Update functionality not yet implemented for Trust Score 2.0'
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// =============================================================================
// PATCH /:id — Edit a recommendation (ADD THIS AFTER THE router.put STUB)
// =============================================================================
// - Author-only (must own the recommendation)
// - 15-minute grace period: edits within 15 min are silent (no "edited" flag)
// - After 15 min: sets is_edited = true, edited_at = NOW()
// - Restaurant is LOCKED (cannot be changed)
// - If already hashed on-chain, edit is database-only (original hash preserved)

router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { id } = req.params;
    const userId = req.user!.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    console.log(`✏️ PATCH /api/recommendations/${id} by user ${userId}`);

    // 1. Fetch existing recommendation and verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('recommendations')
      .select('id, author_id, created_at, restaurant_id, blockchain_status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }

    if (existing.author_id !== userId) {
      return res.status(403).json({ success: false, error: 'You can only edit your own recommendations' });
    }

    // 2. Determine if we're within the 15-minute grace period
    const createdAt = new Date(existing.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const withinGracePeriod = minutesSinceCreation <= 15;

    console.log(`⏱️ Minutes since creation: ${minutesSinceCreation.toFixed(1)}, grace period: ${withinGracePeriod}`);

    // 3. Extract fields from request body (restaurant_id intentionally excluded — locked)
    const {
      title,
      content,
      category,
      overall_rating,
      context_tags,
      cuisine_type,
      dishes,
      aspects,
      context,
      photos,         // Array of IPFS CIDs (final state after add/remove/re-crop)
      photo_tagging,  // Updated tagging info
    } = req.body;

    // 4. Build the update payload — only include fields that were explicitly sent
    const updatePayload: Record<string, any> = {
      updated_at: now.toISOString(),
    };

    if (title !== undefined) updatePayload.title = title;
    if (content !== undefined) updatePayload.content = content;
    if (category !== undefined) updatePayload.category = category;
    if (overall_rating !== undefined) updatePayload.overall_rating = overall_rating;
    if (context_tags !== undefined) updatePayload.context_tags = context_tags;
    if (cuisine_type !== undefined) updatePayload.cuisine_type = cuisine_type;
    if (photos !== undefined) updatePayload.photos = photos;

    // 5. Set the edited flag if outside grace period
    if (!withinGracePeriod) {
      updatePayload.is_edited = true;
      updatePayload.edited_at = now.toISOString();
    }

    // 6. If already hashed on-chain, note it was edited post-hash (database-only edit)
    if (existing.blockchain_status === 'confirmed' && !withinGracePeriod) {
      console.log(`⚠️ Recommendation ${id} was already hashed on-chain. Edit is database-only.`);
      updatePayload.post_hash_edit = true;
    }

    // 7. Update the recommendation row
    const { data: updated, error: updateError } = await supabase
      .from('recommendations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update recommendation:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update recommendation' });
    }

    // 8. Update dishes (if provided) — delete-and-reinsert pattern
    if (dishes !== undefined) {
      // Delete existing dishes
      const { error: deleteDisheError } = await supabase
        .from('dishes')
        .delete()
        .eq('recommendation_id', id);

      if (deleteDisheError) {
        console.warn('⚠️ Failed to delete existing dishes:', deleteDisheError);
      }

      // Insert updated dishes
      if (Array.isArray(dishes) && dishes.length > 0) {
        const dishInserts = dishes.map((dish: any) => ({
          recommendation_id: id,
          name: dish.name,
          rating: dish.rating,
          notes: dish.notes || null,
          would_order_again: dish.would_order_again !== undefined ? dish.would_order_again : true,
          estimated_price: dish.estimated_price || null,
          dietary_tags: dish.dietary_tags || null,
        }));

        const { error: dishError } = await supabase
          .from('dishes')
          .insert(dishInserts);

        if (dishError) {
          console.warn('⚠️ Failed to insert updated dishes:', dishError);
        } else {
          console.log(`✅ Updated ${dishInserts.length} dishes`);
        }
      }
    }

    // 9. Update aspects (if provided) — upsert pattern
    if (aspects !== undefined) {
      const { error: aspectError } = await supabase
        .from('restaurant_aspects')
        .upsert({
          recommendation_id: id,
          ambiance: aspects.ambiance,
          service: aspects.service,
          value_for_money: aspects.value_for_money,
          noise_level: aspects.noise_level || null,
          wait_time_minutes: aspects.wait_time_minutes || null,
        }, {
          onConflict: 'recommendation_id'
        });

      if (aspectError) {
        console.warn('⚠️ Failed to update aspects:', aspectError);
      } else {
        console.log('✅ Updated aspects');
      }
    }

    // 10. Update context (if provided) — upsert pattern
    if (context !== undefined) {
      const { error: contextError } = await supabase
        .from('contextual_factors')
        .upsert({
          recommendation_id: id,
          occasion: context.occasion,
          party_size: context.party_size,
          time_of_visit: context.time_of_visit ? new Date(context.time_of_visit).toISOString() : null,
          meal_type: context.meal_type || null,
          day_of_week: context.day_of_week || null,
          total_spent: context.total_spent || null,
          visit_duration_minutes: context.visit_duration_minutes || null,
        }, {
          onConflict: 'recommendation_id'
        });

      if (contextError) {
        console.warn('⚠️ Failed to update context:', contextError);
      } else {
        console.log('✅ Updated context');
      }
    }

    // 11. Update photo tagging (if provided) — delete-and-reinsert for this recommendation
    if (photo_tagging !== undefined && Array.isArray(photo_tagging) && photo_tagging.length > 0) {
      // Delete existing photo records for this recommendation
      const { error: deletePhotoError } = await supabase
        .from('restaurant_photos')
        .delete()
        .eq('recommendation_id', id);

      if (deletePhotoError) {
        console.warn('⚠️ Failed to delete existing photos:', deletePhotoError);
      }

      // Insert updated photo records
      const photoInserts = photo_tagging.map((pt: any) => {
        let tagType = 'other';
        let dishName: string | null = null;

        if (pt.tag === 'skip' || !pt.tag) {
          tagType = 'other';
        } else if (pt.tag === 'dish' && pt.dish_name) {
          tagType = 'dish';
          dishName = pt.dish_name;
        } else if (pt.tag.startsWith('dish:')) {
          tagType = 'dish';
          const dishId = pt.tag.replace('dish:', '');
          const dish = dishes?.find((d: any) => d.id === dishId || d.name === dishId);
          dishName = dish?.name || pt.description || dishId;
        } else if (['vibe', 'menu', 'drink', 'food', 'other'].includes(pt.tag)) {
          tagType = pt.tag;
        }

        return {
          restaurant_id: existing.restaurant_id,
          recommendation_id: id,
          user_id: userId,
          ipfs_hash: pt.cid,
          tag_type: tagType,
          dish_name: dishName,
          caption: pt.description || pt.other || null,
        };
      });

      if (photoInserts.length > 0) {
        const { error: photoError } = await supabase
          .from('restaurant_photos')
          .insert(photoInserts);

        if (photoError) {
          console.warn('⚠️ Failed to insert updated photos:', photoError);
        } else {
          console.log(`✅ Updated ${photoInserts.length} photo records`);
        }
      }
    }

    console.log(`✅ Recommendation ${id} updated successfully (grace period: ${withinGracePeriod}, edited flag: ${!withinGracePeriod})`);

    res.json({
      success: true,
      recommendation: updated,
      within_grace_period: withinGracePeriod,
      is_edited: !withinGracePeriod,
    });

  } catch (error) {
    console.error('❌ Edit recommendation error:', error);
    res.status(500).json({ success: false, error: 'Failed to edit recommendation' });
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.status(501).json({
      error: 'Delete functionality not yet implemented'
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// =============================================================================
// INTERACTION ENDPOINTS (LIKE/BOOKMARK WITH TWO-TIER TOKEN REWARDS)
// =============================================================================



// POST /:id/like - Toggle like on a recommendation (WITH TWO-TIER TOKEN REWARDS)
router.post('/:id/like', authenticateToken, async (req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const recommendationId = req.params.id;
    const userId = req.user!.id;

    console.log('❤️ Toggling like:', { recommendationId, userId });

    // Check if recommendation exists and get author
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('id, likes_count, author_id')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found'
      });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('recommendation_likes')
      .select('id')
      .eq('recommendation_id', recommendationId)
      .eq('user_id', userId)
      .single();

    let action: 'liked' | 'unliked';
    let newCount: number;
    let rewardResult: RewardResult | null = null;

    if (existingLike) {
      // Unlike: Remove the like
      const { error: deleteError } = await supabase
        .from('recommendation_likes')
        .delete()
        .eq('recommendation_id', recommendationId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('❌ Error removing like:', deleteError);
        return res.status(500).json({
          error: 'Failed to unlike: ' + deleteError.message
        });
      }

      // Decrement count
      newCount = Math.max(0, (recommendation.likes_count || 0) - 1);
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ likes_count: newCount })
        .eq('id', recommendationId);

      if (updateError) {
        console.warn('⚠️ Failed to update like count:', updateError);
      }

      action = 'unliked';
      console.log(`💔 Unliked recommendation, new count: ${newCount}`);

    } else {
      // Like: Add new like
      const { error: insertError } = await supabase
        .from('recommendation_likes')
        .insert({
          recommendation_id: recommendationId,
          user_id: userId
        });

      if (insertError) {
        console.error('❌ Error adding like:', insertError);
        return res.status(500).json({
          error: 'Failed to like: ' + insertError.message
        });
      }

      // Increment count
      newCount = (recommendation.likes_count || 0) + 1;
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ likes_count: newCount })
        .eq('id', recommendationId);

      if (updateError) {
        console.warn('⚠️ Failed to update like count:', updateError);
      }

      // =========================================================================
      // 💰 Award tokens to recommendation author via TWO-TIER REWARD SERVICE
      // =========================================================================
      if (recommendation.author_id !== userId) {
        console.log(`💰 [TWO-TIER] Awarding like reward to author ${recommendation.author_id}...`);
        
        try {
          rewardResult = await rewardService.awardUpvoteReceived(
            recommendation.author_id,  // Author receives reward
            recommendationId,
            userId                     // Engager's tier determines weight
          );
          
          if (rewardResult.success) {
            console.log(`✅ [TWO-TIER] Like reward: ${rewardResult.displayAmount} BOCA (${rewardResult.method})`);
            if (rewardResult.txDigest) {
              console.log(`   TX: ${rewardResult.txDigest}`);
            }
          } else {
            console.error(`❌ [TWO-TIER] Like reward failed: ${rewardResult.error}`);
          }
        } catch (rewardError) {
          console.error('❌ [TWO-TIER] Exception during like reward:', rewardError);
        }
      } else {
        console.log('⚠️ Self-like detected - no tokens awarded');
      }

      // Update engagement points for validation bonus tracking
      await updateEngagementPoints(recommendationId, userId, 'like');
      
      action = 'liked';
      console.log(`❤️ Liked recommendation, new count: ${newCount}`);
    }

    return res.json({
      success: true,
      action,
      newCount,
      reward: rewardResult?.success ? {
        amount: rewardResult.displayAmount,
        recipient: recommendation.author_id,
        recipient_type: 'recommendation_author',
        reason: 'like_received',
        method: rewardResult.method,
        tx_digest: rewardResult.txDigest || null,
        pending_id: rewardResult.pendingRewardId || null,
        new_balance: rewardResult.newBalance
      } : null
    });

  } catch (error) {
    console.error('❌ Like toggle error:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

// POST /:id/bookmark - Toggle bookmark on a recommendation (WITH TWO-TIER TOKEN REWARDS)
router.post('/:id/bookmark', authenticateToken, async (req: Request, res: Response) => {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const recommendationId = req.params.id;
    const userId = req.user!.id;

    console.log('🔖 Toggling bookmark:', { recommendationId, userId });

    // Check if recommendation exists and get author
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('id, saves_count, author_id')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found'
      });
    }

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from('recommendation_bookmarks')
      .select('id')
      .eq('recommendation_id', recommendationId)
      .eq('user_id', userId)
      .single();

    let action: 'bookmarked' | 'unbookmarked';
    let newCount: number;
    let rewardResult: RewardResult | null = null;

    if (existingBookmark) {
      // Unbookmark: Remove the bookmark
      const { error: deleteError } = await supabase
        .from('recommendation_bookmarks')
        .delete()
        .eq('recommendation_id', recommendationId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('❌ Error removing bookmark:', deleteError);
        return res.status(500).json({
          error: 'Failed to unbookmark: ' + deleteError.message
        });
      }

      // Decrement count
      newCount = Math.max(0, (recommendation.saves_count || 0) - 1);
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ saves_count: newCount })
        .eq('id', recommendationId);

      if (updateError) {
        console.warn('⚠️ Failed to update bookmark count:', updateError);
      }

      action = 'unbookmarked';
      console.log(`📑 Unbookmarked recommendation, new count: ${newCount}`);

    } else {
      // Bookmark: Add new bookmark
      const { error: insertError } = await supabase
        .from('recommendation_bookmarks')
        .insert({
          recommendation_id: recommendationId,
          user_id: userId
        });

      if (insertError) {
        console.error('❌ Error adding bookmark:', insertError);
        return res.status(500).json({
          error: 'Failed to bookmark: ' + insertError.message
        });
      }

      // Increment count
      newCount = (recommendation.saves_count || 0) + 1;
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ saves_count: newCount })
        .eq('id', recommendationId);

      if (updateError) {
        console.warn('⚠️ Failed to update bookmark count:', updateError);
      }

      // =========================================================================
      // 💰 Award tokens to recommendation author via TWO-TIER REWARD SERVICE
      // =========================================================================
      if (recommendation.author_id !== userId) {
        console.log(`💰 [TWO-TIER] Awarding save reward to author ${recommendation.author_id}...`);
        
        try {
          rewardResult = await rewardService.awardSaveReceived(
            recommendation.author_id,  // Author receives reward
            recommendationId,
            userId                     // Engager's tier determines weight
          );
          
          if (rewardResult.success) {
            console.log(`✅ [TWO-TIER] Save reward: ${rewardResult.displayAmount} BOCA (${rewardResult.method})`);
            if (rewardResult.txDigest) {
              console.log(`   TX: ${rewardResult.txDigest}`);
            }
          } else {
            console.error(`❌ [TWO-TIER] Save reward failed: ${rewardResult.error}`);
          }
        } catch (rewardError) {
          console.error('❌ [TWO-TIER] Exception during save reward:', rewardError);
        }
      } else {
        console.log('⚠️ Self-save detected - no tokens awarded');
      }

      // Update engagement points for validation bonus tracking
      await updateEngagementPoints(recommendationId, userId, 'save');
      
      action = 'bookmarked';
      console.log(`🔖 Bookmarked recommendation, new count: ${newCount}`);
    }

    return res.json({
      success: true,
      action,
      newCount,
      reward: rewardResult?.success ? {
        amount: rewardResult.displayAmount,
        recipient: recommendation.author_id,
        recipient_type: 'recommendation_author',
        reason: 'save_received',
        method: rewardResult.method,
        tx_digest: rewardResult.txDigest || null,
        pending_id: rewardResult.pendingRewardId || null,
        new_balance: rewardResult.newBalance
      } : null
    });

  } catch (error) {
    console.error('❌ Bookmark toggle error:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error as Error).message
    });
  }
});

// POST /:id/save - Alias for bookmark (frontend uses this endpoint)
router.post('/:id/save', authenticateToken, async (req: Request, res: Response) => {
  // Delegate to bookmark handler
  req.params.id = req.params.id;
  return router.handle(req, res, () => {});
});

export default router;