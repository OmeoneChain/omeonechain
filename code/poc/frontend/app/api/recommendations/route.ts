// File: /code/poc/frontend/app/api/recommendations/route.ts
// ✅ MIGRATED: Updated to use integer restaurant IDs with smart matching
// ✅ FIXED: Removed geohash dependencies and hash-based ID generation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Environment variable validation and initialization
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  console.log('🔍 Environment check:');
  console.log('- SUPABASE_URL exists:', !!supabaseUrl);
  console.log('- SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required. Check your .env.local file.');
  }
  
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required. Check your .env.local file.');
  }

  console.log('✅ Supabase environment variables loaded');
  return createClient(supabaseUrl, supabaseAnonKey);
}

// ✅ NEW: Smart restaurant matching function
function normalizeRestaurantName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Distance in meters
}

async function findOrCreateRestaurant(
  supabase: any,
  name: string,
  address: string,
  latitude: number,
  longitude: number
): Promise<{ id: number; name: string; address: string }> {
  const normalizedName = normalizeRestaurantName(name);
  console.log('🔍 Looking for restaurant:', { name, normalizedName, latitude, longitude });

  // Search for existing restaurants with similar names in the area
  const { data: nearbyRestaurants, error: searchError } = await supabase
    .from('restaurants')
    .select('id, name, address, latitude, longitude')
    .or(`name.ilike.%${normalizedName}%,address.ilike.%${address}%`)
    .limit(10);

  if (searchError) {
    console.log('❌ Restaurant search error:', searchError);
    throw new Error(`Restaurant search failed: ${searchError.message}`);
  }

  // Check for matches within 100m radius with similar names
  if (nearbyRestaurants && nearbyRestaurants.length > 0) {
    for (const restaurant of nearbyRestaurants) {
      if (restaurant.latitude && restaurant.longitude) {
        const distance = calculateDistance(
          latitude, 
          longitude, 
          restaurant.latitude, 
          restaurant.longitude
        );
        
        const nameNormalized = normalizeRestaurantName(restaurant.name);
        const nameSimilarity = nameNormalized === normalizedName || 
                               nameNormalized.includes(normalizedName) || 
                               normalizedName.includes(nameNormalized);

        console.log(`🔍 Checking restaurant ${restaurant.id}: distance=${distance}m, nameSimilar=${nameSimilarity}`);

        if (distance <= 100 && nameSimilarity) {
          console.log(`✅ Found existing restaurant: ${restaurant.name} (ID: ${restaurant.id})`);
          return {
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address
          };
        }
      }
    }
  }

  // No match found, create new restaurant with auto-increment ID
  console.log('🔵 Creating new restaurant...');
  
  const newRestaurant = {
    name: name,
    normalized_name: normalizedName,
    address: address || 'Address not provided',
    city: 'Brasília', // Default for now
    state_province: 'DF',
    country: 'BR',
    latitude: latitude,
    longitude: longitude,
    category: 'Restaurant',
    verification_status: 'user_contributed',
    is_active: true,
    created_by: null // We'll handle user lookup separately
  };

  const { data: createdRestaurant, error: restaurantCreateError } = await supabase
    .from('restaurants')
    .insert(newRestaurant)
    .select('id, name, address')
    .single();

  if (restaurantCreateError) {
    console.log('❌ Restaurant creation error:', restaurantCreateError);
    throw new Error(`Failed to create restaurant: ${restaurantCreateError.message}`);
  }

  console.log(`✅ Created new restaurant: ${createdRestaurant.name} (ID: ${createdRestaurant.id})`);
  return createdRestaurant;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 Starting recommendation creation process...');
    
    // Initialize Supabase with error handling
    let supabase;
    try {
      supabase = initializeSupabase();
    } catch (envError) {
      console.error('💥 Environment configuration error:', envError);
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: envError instanceof Error ? envError.message : 'Environment variables not configured properly',
          hint: 'Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env.local'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('🔵 API Route received recommendation data:', body);

    // Extract and validate required fields
    const {
      title,
      content,
      category,
      restaurantName,
      restaurantAddress,
      latitude,
      longitude,
      authorId,
      authorName,
      photos = [],
      tags = [],
      rating
    } = body;

    // Validate required fields
    if (!title || !content || !category || !restaurantName || !authorId) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: title, content, category, restaurantName, authorId' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (!latitude || !longitude) {
      console.log('❌ Missing restaurant coordinates');
      return NextResponse.json(
        { error: 'Restaurant coordinates (latitude, longitude) are required' },
        { status: 400 }
      );
    }

    console.log('✅ Required fields validated');

    // Test Supabase connection first
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('restaurants')
        .select('count')
        .limit(1);
        
      if (connectionError) {
        console.log('❌ Supabase connection test failed:', connectionError);
        throw new Error(`Database connection failed: ${connectionError.message}`);
      }
      
      console.log('✅ Supabase connection successful');
    } catch (connectionError) {
      console.log('💥 Supabase connection error:', connectionError);
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: connectionError instanceof Error ? connectionError.message : 'Could not connect to Supabase'
        },
        { status: 500 }
      );
    }

    // Step 1: Find or create restaurant using smart matching
    const restaurantRecord = await findOrCreateRestaurant(
      supabase,
      restaurantName,
      restaurantAddress,
      parseFloat(latitude),
      parseFloat(longitude)
    );

    // Step 2: Handle user lookup/creation
    console.log('🔵 Looking up user...');
    let userId: string;

    // First, try to find user by wallet address
    const { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', authorId)
      .single();

    if (userLookupError && userLookupError.code !== 'PGRST116') {
      console.log('❌ User lookup error:', userLookupError);
      throw new Error(`Database error during user lookup: ${userLookupError.message}`);
    }

    if (existingUser) {
      console.log('✅ Found existing user:', existingUser.display_name);
      userId = existingUser.id;
    } else {
      // Create new user
      console.log('🔵 Creating new user...');
      
      const newUser = {
        wallet_address: authorId,
        display_name: authorName || 'Anonymous User',
        location_city: 'Brasília',
        location_country: 'BR',
        verification_level: 'basic',
        is_active: true
      };

      const { data: createdUser, error: userCreateError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (userCreateError) {
        console.log('❌ User creation error:', userCreateError);
        throw new Error(`Failed to create user: ${userCreateError.message}`);
      }

      console.log('✅ Created new user:', createdUser.display_name);
      userId = createdUser.id;
    }

    // Step 3: Create the recommendation with integer restaurant ID
    console.log('🔵 Creating recommendation...');

    const newRecommendation = {
      restaurant_id: restaurantRecord.id, // ✅ Now using integer ID from auto-increment
      author_id: userId,
      title: title,
      content: content,
      category: category,
      tags: tags,
      photos: photos,
      trust_score: 0.0, // Initial trust score
      upvotes_count: 0,
      saves_count: 0,
      base_reward: 1.0,
      social_reward: 0.0,
      total_tokens_earned: 0.0,
      verification_status: 'unverified',
      location_data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: restaurantAddress,
        userRating: rating
      },
      visit_date: new Date().toISOString().split('T')[0], // Today's date
      is_featured: false,
      is_archived: false
    };

    const { data: createdRecommendation, error: recommendationCreateError } = await supabase
      .from('recommendations')
      .insert(newRecommendation)
      .select(`
        *,
        restaurant:restaurants(*),
        author:users(*)
      `)
      .single();

    if (recommendationCreateError) {
      console.log('❌ Recommendation creation error:', recommendationCreateError);
      throw new Error(`Failed to create recommendation: ${recommendationCreateError.message}`);
    }

    console.log('✅ Recommendation created successfully!');
    console.log('✅ Database ID:', createdRecommendation.id);
    console.log('✅ Restaurant ID (integer):', createdRecommendation.restaurant.id);
    console.log('✅ Restaurant:', createdRecommendation.restaurant.name);
    console.log('✅ Author:', createdRecommendation.author.display_name);

    // Return success response
    const response = {
      success: true,
      recommendation: {
        id: createdRecommendation.id,
        title: createdRecommendation.title,
        content: createdRecommendation.content,
        category: createdRecommendation.category,
        trustScore: createdRecommendation.trust_score,
        restaurant: {
          id: createdRecommendation.restaurant.id, // ✅ Integer ID
          name: createdRecommendation.restaurant.name,
          address: createdRecommendation.restaurant.address
        },
        author: {
          id: createdRecommendation.author.id,
          displayName: createdRecommendation.author.display_name,
          walletAddress: createdRecommendation.author.wallet_address
        },
        createdAt: createdRecommendation.created_at
      },
      message: `Recommendation creation complete! Restaurant ID: ${restaurantRecord.id} (integer), Recommendation ID: ${createdRecommendation.id}`
    };

    console.log('🎉 Recommendation creation process completed successfully!');
    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('💥 Recommendation creation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create recommendation', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving recommendations
export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase with error handling
    let supabase;
    try {
      supabase = initializeSupabase();
    } catch (envError) {
      console.error('💥 Environment configuration error:', envError);
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: envError instanceof Error ? envError.message : 'Environment variables not configured properly'
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const restaurantId = searchParams.get('restaurantId');
    const authorId = searchParams.get('author');

    console.log('🔍 Fetching recommendations...', { limit, restaurantId, authorId });

    let query = supabase
      .from('recommendations')
      .select(`
        *,
        restaurant:restaurants(*),
        author:users(display_name, wallet_address, reputation_score)
      `)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    // ✅ UPDATED: Handle restaurant ID as integer
    if (restaurantId) {
      const restaurantIdInt = parseInt(restaurantId, 10);
      if (isNaN(restaurantIdInt)) {
        return NextResponse.json(
          { error: 'Invalid restaurant ID format. Must be an integer.' },
          { status: 400 }
        );
      }
      console.log(`✅ Filtering by restaurant_id = ${restaurantIdInt} (integer)`);
      query = query.eq('restaurant_id', restaurantIdInt);
    }

    // Direct filtering by author_id (which should be a user UUID)
    if (authorId) {
      console.log(`✅ Filtering recommendations by author_id = ${authorId}`);
      query = query.eq('author_id', authorId);
    }

    const { data: recommendations, error } = await query;

    if (error) {
      console.log('❌ Error fetching recommendations:', error);
      throw error;
    }

    console.log(`✅ Retrieved ${recommendations.length} recommendations${authorId ? ` for author ${authorId}` : ''}${restaurantId ? ` for restaurant ${restaurantId}` : ''}`);

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length
    });

  } catch (error) {
    console.error('💥 Error fetching recommendations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}