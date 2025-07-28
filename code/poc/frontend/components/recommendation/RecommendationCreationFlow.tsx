// components/recommendation/RecommendationCreationFlow.tsx
// Enhanced version with Assessment step and improved Brasília data

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Plus, ArrowLeft, Loader, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import EnhancedPhotoUpload from './EnhancedPhotoUpload';
import RecommendationCard from '@/components/RecommendationCard';
import { useGeolocation } from '@/hooks/useGeolocation';

// Enhanced types matching your RecommendationCard
interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  cuisine?: string;
  priceRange?: '€' | '€€' | '€€€' | '€€€€';
  placeId?: string;
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

// Updated Brasília restaurants data
const brasiliaRestaurants: Restaurant[] = [
  { 
    id: '1', 
    name: 'Restaurante Mangai', 
    address: 'SCLS 109, Bloco A, Loja 2/8 - Asa Sul', 
    city: 'Brasília', 
    latitude: -15.8052, 
    longitude: -47.8890,
    cuisine: 'Nordestina', 
    priceRange: '€€' 
  },
  { 
    id: '2', 
    name: 'Coco Bambu', 
    address: 'SCRN 715, Bloco C, Loja 30 - Asa Norte', 
    city: 'Brasília', 
    latitude: -15.7610, 
    longitude: -47.8814,
    cuisine: 'Frutos do Mar', 
    priceRange: '€€€' 
  },
  { 
    id: '3', 
    name: 'Parrilla Madrid', 
    address: 'CLS 403, Bloco A, Loja 25 - Asa Sul', 
    city: 'Brasília', 
    latitude: -15.8180, 
    longitude: -47.8976,
    cuisine: 'Espanhola', 
    priceRange: '€€€' 
  },
  { 
    id: '4', 
    name: 'Rubaiyat Brasília', 
    address: 'SHIS QI 23, Conjunto 6, Casa 4 - Lago Sul', 
    city: 'Brasília', 
    latitude: -15.8350, 
    longitude: -47.8650,
    cuisine: 'Steakhouse', 
    priceRange: '€€€€' 
  },
  { 
    id: '5', 
    name: 'Antiquarius', 
    address: 'SCRN 708/709, Bloco E, Loja 15 - Asa Norte', 
    city: 'Brasília', 
    latitude: -15.7580, 
    longitude: -47.8820,
    cuisine: 'Contemporânea', 
    priceRange: '€€€€' 
  },
  {
    id: '6',
    name: 'DOM Restaurant',
    address: 'SCS Quadra 2, Bloco C, Loja 256 - Asa Sul',
    city: 'Brasília',
    latitude: -15.7950,
    longitude: -47.8890,
    cuisine: 'Brasileira Contemporânea',
    priceRange: '€€€€'
  },
  {
    id: '7',
    name: 'Beirute',
    address: 'CLS 109, Bloco A, Loja 56 - Asa Sul',
    city: 'Brasília',
    latitude: -15.8055,
    longitude: -47.8885,
    cuisine: 'Árabe',
    priceRange: '€€'
  },
  {
    id: '8',
    name: 'Tordesilhas',
    address: 'SHIS QI 11, Conjunto 1, Casa 14 - Lago Sul',
    city: 'Brasília',
    latitude: -15.8300,
    longitude: -47.8600,
    cuisine: 'Brasileira Regional',
    priceRange: '€€€'
  }
];

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
  const [showAddNew, setShowAddNew] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState<Partial<Restaurant>>({
    name: '',
    address: '',
    city: 'Brasília',
    cuisine: '',
    priceRange: '€€'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Location services
  const { location, loading: locationLoading, error: locationError, getCurrentPosition } = useGeolocation({
    enableHighAccuracy: true,
    requestPermission: true
  });

  // Search restaurants with location awareness
  useEffect(() => {
    if (searchQuery.length > 0) {
      let filtered = brasiliaRestaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.cuisine?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Sort by distance if user location is available
      if (location) {
        filtered = filtered.sort((a, b) => {
          const distanceA = getDistance(location.latitude, location.longitude, a.latitude || 0, a.longitude || 0);
          const distanceB = getDistance(location.latitude, location.longitude, b.latitude || 0, b.longitude || 0);
          return distanceA - distanceB;
        });
      }

      setSearchResults(filtered);
    } else {
      // Show all Brasília restaurants when no search query
      setSearchResults(brasiliaRestaurants);
    }
  }, [searchQuery, location]);

  // Calculate distance between two points
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setDraft(prev => ({ ...prev, restaurant }));
    setStep('recommendation');
  };

  const handleAddNewRestaurant = async () => {
    if (!newRestaurant.name || !newRestaurant.address) return;
    
    setIsLoading(true);
    try {
      // Simulate API call with geocoding
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const restaurant: Restaurant = {
        id: `new-${Date.now()}`,
        name: newRestaurant.name!,
        address: newRestaurant.address!,
        city: newRestaurant.city!,
        cuisine: newRestaurant.cuisine,
        priceRange: newRestaurant.priceRange as '€' | '€€' | '€€€' | '€€€€',
        latitude: location?.latitude,
        longitude: location?.longitude
      };
      
      setDraft(prev => ({ ...prev, restaurant }));
      setShowAddNew(false);
      setStep('recommendation');
    } catch (error) {
      console.error('Error adding restaurant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotosChange = (photos: PhotoData[]) => {
    setDraft(prev => ({ ...prev, photos }));
  };

  const handleSubmit = async () => {
    if (!draft.restaurant || !draft.title || !draft.body || !draft.category) return;

    setIsSubmitting?.(true);
    setIsLoading(true);
    
    try {
      // Submit to your API
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          content: draft.body,
          category: draft.category,
          restaurantName: draft.restaurant.name,
          restaurantAddress: draft.restaurant.address,
          latitude: draft.restaurant.latitude,
          longitude: draft.restaurant.longitude,
          // Include assessment data
          rating: draft.assessment.rating,
          wouldRecommend: draft.assessment.wouldRecommend,
          confidence: draft.assessment.confidence,
          experience: draft.assessment.experience,
          tags: draft.assessment.tags,
          // Add actual user data when auth is implemented
          authorId: 'user_' + Date.now(),
          authorName: 'Current User'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const recommendationId = `rec-${Date.now()}`;
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
      } else {
        throw new Error(result.error || 'Failed to publish recommendation');
      }
      
    } catch (error) {
      console.error('Error submitting recommendation:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
      setIsSubmitting?.(false);
    }
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
      trustScore: Math.max(0.1, draft.assessment.rating * 0.1), // Convert 1-10 to 0.1-1.0
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
        amount: 1.0 + (draft.photos.length * 0.2) + (draft.assessment.confidence === 'high' ? 0.5 : 0),
        usdValue: 0.12,
        earnedFrom: 'creation' as const
      },
      createdAt: new Date().toISOString(),
      tags: draft.assessment.tags,
      isBookmarked: false,
      hasUpvoted: false,
      verificationStatus: 'unverified' as const,
      // Include assessment for display
      personalRating: draft.assessment.rating,
      wouldRecommend: draft.assessment.wouldRecommend,
      confidence: draft.assessment.confidence
    };
  };

  // Restaurant Selection Step
  if (step === 'restaurant') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Escolha um Restaurante</h2>
        
        {/* Location Status */}
        {locationLoading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-700">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Obtendo sua localização para melhores sugestões...
            </div>
          </div>
        )}

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
        </div>

        {/* Search Results */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            {searchQuery ? 'Resultados da Busca' : 'Restaurantes em Brasília'} 
            {location && ' (ordenados por distância)'}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map(restaurant => {
              const distance = location && restaurant.latitude && restaurant.longitude
                ? getDistance(location.latitude, location.longitude, restaurant.latitude, restaurant.longitude)
                : null;

              return (
                <button
                  key={restaurant.id}
                  onClick={() => handleRestaurantSelect(restaurant)}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
                      <p className="text-gray-600 flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {restaurant.address}
                        {distance && (
                          <span className="ml-2 text-sm text-blue-600">
                            • {distance.toFixed(1)}km
                          </span>
                        )}
                      </p>
                      <div className="flex items-center mt-2 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                          {restaurant.cuisine}
                        </span>
                        <span className="text-gray-500">{restaurant.priceRange}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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
                  placeholder="Tipo de culinária"
                  value={newRestaurant.cuisine || ''}
                  onChange={(e) => setNewRestaurant(prev => ({ ...prev, cuisine: e.target.value }))}
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
                  onClick={handleAddNewRestaurant}
                  disabled={!newRestaurant.name || !newRestaurant.address || isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Adicionando...' : 'Adicionar'}
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
              Fotos (até 5)
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

        {/* Assessment Section - Now Integrated */}
        <div className="mt-8 border-t pt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Como foi sua experiência?</h3>
          
          <div className="space-y-6">
            {/* Rating Scale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Como você avaliaria esta experiência? (Para sua referência pessoal)
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
                  Qual seu nível de confiança?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'low', label: 'Vale mencionar', desc: 'Opção decente' },
                    { key: 'medium', label: 'Boa escolha', desc: 'Recomendo ativamente' },
                    { key: 'high', label: 'Imperdível!', desc: 'Todo mundo deveria ir' }
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
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Context Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Bom para... (opcional)
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

  // NEW: Assessment Step - REMOVED (now integrated)

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

        {/* Assessment Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-800 mb-2">Sua Avaliação</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Nota pessoal: {draft.assessment.rating}/10 ({ratingLabels[draft.assessment.rating]})</p>
            <p>• Recomendaria: {draft.assessment.wouldRecommend ? 'Sim' : 'Não'}</p>
            {draft.assessment.wouldRecommend && (
              <p>• Confiança: {draft.assessment.confidence === 'high' ? 'Alta' : draft.assessment.confidence === 'medium' ? 'Média' : 'Baixa'}</p>
            )}
            <p>• Experiência: {draft.assessment.experience === 'exceeded' ? 'Superou expectativas' : draft.assessment.experience === 'met' ? 'Como esperado' : 'Abaixo do esperado'}</p>
            {draft.assessment.tags.length > 0 && (
              <p>• Tags: {draft.assessment.tags.map(tagId => contextTags.find(t => t.id === tagId)?.label).join(', ')}</p>
            )}
          </div>
        </div>

        {/* Expected Rewards */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-green-800 mb-2">Recompensas Esperadas</h4>
          <div className="text-sm text-green-700">
            <p>• Recompensa base: 1 TOK quando Trust Score ≥ 0.25</p>
            <p>• Multiplicador social: Até 3x baseado em endorsos de amigos</p>
            <p>• Bônus de qualidade: +0.2 TOK por foto com localização</p>
            <p>• Bônus de confiança: +0.5 TOK para recomendações de alta confiança</p>
            <p>• Aumento de reputação: +5 pontos por conteúdo de qualidade</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => setStep('recommendation')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || isSubmitting}
            className="flex-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-lg font-semibold transition-colors flex items-center justify-center"
          >
            {isLoading || isSubmitting ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Publicando na Blockchain...
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