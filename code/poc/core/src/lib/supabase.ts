// File: code/poc/core/src/lib/supabase.ts
// Proper Supabase client for OmeoneChain

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not configured. Using mock mode.');
}

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    // Return mock client if credentials not configured
    return createMockClient();
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey);
}

// Mock client for development without Supabase
function createMockClient() {
  console.log('📦 Using mock Supabase client');
  
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => ({ data: null, error: null }),
          limit: (count: number) => Promise.resolve({ data: [], error: null })
        }),
        limit: (count: number) => Promise.resolve({ data: [], error: null })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: async () => ({ 
            data: { id: 'mock_' + Date.now(), ...data }, 
            error: null 
          })
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => Promise.resolve({ error: null })
      }),
      upsert: (data: any) => ({
        select: () => ({
          single: async () => ({ 
            data: { id: 'mock_' + Date.now(), ...data }, 
            error: null 
          })
        })
      })
    }),
    auth: {
      signUp: async (credentials: any) => ({ 
        data: { user: null, session: null }, 
        error: null 
      }),
      signInWithPassword: async (credentials: any) => ({ 
        data: { user: null, session: null }, 
        error: null 
      })
    }
  } as any;
}

// Re-export createClient as default
export default createClient;