// Simple mock Supabase client to unblock the route
export function createClient() {
    console.log('Using mock Supabase client');
    return {
        from: (table) => ({
            select: (columns) => ({
                eq: (column, value) => ({
                    single: () => Promise.resolve({ data: null, error: null })
                }),
                limit: (count) => Promise.resolve({ data: [], error: null })
            }),
            insert: (data) => ({
                select: () => ({
                    single: () => Promise.resolve({
                        data: { id: 'test_id_' + Date.now(), ...data },
                        error: null
                    })
                })
            }),
            update: (data) => ({
                eq: (column, value) => Promise.resolve({ error: null })
            })
        })
    };
}
