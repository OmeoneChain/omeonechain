// lib/supabase.ts - Create this file
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          username: string | null
          email: string | null
          reputation_score: number
          trust_score: number
          staking_balance: number
          staking_tier: string
          verification_level: string
          created_at: string
          updated_at: string
        }
        Insert: {
          wallet_address: string
          username?: string
          email?: string
          reputation_score?: number
          trust_score?: number
        }
        Update: {
          username?: string
          email?: string
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