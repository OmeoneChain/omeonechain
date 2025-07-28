// app/admin/test-api/page.tsx
'use client'

import { useState } from 'react'

export default function TestAPIPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const callTestAPI = async (action: string) => {
    setLoading(true)
    try {
      console.log(`Calling API with action: ${action}`)
      
      const response = await fetch('/api/admin/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      console.log(`Response status: ${response.status}`)
      
      const data = await response.json()
      console.log('Response data:', data)
      
      setResult({ type: action, status: response.status, data })

    } catch (error) {
      console.error('API call error:', error)
      setResult({ type: action, error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const testDatabaseConnection = () => callTestAPI('DB_TEST')
  const testCreateRecommendation = () => callTestAPI('CREATE')
  const testGetRecommendations = () => callTestAPI('GET')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API & Database Testing</h1>
        
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={testDatabaseConnection}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-4 rounded-lg font-medium"
          >
            {loading ? 'Testing...' : 'Test Database Connection'}
          </button>
          
          <button
            onClick={testCreateRecommendation}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white p-4 rounded-lg font-medium"
          >
            {loading ? 'Testing...' : 'Test Create Recommendation'}
          </button>
          
          <button
            onClick={testGetRecommendations}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white p-4 rounded-lg font-medium"
          >
            {loading ? 'Testing...' : 'Test Get Recommendations'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Test Result: {result.type}
              {result.status && (
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  result.status < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.status}
                </span>
              )}
            </h2>
            
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li><strong>Test Database Connection:</strong> Verifies Supabase connection is working</li>
            <li><strong>Test Create Recommendation:</strong> Creates a test recommendation via API</li>
            <li><strong>Test Get Recommendations:</strong> Fetches recommendations from database</li>
            <li>After testing, go to <a href="/admin/recommendations" className="text-blue-600 hover:underline">/admin/recommendations</a> to see saved data</li>
          </ol>
        </div>
      </div>
    </div>
  )
}