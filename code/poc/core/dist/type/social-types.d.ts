export interface UserFollow {
    id: string;
    follower_id: string;
    following_id: string;
    created_at: string;
    updated_at: string;
}
export interface SocialUser {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    followers_count: number;
    following_count: number;
    reputation_score: number;
    recommendations_count: number;
    avg_trust_score: number;
    is_following?: boolean;
    is_followed_by?: boolean;
}
export interface FollowRequest {
    following_id: string;
}
export interface UnfollowRequest {
    following_id: string;
}
export interface SocialStats {
    followers_count: number;
    following_count: number;
    mutual_follows_count: number;
    recommendations_count: number;
    avg_trust_score: number;
}
export interface SocialConnection {
    user: SocialUser;
    connection_type: 'following' | 'follower' | 'mutual';
    connected_since: string;
    trust_score?: number;
}
export interface FollowersResponse {
    followers: SocialConnection[];
    total_count: number;
    page: number;
    per_page: number;
    has_more: boolean;
}
export interface FollowingResponse {
    following: SocialConnection[];
    total_count: number;
    page: number;
    per_page: number;
    has_more: boolean;
}
export interface MutualFollowsResponse {
    mutual_follows: SocialUser[];
    total_count: number;
}
export interface FollowSuggestionsResponse {
    suggestions: SocialUser[];
    suggestion_reasons: Record<string, string[]>;
}
export interface SocialActivity {
    id: string;
    type: 'follow' | 'recommendation' | 'upvote' | 'list_creation';
    user_id: string;
    target_user_id?: string;
    target_recommendation_id?: string;
    target_list_id?: string;
    created_at: string;
    metadata?: Record<string, any>;
}
export interface FollowResponse {
    success: boolean;
    following: boolean;
    followers_count: number;
    following_count: number;
}
export interface SocialGraphNode {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    trust_score: number;
    distance: number;
    connection_path?: string[];
}
export interface TrustNetwork {
    nodes: SocialGraphNode[];
    edges: {
        from: string;
        to: string;
        weight: number;
        relationship_type: 'follow' | 'mutual';
    }[];
}
export interface UserProfileProps {
    userId: string;
    currentUserId?: string;
}
export interface FollowButtonProps {
    targetUserId: string;
    currentUserId: string;
    isFollowing: boolean;
    onFollowChange: (isFollowing: boolean) => void;
    size?: 'small' | 'medium' | 'large';
    variant?: 'primary' | 'secondary' | 'outline';
}
export interface SocialListProps {
    users: SocialUser[];
    currentUserId: string;
    listType: 'followers' | 'following' | 'suggestions';
    onUserClick: (userId: string) => void;
    onFollowChange: (userId: string, isFollowing: boolean) => void;
}
export interface SocialStatsProps {
    stats: SocialStats;
    userId: string;
    currentUserId?: string;
}
export interface UserSearchFilters {
    query?: string;
    min_reputation?: number;
    has_recommendations?: boolean;
    location?: string;
    verification_status?: 'verified' | 'expert' | 'basic';
    sort_by?: 'reputation' | 'followers' | 'recent_activity' | 'recommendations';
    sort_order?: 'asc' | 'desc';
}
export interface UserSearchResponse {
    users: SocialUser[];
    total_count: number;
    page: number;
    per_page: number;
    has_more: boolean;
    filters_applied: UserSearchFilters;
}
