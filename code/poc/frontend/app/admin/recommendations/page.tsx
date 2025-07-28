// app/admin/recommendations/page.tsx - FIXED VERSION
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'  // ✅ FIXED: Use named import

interface Recommendation {
  id: string
  title: string
  description: string  // ✅ FIXED: Changed from 'content' to 'description' to match DB schema
  category: string
  restaurant_name: string
  restaurant_address: string
  latitude: number
  longitude: number
  author_name: string
  trust_score: number
  upvotes: number
  saves: number
  created_at: string
}

export default function AdminRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      
      // ✅ FIXED: Use the same query structure that worked in the API test
      const { data, error: fetchError } = await supabase
        .from('recommendations')
        .select(`
          *,
          restaurants(name, address, city),
          users(username, wallet_address)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Supabase error:', fetchError)
        throw fetchError
      }

      console.log('Raw data from Supabase:', data)

      // ✅ FIXED: Transform data to match interface
      const transformedData = data?.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category || 'uncategorized',
        restaurant_name: item.restaurants?.name || 'Unknown Restaurant',
        restaurant_address: item.restaurants?.address || 'Unknown Address',
        latitude: item.latitude || 0,
        longitude: item.longitude || 0,
        author_name: item.users?.username || item.users?.wallet_address || 'Unknown User',
        trust_score: item.trust_score || 0,
        upvotes: item.upvotes || 0,
        saves: item.saves || 0,
        created_at: item.created_at
      })) || []

      console.log('Transformed data:', transformedData)
      setRecommendations(transformedData)
    } catch (err) {
      console.error('Error fetching recommendations:', err)
      setError(`Failed to load recommendations: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteRecommendation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recommendation?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Remove from local state
      setRecommendations(prev => prev.filter(rec => rec.id !== id))
      alert('Recommendation deleted successfully')
    } catch (err) {
      console.error('Error deleting recommendation:', err)
      alert('Failed to delete recommendation')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading recommendations...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin: Database Recommendations</h1>
          <p className="text-gray-600 mt-2">
            Total recommendations in database: <strong>{recommendations.length}</strong>
          </p>
          <button 
            onClick={fetchRecommendations}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 text-red-600 underline text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {recommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Recommendations Found</h2>
            <p className="text-gray-500">
              No recommendations have been saved to the database yet. 
              Try creating a recommendation to see it appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{rec.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{rec.category}</span>
                      <span>by {rec.author_name}</span>
                      <span>Trust Score: {rec.trust_score.toFixed(2)}/1.0</span>
                      <span>{rec.upvotes} upvotes</span>
                      <span>{rec.saves} saves</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteRecommendation(rec.id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-300 hover:border-red-500"
                  >
                    Delete
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Restaurant Details</h4>
                    <p className="text-gray-700 font-medium">{rec.restaurant_name}</p>
                    <p className="text-gray-600 text-sm">{rec.restaurant_address}</p>
                    {rec.latitude && rec.longitude && (
                      <p className="text-gray-500 text-xs">
                        Coordinates: {rec.latitude.toFixed(6)}, {rec.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Recommendation</h4>
                    <p className="text-gray-700 text-sm">{rec.description}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                  <span>ID: {rec.id}</span>
                  <span>Created: {new Date(rec.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Database Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Database Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{recommendations.length}</div>
              <div className="text-sm text-gray-600">Total Recommendations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {new Set(recommendations.map(r => r.restaurant_name)).size}
              </div>
              <div className="text-sm text-gray-600">Unique Restaurants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(recommendations.map(r => r.category)).size}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {recommendations.reduce((sum, r) => sum + r.upvotes, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Upvotes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}