// app/api/admin/test/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Create Supabase client with enhanced error handling
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    urlStart: supabaseUrl?.substring(0, 20),
    keyStart: supabaseKey?.substring(0, 20),
    createClientType: typeof createClient
  });
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseKey}`);
  }
  
  try {
    const client = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    console.log('API Test called with action:', action);

    switch (action) {
      case 'DB_TEST':
        return await testDatabaseConnection();
      case 'CREATE':
        return await testCreateRecommendation();
      case 'GET':
        return await testGetRecommendations();
      default:
        return Response.json({ 
          type: action, 
          error: 'Invalid action',
          validActions: ['DB_TEST', 'CREATE', 'GET']
        }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: 'API_ERROR'
    }, { status: 500 });
  }
}

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // First, check if createClient function exists
    if (typeof createClient !== 'function') {
      return Response.json({ 
        type: 'DB_TEST', 
        error: 'createClient is not a function - package import issue',
        createClientType: typeof createClient
      });
    }
    
    const supabase = createSupabaseClient();
    
    // Simple connection test - try a basic query
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Database query error:', error);
      return Response.json({ 
        type: 'DB_TEST', 
        error: `Database query failed: ${error.message}`,
        details: error,
        hint: error.message.includes('relation') ? 'Tables may not exist in database' : 'Check database connection'
      });
    }

    console.log('Database connection successful, table exists with', count, 'rows');
    return Response.json({ 
      type: 'DB_TEST', 
      success: true, 
      message: 'Database connection successful',
      tableExists: true,
      rowCount: count
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return Response.json({ 
      type: 'DB_TEST', 
      error: error instanceof Error ? error.message : 'Connection failed',
      details: error instanceof Error ? error.stack : undefined,
      hint: 'Check if Supabase package is installed and tables exist'
    });
  }
}

// Replace the testCreateRecommendation function in your route.ts file
async function testCreateRecommendation() {
  try {
    console.log('Testing create recommendation...');
    const supabase = createSupabaseClient();
    
    // Generate unique wallet address to avoid duplicates
    const uniqueWallet = `test_user_${Date.now()}`;
    
    // Create test user first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({  // Changed from upsert to insert with unique wallet
        wallet_address: uniqueWallet,
        username: 'Test User ' + Date.now(),
        reputation_score: 0.5,
        trust_score: 0.5
      })
      .select()
      .single();

    if (userError) {
      return Response.json({ 
        type: 'CREATE', 
        error: `User creation error: ${userError.message}`,
        details: userError,
        hint: userError.message.includes('relation') ? 'Users table does not exist' : 'Check user table schema'
      });
    }

    console.log('Test user created:', userData?.id);

    // Create test restaurant (use upsert to avoid duplicates)
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .upsert({
        name: 'Test Restaurant ' + Date.now(),
        address: 'Test Address, Brasília',
        city: 'Brasília',
        category: 'Brazilian',
        description: 'A test restaurant for API testing'
      })
      .select()
      .single();

    if (restaurantError) {
      return Response.json({ 
        type: 'CREATE', 
        error: `Restaurant creation error: ${restaurantError.message}`,
        details: restaurantError,
        hint: restaurantError.message.includes('relation') ? 'Restaurants table does not exist' : 'Check restaurant table schema'
      });
    }

    console.log('Test restaurant created:', restaurantData?.id);

    // Create test recommendation
    const { data: recommendationData, error: recommendationError } = await supabase
      .from('recommendations')
      .insert({
        restaurant_id: restaurantData.id,
        author_id: userData.id,
        title: 'Great Food! ' + Date.now(),
        description: 'This is a test recommendation created via API at ' + new Date().toISOString(),
        tags: ['test', 'api']
      })
      .select()
      .single();

    if (recommendationError) {
      return Response.json({ 
        type: 'CREATE', 
        error: `Recommendation creation error: ${recommendationError.message}`,
        details: recommendationError,
        hint: recommendationError.message.includes('relation') ? 'Recommendations table does not exist' : 'Check recommendation table schema'
      });
    }

    console.log('Test recommendation created:', recommendationData?.id);

    return Response.json({ 
      type: 'CREATE', 
      success: true, 
      message: 'Test recommendation created successfully',
      data: {
        user: userData,
        restaurant: restaurantData,
        recommendation: recommendationData
      }
    });
  } catch (error) {
    return Response.json({ 
      type: 'CREATE', 
      error: error instanceof Error ? error.message : 'Create operation failed',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}

async function testGetRecommendations() {
  try {
    console.log('Testing get recommendations...');
    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        *,
        restaurants(name, address, city),
        users(username, wallet_address)
      `)
      .limit(10);

    if (error) {
      return Response.json({ 
        type: 'GET', 
        error: `Get recommendations error: ${error.message}`,
        details: error,
        hint: error.message.includes('relation') ? 'Recommendations table does not exist' : 'Check table relationships'
      });
    }

    return Response.json({ 
      type: 'GET', 
      success: true, 
      message: `Found ${data?.length || 0} recommendations`,
      data: data || []
    });
  } catch (error) {
    return Response.json({ 
      type: 'GET', 
      error: error instanceof Error ? error.message : 'Get operation failed',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}