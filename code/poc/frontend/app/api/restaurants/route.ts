// File: code/poc/frontend/app/api/restaurants/route.ts
// Restaurant creation API endpoint with integer IDs and smart matching
// Aligns with the completed restaurant ID migration

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Environment variable validation and initialization
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  console.log('🔍 Restaurant API Environment check:');
  console.log('- SUPABASE_URL exists:', !!supabaseUrl);
  console.log('- SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required. Check your .env.local file.');
  }
  
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required. Check your .env.local file.');
  }

  console.log('✅ Supabase environment variables loaded for restaurants API');
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Smart restaurant matching functions
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
  longitude: number,
  category?: string
): Promise<{ id: number; name: string; address: string; created: boolean }> {
  const normalizedName = normalizeRestaurantName(name);
  console.log('🔍 Restaurant API: Looking for restaurant:', { name, normalizedName, latitude, longitude });

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

        console.log(`🔍 Restaurant API: Checking restaurant ${restaurant.id}: distance=${distance}m, nameSimilar=${nameSimilarity}`);

        if (distance <= 100 && nameSimilarity) {
          console.log(`✅ Restaurant API: Found existing restaurant: ${restaurant.name} (ID: ${restaurant.id})`);
          return {
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
            created: false
          };
        }
      }
    }
  }

  // No match found, create new restaurant with auto-increment ID
  console.log('🔵 Restaurant API: Creating new restaurant...');
  
  const newRestaurant = {
    name: name,
    normalized_name: normalizedName,
    address: address || 'Address not provided',
    city: 'Brasília', // Default for now
    state_province: 'DF',
    country: 'BR',
    latitude: latitude,
    longitude: longitude,
    category: category || 'Restaurant',
    verification_status: 'user_contributed',
    is_active: true,
    created_by: null // Will be updated when user system is integrated
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

  console.log(`✅ Restaurant API: Created new restaurant: ${createdRestaurant.name} (ID: ${createdRestaurant.id})`);
  return {
    id: createdRestaurant.id,
    name: createdRestaurant.name,
    address: createdRestaurant.address,
    created: true
  };
}

// POST endpoint for creating restaurants
export async function POST(request: NextRequest) {
  try {
    console.log('🔵 Restaurant API: Starting restaurant creation process...');
    
    // Initialize Supabase with error handling
    let supabase;
    try {
      supabase = initializeSupabase();
    } catch (envError) {
      console.error('💥 Restaurant API: Environment configuration error:', envError);
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
    console.log('🔵 Restaurant API: Received restaurant data:', body);

    // Extract and validate required fields
    const {
      name,
      address,
      latitude,
      longitude,
      category,
      city,
      priceRange
    } = body;

    // Validate required fields
    if (!name || !latitude || !longitude) {
      console.log('❌ Restaurant API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: name, latitude, longitude' },
        { status: 400 }
      );
    }

    // Validate coordinates are numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.log('❌ Restaurant API: Invalid coordinates');
      return NextResponse.json(
        { error: 'Invalid coordinates: latitude and longitude must be valid numbers' },
        { status: 400 }
      );
    }

    console.log('✅ Restaurant API: Required fields validated');

    // Test Supabase connection first
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('restaurants')
        .select('count')
        .limit(1);
        
      if (connectionError) {
        console.log('❌ Restaurant API: Supabase connection test failed:', connectionError);
        throw new Error(`Database connection failed: ${connectionError.message}`);
      }
      
      console.log('✅ Restaurant API: Supabase connection successful');
    } catch (connectionError) {
      console.log('💥 Restaurant API: Supabase connection error:', connectionError);
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: connectionError instanceof Error ? connectionError.message : 'Could not connect to Supabase'
        },
        { status: 500 }
      );
    }

    // Find or create restaurant using smart matching
    const restaurantResult = await findOrCreateRestaurant(
      supabase,
      name,
      address || 'Address not provided',
      lat,
      lng,
      category
    );

    console.log('✅ Restaurant API: Restaurant operation completed!');
    console.log('✅ Restaurant ID (integer):', restaurantResult.id);
    console.log('✅ Restaurant name:', restaurantResult.name);
    console.log('✅ Created new:', restaurantResult.created);

    // Return success response
    const response = {
      success: true,
      restaurant: {
        id: restaurantResult.id, // Integer ID from auto-increment
        name: restaurantResult.name,
        address: restaurantResult.address,
        latitude: lat,
        longitude: lng,
        category: category || 'Restaurant',
        city: city || 'Brasília',
        priceRange: priceRange
      },
      created: restaurantResult.created,
      message: restaurantResult.created 
        ? `New restaurant created with ID: ${restaurantResult.id}` 
        : `Found existing restaurant with ID: ${restaurantResult.id}`
    };

    console.log('🎉 Restaurant API: Restaurant creation process completed successfully!');
    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('💥 Restaurant API: Restaurant creation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create restaurant', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving restaurants
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Restaurant API: Starting restaurant retrieval...');
    
    // Initialize Supabase with error handling
    let supabase;
    try {
      supabase = initializeSupabase();
    } catch (envError) {
      console.error('💥 Restaurant API: Environment configuration error:', envError);
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: envError instanceof Error ? envError.message : 'Environment variables not configured properly'
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    console.log('🔍 Restaurant API: Fetching restaurants...', { limit, city, category, search });

    let query = supabase
      .from('restaurants')
      .select('id, name, address, city, latitude, longitude, category, verification_status')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (city) {
      query = query.eq('city', city);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      const normalizedSearch = normalizeRestaurantName(search);
      query = query.or(`name.ilike.%${normalizedSearch}%,address.ilike.%${search}%`);
    }

    const { data: restaurants, error } = await query;

    if (error) {
      console.log('❌ Restaurant API: Error fetching restaurants:', error);
      throw error;
    }

    console.log(`✅ Restaurant API: Retrieved ${restaurants.length} restaurants`);

    return NextResponse.json({
      success: true,
      restaurants,
      count: restaurants.length
    });

  } catch (error) {
    console.error('💥 Restaurant API: Error fetching restaurants:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch restaurants',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}