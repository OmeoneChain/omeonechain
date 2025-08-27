import { NextRequest } from 'next/server';
export interface Restaurant {
    id: string;
    name: string;
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    cuisineType?: string;
    priceRange?: 1 | 2 | 3 | 4;
    phone?: string;
    website?: string;
    addedBy: string;
    verified: boolean;
    verificationCount: number;
    totalRecommendations: number;
    avgTrustScore: number;
    lastRecommendationDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface RestaurantSearchResult extends Restaurant {
    distanceKm?: number;
    trustScoreForUser?: number;
    friendRecommendations?: number;
    totalUserRecommendations?: number;
}
export declare function GET(request: NextRequest): Promise<any>;
export declare function POST(request: NextRequest): Promise<any>;
export declare function getRestaurantById(id: string, userAddress?: string): Promise<{
    restaurant: {
        trustScoreForUser: number | undefined;
        friendRecommendations: number | undefined;
        id: string;
        name: string;
        address: string;
        city: string;
        country: string;
        latitude: number;
        longitude: number;
        cuisineType?: string;
        priceRange?: 1 | 2 | 3 | 4;
        phone?: string;
        website?: string;
        addedBy: string;
        verified: boolean;
        verificationCount: number;
        totalRecommendations: number;
        avgTrustScore: number;
        lastRecommendationDate?: Date;
        createdAt: Date;
        updatedAt: Date;
    };
    recommendations: any;
    trustScoreBreakdown: {
        personalizedScore: number;
        globalAverage: number;
        directFriends: {
            count: number;
            avgScore: number;
            weight: number;
        };
        friendsOfFriends: {
            count: number;
            avgScore: number;
            weight: number;
        };
        explanation: string;
    } | null;
    socialProof: {
        friendsWhoRecommend: {
            address: string;
            displayName: string;
            recommendationCount: number;
            mostRecentDate: Date;
        }[];
        totalFriendsRecommended: number;
    } | null;
} | null>;
export declare function getCities(): Promise<{
    name: unknown;
    country: string;
    restaurantCount: any;
    avgTrustScore: number;
}[]>;
export declare function getCuisines(): Promise<{
    name: unknown;
    restaurantCount: any;
    avgTrustScore: number;
}[]>;
