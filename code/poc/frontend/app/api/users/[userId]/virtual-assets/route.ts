// API Route: /app/api/users/[userId]/virtual-assets/route.ts
// Handles virtual assets (rewards, badges, loyalty cards) for users

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to verify JWT token
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', user: null };
  }

  const token = authHeader.substring(7);
  
  try {
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

// Helper function to validate asset type
function validateAssetType(assetType: string): boolean {
  const validTypes = ['reward_points', 'loyalty_card', 'achievement_badge', 'vip_status', 'access_token'];
  return validTypes.includes(assetType);
}

// Helper function to validate rarity tier
function validateRarityTier(rarityTier: string): boolean {
  const validTiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  return validTiers.includes(rarityTier);
}

// GET: Retrieve virtual assets for a user
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

    // Users can only access their own virtual assets
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied. Users can only view their own assets.' },
        { status: 403 }
      );
    }

    // Parse query parameters for filtering
    const url = new URL(request.url);
    const assetType = url.searchParams.get('type');
    const activeOnly = url.searchParams.get('active') === 'true';
    const visibleOnly = url.searchParams.get('visible') !== 'false'; // Default to visible only

    // Build query
    let query = supabase
      .from('virtual_assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (assetType && validateAssetType(assetType)) {
      query = query.eq('asset_type', assetType);
    }
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    if (visibleOnly) {
      query = query.eq('is_visible_to_user', true);
    }

    // Execute query
    const { data: assets, error: assetsError } = await query;

    if (assetsError) {
      console.error('Error fetching virtual assets:', assetsError);
      return NextResponse.json(
        { error: 'Failed to fetch virtual assets' },
        { status: 500 }
      );
    }

    // Calculate totals by type
    const summary = {
      total_assets: assets.length,
      total_points: assets
        .filter(asset => asset.asset_type === 'reward_points' && asset.is_active)
        .reduce((sum, asset) => sum + (asset.token_balance || 0), 0),
      badges_count: assets.filter(asset => asset.asset_type === 'achievement_badge' && asset.is_active).length,
      loyalty_cards_count: assets.filter(asset => asset.asset_type === 'loyalty_card' && asset.is_active).length,
      by_rarity: assets.reduce((acc, asset) => {
        acc[asset.rarity_tier] = (acc[asset.rarity_tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      assets,
      summary
    });

  } catch (error) {
    console.error('Virtual assets GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new virtual asset for a user
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

    // Users can only create assets for themselves (or system can create for any user)
    if (user.id !== userId) {
      // Check if this is a system/admin operation
      // For now, only allow users to create their own assets
      return NextResponse.json(
        { error: 'Access denied. Users can only create assets for themselves.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.asset_type || !body.display_name) {
      return NextResponse.json(
        { error: 'Missing required fields: asset_type, display_name' },
        { status: 400 }
      );
    }

    // Validate asset type
    if (!validateAssetType(body.asset_type)) {
      return NextResponse.json(
        { error: 'Invalid asset_type. Must be one of: reward_points, loyalty_card, achievement_badge, vip_status, access_token' },
        { status: 400 }
      );
    }

    // Validate rarity tier if provided
    if (body.rarity_tier && !validateRarityTier(body.rarity_tier)) {
      return NextResponse.json(
        { error: 'Invalid rarity_tier. Must be one of: common, uncommon, rare, epic, legendary' },
        { status: 400 }
      );
    }

    // Prepare asset data
    const assetData = {
      user_id: userId,
      asset_type: body.asset_type,
      display_name: body.display_name,
      user_description: body.user_description || null,
      blockchain_metadata: body.blockchain_metadata || {},
      blockchain_token_id: body.blockchain_token_id || null,
      blockchain_contract_address: body.blockchain_contract_address || null,
      is_minted: body.is_minted || false,
      token_balance: body.token_balance || 0,
      is_active: body.is_active !== false, // Default to true
      is_visible_to_user: body.is_visible_to_user !== false, // Default to true
      associated_restaurant_id: body.associated_restaurant_id || null,
      rarity_tier: body.rarity_tier || 'common',
      expires_at: body.expires_at || null
    };

    // Insert virtual asset
    const { data: result, error: insertError } = await supabase
      .from('virtual_assets')
      .insert(assetData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating virtual asset:', insertError);
      return NextResponse.json(
        { error: 'Failed to create virtual asset' },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Virtual assets POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update a virtual asset
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

    // Users can only update their own assets
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { asset_id, ...updateData } = body;

    if (!asset_id) {
      return NextResponse.json(
        { error: 'Missing required field: asset_id' },
        { status: 400 }
      );
    }

    // Validate fields if provided
    if (updateData.asset_type && !validateAssetType(updateData.asset_type)) {
      return NextResponse.json(
        { error: 'Invalid asset_type' },
        { status: 400 }
      );
    }

    if (updateData.rarity_tier && !validateRarityTier(updateData.rarity_tier)) {
      return NextResponse.json(
        { error: 'Invalid rarity_tier' },
        { status: 400 }
      );
    }

    // Verify asset belongs to user
    const { data: existingAsset, error: fetchError } = await supabase
      .from('virtual_assets')
      .select('id, user_id')
      .eq('id', asset_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingAsset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    // Update asset
    const { data: result, error: updateError } = await supabase
      .from('virtual_assets')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', asset_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating virtual asset:', updateError);
      return NextResponse.json(
        { error: 'Failed to update virtual asset' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Virtual assets PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a virtual asset
export async function DELETE(
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

    // Users can only delete their own assets
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const assetId = url.searchParams.get('asset_id');

    if (!assetId) {
      return NextResponse.json(
        { error: 'Missing required parameter: asset_id' },
        { status: 400 }
      );
    }

    // Soft delete (mark as inactive) instead of hard delete to preserve history
    const { data: result, error: deleteError } = await supabase
      .from('virtual_assets')
      .update({
        is_active: false,
        is_visible_to_user: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)
      .eq('user_id', userId)
      .select()
      .single();

    if (deleteError) {
      console.error('Error deleting virtual asset:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete virtual asset' },
        { status: 500 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Asset deleted successfully' });

  } catch (error) {
    console.error('Virtual assets DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}