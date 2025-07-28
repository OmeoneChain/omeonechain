// File path: /code/poc/frontend/src/hooks/useTrustScore.ts

import { useState, useEffect, useCallback } from 'react';
import TrustScoreService, { 
  TrustScoreBreakdown, 
  UserReputation, 
  Recommendation 
} from '../services/TrustScoreService';

export interface UseTrustScoreReturn {
  // User data
  userReputation: UserReputation | null;
  userAddress: string;
  
  // Trust score calculations
  trustBreakdown: TrustScoreBreakdown | null;
  
  // Recommendations
  recommendations: Recommendation[];
  
  // Loading states
  loading: {
    reputation: boolean;
    trustScore: boolean;
    recommendations: boolean;
    endorsing: boolean;
  };
  
  // Error states
  errors: {
    reputation: string | null;
    trustScore: string | null;
    recommendations: string | null;
    endorsing: string | null;
  };
  
  // Actions
  calculateTrustScore: (recommendationId: string) => Promise<void>;
  loadUserReputation: (address: string) => Promise<void>;
  loadRecommendations: (options?: any) => Promise<void>;
  endorseRecommendation: (recommendationId: string, type: 'save' | 'upvote' | 'share') => Promise<void>;
  createRecommendation: (recommendation: any) => Promise<string | null>;
  
  // Connection status
  isConnected: boolean;
  testConnection: () => Promise<boolean>;
}

export const useTrustScore = (initialUserAddress?: string): UseTrustScoreReturn => {
  // State
  const [userReputation, setUserReputation] = useState<UserReputation | null>(null);
  const [userAddress, setUserAddress] = useState<string>(initialUserAddress || 'user_123');
  const [trustBreakdown, setTrustBreakdown] = useState<TrustScoreBreakdown | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Loading states
  const [loading, setLoading] = useState({
    reputation: false,
    trustScore: false,
    recommendations: false,
    endorsing: false
  });
  
  // Error states
  const [errors, setErrors] = useState({
    reputation: null as string | null,
    trustScore: null as string | null,
    recommendations: null as string | null,
    endorsing: null as string | null
  });
  
  // Service instance
  const [trustScoreService] = useState(() => new TrustScoreService());
  
  // Helper to update loading state
  const setLoadingState = useCallback((key: keyof typeof loading, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Helper to update error state
  const setErrorState = useCallback((key: keyof typeof errors, value: string | null) => {
    setErrors(prev => ({ ...prev, [key]: value }));
  }, []);
  
  /**
   * Test connection to IOTA Rebased testnet
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const connected = await trustScoreService['iotaService'].testConnection();
      setIsConnected(connected);
      return connected;
    } catch (error) {
      console.error('Connection test failed:', error);
      setIsConnected(false);
      return false;
    }
  }, [trustScoreService]);
  
  /**
   * Load user reputation from IOTA testnet
   */
  const loadUserReputation = useCallback(async (address: string): Promise<void> => {
    setLoadingState('reputation', true);
    setErrorState('reputation', null);
    
    try {
      const reputation = await trustScoreService.getUserReputation(address);
      setUserReputation(reputation);
      setUserAddress(address);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user reputation';
      setErrorState('reputation', errorMessage);
      console.error('Error loading user reputation:', error);
    } finally {
      setLoadingState('reputation', false);
    }
  }, [trustScoreService, setLoadingState, setErrorState]);
  
  /**
   * Calculate trust score for a specific recommendation
   */
  const calculateTrustScore = useCallback(async (recommendationId: string): Promise<void> => {
    setLoadingState('trustScore', true);
    setErrorState('trustScore', null);
    
    try {
      const breakdown = await trustScoreService.calculateTrustScore(recommendationId, userAddress);
      setTrustBreakdown(breakdown);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to calculate trust score';
      setErrorState('trustScore', errorMessage);
      console.error('Error calculating trust score:', error);
    } finally {
      setLoadingState('trustScore', false);
    }
  }, [trustScoreService, userAddress, setLoadingState, setErrorState]);
  
  /**
   * Load recommendations with trust scores
   */
  const loadRecommendations = useCallback(async (options: any = {}): Promise<void> => {
    setLoadingState('recommendations', true);
    setErrorState('recommendations', null);
    
    try {
      const recs = await trustScoreService.getRecommendations(userAddress, options);
      setRecommendations(recs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recommendations';
      setErrorState('recommendations', errorMessage);
      console.error('Error loading recommendations:', error);
    } finally {
      setLoadingState('recommendations', false);
    }
  }, [trustScoreService, userAddress, setLoadingState, setErrorState]);
  
  /**
   * Endorse a recommendation (save, upvote, share)
   */
  const endorseRecommendation = useCallback(async (
    recommendationId: string, 
    type: 'save' | 'upvote' | 'share'
  ): Promise<void> => {
    setLoadingState('endorsing', true);
    setErrorState('endorsing', null);
    
    try {
      await trustScoreService.endorseRecommendation(recommendationId, userAddress, type);
      
      // Refresh recommendations to show updated trust scores
      await loadRecommendations();
      
      // Recalculate trust score for this recommendation
      await calculateTrustScore(recommendationId);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to endorse recommendation';
      setErrorState('endorsing', errorMessage);
      console.error('Error endorsing recommendation:', error);
    } finally {
      setLoadingState('endorsing', false);
    }
  }, [trustScoreService, userAddress, loadRecommendations, calculateTrustScore, setLoadingState, setErrorState]);
  
  /**
   * Create a new recommendation
   */
  const createRecommendation = useCallback(async (recommendation: any): Promise<string | null> => {
    setLoadingState('recommendations', true);
    setErrorState('recommendations', null);
    
    try {
      const recommendationId = await trustScoreService.createRecommendation({
        ...recommendation,
        author: userAddress
      });
      
      // Refresh recommendations list
      await loadRecommendations();
      
      return recommendationId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create recommendation';
      setErrorState('recommendations', errorMessage);
      console.error('Error creating recommendation:', error);
      return null;
    } finally {
      setLoadingState('recommendations', false);
    }
  }, [trustScoreService, userAddress, loadRecommendations, setLoadingState, setErrorState]);
  
  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      // Test connection to IOTA Rebased
      await testConnection();
      
      // Load initial user reputation
      if (userAddress) {
        await loadUserReputation(userAddress);
        
        // Load initial recommendations
        await loadRecommendations();
      }
    };
    
    initialize();
  }, [userAddress]); // Only depend on userAddress to avoid infinite loops
  
  return {
    // User data
    userReputation,
    userAddress,
    
    // Trust score calculations
    trustBreakdown,
    
    // Recommendations
    recommendations,
    
    // Loading states
    loading,
    
    // Error states
    errors,
    
    // Actions
    calculateTrustScore,
    loadUserReputation,
    loadRecommendations,
    endorseRecommendation,
    createRecommendation,
    
    // Connection status
    isConnected,
    testConnection
  };
};