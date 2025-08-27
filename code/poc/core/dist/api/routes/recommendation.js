"use strict";
// app/api/recommendations/route.ts
// Comprehensive API implementation updated for new database schema
// Merges advanced functionality with Supabase integration
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const supabase_1 = require("@/lib/supabase");
const server_1 = require("next/server");
// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// Helper function to calculate Trust Score based on social connections
async function calculateTrustScore(supabase, recommendationId, userId) {
    try {
        // Base trust score calculation
        const { data: recommendation } = await supabase
            .from('recommendations')
            .select('trust_score, upvotes_count, saves_count, author_id')
            .eq('id', recommendationId)
            .single();
        if (!recommendation)
            return 0;
        let trustScore = recommendation.trust_score || 0;
        // If user is provided, calculate personalized trust score
        if (userId && userId !== recommendation.author_id) {
            // Check social connections for trust weighting
            const { data: socialConnections } = await supabase
                .from('social_connections')
                .select('trust_weight, connection_type')
                .eq('follower_id', userId)
                .eq('following_id', recommendation.author_id)
                .eq('is_active', true);
            if (socialConnections && socialConnections.length > 0) {
                const connection = socialConnections[0];
                // Apply social weighting: 0.75 for direct connections
                trustScore = trustScore * (connection.trust_weight || 0.75);
            }
            // Check for friend-of-friend connections (2-hop)
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
                // Apply 0.25 weight for friend-of-friend connections
                if (friendOfFriend && friendOfFriend.length > 0) {
                    trustScore = trustScore * 0.25;
                }
            }
        }
        // Factor in engagement metrics
        const engagementBoost = Math.min(0.2, (recommendation.upvotes_count * 0.1 + recommendation.saves_count * 0.05));
        trustScore = Math.min(1.0, trustScore + engagementBoost);
        return Math.round(trustScore * 1000) / 1000; // Round to 3 decimal places
    }
    catch (error) {
        console.error('Error calculating trust score:', error);
        return 0;
    }
}
/**
 * POST /api/recommendations
 * Create a new recommendation with comprehensive validation
 */
