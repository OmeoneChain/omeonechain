"use strict";
// Restaurant Discovery API Routes - Next.js App Router with Supabase
// File: app/api/restaurants/route.ts
// COMPLETE VERSION - Ready for copy-paste replacement
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.getRestaurantById = getRestaurantById;
exports.getCities = getCities;
exports.getCuisines = getCuisines;
const server_1 = require("next/server");
const supabase_1 = require("@/lib/supabase");
// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// Helper function to calculate personalized trust score
function calculatePersonalizedTrustScore(restaurant, userAddress) {
    // Mock social graph - in production, query from blockchain/database
    const mockFriends = ['0x123...abc', '0x789...ghi', '0xabc...123'];
    const mockFriendsOfFriends = ['0x456...def', '0xdef...456'];
    // Mock recommendation data - in production, query actual recommendations
    const mockRecommendations = [
        { restaurantId: restaurant.id, author: '0x123...abc', trustScore: 9.3, isFriend: true },
        { restaurantId: restaurant.id, author: '0x789...ghi', trustScore: 8.8, isFriend: true },
        { restaurantId: restaurant.id, author: '0x456...def', trustScore: 8.1, isFriend: false },
    ];
    const restaurantRecs = mockRecommendations.filter(r => r.restaurantId === restaurant.id);
    if (!userAddress || restaurantRecs.length === 0) {
        return { trustScore: restaurant.avgTrustScore, friendRecommendations: 0 };
    }
    let weightedScore = 0;
    let totalWeight = 0;
    let friendCount = 0;
    restaurantRecs.forEach(rec => {
        let weight = 0;
        if (mockFriends.includes(rec.author)) {
            weight = 0.75; // Direct friend
            friendCount++;
        }
        else if (mockFriendsOfFriends.includes(rec.author)) {
            weight = 0.25; // Friend of friend
        }
        if (weight > 0) {
            weightedScore += rec.trustScore * weight;
            totalWeight += weight;
        }
    });
    const personalizedScore = totalWeight > 0 ? weightedScore / totalWeight : restaurant.avgTrustScore;
    return {
        trustScore: Math.min(10, personalizedScore),
        friendRecommendations: friendCount
    };
}
// Get restaurants from Supabase database
async function getRestaurantsFromDatabase() {
    const { data: restaurants, error } = await supabase_1.supabase
        .from('restaurants')
        .select(`
      *,
      recommendations:recommendations(count)
    `)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Supabase error:', error);
        throw new Error('Failed to fetch restaurants from database');
    }
    // Transform Supabase data to match your Restaurant interface
    return restaurants.map(restaurant => ({
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        country: 'Brazil', // Default for now
        latitude: restaurant.latitude || 0,
        longitude: restaurant.longitude || 0,
        cuisineType: restaurant.category, // Map category to cuisineType
        priceRange: undefined, // Add this to your schema later
        phone: undefined, // Add this to your schema later
        website: undefined, // Add this to your schema later
        addedBy: restaurant.created_by || 'system',
        verified: false, // Calculate based on recommendations
        verificationCount: 0, // Calculate later
        totalRecommendations: restaurant.recommendations?.[0]?.count || 0,
        avgTrustScore: Math.random() * 3 + 7, // Mock for now, calculate from actual recommendations
        lastRecommendationDate: restaurant.created_at ? new Date(restaurant.created_at) : undefined,
        createdAt: new Date(restaurant.created_at),
        updatedAt: new Date(restaurant.created_at)
    }));
}
// GET /api/restaurants - Search and list restaurants
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        // Parse query parameters
        const search = searchParams.get('search') || '';
        const city = searchParams.get('city');
        const cuisineType = searchParams.get('cuisineType');
        const priceRange = searchParams.get('priceRange')?.split(',').map(Number);
        const minTrustScore = Number(searchParams.get('minTrustScore')) || 0;
        const sortBy = searchParams.get('sortBy') || 'trustScore';
        const page = Number(searchParams.get('page')) || 1;
        const limit = Number(searchParams.get('limit')) || 20;
        const userAddress = searchParams.get('userAddress');
        const userLat = searchParams.get('userLat');
        const userLng = searchParams.get('userLng');
        // Get restaurants from Supabase
        const restaurants = await getRestaurantsFromDatabase();
        // Filter restaurants
        let filteredRestaurants = restaurants.filter(restaurant => {
            // Search filter
            if (search && !restaurant.name.toLowerCase().includes(search.toLowerCase()) &&
                !restaurant.address.toLowerCase().includes(search.toLowerCase())) {
                return false;
            }
            // City filter
            if (city && city !== 'All Cities' && restaurant.city !== city) {
                return false;
            }
            // Cuisine filter
            if (cuisineType && cuisineType !== 'All Cuisines' && restaurant.cuisineType !== cuisineType) {
                return false;
            }
            // Price range filter
            if (priceRange && priceRange.length > 0 &&
                restaurant.priceRange && !priceRange.includes(restaurant.priceRange)) {
                return false;
            }
            return true;
        });
        // Calculate distances and personalized scores
        const enrichedRestaurants = filteredRestaurants.map(restaurant => {
            const { trustScore, friendRecommendations } = calculatePersonalizedTrustScore(restaurant, userAddress);
            let distanceKm;
            if (userLat && userLng) {
                distanceKm = calculateDistance(Number(userLat), Number(userLng), restaurant.latitude, restaurant.longitude);
            }
            return {
                ...restaurant,
                distanceKm,
                trustScoreForUser: userAddress ? trustScore : undefined,
                friendRecommendations: userAddress ? friendRecommendations : undefined,
            };
        });
        // Filter by minimum trust score
        const trustFilteredRestaurants = enrichedRestaurants.filter(restaurant => {
            const score = restaurant.trustScoreForUser || restaurant.avgTrustScore;
            return score >= minTrustScore;
        });
        // Sort restaurants
        const sortedRestaurants = trustFilteredRestaurants.sort((a, b) => {
            switch (sortBy) {
                case 'trustScore':
                    const scoreA = a.trustScoreForUser || a.avgTrustScore;
                    const scoreB = b.trustScoreForUser || b.avgTrustScore;
                    return scoreB - scoreA;
                case 'distance':
                    return (a.distanceKm || 0) - (b.distanceKm || 0);
                case 'recent':
                    const dateA = a.lastRecommendationDate?.getTime() || 0;
                    const dateB = b.lastRecommendationDate?.getTime() || 0;
                    return dateB - dateA;
                case 'recommendations':
                    return b.totalRecommendations - a.totalRecommendations;
                default:
                    return 0;
            }
        });
        // Paginate results
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedRestaurants = sortedRestaurants.slice(startIndex, endIndex);
        return server_1.NextResponse.json({
            results: paginatedRestaurants,
            total: sortedRestaurants.length,
            page,
            limit,
            hasNextPage: endIndex < sortedRestaurants.length,
            hasPrevPage: page > 1
        });
    }
    catch (error) {
        console.error('Error searching restaurants:', error);
        return server_1.NextResponse.json({ error: 'Failed to search restaurants' }, { status: 500 });
    }
}
// POST /api/restaurants - Create new restaurant
async function POST(request) {
    try {
        const body = await request.json();
        // Validate required fields
        const requiredFields = ['name', 'address', 'city', 'latitude', 'longitude'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return server_1.NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }
        // Get existing restaurants to check for duplicates
        const existingRestaurants = await getRestaurantsFromDatabase();
        // Check for duplicate restaurants (within 100m radius)
        const duplicates = existingRestaurants.filter(restaurant => {
            const distance = calculateDistance(body.latitude, body.longitude, restaurant.latitude, restaurant.longitude);
            return distance < 0.1 && // 100m radius
                restaurant.name.toLowerCase().includes(body.name.toLowerCase());
        });
        if (duplicates.length > 0) {
            return server_1.NextResponse.json({
                error: 'A similar restaurant already exists nearby',
                suggestions: duplicates.map(r => ({
                    id: r.id,
                    name: r.name,
                    address: r.address,
                    distanceM: Math.round(calculateDistance(body.latitude, body.longitude, r.latitude, r.longitude) * 1000)
                }))
            }, { status: 409 });
        }
        // Validate price range
        if (body.priceRange && (body.priceRange < 1 || body.priceRange > 4)) {
            return server_1.NextResponse.json({ error: 'Price range must be between 1 and 4' }, { status: 400 });
        }
        // Validate coordinates
        if (Math.abs(body.latitude) > 90 || Math.abs(body.longitude) > 180) {
            return server_1.NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
        }
        // Insert into Supabase
        const { data: newRestaurant, error } = await supabase_1.supabase
            .from('restaurants')
            .insert({
            name: body.name.trim(),
            address: body.address.trim(),
            city: body.city.trim(),
            latitude: Number(body.latitude),
            longitude: Number(body.longitude),
            category: body.cuisineType?.trim(),
            description: body.description?.trim(),
            created_by: body.addedBy || null
        })
            .select()
            .single();
        if (error) {
            console.error('Supabase error:', error);
            return server_1.NextResponse.json({ error: 'Failed to create restaurant', details: error.message }, { status: 500 });
        }
        // Transform back to your Restaurant interface
        const formattedRestaurant = {
            id: newRestaurant.id,
            name: newRestaurant.name,
            address: newRestaurant.address,
            city: newRestaurant.city,
            country: body.country?.trim() || 'Brazil',
            latitude: newRestaurant.latitude,
            longitude: newRestaurant.longitude,
            cuisineType: newRestaurant.category,
            priceRange: body.priceRange ? Number(body.priceRange) : undefined,
            phone: body.phone?.trim(),
            website: body.website?.trim(),
            addedBy: body.addedBy || 'anonymous',
            verified: false,
            verificationCount: 0,
            totalRecommendations: 0,
            avgTrustScore: 0,
            createdAt: new Date(newRestaurant.created_at),
            updatedAt: new Date(newRestaurant.created_at)
        };
        return server_1.NextResponse.json(formattedRestaurant, { status: 201 });
    }
    catch (error) {
        console.error('Error creating restaurant:', error);
        return server_1.NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
    }
}
// Individual restaurant details - GET /api/restaurants/[id]
async function getRestaurantById(id, userAddress) {
    try {
        const { data: restaurant, error } = await supabase_1.supabase
            .from('restaurants')
            .select(`
        *,
        recommendations:recommendations(
          id,
          title,
          description,
          trust_score,
          upvotes,
          saves,
          created_at,
          author:users(username, wallet_address)
        )
      `)
            .eq('id', id)
            .single();
        if (error || !restaurant) {
            return null;
        }
        // Transform to Restaurant interface
        const formattedRestaurant = {
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            country: 'Brazil',
            latitude: restaurant.latitude || 0,
            longitude: restaurant.longitude || 0,
            cuisineType: restaurant.category,
            addedBy: restaurant.created_by || 'system',
            verified: false,
            verificationCount: 0,
            totalRecommendations: restaurant.recommendations?.length || 0,
            avgTrustScore: Math.random() * 3 + 7,
            createdAt: new Date(restaurant.created_at),
            updatedAt: new Date(restaurant.created_at)
        };
        // Calculate personalized trust score
        const { trustScore, friendRecommendations } = calculatePersonalizedTrustScore(formattedRestaurant, userAddress);
        // Mock trust score breakdown
        const trustScoreBreakdown = {
            personalizedScore: trustScore,
            globalAverage: formattedRestaurant.avgTrustScore,
            directFriends: {
                count: friendRecommendations,
                avgScore: 9.0,
                weight: 0.75
            },
            friendsOfFriends: {
                count: Math.max(0, Math.floor(Math.random() * 3)),
                avgScore: 8.4,
                weight: 0.25
            },
            explanation: `Your personalized Trust Score of ${trustScore.toFixed(1)} is ${trustScore > formattedRestaurant.avgTrustScore ? 'higher' : 'lower'} than the global average because ${friendRecommendations} of your direct friends have recommended this place.`
        };
        // Mock social proof
        const socialProof = {
            friendsWhoRecommend: [
                {
                    address: '0x123...abc',
                    displayName: 'Maria Santos',
                    recommendationCount: 1,
                    mostRecentDate: new Date('2025-01-15')
                }
            ].slice(0, friendRecommendations),
            totalFriendsRecommended: friendRecommendations
        };
        return {
            restaurant: {
                ...formattedRestaurant,
                trustScoreForUser: userAddress ? trustScore : undefined,
                friendRecommendations: userAddress ? friendRecommendations : undefined,
            },
            recommendations: restaurant.recommendations || [],
            trustScoreBreakdown: userAddress ? trustScoreBreakdown : null,
            socialProof: userAddress ? socialProof : null
        };
    }
    catch (error) {
        console.error('Error fetching restaurant:', error);
        return null;
    }
}
// Get available cities from database
async function getCities() {
    try {
        const { data: restaurants, error } = await supabase_1.supabase
            .from('restaurants')
            .select('city')
            .order('city');
        if (error) {
            throw error;
        }
        const cities = [...new Set(restaurants.map(r => r.city))].sort();
        const cityStats = cities.map(city => ({
            name: city,
            country: 'Brazil', // Default for now
            restaurantCount: restaurants.filter(r => r.city === city).length,
            avgTrustScore: 8.0 // Mock average for now
        }));
        return cityStats;
    }
    catch (error) {
        console.error('Error fetching cities:', error);
        return [];
    }
}
// Get available cuisines from database
async function getCuisines() {
    try {
        const { data: restaurants, error } = await supabase_1.supabase
            .from('restaurants')
            .select('category')
            .not('category', 'is', null)
            .order('category');
        if (error) {
            throw error;
        }
        const cuisines = [...new Set(restaurants.map(r => r.category).filter(Boolean))].sort();
        const cuisineStats = cuisines.map(cuisine => ({
            name: cuisine,
            restaurantCount: restaurants.filter(r => r.category === cuisine).length,
            avgTrustScore: 8.0 // Mock average for now
        }));
        return cuisineStats;
    }
    catch (error) {
        console.error('Error fetching cuisines:', error);
        return [];
    }
}
//# sourceMappingURL=restaurants.js.map