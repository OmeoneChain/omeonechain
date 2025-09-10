// Simple mock Supabase client to unblock the route
export function createClient() {
  console.log('Using mock Supabase client');
  
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => Promise.resolve({ data: null, error: null })
        }),
        limit: (count: number) => Promise.resolve({ data: [], error: null })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({ 
            data: { id: 'test_id_' + Date.now(), ...data }, 
            error: null 
          })
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => Promise.resolve({ error: null })
      })
    })
  };
}
