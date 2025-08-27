import type { SocialUser, SocialStats, FollowersResponse, FollowingResponse, FollowSuggestionsResponse, UserSearchFilters, UserSearchResponse } from './social-types';
export declare class SocialService {
    private supabase;
    followUser(followerId: string, followingId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    unfollowUser(followerId: string, followingId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    isFollowing(followerId: string, followingId: string): Promise<boolean>;
    getFollowers(userId: string, page?: number, perPage?: number): Promise<FollowersResponse>;
    getFollowing(userId: string, page?: number, perPage?: number): Promise<FollowingResponse>;
    getMutualFollows(userId1: string, userId2: string): Promise<SocialUser[]>;
    getSocialStats(userId: string): Promise<SocialStats>;
    searchUsers(filters: UserSearchFilters, page?: number, perPage?: number): Promise<UserSearchResponse>;
    getFollowSuggestions(userId: string, limit?: number): Promise<FollowSuggestionsResponse>;
    private logSocialActivity;
    refreshSocialStats(): Promise<void>;
}
export declare const socialService: SocialService;