async function POST(request) {
    try {
        const supabase = (0, supabase_1.createClient)();
        const body = await request.json();
        const { title, content, category, restaurantName, restaurantAddress, latitude, longitude, authorId = 'anonymous_' + Date.now(), authorName = 'Anonymous User', photos = [], tags = [], rating } = body;
        console.log('Received recommendation data:', {
            title, category, restaurantName, authorId
        });
        // Comprehensive validation
        if (!title || typeof title !== 'string' || title.trim().length < 3 || title.length > 200) {
            return server_1.NextResponse.json({ error: 'Title is required and must be between 3 and 200 characters' }, { status: 400 });
        }
        if (!content || typeof content !== 'string' || content.trim().length < 10 || content.length > 2000) {
            return server_1.NextResponse.json({ error: 'Content is required and must be between 10 and 2000 characters' }, { status: 400 });
        }
        if (!category || typeof category !== 'string') {
            return server_1.NextResponse.json({ error: 'Category is required and must be a string' }, { status: 400 });
        }
        if (!restaurantName || typeof restaurantName !== 'string') {
            return server_1.NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 });
        }
        // Validate coordinates if provided
        if (latitude !== undefined && longitude !== undefined) {
            if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
                latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                return server_1.NextResponse.json({ error: 'Invalid coordinates provided' }, { status: 400 });
            }
        }
        // Validate rating if provided
        if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
            return server_1.NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
        }
        // Validate tags
        if (tags && (!Array.isArray(tags) || tags.length > 10)) {
            return server_1.NextResponse.json({ error: 'Tags must be an array with maximum 10 items' }, { status: 400 });
        }
        // Step 1: Ensure user exists (create if needed)
        let user;
        const { data: existingUser, error: userLookupError } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', authorId)
            .single();
        if (!existingUser) {
            console.log('Creating new user:', authorId);
            const { data: newUser, error: userError } = await supabase
                .from('users')
                .insert({
                wallet_address: authorId,
                display_name: authorName,
                location_city: 'Brasília' // Default for now
            })
                .select()
                .single();
            if (userError) {
                console.error('Error creating user:', userError);
                return server_1.NextResponse.json({ error: 'Failed to create user: ' + userError.message }, { status: 500 });
            }
            user = newUser;
        }
        else {
            user = existingUser;
        }
        // Step 2: Ensure restaurant exists (create if needed)
        let restaurant;
        const { data: existingRestaurant, error: restaurantLookupError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('name', restaurantName)
            .single();
        if (!existingRestaurant) {
            console.log('Creating new restaurant:', restaurantName);
            const { data: newRestaurant, error: restaurantError } = await supabase
                .from('restaurants')
                .insert({
                name: restaurantName,
                address: restaurantAddress || 'Address not provided',
                city: 'Brasília',
                latitude: latitude || null,
                longitude: longitude || null,
                category: category,
                created_by: user.id,
                verification_status: 'unverified'
            })
                .select()
                .single();
            if (restaurantError) {
                console.error('Error creating restaurant:', restaurantError);
                return server_1.NextResponse.json({ error: 'Failed to create restaurant: ' + restaurantError.message }, { status: 500 });
            }
            restaurant = newRestaurant;
        }
        else {
            restaurant = existingRestaurant;
        }
        // Step 3: Create the recommendation
        console.log('Creating recommendation for restaurant:', restaurant.id, 'by user:', user.id);
        const { data: recommendation, error: recommendationError } = await supabase
            .from('recommendations')
            .insert({
            restaurant_id: restaurant.id,
            author_id: user.id,
            title: title.trim(),
            content: content.trim(),
            category: category,
            photos: photos,
            tags: tags,
            trust_score: 0.25, // Default starting trust score
            base_reward: 1.0,
            location_data: {
                address: restaurantAddress,
                coordinates: latitude && longitude ? { lat: latitude, lng: longitude } : null
            },
            verification_status: 'unverified',
            visit_date: new Date().toISOString().split('T')[0] // Today's date
        })
            .select(`
        *,
        restaurants!inner(name, address, category, latitude, longitude),
        users!inner(display_name, username, wallet_address)
      `)
            .single();
        if (recommendationError) {
            console.error('Error creating recommendation:', recommendationError);
            return server_1.NextResponse.json({ error: 'Failed to create recommendation: ' + recommendationError.message }, { status: 500 });
        }
        // Step 4: Update restaurant metrics
        const { error: updateError } = await supabase
            .from('restaurants')
            .update({
            total_recommendations: (restaurant.total_recommendations || 0) + 1,
            // Recalculate average trust score
            average_trust_score: await calculateAverageRestaurantTrustScore(supabase, restaurant.id)
        })
            .eq('id', restaurant.id);
        if (updateError) {
            console.warn('Warning: Failed to update restaurant metrics:', updateError);
        }
        console.log('Successfully created recommendation:', recommendation.id);
        return server_1.NextResponse.json({
            success: true,
            recommendation,
            restaurant,
            user,
            message: 'Recommendation created successfully!'
        });
    }
    catch (error) {
        console.error('API Error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}
/**
 * GET /api/recommendations
 * List recommendations with advanced filtering and Trust Score calculation
 */
async function GET(request) {
    try {
        const supabase = (0, supabase_1.createClient)();
        const { searchParams } = new URL(request.url);
        // Extract query parameters
        const author = searchParams.get('author');
        const category = searchParams.get('category');
        const restaurantId = searchParams.get('restaurantId');
        const tags = searchParams.get('tags');
        const minTrustScore = searchParams.get('minTrustScore');
        const nearLat = searchParams.get('nearLat');
        const nearLng = searchParams.get('nearLng');
        const nearRadius = searchParams.get('nearRadius');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const limit = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
        const sort = searchParams.get('sort') || 'created_at';
        const direction = searchParams.get('direction') === 'asc' ? 'asc' : 'desc';
        const userId = searchParams.get('userId'); // For personalized Trust Scores
        const search = searchParams.get('q'); // Search query
        console.log('Fetching recommendations with filters:', {
            category, limit, offset, sort, direction
        });
        // Build the query
        let query = supabase
            .from('recommendations')
            .select(`
        *,
        restaurants!inner(
          id, name, address, category, latitude, longitude, 
          average_trust_score, total_recommendations
        ),
        users!inner(
          id, display_name, username, wallet_address, 
          reputation_score, verification_level
        )
      `);
        // Apply filters
        if (author) {
            query = query.eq('users.wallet_address', author);
        }
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }
        if (restaurantId) {
            query = query.eq('restaurant_id', restaurantId);
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
        // Text search
        if (search && search.trim().length >= 2) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }
        // Apply sorting
        if (sort === 'trust_score') {
            query = query.order('trust_score', { ascending: direction === 'asc' });
        }
        else if (sort === 'created_at') {
            query = query.order('created_at', { ascending: direction === 'asc' });
        }
        else if (sort === 'upvotes_count') {
            query = query.order('upvotes_count', { ascending: direction === 'asc' });
        }
        // Apply pagination
        query = query.range(offset, offset + limit - 1);
        const { data: recommendations, error, count } = await query;
        if (error) {
            console.error('Error fetching recommendations:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch recommendations: ' + error.message }, { status: 500 });
        }
        // Calculate personalized Trust Scores if userId provided
        const enhancedRecommendations = await Promise.all((recommendations || []).map(async (rec) => {
            const personalizedTrustScore = userId
                ? await calculateTrustScore(supabase, rec.id, userId)
                : rec.trust_score;
            // Apply location filtering if coordinates provided
            let distance = null;
            if (nearLat && nearLng && rec.restaurants.latitude && rec.restaurants.longitude) {
                distance = calculateDistance(parseFloat(nearLat), parseFloat(nearLng), rec.restaurants.latitude, rec.restaurants.longitude);
            }
            return {
                ...rec,
                personalizedTrustScore,
                distance,
                // Add computed fields
                engagementScore: (rec.upvotes_count * 0.7) + (rec.saves_count * 0.3),
                isRecent: new Date(rec.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            };
        }));
        // Filter by distance if location filter provided
        let filteredRecommendations = enhancedRecommendations;
        if (nearLat && nearLng && nearRadius) {
            const maxDistance = Math.max(0.1, Math.min(100, parseFloat(nearRadius)));
            filteredRecommendations = enhancedRecommendations.filter(rec => rec.distance === null || rec.distance <= maxDistance);
        }
        console.log('Fetched recommendations:', filteredRecommendations.length);
        return server_1.NextResponse.json({
            success: true,
            recommendations: filteredRecommendations,
            total: filteredRecommendations.length,
            pagination: {
                offset,
                limit,
                hasMore: filteredRecommendations.length === limit
            },
            filters: {
                category,
                author,
                minTrustScore,
                search,
                nearLocation: nearLat && nearLng ? { lat: nearLat, lng: nearLng, radius: nearRadius } : null
            }
        });
    }
    catch (error) {
        console.error('API Error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}
/**
 * PUT /api/recommendations
 * Update a recommendation (for future implementation)
 */
async function PUT(request) {
    try {
        return server_1.NextResponse.json({
            error: 'Update functionality not yet implemented'
        }, { status: 501 });
    }
    catch (error) {
        console.error('API Error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
/**
 * DELETE /api/recommendations
 * Delete a recommendation (for future implementation)
 */
async function DELETE(request) {
    try {
        return server_1.NextResponse.json({
            error: 'Delete functionality not yet implemented'
        }, { status: 501 });
    }
    catch (error) {
        console.error('API Error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
// Helper function to calculate average restaurant trust score
async function calculateAverageRestaurantTrustScore(supabase, restaurantId) {
    try {
        const { data } = await supabase
            .from('recommendations')
            .select('trust_score')
            .eq('restaurant_id', restaurantId)
            .eq('verification_status', 'verified');
        if (!data || data.length === 0)
            return 0;
        const average = data.reduce((sum, rec) => sum + (rec.trust_score || 0), 0) / data.length;
        return Math.round(average * 1000) / 1000; // Round to 3 decimal places
    }
    catch (error) {
        console.error('Error calculating average trust score:', error);
        return 0;
    }
}
//# sourceMappingURL=recommendation.js.map