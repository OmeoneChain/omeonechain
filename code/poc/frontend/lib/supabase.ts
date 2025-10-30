// File: code/poc/frontend/src/lib/services/supabase.ts
// Enhanced version of your existing supabase.ts with correct schema and service functions

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// UPDATED Database Types - Based on your actual Supabase schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          username: string | null
          email: string | null
          display_name: string | null  // Added - seen in screenshot
          bio: string | null           // Added - common profile field
          avatar_url: string | null    // Added - common profile field
          location_city: string | null // Added - common profile field
          location_country: string | null // Added - common profile field
          verification_status: string | null // Added - from schema
          reputation_score: number | null
          trust_score: number | null
          staking_balance: number | null
          staking_tier: string | null
          verification_level: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          wallet_address: string
          username?: string
          email?: string
          display_name?: string
          bio?: string
          avatar_url?: string
          location_city?: string
          location_country?: string
          verification_status?: string
          reputation_score?: number
          trust_score?: number
        }
        Update: {
          username?: string
          email?: string
          display_name?: string
          bio?: string
          avatar_url?: string
          location_city?: string
          location_country?: string
          verification_status?: string
          reputation_score?: number
          trust_score?: number
          staking_balance?: number
          staking_tier?: string
        }
      }
      restaurants: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          latitude: number | null
          longitude: number | null
          category: string | null
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          name: string
          address: string
          city: string
          latitude?: number
          longitude?: number
          category?: string
          description?: string
          created_by?: string
        }
        Update: {
          name?: string
          address?: string
          city?: string
          latitude?: number
          longitude?: number
          category?: string
          description?: string
        }
      }
      recommendations: {
        Row: {
          id: string
          restaurant_id: string
          author_id: string
          title: string
          description: string
          trust_score: number
          upvotes: number
          saves: number
          comments: number
          tags: string[]
          image_url: string | null
          token_rewards_earned: number
          verification_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          restaurant_id: string
          author_id: string
          title: string
          description: string
          tags?: string[]
          image_url?: string
        }
        Update: {
          title?: string
          description?: string
          trust_score?: number
          upvotes?: number
          saves?: number
          tags?: string[]
          image_url?: string
          token_rewards_earned?: number
        }
      }
    }
  }
}

// User type that matches your actual database structure
export type SupabaseUser = Database['public']['Tables']['users']['Row']

// Service functions for user management
export const SupabaseUserService = {
  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testing Supabase connection...')
      const { data, error } = await supabase
        .from('users')
        .select('count(*)')
        .limit(1)
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error)
        return false
      }
      
      console.log('✅ Supabase connection successful')
      return true
    } catch (error) {
      console.error('❌ Supabase connection error:', error)
      return false
    }
  },

  // Get user by wallet address
  async getUserByWalletAddress(walletAddress: string): Promise<SupabaseUser | null> {
    console.log('🔍 Looking up user by wallet address:', walletAddress)
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user doesn't exist
          console.log('ℹ️ User not found for wallet:', walletAddress)
          return null
        }
        console.error('❌ Error looking up user:', error)
        throw error
      }

      if (data) {
        console.log('✅ Found user in Supabase:', {
          id: data.id,
          username: data.username,
          display_name: data.display_name,
          wallet_address: data.wallet_address
        })
        return data
      }

      return null
    } catch (error) {
      console.error('❌ Failed to get user by wallet address:', error)
      throw error
    }
  },

  // Get user by ID
  async getUserById(userId: string): Promise<SupabaseUser | null> {
    console.log('🔍 Looking up user by ID:', userId)
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ User not found for ID:', userId)
          return null
        }
        console.error('❌ Error looking up user:', error)
        throw error
      }

      if (data) {
        console.log('✅ Found user in Supabase:', {
          id: data.id,
          username: data.username,
          display_name: data.display_name
        })
        return data
      }

      return null
    } catch (error) {
      console.error('❌ Failed to get user by ID:', error)
      throw error
    }
  },

  // Create new user
  async createUser(walletAddress: string, username?: string): Promise<SupabaseUser> {
    console.log('➕ Creating new user for wallet:', walletAddress)
    
    const newUser: Database['public']['Tables']['users']['Insert'] = {
      wallet_address: walletAddress,
      username: username || `user_${walletAddress.slice(-4)}`,
      display_name: username || `User ${walletAddress.slice(-4)}`,
      bio: null,
      email: null,
      verification_status: 'basic',
      reputation_score: 0,
      trust_score: 0
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to create user:', error)
        throw new Error(`Failed to create user: ${error.message}`)
      }

      console.log('✅ Created new user:', {
        id: data.id,
        username: data.username,
        display_name: data.display_name,
        wallet_address: data.wallet_address
      })
      
      return data
    } catch (error) {
      console.error('❌ Error creating user:', error)
      throw error
    }
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Database['public']['Tables']['users']['Update']): Promise<SupabaseUser> {
    console.log('📝 Updating user profile:', userId, updates)
    
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to update profile:', error)
        throw new Error(`Failed to update profile: ${error.message}`)
      }

      console.log('✅ Updated user profile:', {
        id: data.id,
        username: data.username,
        display_name: data.display_name
      })
      
      return data
    } catch (error) {
      console.error('❌ Error updating profile:', error)
      throw error
    }
  },

  // Check if username is available
  async checkUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('users')
        .select('id')
        .eq('username', username)

      if (excludeUserId) {
        query = query.neq('id', excludeUserId)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error checking username availability:', error)
        return false
      }

      // Username is available if no rows returned
      return !data || data.length === 0
    } catch (error) {
      console.error('❌ Error checking username availability:', error)
      return false
    }
  },

  // Get all users (for testing/admin)
  async getAllUsers(): Promise<SupabaseUser[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error getting all users:', error)
        throw error
      }

      console.log(`✅ Retrieved ${data?.length || 0} users from Supabase`)
      return data || []
    } catch (error) {
      console.error('❌ Error getting all users:', error)
      throw error
    }
  }
}

// Restaurant service functions
export const SupabaseRestaurantService = {
  // Get all restaurants
  async getAllRestaurants() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error getting restaurants:', error)
      throw error
    }

    return data || []
  },

  // Create restaurant
  async createRestaurant(restaurant: Database['public']['Tables']['restaurants']['Insert']) {
    const { data, error } = await supabase
      .from('restaurants')
      .insert([restaurant])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating restaurant:', error)
      throw error
    }

    return data
  }
}

// Recommendation service functions
export const SupabaseRecommendationService = {
  // Get all recommendations
  async getAllRecommendations() {
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        *,
        author:users!recommendations_author_id_fkey(*),
        restaurant:restaurants!recommendations_restaurant_id_fkey(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error getting recommendations:', error)
      throw error
    }

    return data || []
  },

  // Create recommendation
  async createRecommendation(recommendation: Database['public']['Tables']['recommendations']['Insert']) {
    const { data, error } = await supabase
      .from('recommendations')
      .insert([recommendation])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating recommendation:', error)
      throw error
    }

    return data
  }
}

export default supabase