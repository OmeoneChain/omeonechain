/**
 * Developer Panel Component
 * 
 * File: /frontend/src/components/DeveloperPanel.tsx
 * 
 * Temporary developer panel for testing different user reputation scenarios.
 * Allows simulation of various user personas to test Trust Score calculations.
 */

import React, { useState, useEffect } from 'react';

// Types for mock user data
interface MockUserData {
  reputationScore: number;
  socialConnections: number;
  verificationLevel: 'basic' | 'verified' | 'expert';
  totalRecommendations: number;
  upvotesReceived: number;
}

// Predefined user personas for quick testing
const USER_PERSONAS = {
  newUser: {
    name: 'New User',
    reputationScore: 0.1,
    socialConnections: 2,
    verificationLevel: 'basic' as const,
    totalRecommendations: 0,
    upvotesReceived: 0,
  },
  contributor: {
    name: 'Active Contributor',
    reputationScore: 0.5,
    socialConnections: 25,
    verificationLevel: 'verified' as const,
    totalRecommendations: 15,
    upvotesReceived: 45,
  },
  expert: {
    name: 'Expert Curator',
    reputationScore: 0.8,
    socialConnections: 100,
    verificationLevel: 'expert' as const,
    totalRecommendations: 50,
    upvotesReceived: 200,
  },
};

interface DeveloperPanelProps {
  onUserDataChange?: (userData: MockUserData) => void;
}

export const DeveloperPanel: React.FC<DeveloperPanelProps> = ({ 
  onUserDataChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<MockUserData>(USER_PERSONAS.contributor);

  // Update parent component when user data changes
  useEffect(() => {
    if (onUserDataChange) {
      onUserDataChange(userData);
    }
    
    // Store mock data in localStorage for backend to use
    localStorage.setItem('mockUserData', JSON.stringify(userData));
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('mockUserDataChanged', { 
      detail: userData 
    }));
  }, [userData, onUserDataChange]);

  const handleSliderChange = (field: keyof MockUserData, value: number | string) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const loadPersona = (persona: keyof typeof USER_PERSONAS) => {
    setUserData(USER_PERSONAS[persona]);
  };

  const resetToDefault = () => {
    setUserData(USER_PERSONAS.contributor);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        >
          🛠️ Dev Panel
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white border border-gray-300 rounded-lg shadow-xl">
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
        <h3 className="font-medium text-sm">🛠️ Developer Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-gray-200 text-lg font-bold"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Quick Personas */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Quick Personas
          </label>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(USER_PERSONAS).map(([key, persona]) => (
              <button
                key={key}
                onClick={() => loadPersona(key as keyof typeof USER_PERSONAS)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-center"
              >
                {persona.name}
              </button>
            ))}
          </div>
        </div>

        {/* Reputation Score */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Reputation Score: {userData.reputationScore.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={userData.reputationScore}
            onChange={(e) => handleSliderChange('reputationScore', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.1 (New)</span>
            <span>0.5 (Active)</span>
            <span>1.0 (Expert)</span>
          </div>
        </div>

        {/* Social Connections */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Social Connections: {userData.socialConnections}
          </label>
          <input
            type="range"
            min="0"
            max="200"
            step="5"
            value={userData.socialConnections}
            onChange={(e) => handleSliderChange('socialConnections', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>100</span>
            <span>200+</span>
          </div>
        </div>

        {/* Verification Level */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Verification Level
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(['basic', 'verified', 'expert'] as const).map((level) => (
              <button
                key={level}
                onClick={() => handleSliderChange('verificationLevel', level)}
                className={`text-xs px-2 py-1 rounded border capitalize ${
                  userData.verificationLevel === level
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Total Recommendations */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Total Recommendations: {userData.totalRecommendations}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={userData.totalRecommendations}
            onChange={(e) => handleSliderChange('totalRecommendations', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Upvotes Received */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Upvotes Received: {userData.upvotesReceived}
          </label>
          <input
            type="range"
            min="0"
            max="500"
            step="5"
            value={userData.upvotesReceived}
            onChange={(e) => handleSliderChange('upvotesReceived', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Current Values Display */}
        <div className="bg-gray-50 p-2 rounded border">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Current Mock Data:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Reputation: {userData.reputationScore.toFixed(2)}</div>
            <div>Connections: {userData.socialConnections}</div>
            <div>Level: {userData.verificationLevel}</div>
            <div>Recommendations: {userData.totalRecommendations}</div>
            <div>Upvotes: {userData.upvotesReceived}</div>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetToDefault}
          className="w-full text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border"
        >
          Reset to Default
        </button>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
          <p className="text-xs text-yellow-800">
            <strong>Testing:</strong> Adjust values above, then create recommendations to see how Trust Scores vary with different user personas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeveloperPanel;