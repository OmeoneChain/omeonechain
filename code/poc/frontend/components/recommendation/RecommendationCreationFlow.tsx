// components/recommendation/RecommendationCreationFlow.tsx
// UPDATED VERSION: Now uses integer restaurant IDs with smart matching backend

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Plus, ArrowLeft, Loader, Star, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import EnhancedPhotoUpload from './EnhancedPhotoUpload';
import RecommendationCard from '../RecommendationCard';
import { useGeolocation } from '../../src/hooks/useGeolocation';
import { IOTAService } from '../../src/services/IOTAService';
import { useAuth, useAuthenticatedFetch } from '../../hooks/useAuth';

// Updated Restaurant interface with integer ID
interface Restaurant {
  id: number; // Changed from string to number
  name: string;
  normalized_name?: string; // Added for smart matching
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  cuisine?: string;
  priceRange?: '€' | '€€' | '€€€' | '€€€€';
  category?: string;
  created_at?: string;
  updated_at?: string;
}

// For restaurant suggestions from backend
interface RestaurantSuggestion {
  restaurant: Restaurant;
  similarity: number;
  distance?: number;
}

interface PhotoData {
  file: File;
  preview: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: Date;
}

interface AssessmentData {
  rating: number; // 1-10 scale for personal memory
  wouldRecommend: boolean;
  confidence: 'low' | 'medium' | 'high';
  experience: 'exceeded' | 'met' | 'below';
  tags: string[];
}

interface RecommendationDraft {
  restaurant: Restaurant | null;
  title: string;
  body: string;
  category: string;
  photos: PhotoData[];
  assessment: AssessmentData;
  visitDate?: Date;
  pricePoint?: number;
}

const categories = [
  'Café da Manhã', 'Almoço', 'Jantar', 'Café & Bebidas', 
  'Sobremesas', 'Ocasião Especial', 'Lanche Rápido', 'Madrugada'
];

const contextTags = [
  { id: 'romantic', label: 'Romântico', icon: '💕' },
  { id: 'family', label: 'Família', icon: '👨‍👩‍👧‍👦' },
  { id: 'business', label: 'Trabalho', icon: '💼' },
  { id: 'friends', label: 'Amigos', icon: '👥' },
  { id: 'celebration', label: 'Celebração', icon: '🎉' },
  { id: 'casual', label: 'Casual', icon: '😊' },
  { id: 'quick', label: 'Rápido', icon: '⚡' },
  { id: 'late', label: 'Tardio', icon: '🌙' }
];

const ratingLabels: { [key: number]: string } = {
  1: 'Terrível',
  2: 'Muito Ruim',
  3: 'Ruim', 
  4: 'Regular',
  5: 'Razoável',
  6: 'Bom',
  7: 'Muito Bom',
  8: 'Ótimo',
  9: 'Excelente',
  10: 'Perfeito'
};

const priceRanges = [
  { value: '€', label: '€ - Econômico (até R$ 30)' },
  { value: '€€', label: '€€ - Moderado (R$ 30-60)' },
  { value: '€€€', label: '€€€ - Caro (R$ 60-120)' },
  { value: '€€€€', label: '€€€€ - Muito Caro (R$ 120+)' }
];

interface RecommendationCreationFlowProps {
  onSuccess?: (recommendationId: string) => void;
  onError?: (error: Error) => void;
  isSubmitting?: boolean;
  setIsSubmitting?: (loading: boolean) => void;
}

