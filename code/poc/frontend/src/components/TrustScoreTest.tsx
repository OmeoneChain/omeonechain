// TrustScoreTest.tsx
// Add this component to test your enhanced API service
import React, { useState, useEffect } from 'react';
import { trustScoreApi, healthApi, useTrustScore } from '../services/api';

const TrustScoreTest: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [testRecommendationId] = useState('test-recommendation-1');
  
  // Using the new hook from your enhanced API service
  const { trustScore, loading, error } = useTrustScore(testRecommendationId, 'user1');

  // Check backend connection
  useEffect(() => {
    const checkBackend = async () => {
      const health = await healthApi.check();
      setBackendStatus(health.status === 'ok' ? 'connected' : 'disconnected');
    };
    
    checkBackend();
    const interval = setInterval(checkBackend, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleTestTrustSignal = async (signalType: 'save' | 'upvote' | 'share') => {
    const result = await trustScoreApi.updateTrustSignal(testRecommendationId, signalType);
    console.log('Trust signal result:', result);
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2>🔍 Trust Score Test Dashboard</h2>
      
      {/* Backend Status */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Backend Status</h3>
        <div style={{ 
          padding: '10px', 
          borderRadius: '4px',
          backgroundColor: backendStatus === 'connected' ? '#d4edda' : 
                          backendStatus === 'disconnected' ? '#f8d7da' : '#fff3cd',
          color: backendStatus === 'connected' ? '#155724' : 
                 backendStatus === 'disconnected' ? '#721c24' : '#856404'
        }}>
          Status: {backendStatus === 'checking' ? '⏳ Checking...' : 
                   backendStatus === 'connected' ? '✅ Connected to localhost:3001' :
                   '❌ Backend not responding (using mock data)'}
        </div>
      </div>

      {/* Trust Score Display */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Trust Score for Test Recommendation</h3>
        
        {loading && <div>⏳ Loading trust score...</div>}
        
        {error && (
          <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px' }}>
            ⚠️ Error: {error} (showing mock data)
          </div>
        )}
        
        {trustScore && (
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
              Trust Score: {trustScore.score.toFixed(2)} / 1.0
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <strong>Social Distance:</strong> {trustScore.socialDistance.toFixed(1)} hops
              </div>
              <div>
                <strong>Direct Friends:</strong> {trustScore.breakdown.directFriends}
              </div>
              <div>
                <strong>Friends of Friends:</strong> {trustScore.breakdown.friendsOfFriends}
              </div>
              <div>
                <strong>Total Endorsements:</strong> {trustScore.breakdown.totalEndorsements}
              </div>
            </div>

            <h4 style={{ marginTop: '15px', marginBottom: '10px' }}>Endorsers:</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {trustScore.endorsers.map((endorser, index) => (
                <div key={index} style={{ 
                  backgroundColor: '#e7f3ff', 
                  padding: '8px 12px', 
                  borderRadius: '16px',
                  fontSize: '14px'
                }}>
                  {endorser.userId} 
                  <span style={{ opacity: 0.7 }}>
                    ({endorser.socialDistance === 1 ? 'Direct' : '2nd degree'}, 
                    weight: {endorser.weight}, 
                    rep: {endorser.reputation.toFixed(1)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Test Trust Signals</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleTestTrustSignal('save')}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            🔖 Save Recommendation
          </button>
          <button 
            onClick={() => handleTestTrustSignal('upvote')}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            👍 Upvote Recommendation
          </button>
          <button 
            onClick={() => handleTestTrustSignal('share')}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#ffc107', 
              color: 'black', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            📤 Share Recommendation
          </button>
        </div>
      </div>

      {/* API Information */}
      <div style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
        <strong>API Configuration:</strong><br/>
        Base URL: {process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1'}<br/>
        WebSocket URL: {process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}<br/>
        <br/>
        <strong>Note:</strong> If backend is not connected, this component will display mock data to demonstrate Trust Score functionality.
      </div>
    </div>
  );
};

export default TrustScoreTest;