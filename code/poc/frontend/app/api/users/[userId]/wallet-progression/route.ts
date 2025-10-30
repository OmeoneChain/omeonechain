// API Route: /app/api/users/[userId]/wallet-progression/route.ts
// Handles wallet progression data for progressive crypto feature disclosure

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to verify JWT token (adapt to your existing auth pattern)
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', user: null };
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { error: 'Invalid token', user: null };
    }
    
    return { error: null, user };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { error: 'Authentication failed', user: null };
  }
}

// Helper function to calculate profile completion
function calculateProfileCompletion(userData: any): number {
  let score = 0;
  const maxScore = 100;
  
  // Basic information (50 points total)
  if (userData.username && userData.username.trim() !== '' && userData.username !== userData.id) score += 10;
  if (userData.display_name && userData.display_name.trim() !== '' && userData.display_name !== userData.username) score += 10;
  if (userData.bio && userData.bio.length >= 10) score += 15;
  if (userData.avatar_url && !userData.avatar_url.includes('dicebear')) score += 15;
  
  // Location information (20 points total)
  if (userData.location_city && userData.location_city.trim() !== '') score += 10;
  if (userData.location_country && userData.location_country.trim() !== '') score += 10;
  
  // Account verification and connection (20 points total)
  if (userData.wallet_address && userData.wallet_address.trim() !== '') score += 10;
  // Note: verification_level would need to be added to users table
  
  // Social activity (10 points total)
  // Note: These would need to be calculated from related tables
  // For now, we'll skip these or set them based on available data
  
  return Math.min(score, maxScore);
}

// Helper function to determine onboarding stage
function determineOnboardingStage(profileCompletion: number, recommendationCount: number = 0): string {
  if (profileCompletion >= 80 && recommendationCount >= 3) return 'reward_awareness';
  if (profileCompletion >= 60 && recommendationCount >= 1) return 'basic_engagement';
  return 'social_signup';
}

// GET: Retrieve wallet progression for a user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const { error: authError, user } = await verifyAuth(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Users can only access their own wallet progression
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied. Users can only view their own progression.' },
        { status: 403 }
      );
    }

    // Fetch wallet progression data
    const { data: progressionData, error: progressionError } = await supabase
      .from('user_wallet_progression')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progressionError && progressionError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Error fetching wallet progression:', progressionError);
      return NextResponse.json(
        { error: 'Failed to fetch wallet progression' },
        { status: 500 }
      );
    }

    if (!progressionData) {
      // No progression record exists - this is normal for new users
      return NextResponse.json(
        { error: 'Wallet progression not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(progressionData);

  } catch (error) {
    console.error('Wallet progression GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create or update wallet progression for a user
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const { error: authError, user } = await verifyAuth(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Users can only create/update their own wallet progression
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied. Users can only modify their own progression.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Fetch user data to calculate current profile completion
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate current profile completion
    const profileCompletion = calculateProfileCompletion(userData);
    
    // Determine appropriate onboarding stage
    const onboardingStage = body.onboarding_stage || determineOnboardingStage(profileCompletion);

    // Prepare progression data
    const progressionData = {
      user_id: userId,
      onboarding_stage: onboardingStage,
      show_crypto_features: body.show_crypto_features || false,
      wallet_education_completed: body.wallet_education_completed || false,
      advanced_mode_enabled: body.advanced_mode_enabled || false,
      progression_metadata: {
        profile_completion: profileCompletion,
        last_updated: new Date().toISOString(),
        updated_from: 'api',
        ...body.progression_metadata
      }
    };

    // Insert or update wallet progression
    const { data: result, error: upsertError } = await supabase
      .from('user_wallet_progression')
      .upsert(progressionData, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting wallet progression:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save wallet progression' },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Wallet progression POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update specific fields of wallet progression
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const { error: authError, user } = await verifyAuth(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Users can only update their own wallet progression
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Prepare update data (only include provided fields)
    const updateData: any = {
      progression_updated_at: new Date().toISOString()
    };

    if (body.onboarding_stage) updateData.onboarding_stage = body.onboarding_stage;
    if (typeof body.show_crypto_features === 'boolean') updateData.show_crypto_features = body.show_crypto_features;
    if (typeof body.wallet_education_completed === 'boolean') updateData.wallet_education_completed = body.wallet_education_completed;
    if (typeof body.advanced_mode_enabled === 'boolean') updateData.advanced_mode_enabled = body.advanced_mode_enabled;
    
    if (body.progression_metadata) {
      // Merge with existing metadata
      const { data: existing } = await supabase
        .from('user_wallet_progression')
        .select('progression_metadata')
        .eq('user_id', userId)
        .single();
      
      updateData.progression_metadata = {
        ...existing?.progression_metadata,
        ...body.progression_metadata,
        last_updated: new Date().toISOString()
      };
    }

    // Update wallet progression
    const { data: result, error: updateError } = await supabase
      .from('user_wallet_progression')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating wallet progression:', updateError);
      return NextResponse.json(
        { error: 'Failed to update wallet progression' },
        { status: 500 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Wallet progression not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Wallet progression PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}