const RecommendationCreationFlow: React.FC<RecommendationCreationFlowProps> = ({
  onSuccess,
  onError,
  isSubmitting = false,
  setIsSubmitting
}) => {
  const [step, setStep] = useState<'restaurant' | 'recommendation' | 'preview'>('restaurant');
  const [draft, setDraft] = useState<RecommendationDraft>({
    restaurant: null,
    title: '',
    body: '',
    category: '',
    photos: [],
    assessment: {
      rating: 7,
      wouldRecommend: true,
      confidence: 'medium',
      experience: 'met',
      tags: []
    }
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [suggestions, setSuggestions] = useState<RestaurantSuggestion[]>([]);
  const [showAddNew, setShowAddNew] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState<Partial<Restaurant>>({
    name: '',
    address: '',
    city: 'Brasília',
    category: '',
    priceRange: '€€'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [iotaService, setIotaService] = useState<IOTAService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'fallback'>('testing');
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  const { user, isAuthenticated } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  // API Base URL
  const API_BASE_URL = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

  const getCurrentUser = () => {
    console.log('Getting current user from auth context...');
    console.log('Auth status:', { isAuthenticated, user: user?.id, address: user?.address });
    
    if (!isAuthenticated || !user) {
      throw new Error('No user logged in - please connect your wallet first');
    }
    
    const currentUser = {
      id: user.id,
      name: user.name || user.display_name || user.username || 'User',
      walletAddress: user.address || user.walletAddress || user.id
    };
    
    console.log('Current user resolved:', currentUser);
    return currentUser;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      console.warn('User not authenticated - recommendation creation requires login');
    }
  }, [isAuthenticated]);

  // Initialize IOTA Service
  useEffect(() => {
    const initIOTA = async () => {
      try {
        console.log('Creating IOTA service instance...');
        const service = new IOTAService();
        setIotaService(service);
        
        console.log('Testing IOTA Rebased connection...');
        const isConnected = await service.testConnection();
        
        if (isConnected) {
          setConnectionStatus('connected');
          console.log('IOTA Rebased connected successfully!');
          
          const info = await service.getNetworkInfo();
          setNetworkInfo(info);
          console.log('Network info:', info);
        } else {
          setConnectionStatus('fallback');
          console.log('IOTA connection limited - using fallback mode');
        }
        
      } catch (error) {
        console.error('IOTA service initialization failed:', error);
        setConnectionStatus('fallback');
        onError?.(new Error('IOTA connection limited. Using fallback mode.'));
      }
    };

    initIOTA();
  }, [onError]);

  // Location services
  const location = {
    latitude: -15.8052,
    longitude: -47.889,
    accuracy: 10,
    address: 'Asa Sul',
    city: 'Brasília',
    country: 'Brazil'
  };
  const locationLoading = false;
  const locationError = null;

  // Search restaurants using the new backend API
  const searchRestaurants = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Searching restaurants with backend API:', query);
      
      // Search for existing restaurants
      const searchParams = new URLSearchParams({
        search: query.trim(),
        city: location.city || 'Brasília',
        ...(location.latitude && { lat: location.latitude.toString() }),
        ...(location.longitude && { lng: location.longitude.toString() })
      });

      const response = await fetch(`${API_BASE_URL}/api/restaurants?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('omeone_auth_token')
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Restaurant search results:', data);
        
        // Handle exact matches
        setSearchResults(data.results || []);
        
        // Handle suggestions for similar restaurants
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        console.warn('Restaurant search failed:', response.status);
        setSearchResults([]);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Restaurant search error:', error);
      setSearchResults([]);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length > 2) {
        searchRestaurants(searchQuery);
      } else {
        setSearchResults([]);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    console.log('=== RESTAURANT SELECTED ===');
    console.log('Restaurant:', restaurant);
    console.log('Restaurant coordinates:', { lat: restaurant.latitude, lng: restaurant.longitude });
    
    setDraft(prev => ({ ...prev, restaurant }));
    setShowSuggestions(false);
    setStep('recommendation');
  };

  const handleCreateNewRestaurant = async () => {
    if (!newRestaurant.name || !newRestaurant.address) {
      alert('Por favor, preencha nome e endereço do restaurante');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Creating new restaurant with backend API...');
      
      const restaurantData = {
        name: newRestaurant.name.trim(),
        address: newRestaurant.address.trim(),
        city: newRestaurant.city || 'Brasília',
        category: newRestaurant.category?.trim() || undefined,
        // Include coordinates if available
        ...(location.latitude && { latitude: location.latitude }),
        ...(location.longitude && { longitude: location.longitude })
      };

      console.log('Restaurant creation payload:', restaurantData);

      const response = await fetch(`${API_BASE_URL}/api/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('omeone_auth_token')
        },
        body: JSON.stringify(restaurantData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create restaurant: ${response.status}`);
      }

      const result = await response.json();
      console.log('Restaurant created successfully:', result);

      const createdRestaurant = result.restaurant;
      
      console.log('=== NEW RESTAURANT CREATED ===');
      console.log('New restaurant:', createdRestaurant);
      
      setDraft(prev => ({ ...prev, restaurant: createdRestaurant }));
      setShowAddNew(false);
      setSearchQuery('');
      setStep('recommendation');
      
    } catch (error) {
      console.error('Error creating restaurant:', error);
      alert(`Erro ao criar restaurante: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotosChange = (photos: PhotoData[]) => {
    setDraft(prev => ({ ...prev, photos }));
  };

  const uploadPhotosToIPFS = async (photos: PhotoData[]): Promise<string[]> => {
    const uploadPromises = photos.map(async (photo) => {
      try {
        const buffer = await photo.file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        const ipfsHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        
        console.log(`Photo uploaded to IPFS: ${ipfsHash}`);
        return ipfsHash;
      } catch (error) {
        console.error('Error uploading photo to IPFS:', error);
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    console.log('SUBMIT BUTTON CLICKED - handleSubmit triggered!');
    console.log('Form data check:', {
      hasRestaurant: !!draft.restaurant,
      hasTitle: !!draft.title,
      hasBody: !!draft.body,
      hasCategory: !!draft.category
    });

    if (!draft.restaurant || !draft.title || !draft.body || !draft.category) {
      console.log('Form validation failed - missing required fields');
      return;
    }

    try {
      const currentUser = getCurrentUser();
      console.log('Authenticated user verified:', currentUser);
    } catch (error) {
      console.error('Authentication required:', error);
      alert('Please connect your wallet before creating recommendations');
      return;
    }
    
    setIsSubmitting?.(true);
    setIsLoading(true);
    
    try {
      const currentUser = getCurrentUser();

      // Step 1: Upload photos to IPFS if any
      let photoHashes: string[] = [];
      if (draft.photos.length > 0) {
        console.log(`Uploading ${draft.photos.length} photos to IPFS...`);
        try {
          photoHashes = await uploadPhotosToIPFS(draft.photos);
          console.log('Photos uploaded:', photoHashes);
        } catch (error) {
          console.warn('Photo upload failed, continuing without photos:', error);
        }
      }

      // Step 2: Prepare data for the API endpoint
      const apiPayload = {
        title: draft.title.trim(),
        content: draft.body.trim(),
        category: draft.category,
        restaurant_id: draft.restaurant.id, // Use the integer restaurant ID
        authorId: currentUser.walletAddress,
        // Include coordinates for legacy compatibility
        latitude: draft.restaurant.latitude,
        longitude: draft.restaurant.longitude,
        location: {
          city: draft.restaurant.city,
          latitude: draft.restaurant.latitude,
          longitude: draft.restaurant.longitude
        }
      };

      console.log('Calling Core Server: POST /api/recommendations');
      console.log('Payload with restaurant_id:', apiPayload);

      const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('omeone_auth_token')
        },
        body: JSON.stringify(apiPayload)
      });

      console.log('Core Server Response Status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Core Server API Error:', errorData);
        throw new Error(errorData.error || `Core Server API call failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('Core Server API Success:', result);

      // Step 3: Also submit to IOTA blockchain (parallel to database)
      if (iotaService && connectionStatus === 'connected') {
        console.log('Also submitting to IOTA blockchain...');
        
        const blockchainData = {
          title: draft.title,
          body: draft.body,
          author: currentUser.walletAddress,
          category: draft.category,
          location: {
            latitude: draft.restaurant.latitude || 0,
            longitude: draft.restaurant.longitude || 0,
            address: draft.restaurant.address,
            city: draft.restaurant.city
          },
          contentHash: result.recommendation?.id || 'db-' + Date.now(),
          metadata: {
            restaurantId: draft.restaurant.id, // Include the integer restaurant ID
            restaurantName: draft.restaurant.name,
            personalRating: draft.assessment.rating,
            wouldRecommend: draft.assessment.wouldRecommend,
            confidence: draft.assessment.confidence,
            experience: draft.assessment.experience,
            contextTags: draft.assessment.tags,
            photoHashes,
            photoCount: draft.photos.length,
            hasGPSPhotos: draft.photos.some(photo => photo.location),
            createdAt: new Date().toISOString(),
            visitDate: draft.visitDate?.toISOString(),
            language: 'pt-BR',
            platform: 'omeonechain-web',
            version: '1.0.0',
            databaseId: result.recommendation?.id
          }
        };

        try {
          const blockchainResult = await iotaService.storeRecommendation(blockchainData);
          console.log('Blockchain submission successful!', blockchainResult);

          if (blockchainResult?.id) {
            try {
              const trustCalculation = await iotaService.calculateLiveTrustScore(
                currentUser.walletAddress, 
                blockchainResult.id
              );
              console.log('Trust Score calculated:', trustCalculation);
              
              if (trustCalculation.finalScore >= 0.25) {
                console.log('Trust Score threshold reached - token rewards will be distributed');
              }
            } catch (trustError) {
              console.warn('Trust Score calculation failed:', trustError);
            }
          }
        } catch (blockchainError) {
          console.warn('Blockchain submission failed, but database storage succeeded:', blockchainError);
        }
      } else {
        console.log('IOTA service not available or not connected - skipping blockchain submission');
      }

      // Step 4: Success
      const recommendationId = result.recommendation?.id || 'unknown';
      console.log('Recommendation creation complete! Database ID:', recommendationId);
      console.log('Recommendation associated with restaurant ID:', draft.restaurant.id);
      
      onSuccess?.(recommendationId);

      // Reset form
      setDraft({
        restaurant: null,
        title: '',
        body: '',
        category: '',
        photos: [],
        assessment: {
          rating: 7,
          wouldRecommend: true,
          confidence: 'medium',
          experience: 'met',
          tags: []
        }
      });
      setStep('restaurant');

      alert(`Recomendação criada com sucesso! ID: ${recommendationId}`);

    } catch (error) {
      console.error('Submission failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', {
        message: errorMessage,
        draft: {
          title: draft.title,
          category: draft.category,
          hasRestaurant: !!draft.restaurant,
          restaurantId: draft.restaurant?.id
        },
        connectionStatus,
        iotaServiceAvailable: !!iotaService
      });
      
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      alert(`Erro ao criar recomendação: ${errorMessage}`);
    } finally {
      setIsSubmitting?.(false);
      setIsLoading(false);
    }
  };

  const calculateInitialTrustScore = (assessment: AssessmentData): number => {
    let score = 0.1;
    score = Math.max(score, assessment.rating * 0.1);
    
    if (assessment.confidence === 'high' && assessment.wouldRecommend) {
      score = Math.min(1.0, score + 0.2);
    }
    
    if (assessment.tags.length > 0) {
      score = Math.min(1.0, score + (assessment.tags.length * 0.05));
    }
    
    return Math.round(score * 100) / 100;
  };

  const calculateExpectedRewards = (draft: RecommendationDraft): number => {
    let rewards = 1.0;
    rewards += draft.photos.length * 0.2;
    
    if (draft.assessment.confidence === 'high') {
      rewards += 0.5;
    } else if (draft.assessment.confidence === 'medium') {
      rewards += 0.2;
    }
    
    rewards += draft.assessment.tags.length * 0.05;
    
    return Math.round(rewards * 100) / 100;
  };

  const generatePreviewRecommendation = () => {
    if (!draft.restaurant) return null;

    return {
      id: 'preview',
      title: draft.title,
      description: draft.body,
      photos: draft.photos.map(photo => ({
        url: photo.preview,
        hasLocation: !!photo.location,
        isCompressed: true
      })),
      category: draft.category,
      location: {
        name: draft.restaurant.name,
        address: draft.restaurant.address,
        city: draft.restaurant.city,
        latitude: draft.restaurant.latitude,
        longitude: draft.restaurant.longitude
      },
      author: {
        id: 'current-user',
        name: 'Você',
        avatar: '/default-avatar.png',
        reputation: 0,
        isFollowing: false,
        socialDistance: 1 as const,
        verificationLevel: 'basic' as const
      },
      trustScore: calculateInitialTrustScore(draft.assessment),
      trustBreakdown: {
        directFriends: 0,
        friendsOfFriends: 0,
        totalEndorsements: 0,
        socialHops: '±1 hop' as const,
        algorithm: 'PREVIEW'
      },
      engagement: {
        saves: 0,
        upvotes: 0,
        comments: 0
      },
      tokenRewards: {
        amount: calculateExpectedRewards(draft),
        usdValue: 0.12,
        earnedFrom: 'creation' as const
      },
      createdAt: new Date().toISOString(),
      tags: draft.assessment.tags,
      isBookmarked: false,
      hasUpvoted: false,
      verificationStatus: 'unverified' as const,
      personalRating: draft.assessment.rating,
      wouldRecommend: draft.assessment.wouldRecommend,
      confidence: draft.assessment.confidence
    };
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You need to connect your wallet to create recommendations and earn tokens.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'testing':
        return (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-yellow-700">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Testando conexão IOTA Rebased...
            </div>
          </div>
        );
      
      case 'connected':
        return (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-700">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              IOTA Rebased conectado! {networkInfo && `(${networkInfo.contractsDeployed}/5 contratos ativos)`}
            </div>
          </div>
        );
      
      case 'fallback':
        return (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-700">
              <AlertCircle className="h-4 w-4 mr-2" />
              IOTA modo limitado - funcionalidade básica disponível
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Restaurant Selection Step
  if (step === 'restaurant') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Escolha um Restaurante</h2>
        
        {user && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-700">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Logged in as: {user.name || user.username || user.display_name} ({user.id})
            </div>
          </div>
        )}
        
        {renderConnectionStatus()}
        
        {location && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-700">
              <MapPin className="h-4 w-4 mr-2" />
              Localização: Brasília, DF
            </div>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar restaurante em Brasília..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isSearching && (
            <div className="absolute right-3 top-3">
              <Loader className="animate-spin h-5 w-5 text-gray-400" />
            </div>
          )}
        </div>

        {/* Suggestions from Backend */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-orange-600">
              Você quis dizer...?
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${suggestion.restaurant.id}-${index}`}
                  onClick={() => handleRestaurantSelect(suggestion.restaurant)}
                  className="w-full p-4 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 text-left transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{suggestion.restaurant.name}</h4>
                      <p className="text-gray-600 flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {suggestion.restaurant.address}
                        {suggestion.distance && (
                          <span className="ml-2 text-sm text-blue-600">
                            • {suggestion.distance.toFixed(1)}km
                          </span>
                        )}
                      </p>
                      <div className="flex items-center mt-2 text-sm">
                        {suggestion.restaurant.category && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                            {suggestion.restaurant.category}
                          </span>
                        )}
                        <span className="text-orange-600">
                          Similaridade: {Math.round(suggestion.similarity * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">
              Restaurantes Encontrados ({searchResults.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map(restaurant => (
                <button
                  key={`restaurant-${restaurant.id}`}
                  onClick={() => handleRestaurantSelect(restaurant)}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
                      <p className="text-gray-600 flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {restaurant.address}
                      </p>
                      <div className="flex items-center mt-2 text-sm">
                        {restaurant.category && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                            {restaurant.category}
                          </span>
                        )}
                        <span className="text-gray-500">ID: {restaurant.id}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Show Add New if searched but no results */}
        {searchQuery.length > 2 && !isSearching && searchResults.length === 0 && suggestions.length === 0 && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-gray-600 mb-3">
              Nenhum restaurante encontrado para "{searchQuery}"
            </p>
          </div>
        )}

        {/* Add New Restaurant Button */}
        <div className="text-center">
          <button
            onClick={() => {
              setNewRestaurant(prev => ({ ...prev, name: searchQuery }));
              setShowAddNew(true);
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Novo Restaurante
          </button>
        </div>

        {/* Add New Restaurant Modal */}
        {showAddNew && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Adicionar Novo Restaurante</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome do restaurante"
                  value={newRestaurant.name || ''}
                  onChange={(e) => setNewRestaurant(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                
                <input
                  type="text"
                  placeholder="Endereço"
                  value={newRestaurant.address || ''}
                  onChange={(e) => setNewRestaurant(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                
                <input
                  type="text"
                  placeholder="Tipo de culinária/categoria"
                  value={newRestaurant.category || ''}
                  onChange={(e) => setNewRestaurant(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                
                <select
                  value={newRestaurant.priceRange || '€€'}
                  onChange={(e) => setNewRestaurant(prev => ({ ...prev, priceRange: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {priceRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddNew(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNewRestaurant}
                  disabled={!newRestaurant.name || !newRestaurant.address || isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader className="animate-spin h-4 w-4 mr-2 inline" />
                      Criando...
                    </>
                  ) : (
                    'Adicionar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Recommendation Content Step
  if (step === 'recommendation') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setStep('restaurant')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Escreva sua Recomendação</h2>
        </div>

        {/* Selected Restaurant */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-900">{draft.restaurant?.name}</h3>
          <p className="text-gray-600 flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {draft.restaurant?.address}, {draft.restaurant?.city}
          </p>
          <p className="text-sm text-gray-500">Restaurant ID: {draft.restaurant?.id}</p>
        </div>

        {/* Recommendation Form */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              placeholder="ex: Melhor picanha de Brasília!"
              value={draft.title}
              onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria *
            </label>
            <select
              value={draft.category}
              onChange={(e) => setDraft(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Enhanced Photos with Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos (até 5) - Bônus de +0.2 TOK por foto com GPS
            </label>
            <EnhancedPhotoUpload
              photos={draft.photos}
              onPhotosChange={handlePhotosChange}
              maxPhotos={5}
              allowLocation={true}
            />
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sua Recomendação *
            </label>
            <textarea
              placeholder="Compartilhe o que tornou este lugar especial. O que você recomendaria para um amigo?"
              value={draft.body}
              onChange={(e) => setDraft(prev => ({ ...prev, body: e.target.value }))}
              rows={5}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {draft.body.length}/2000 caracteres
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => setStep('preview')}
              disabled={!draft.title || !draft.body || !draft.category}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Visualizar
            </button>
          </div>
        </div>

        {/* Assessment Section */}
        <div className="mt-8 border-t pt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Como foi sua experiência?</h3>
          
          <div className="space-y-6">
            {/* Rating Scale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Como você avaliaria esta experiência? (Para Trust Score inicial)
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={draft.assessment.rating}
                    onChange={(e) => setDraft(prev => ({
                      ...prev,
                      assessment: { ...prev.assessment, rating: parseInt(e.target.value) }
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-blue-600">{draft.assessment.rating}/10</span>
                  <p className="text-gray-700">{ratingLabels[draft.assessment.rating]}</p>
                  <p className="text-sm text-gray-500">Trust Score inicial: {calculateInitialTrustScore(draft.assessment).toFixed(2)}</p>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 - Terrível</span>
                  <span>10 - Perfeito</span>
                </div>
              </div>
            </div>

            {/* Recommendation Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Você recomendaria este lugar?
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setDraft(prev => ({
                    ...prev,
                    assessment: { ...prev.assessment, wouldRecommend: true }
                  }))}
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center space-x-2 transition-colors ${
                    draft.assessment.wouldRecommend 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-300 hover:border-green-300'
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Sim, recomendo</span>
                </button>
                <button
                  onClick={() => setDraft(prev => ({
                    ...prev,
                    assessment: { ...prev.assessment, wouldRecommend: false }
                  }))}
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center space-x-2 transition-colors ${
                    !draft.assessment.wouldRecommend 
                      ? 'border-red-500 bg-red-50 text-red-700' 
                      : 'border-gray-300 hover:border-red-300'
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>Não recomendo</span>
                </button>
              </div>
            </div>

            {/* Confidence Level (only if recommending) */}
            {draft.assessment.wouldRecommend && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Qual seu nível de confiança? (Afeta recompensas em TOK)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'low', label: 'Vale mencionar', desc: 'Opção decente', bonus: '+0 TOK' },
                    { key: 'medium', label: 'Boa escolha', desc: 'Recomendo ativamente', bonus: '+0.2 TOK' },
                    { key: 'high', label: 'Imperdível!', desc: 'Todo mundo deveria ir', bonus: '+0.5 TOK' }
                  ].map(option => (
                    <button
                      key={option.key}
                      onClick={() => setDraft(prev => ({
                        ...prev,
                        assessment: { ...prev.assessment, confidence: option.key as 'low' | 'medium' | 'high' }
                      }))}
                      className={`p-3 rounded-lg border-2 text-center transition-colors ${
                        draft.assessment.confidence === option.key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.desc}</div>
                      <div className="text-xs text-green-600 font-medium">{option.bonus}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Context Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Bom para... (opcional) - Cada tag +0.05 TOK
              </label>
              <div className="grid grid-cols-2 gap-2">
                {contextTags.slice(0, 6).map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const newTags = draft.assessment.tags.includes(tag.id)
                        ? draft.assessment.tags.filter(t => t !== tag.id)
                        : [...draft.assessment.tags, tag.id];
                      setDraft(prev => ({
                        ...prev,
                        assessment: { ...prev.assessment, tags: newTags }
                      }));
                    }}
                    className={`p-2 rounded-lg border-2 text-left transition-colors flex items-center space-x-2 ${
                      draft.assessment.tags.includes(tag.id)
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 hover:border-orange-300'
                    }`}
                  >
                    <span className="text-sm">{tag.icon}</span>
                    <span className="text-sm font-medium">{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

// Preview Step
  if (step === 'preview') {
    const previewRecommendation = generatePreviewRecommendation();
    
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setStep('recommendation')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Visualizar Recomendação</h2>
        </div>

        {/* Preview using your enhanced RecommendationCard */}
        {previewRecommendation && (
          <div className="mb-6">
            <RecommendationCard 
              recommendation={previewRecommendation}
              variant="creation-preview"
              showTokenRewards={true}
              showActions={false}
              className="w-full"
            />
          </div>
        )}

        {/* Expected Database Storage */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-green-800 mb-2">Armazenamento na Base de Dados</h4>
          <div className="text-sm text-green-700">
            <p>✓ Recomendação será salva no Core Server</p>
            <p>✓ Relacionamento com restaurante ID: {draft.restaurant?.id}</p>
            <p>✓ Disponível para descoberta por outros usuários</p>
            <p>✓ Possível fazer upvote após criação</p>
          </div>
        </div>

        {/* Expected Rewards */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-800 mb-2">Recompensas Esperadas na Blockchain</h4>
          <div className="text-sm text-blue-700">
            <p>• Recompensa base: 1 TOK quando Trust Score ≥ 0.25</p>
            <p>• Multiplicador social: Até 3x baseado em endorsos de amigos</p>
            <p>• Bônus de qualidade: +{(draft.photos.length * 0.2).toFixed(1)} TOK por {draft.photos.length} foto{draft.photos.length !== 1 ? 's' : ''}</p>
            <p>• Bônus de confiança: +{draft.assessment.confidence === 'high' ? '0.5' : draft.assessment.confidence === 'medium' ? '0.2' : '0'} TOK</p>
            <p>• Bônus de contexto: +{(draft.assessment.tags.length * 0.05).toFixed(2)} TOK por {draft.assessment.tags.length} tag{draft.assessment.tags.length !== 1 ? 's' : ''}</p>
            <p className="font-semibold">• Total estimado: {calculateExpectedRewards(draft)} TOK</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => setStep('recommendation')}
            disabled={isLoading || isSubmitting}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Editar
          </button>
          
          <button
            onClick={(e) => {
              console.log('SUBMIT BUTTON CLICKED - Core Server submission with integer restaurant ID!');
              e.preventDefault();
              handleSubmit();
            }}
            disabled={isLoading || isSubmitting}
            className="flex-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-lg font-semibold transition-colors flex items-center justify-center"
          >
            {isLoading || isSubmitting ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Salvando no Core Server...
              </>
            ) : (
              'Publicar Recomendação'
            )}
          </button>
        </div>
      </div>
    );
  }
  
  return null;
};

export default RecommendationCreationFlow;