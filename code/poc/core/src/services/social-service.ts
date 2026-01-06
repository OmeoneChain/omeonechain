import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export class SocialService {
  // Removed: private userManager: UserManager;
  // No UserManager dependency - direct database operations only

  constructor() {
    // Removed: this.userManager = new UserManager();
    console.log('SocialService initialized with database-first approach');
  }

  // ========================================
  // USER VALIDATION (Database-First)
  // ========================================

  private async validateUserInDatabase(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.log(`User ${userId} not found in database`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating user in database:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      return false;
    }
  }

  private async getAllUsersFromDatabase(): Promise<any[]> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users from database:', error);
        return [];
      }

      return users || [];
    } catch (error) {
      console.error('Error in getAllUsersFromDatabase:', error);
      return [];
    }
  }

  // ========================================
  // FOLLOW FUNCTIONALITY
  // ========================================

  async followUser(followerId: string, followeeId: string): Promise<{ success: boolean; message: string }> {
    console.log(`Follow operation: ${followerId} → ${followeeId}`);

    try {
      // Validate both users exist in database
      const followerExists = await this.validateUserInDatabase(followerId);
      const followeeExists = await this.validateUserInDatabase(followeeId);

      if (!followerExists) {
        return { success: false, message: 'Follower not found in database' };
      }

      if (!followeeExists) {
        return { success: false, message: 'User to follow not found in database' };
      }

      // Check if already following
      const { data: existingConnection, error: checkError } = await supabase
        .from('social_connections')
        .select('id, is_active')
        .eq('follower_id', followerId)
        .eq('following_id', followeeId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing connection:', checkError);
        return { success: false, message: 'Database error checking existing connection' };
      }

      if (existingConnection) {
        if (existingConnection.is_active) {
          return { success: false, message: 'Already following this user' };
        } else {
          // Reactivate existing connection
          const { error: updateError } = await supabase
            .from('social_connections')
            .update({ 
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('follower_id', followerId)
            .eq('following_id', followeeId);

          if (updateError) {
            console.error('Error reactivating connection:', updateError);
            return { success: false, message: 'Failed to reactivate connection' };
          }

          console.log(`Reactivated connection: ${followerId} → ${followeeId}`);
          return { success: true, message: 'Successfully started following user again' };
        }
      }

      // Create new social connection
      const { data: newConnection, error: insertError } = await supabase
        .from('social_connections')
        .insert({
          follower_id: followerId,
          following_id: followeeId,
          trust_weight: 0.75,
          connection_type: 'follow',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating social connection:', insertError);
        return { 
          success: false, 
          message: `Failed to create connection: ${insertError.message}` 
        };
      }

      console.log(`Created new social connection:`, newConnection.id);
      return { 
        success: true, 
        message: 'Successfully started following user' 
      };

    } catch (error) {
      console.error('Unexpected error in followUser:', error);
      return { 
        success: false, 
        message: 'Unexpected error occurred' 
      };
    }
  }

  async unfollowUser(followerId: string, followeeId: string): Promise<{ success: boolean; message: string }> {
    console.log(`Unfollow operation: ${followerId} → ${followeeId}`);

    try {
      // Validate both users exist in database
      const followerExists = await this.validateUserInDatabase(followerId);
      const followeeExists = await this.validateUserInDatabase(followeeId);

      if (!followerExists || !followeeExists) {
        return { success: false, message: 'One or both users not found in database' };
      }

      // Find and deactivate the connection
      const { error: updateError } = await supabase
        .from('social_connections')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('follower_id', followerId)
        .eq('following_id', followeeId)
        .eq('is_active', true);

      if (updateError) {
        console.error('Error deactivating connection:', updateError);
        return { success: false, message: 'Failed to unfollow user' };
      }

      console.log(`Deactivated connection: ${followerId} → ${followeeId}`);
      return { success: true, message: 'Successfully unfollowed user' };

    } catch (error) {
      console.error('Unexpected error in unfollowUser:', error);
      return { success: false, message: 'Unexpected error occurred' };
    }
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    try {
      const { data: connection, error } = await supabase
        .from('social_connections')
        .select('is_active')
        .eq('follower_id', followerId)
        .eq('following_id', followeeId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
        return false;
      }

      return !!connection;
    } catch (error) {
      console.error('Error in isFollowing:', error);
      return false;
    }
  }

  // ========================================
  // USER STATS AND PROFILES
  // ========================================

  async getUserStats(userId: string): Promise<any> {
    try {
      // Validate user exists in database
      const userExists = await this.validateUserInDatabase(userId);
      if (!userExists) {
        return {
          followers_count: 0,
          following_count: 0,
          recommendations_count: 0,
          reputation_score: 0.0
        };
      }

      // Get user stats from database
      const { data: userStats, error } = await supabase
        .from('users')
        .select(`
          followers_count,
          following_count,
          total_recommendations,
          reputation_score
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user stats:', error);
        return {
          followers_count: 0,
          following_count: 0,
          recommendations_count: 0,
          reputation_score: 0.0
        };
      }

      return {
        followers_count: userStats.followers_count || 0,
        following_count: userStats.following_count || 0,
        recommendations_count: userStats.total_recommendations || 0,
        reputation_score: userStats.reputation_score || 0.0
      };

    } catch (error) {
      console.error('Error in getUserStats:', error);
      return {
        followers_count: 0,
        following_count: 0,
        recommendations_count: 0,
        reputation_score: 0.0
      };
    }
  }

  async getDiscoverUsers(
    currentUserId?: string,
    options?: {
      limit?: number;
      sortBy?: 'followers_count' | 'total_recommendations' | 'created_at';
      city?: string;
    }
  ): Promise<any[]> {
    try {
      const { limit = 20, sortBy = 'followers_count', city } = options || {};
    
      console.log('getDiscoverUsers called with:', { currentUserId, limit, sortBy, city });
    
      // Build query with sorting
      let query = supabase
        .from('users')
        .select('*')
        .order(sortBy, { ascending: false });
    
      // Filter by city if provided
      if (city) {
        query = query.ilike('location_city', `%${city}%`);
      }
    
      // Exclude current user
      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }
    
      // Apply limit
      query = query.limit(limit);
    
      const { data: users, error } = await query;
    
      if (error) {
        console.error('Error fetching discover users:', error);
        return [];
      }
    
      // Transform to match the expected discover format
      const discoveryUsers = (users || []).map(user => ({
        id: user.id,
        display_name: user.display_name || user.username || 'Anonymous',
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar_url: user.avatar_url,
        reputation_score: user.reputation_score || 0.0,
        followers_count: user.followers_count || 0,
        following_count: user.following_count || 0,
        recommendations_count: user.total_recommendations || 0,
        avg_trust_score: user.avg_trust_score || 0,
        location_city: user.location_city || null,
        verification_status: user.verification_level || 'basic',
        verification_level: user.verification_level || 'basic',
        is_following: false,
        created_at: user.created_at
      }));

      // Update follow status if current user is provided
      if (currentUserId) {
        for (const user of discoveryUsers) {
          user.is_following = await this.isFollowing(currentUserId, user.id);
        }
      }

      console.log(`Returning ${discoveryUsers.length} discover users`);
      return discoveryUsers;

    } catch (error) {
      console.error('Error in getDiscoverUsers:', error);
      return [];
    }
  }

  // ADD this new method for user search:
  async searchUsers(
    query: string,
    options?: {
      currentUserId?: string;
      city?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    try {
      const { currentUserId, city, limit = 20 } = options || {};
    
      if (!query || query.trim().length < 2) {
        return [];
      }
    
      const searchTerm = query.trim();
    
      console.log('searchUsers called with:', { query: searchTerm, city, limit, currentUserId });
    
      // Search by username OR display_name using ilike
      let dbQuery = supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .order('followers_count', { ascending: false })
        .limit(limit);
    
      // Filter by city if provided
      if (city) {
        dbQuery = dbQuery.ilike('location_city', `%${city}%`);
      }
    
      // Exclude current user
      if (currentUserId) {
        dbQuery = dbQuery.neq('id', currentUserId);
      }
    
      const { data: users, error } = await dbQuery;
    
      if (error) {
        console.error('Error searching users:', error);
        return [];
      }
    
      // Transform results
      const searchResults = (users || []).map(user => ({
        id: user.id,
        display_name: user.display_name || user.username || 'Anonymous',
        username: user.username,
        bio: user.bio,
        avatar_url: user.avatar_url,
        reputation_score: user.reputation_score || 0.0,
        followers_count: user.followers_count || 0,
        following_count: user.following_count || 0,
        recommendations_count: user.total_recommendations || 0,
        avg_trust_score: user.avg_trust_score || 0,
        location_city: user.location_city || null,
        verification_status: user.verification_level || 'basic',
        verification_level: user.verification_level || 'basic',
        is_following: false,
        created_at: user.created_at
      }));

      // Update follow status if current user is provided
      if (currentUserId) {
        for (const user of searchResults) {
          user.is_following = await this.isFollowing(currentUserId, user.id);
        }
      }

      console.log(`Returning ${searchResults.length} search results`);
      return searchResults;

    } catch (error) {
      console.error('Error in searchUsers:', error);
      return [];
    }
  }

  // ========================================
  // FOLLOWERS/FOLLOWING LISTS
  // ========================================

  async getFollowers(userId: string, page: number = 1, perPage: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * perPage;
      
      const { data, error, count } = await supabase
        .from('social_connections')
        .select(`
          follower_id,
          users!social_connections_follower_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            reputation_score,
            verification_level
          )
        `, { count: 'exact' })
        .eq('following_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1);

      if (error) throw error;

      const followers = (data || []).map(connection => ({
        id: connection.users.id,
        username: connection.users.username,
        display_name: connection.users.display_name || 'Anonymous',
        avatar_url: connection.users.avatar_url,
        reputation_score: connection.users.reputation_score || 0.0,
        verification_level: connection.users.verification_level || 'basic'
      }));

      return {
        followers,
        total_count: count || 0,
        page,
        per_page: perPage
      };
    } catch (error) {
      console.error('Error getting followers:', error);
      return {
        followers: [],
        total_count: 0,
        page,
        per_page: perPage
      };
    }
  }

  async getFollowing(userId: string, page: number = 1, perPage: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * perPage;
      
      const { data, error, count } = await supabase
        .from('social_connections')
        .select(`
          following_id,
          users!social_connections_following_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            reputation_score,
            verification_level
          )
        `, { count: 'exact' })
        .eq('follower_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1);

      if (error) throw error;

      const following = (data || []).map(connection => ({
        id: connection.users.id,
        username: connection.users.username,
        display_name: connection.users.display_name || 'Anonymous',
        avatar_url: connection.users.avatar_url,
        reputation_score: connection.users.reputation_score || 0.0,
        verification_level: connection.users.verification_level || 'basic'
      }));

      return {
        following,
        total_count: count || 0,
        page,
        per_page: perPage
      };
    } catch (error) {
      console.error('Error getting following:', error);
      return {
        following: [],
        total_count: 0,
        page,
        per_page: perPage
      };
    }
  }

  // ========================================
  // SIMPLE DEBUG (Minimal)
  // ========================================

  async getDebugInfo(): Promise<any> {
    try {
      const users = await this.getAllUsersFromDatabase();
      
      return {
        service: 'SocialService',
        timestamp: new Date().toISOString(),
        realDatabaseUsers: {
          count: users.length,
          sample_users: users.slice(0, 3).map(u => ({
            id: u.id,
            display_name: u.display_name,
            username: u.username
          }))
        }
      };
    } catch (error) {
      return {
        service: 'SocialService',
        error: error.message
      };
    }
  }
}