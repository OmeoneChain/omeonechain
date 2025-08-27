"use strict";
// Social service - backend logic for following functionality
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialService = exports.SocialService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class SocialService {
    constructor() {
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    }
    // Follow a user
    async followUser(followerId, followingId) {
        try {
            // Prevent self-following
            if (followerId === followingId) {
                return { success: false, message: 'Cannot follow yourself' };
            }
            // Check if already following
            const { data: existing } = await this.supabase
                .from('user_follows')
                .select('id')
                .eq('follower_id', followerId)
                .eq('following_id', followingId)
                .single();
            if (existing) {
                return { success: false, message: 'Already following this user' };
            }
            // Create follow relationship
            const { error } = await this.supabase
                .from('user_follows')
                .insert({
                follower_id: followerId,
                following_id: followingId
            });
            if (error)
                throw error;
            // Log social activity
            await this.logSocialActivity({
                type: 'follow',
                user_id: followerId,
                target_user_id: followingId
            });
            return { success: true, message: 'Successfully followed user' };
        }
        catch (error) {
            console.error('Error following user:', error);
            return { success: false, message: 'Failed to follow user' };
        }
    }
    // Unfollow a user
    async unfollowUser(followerId, followingId) {
        try {
            const { error } = await this.supabase
                .from('user_follows')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', followingId);
            if (error)
                throw error;
            return { success: true, message: 'Successfully unfollowed user' };
        }
        catch (error) {
            console.error('Error unfollowing user:', error);
            return { success: false, message: 'Failed to unfollow user' };
        }
    }
    // Check if user A follows user B
    async isFollowing(followerId, followingId) {
        try {
            const { data } = await this.supabase
                .from('user_follows')
                .select('id')
                .eq('follower_id', followerId)
                .eq('following_id', followingId)
                .single();
            return !!data;
        }
        catch (error) {
            return false;
        }
    }
    // Get user's followers
    async getFollowers(userId, page = 1, perPage = 20) {
        try {
            const offset = (page - 1) * perPage;
            const { data, error, count } = await this.supabase
                .from('user_follows')
                .select(`
          created_at,
          follower:users!user_follows_follower_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            followers_count,
            following_count,
            reputation_score
          )
        `)
                .eq('following_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + perPage - 1)
                .select('*', { count: 'exact' });
            if (error)
                throw error;
            const followers = data?.map(follow => ({
                user: {
                    ...follow.follower,
                    recommendations_count: 0, // TODO: Calculate from recommendations table
                    avg_trust_score: 0, // TODO: Calculate from recommendations
                    is_following: false, // TODO: Check if current user follows this follower
                    is_followed_by: true
                },
                connection_type: 'follower',
                connected_since: follow.created_at
            })) || [];
            return {
                followers,
                total_count: count || 0,
                page,
                per_page: perPage,
                has_more: (count || 0) > offset + perPage
            };
        }
        catch (error) {
            console.error('Error getting followers:', error);
            return {
                followers: [],
                total_count: 0,
                page,
                per_page: perPage,
                has_more: false
            };
        }
    }
    // Get users that this user follows
    async getFollowing(userId, page = 1, perPage = 20) {
        try {
            const offset = (page - 1) * perPage;
            const { data, error, count } = await this.supabase
                .from('user_follows')
                .select(`
          created_at,
          following:users!user_follows_following_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            followers_count,
            following_count,
            reputation_score
          )
        `)
                .eq('follower_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + perPage - 1)
                .select('*', { count: 'exact' });
            if (error)
                throw error;
            const following = data?.map(follow => ({
                user: {
                    ...follow.following,
                    recommendations_count: 0, // TODO: Calculate from recommendations table
                    avg_trust_score: 0, // TODO: Calculate from recommendations
                    is_following: true,
                    is_followed_by: false // TODO: Check if this user follows back
                },
                connection_type: 'following',
                connected_since: follow.created_at
            })) || [];
            return {
                following,
                total_count: count || 0,
                page,
                per_page: perPage,
                has_more: (count || 0) > offset + perPage
            };
        }
        catch (error) {
            console.error('Error getting following:', error);
            return {
                following: [],
                total_count: 0,
                page,
                per_page: perPage,
                has_more: false
            };
        }
    }
    // Get mutual follows between two users
    async getMutualFollows(userId1, userId2) {
        try {
            const { data, error } = await this.supabase
                .rpc('get_mutual_follows', {
                user_id_1: userId1,
                user_id_2: userId2
            });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error getting mutual follows:', error);
            return [];
        }
    }
    // Get social stats for a user
    async getSocialStats(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_social_stats')
                .select('*')
                .eq('id', userId)
                .single();
            if (error)
                throw error;
            // Get mutual follows count (requires current user context)
            const mutualFollowsCount = 0; // TODO: Implement based on current user
            return {
                followers_count: data.followers_count || 0,
                following_count: data.following_count || 0,
                mutual_follows_count: mutualFollowsCount,
                recommendations_count: data.recommendations_count || 0,
                avg_trust_score: data.avg_trust_score || 0
            };
        }
        catch (error) {
            console.error('Error getting social stats:', error);
            return {
                followers_count: 0,
                following_count: 0,
                mutual_follows_count: 0,
                recommendations_count: 0,
                avg_trust_score: 0
            };
        }
    }
    // Search users with filters
    async searchUsers(filters, page = 1, perPage = 20) {
        try {
            let query = this.supabase
                .from('user_social_stats')
                .select('*', { count: 'exact' });
            // Apply filters
            if (filters.query) {
                query = query.or(`username.ilike.%${filters.query}%,display_name.ilike.%${filters.query}%`);
            }
            if (filters.min_reputation) {
                query = query.gte('reputation_score', filters.min_reputation);
            }
            if (filters.has_recommendations) {
                query = query.gt('recommendations_count', 0);
            }
            // Apply sorting
            const sortBy = filters.sort_by || 'reputation';
            const sortOrder = filters.sort_order === 'asc' ? { ascending: true } : { ascending: false };
            switch (sortBy) {
                case 'followers':
                    query = query.order('followers_count', sortOrder);
                    break;
                case 'recommendations':
                    query = query.order('recommendations_count', sortOrder);
                    break;
                default:
                    query = query.order('reputation_score', sortOrder);
            }
            // Apply pagination
            const offset = (page - 1) * perPage;
            query = query.range(offset, offset + perPage - 1);
            const { data, error, count } = await query;
            if (error)
                throw error;
            const users = data?.map(user => ({
                ...user,
                is_following: false, // TODO: Check against current user
                is_followed_by: false // TODO: Check against current user
            })) || [];
            return {
                users,
                total_count: count || 0,
                page,
                per_page: perPage,
                has_more: (count || 0) > offset + perPage,
                filters_applied: filters
            };
        }
        catch (error) {
            console.error('Error searching users:', error);
            return {
                users: [],
                total_count: 0,
                page,
                per_page: perPage,
                has_more: false,
                filters_applied: filters
            };
        }
    }
    // Get follow suggestions for a user
    async getFollowSuggestions(userId, limit = 10) {
        try {
            // This is a simplified version - in production, you'd want more sophisticated recommendation logic
            const { data, error } = await this.supabase
                .rpc('get_follow_suggestions', {
                target_user_id: userId,
                suggestion_limit: limit
            });
            if (error)
                throw error;
            const suggestions = data || [];
            const suggestionReasons = {};
            // Generate reasons for each suggestion
            suggestions.forEach((user) => {
                suggestionReasons[user.id] = [
                    'High reputation in food recommendations',
                    'Active contributor to the community'
                ];
            });
            return {
                suggestions,
                suggestion_reasons: suggestionReasons
            };
        }
        catch (error) {
            console.error('Error getting follow suggestions:', error);
            return {
                suggestions: [],
                suggestion_reasons: {}
            };
        }
    }
    // Log social activity for analytics
    async logSocialActivity(activity) {
        try {
            await this.supabase
                .from('social_activities')
                .insert({
                ...activity,
                created_at: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error logging social activity:', error);
            // Don't throw - this is analytics, not critical functionality
        }
    }
    // Refresh materialized view (call periodically or after bulk operations)
    async refreshSocialStats() {
        try {
            await this.supabase.rpc('refresh_user_social_stats');
        }
        catch (error) {
            console.error('Error refreshing social stats:', error);
        }
    }
}
exports.SocialService = SocialService;
exports.socialService = new SocialService();
//# sourceMappingURL=social-service.js.map