// components/recommendation/RecommendationCreationFlow.tsx
// TRUST SCORE 2.0 VERSION: Streamlined 3-screen flow with collapsible optional sections

import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Plus, ArrowLeft, ArrowRight, Loader, Star, 
  ThumbsUp, ThumbsDown, AlertCircle, ChevronDown, ChevronUp, 
  Utensils, Coffee, DollarSign, Clock, Users, Calendar, X 
} from 'lucide-react';
import EnhancedPhotoUpload from './EnhancedPhotoUpload';
import RecommendationCard from '../RecommendationCard';
import { useGeolocation } from '../../src/hooks/useGeolocation';
import { IOTAService } from '../../src/services/IOTAService';
import { useAuth, useAuthenticatedFetch } from '../../hooks/useAuth';
import RestaurantAutocomplete from '../restaurant/RestaurantAutocomplete';

// ============================================
// INTERFACES
// ============================================

interface Restaurant {
  id: number;
  name: string;
  normalized_name?: string;
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

interface RestaurantSuggestion {
  restaurant: Restaurant;
  similarity: number;
  distance?: number;
}

interface Dish {
  id: string;
  name: string;
  rating: number;
  notes?: string;
  would_order_again: boolean;
}

interface RestaurantAspects {
  ambiance: number;
  service: number;
  value_for_money: number;
  noise_level?: 'quiet' | 'moderate' | 'loud';
  wait_time_minutes?: number;
}

interface ContextualFactors {
  occasion: 'date_night' | 'family_dinner' | 'quick_lunch' | 'celebration' | 'business_lunch' | 'casual';
  party_size: number;
  time_of_visit?: string;
  meal_type?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late_night';
  day_of_week?: string;
  total_spent?: number;
  visit_duration_minutes?: number;
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

interface RecommendationDraft {
  restaurant: Restaurant | null;
  title: string;
  body: string;
  category: string;
  overall_rating: number;
  dishes: Dish[];
  aspects: RestaurantAspects | null;
  context: ContextualFactors | null;
  photos: PhotoData[];
  context_tags: string[];
  cuisine_type?: string;
}

// ============================================
// CONSTANTS
// ============================================

const categories = [
  'Café da Manhã', 'Almoço', 'Jantar', 'Café & Bebidas', 
  'Sobremesas', 'Ocasião Especial', 'Lanche Rápido', 'Madrugada'
];

const occasionOptions = [
  { value: 'date_night', label: 'Encontro Romântico', icon: '💕' },
  { value: 'family_dinner', label: 'Jantar em Família', icon: '👨‍👩‍👧‍👦' },
  { value: 'quick_lunch', label: 'Almoço Rápido', icon: '⚡' },
  { value: 'celebration', label: 'Celebração', icon: '🎉' },
  { value: 'business_lunch', label: 'Almoço de Trabalho', icon: '💼' },
  { value: 'casual', label: 'Casual', icon: '😊' }
];

const mealTypeOptions = [
  { value: 'breakfast', label: 'Café da Manhã', icon: '🌅' },
  { value: 'brunch', label: 'Brunch', icon: '🥐' },
  { value: 'lunch', label: 'Almoço', icon: '🍽️' },
  { value: 'dinner', label: 'Jantar', icon: '🌙' },
  { value: 'late_night', label: 'Madrugada', icon: '🌃' }
];

const noiseLevelOptions = [
  { value: 'quiet', label: 'Silencioso', icon: '🤫' },
  { value: 'moderate', label: 'Moderado', icon: '🗣️' },
  { value: 'loud', label: 'Barulhento', icon: '📢' }
];

const ratingLabels: { [key: number]: string } = {
  0: 'Horrível', 1: 'Terrível', 2: 'Muito Ruim', 3: 'Ruim', 4: 'Regular',
  5: 'Razoável', 6: 'Bom', 7: 'Muito Bom', 8: 'Ótimo', 9: 'Excelente', 10: 'Perfeito'
};

const priceRanges = [
  { value: '€', label: '€ - Econômico (até R$ 30)' },
  { value: '€€', label: '€€ - Moderado (R$ 30-60)' },
  { value: '€€€', label: '€€€ - Caro (R$ 60-120)' },
  { value: '€€€€', label: '€€€€ - Muito Caro (R$ 120+)' }
];

// Quick context tags (3-4 common ones for the streamlined UI)
const quickContextTags = [
  { id: 'romantic', label: 'Romântico', icon: '💕' },
  { id: 'family', label: 'Família', icon: '👨‍👩‍👧‍👦' },
  { id: 'quick', label: 'Rápido', icon: '⚡' },
  { id: 'celebration', label: 'Celebração', icon: '🎉' }
];

type FormStep = 'restaurant' | 'essentials' | 'preview';

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
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  const [step, setStep] = useState<FormStep>('restaurant');
  const [draft, setDraft] = useState<RecommendationDraft>({
    restaurant: null,
    title: '',
    body: '',
    category: '',
    overall_rating: 7,
    dishes: [],
    aspects: null,
    context: null,
    photos: [],
    context_tags: [],
    cuisine_type: ''
  });
  
  // Collapsible sections state
  const [dishesOpen, setDishesOpen] = useState(false);
  const [aspectsOpen, setAspectsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  
  // Restaurant search state
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
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // IOTA blockchain state
  const [iotaService, setIotaService] = useState<IOTAService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'fallback'>('testing');
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  // Auth hooks
  const { user, isAuthenticated } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  // Current dish being edited
  const [currentDish, setCurrentDish] = useState<Dish>({
    id: '',
    name: '',
    rating: 7,
    notes: '',
    would_order_again: true
  });
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  // Custom tag input
  const [customTag, setCustomTag] = useState('');

  // API Base URL
  const API_BASE_URL = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

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

  const generateDishId = () => `dish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const canProceedToNextStep = (): boolean => {
    switch (step) {
      case 'restaurant':
        return !!draft.restaurant;
      case 'essentials':
        return draft.overall_rating >= 0 && draft.overall_rating <= 10;
      case 'preview':
        return !!(draft.title && draft.body && draft.category);
      default:
        return false;
    }
  };

  // ============================================
  // EFFECTS
  // ============================================

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

  // ============================================
  // RESTAURANT SEARCH FUNCTIONS
  // ============================================

  const searchRestaurants = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Searching restaurants with backend API:', query);
      
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
        
        setSearchResults(data.results || []);
        
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
    
    setDraft(prev => ({ 
      ...prev, 
      restaurant,
      cuisine_type: restaurant.cuisine || restaurant.category || ''
    }));
    setShowSuggestions(false);
    setStep('essentials');
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
        ...(location.latitude && { latitude: location.latitude }),
        ...(location.longitude && { longitude: location.longitude })
      };

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
      
      setDraft(prev => ({ 
        ...prev, 
        restaurant: createdRestaurant,
        cuisine_type: createdRestaurant.cuisine || createdRestaurant.category || ''
      }));
      setShowAddNew(false);
      setSearchQuery('');
      setStep('essentials');
      
    } catch (error) {
      console.error('Error creating restaurant:', error);
      alert(`Erro ao criar restaurante: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // DISH MANAGEMENT FUNCTIONS
  // ============================================

  const handleAddDish = () => {
    if (!currentDish.name.trim()) {
      alert('Por favor, insira o nome do prato');
      return;
    }

    if (editingDishId) {
      setDraft(prev => ({
        ...prev,
        dishes: prev.dishes.map(dish => 
          dish.id === editingDishId ? { ...currentDish, id: editingDishId } : dish
        )
      }));
      setEditingDishId(null);
    } else {
      const newDish: Dish = {
        ...currentDish,
        id: generateDishId()
      };
      setDraft(prev => ({
        ...prev,
        dishes: [...prev.dishes, newDish]
      }));
    }

    setCurrentDish({
      id: '',
      name: '',
      rating: 7,
      notes: '',
      would_order_again: true
    });
  };

  const handleEditDish = (dish: Dish) => {
    setCurrentDish(dish);
    setEditingDishId(dish.id);
  };

  const handleDeleteDish = (dishId: string) => {
    setDraft(prev => ({
      ...prev,
      dishes: prev.dishes.filter(dish => dish.id !== dishId)
    }));
  };

  const handleCancelEditDish = () => {
    setCurrentDish({
      id: '',
      name: '',
      rating: 7,
      notes: '',
      would_order_again: true
    });
    setEditingDishId(null);
  };

  // ============================================
  // CONTEXT TAG FUNCTIONS
  // ============================================

  const handleAddCustomTag = () => {
    const tag = customTag.trim().replace(/^#/, '').toLowerCase();
    if (tag && !draft.context_tags.includes(tag)) {
      setDraft(prev => ({ ...prev, context_tags: [...prev.context_tags, tag] }));
      setCustomTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setDraft(prev => ({ ...prev, context_tags: prev.context_tags.filter(t => t !== tag) }));
  };

  const handlePhotosChange = (photos: PhotoData[]) => {
    setDraft(prev => ({ ...prev, photos }));
  };

  // ============================================
  // PHOTO AND SUBMISSION FUNCTIONS
  // ============================================

  const uploadPhotosToIPFS = async (photos: PhotoData[]): Promise<string[]> => {
    const uploadPromises = photos.map(async (photo) => {
      try {
        const buffer = await photo.file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // Mock IPFS hash for now
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
    console.log('=== TRUST SCORE 2.0 SUBMISSION STARTED ===');
    console.log('Form validation check:', {
      hasRestaurant: !!draft.restaurant,
      hasTitle: !!draft.title,
      hasBody: !!draft.body,
      hasCategory: !!draft.category,
      hasOverallRating: draft.overall_rating !== undefined,
      dishesCount: draft.dishes.length,
      hasAspects: !!draft.aspects,
      hasContext: !!draft.context
    });

    if (!draft.restaurant || !draft.title || !draft.body) {
      console.log('Form validation failed - missing required fields');
      alert('Por favor, preencha todos os campos obrigatórios (título e texto da recomendação)');
      return;
    }

    try {
      const currentUser = getCurrentUser();
      console.log('Authenticated user verified:', currentUser);
    } catch (error) {
      console.error('Authentication required:', error);
      alert('Por favor, conecte sua carteira antes de criar recomendações');
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

      // Step 2: Prepare Trust Score 2.0 enhanced payload
      const apiPayload = {
        // Basic fields
        title: draft.title.trim(),
        content: draft.body.trim(),
        category: draft.category,
        restaurant_id: draft.restaurant.id,
        restaurantName: draft.restaurant.name, // BUG FIX: Added this line
        authorId: currentUser.walletAddress,
        
        // Coordinates for legacy compatibility
        latitude: draft.restaurant.latitude,
        longitude: draft.restaurant.longitude,
        location: {
          city: draft.restaurant.city,
          latitude: draft.restaurant.latitude,
          longitude: draft.restaurant.longitude
        },
        
        // Trust Score 2.0 fields
        overall_rating: draft.overall_rating,
        
        dishes: draft.dishes.length > 0 ? draft.dishes.map(dish => ({
          name: dish.name,
          rating: dish.rating,
          notes: dish.notes,
          would_order_again: dish.would_order_again
        })) : undefined,
        
        aspects: draft.aspects ? {
          ambiance: draft.aspects.ambiance,
          service: draft.aspects.service,
          value_for_money: draft.aspects.value_for_money,
          noise_level: draft.aspects.noise_level,
          wait_time_minutes: draft.aspects.wait_time_minutes
        } : undefined,
        
        context: draft.context ? {
          occasion: draft.context.occasion,
          party_size: draft.context.party_size,
          time_of_visit: draft.context.time_of_visit,
          meal_type: draft.context.meal_type,
          day_of_week: draft.context.day_of_week,
          total_spent: draft.context.total_spent,
          visit_duration_minutes: draft.context.visit_duration_minutes
        } : undefined,
        
        // Additional metadata
        context_tags: draft.context_tags,
        cuisine_type: draft.cuisine_type,
        photos: photoHashes
      };

      console.log('=== TRUST SCORE 2.0 API PAYLOAD ===');
      console.log('Calling: POST /api/recommendations');
      console.log('Payload:', JSON.stringify(apiPayload, null, 2));

      const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('omeone_auth_token')
        },
        body: JSON.stringify(apiPayload)
      });

      console.log('API Response Status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `API call failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('=== API SUCCESS ===');
      console.log('Response:', result);

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
            restaurantId: draft.restaurant.id,
            restaurantName: draft.restaurant.name,
            overallRating: draft.overall_rating,
            dishCount: draft.dishes.length,
            hasAspects: !!draft.aspects,
            hasContext: !!draft.context,
            contextTags: draft.context_tags,
            photoHashes,
            photoCount: draft.photos.length,
            createdAt: new Date().toISOString(),
            language: 'pt-BR',
            platform: 'omeonechain-web',
            version: '2.0.0-trust-score',
            databaseId: result.recommendation?.id
          }
        };

        try {
          const blockchainResult = await iotaService.storeRecommendation(blockchainData);
          console.log('Blockchain submission successful!', blockchainResult);
        } catch (blockchainError) {
          console.warn('Blockchain submission failed, but database storage succeeded:', blockchainError);
        }
      }

      // Step 4: Success
      const recommendationId = result.recommendation?.id || 'unknown';
      console.log('=== RECOMMENDATION CREATED SUCCESSFULLY ===');
      console.log('Database ID:', recommendationId);
      console.log('Restaurant ID:', draft.restaurant.id);
      console.log('Dishes submitted:', draft.dishes.length);
      console.log('Has aspects:', !!draft.aspects);
      console.log('Has context:', !!draft.context);
      
      onSuccess?.(recommendationId);

      // Reset form
      setDraft({
        restaurant: null,
        title: '',
        body: '',
        category: '',
        overall_rating: 7,
        dishes: [],
        aspects: null,
        context: null,
        photos: [],
        context_tags: [],
        cuisine_type: ''
      });
      setStep('restaurant');

      alert(`Recomendação Trust Score 2.0 criada com sucesso! ID: ${recommendationId}`);

    } catch (error) {
      console.error('=== SUBMISSION FAILED ===');
      console.error('Error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      alert(`Erro ao criar recomendação: ${errorMessage}`);
    } finally {
      setIsSubmitting?.(false);
      setIsLoading(false);
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const calculateExpectedRewards = (): number => {
    let rewards = 1.0; // Base reward
    
    // Photo bonuses
    rewards += draft.photos.length * 0.2;
    
    // Dish-level detail bonus
    rewards += draft.dishes.length * 0.1;
    
    // Aspects bonus
    if (draft.aspects) {
      rewards += 0.3;
    }
    
    // Context bonus
    if (draft.context) {
      rewards += 0.2;
    }
    
    // Context tags bonus
    rewards += draft.context_tags.length * 0.05;
    
    return Math.round(rewards * 100) / 100;
  };

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

  // ============================================
  // RENDER FUNCTIONS - RESTAURANT STEP
  // ============================================

  const renderRestaurantStep = () => {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Escolha um Restaurante</h2>
        
        {user && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-700">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Conectado como: {user.name || user.username || user.display_name} ({user.id})
            </div>
          </div>
        )}
        
        {renderConnectionStatus()}
        
        {location && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-700">
              <MapPin className="h-4 w-4 mr-2" />
              Localização: {location.city}, {location.country}
            </div>
          </div>
        )}
        
        {/* Restaurant Autocomplete */}
        <div className="mb-6">
          <RestaurantAutocomplete
            onSelect={handleRestaurantSelect}
            placeholder="Buscar restaurante..."
            userLocation={location ? {
              latitude: location.latitude,
              longitude: location.longitude
            } : undefined}
          />
        </div>
        
        {/* Add New Button */}
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

        {/* Add New Modal */}
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
                  onChange={(e) => setNewRestaurant(prev => ({ ...prev, priceRange: e.target.value as any }))}
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
  };

  // ============================================
  // RENDER FUNCTIONS - ESSENTIALS STEP (CONSOLIDATED)
  // ============================================

  const renderEssentialsStep = () => {
    const aspects = draft.aspects || {
      ambiance: 7,
      service: 7,
      value_for_money: 7,
      noise_level: undefined,
      wait_time_minutes: undefined
    };

    const context = draft.context || {
      occasion: 'casual' as const,
      party_size: 2,
      time_of_visit: undefined,
      meal_type: undefined,
      day_of_week: undefined,
      total_spent: undefined,
      visit_duration_minutes: undefined
    };

    const updateAspects = (updates: Partial<RestaurantAspects>) => {
      setDraft(prev => ({
        ...prev,
        aspects: { ...aspects, ...updates }
      }));
    };

    const updateContext = (updates: Partial<ContextualFactors>) => {
      setDraft(prev => ({
        ...prev,
        context: { ...context, ...updates }
      }));
    };

    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setStep('restaurant')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Nova Recomendação</h2>
        </div>

        {/* Restaurant Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-900">{draft.restaurant?.name}</h3>
          <p className="text-gray-600 text-sm flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {draft.restaurant?.address}, {draft.restaurant?.city}
          </p>
        </div>

        {/* ESSENTIALS SECTION (Always Visible) */}
        <div className="space-y-6 mb-6">
          {/* Overall Rating - Compact Single Line */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Avaliação Geral *
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="10"
                value={draft.overall_rating}
                onChange={(e) => setDraft(prev => ({ ...prev, overall_rating: parseInt(e.target.value) }))}
                className="flex-1 h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-lg"
              />
              <div className="flex items-center space-x-2 min-w-[140px]">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-bold text-blue-600">{draft.overall_rating}</span>
                <span className="text-gray-400">/10</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center mt-2">{ratingLabels[draft.overall_rating]}</p>
          </div>

          {/* Quick Context Tags: 4 chips + text input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tags de Contexto (opcional)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {quickContextTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => {
                    const newTags = draft.context_tags.includes(tag.id)
                      ? draft.context_tags.filter(t => t !== tag.id)
                      : [...draft.context_tags, tag.id];
                    setDraft(prev => ({ ...prev, context_tags: newTags }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    draft.context_tags.includes(tag.id)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {tag.icon} {tag.label}
                </button>
              ))}
            </div>
            
            {/* Custom tag input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Adicione tags personalizadas: #vegano #petfriendly"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCustomTag}
                disabled={!customTag.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            {/* Display custom tags */}
            {draft.context_tags.filter(t => !quickContextTags.some(qt => qt.id === t)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {draft.context_tags.filter(t => !quickContextTags.some(qt => qt.id === t)).map(tag => (
                  <span key={tag} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1.5">
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:bg-green-200 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* OPTIONAL DETAILS - COLLAPSIBLE */}
        <div className="border-t pt-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">Detalhes opcionais (clique para expandir):</p>
          
          {/* Dishes Section */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setDishesOpen(!dishesOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Utensils className="h-5 w-5 text-gray-600" />
                <span className="font-medium">Pratos Individuais</span>
                {draft.dishes.length > 0 && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {draft.dishes.length}
                  </span>
                )}
              </div>
              {dishesOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            
            {dishesOpen && (
              <div className="p-4 border-t bg-gray-50">
                {/* Existing dishes */}
                {draft.dishes.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {draft.dishes.map(dish => (
                      <div key={dish.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{dish.name}</span>
                            <div className="flex items-center text-sm">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-1" />
                              <span className="font-bold text-blue-600">{dish.rating}/10</span>
                            </div>
                          </div>
                          {dish.notes && (
                            <p className="text-sm text-gray-600 mt-1">{dish.notes}</p>
                          )}
                          <div className="flex items-center text-xs mt-1">
                            {dish.would_order_again ? (
                              <span className="text-green-600 flex items-center">
                                <ThumbsUp className="h-3 w-3 mr-1" /> Pediria novamente
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center">
                                <ThumbsDown className="h-3 w-3 mr-1" /> Não pediria novamente
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditDish(dish)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteDish(dish.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remover"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add dish form - compact */}
                <div className="space-y-3 bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm font-medium text-gray-700">
                    {editingDishId ? 'Editar Prato' : 'Adicionar Prato'}
                  </p>
                  <input
                    type="text"
                    placeholder="Nome do prato"
                    value={currentDish.name}
                    onChange={(e) => setCurrentDish(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={currentDish.rating}
                      onChange={(e) => setCurrentDish(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                      className="flex-1 h-2"
                    />
                    <span className="text-sm font-bold text-blue-600 min-w-[60px] text-center">
                      {currentDish.rating}/10
                    </span>
                  </div>
                  <textarea
                    placeholder="Notas sobre o prato (opcional)"
                    value={currentDish.notes || ''}
                    onChange={(e) => setCurrentDish(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentDish(prev => ({ ...prev, would_order_again: true }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentDish.would_order_again 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4 inline mr-1" /> Sim
                    </button>
                    <button
                      onClick={() => setCurrentDish(prev => ({ ...prev, would_order_again: false }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !currentDish.would_order_again 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4 inline mr-1" /> Não
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {editingDishId && (
                      <button
                        onClick={handleCancelEditDish}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      onClick={handleAddDish}
                      disabled={!currentDish.name.trim()}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <Plus className="h-4 w-4 inline mr-1" />
                      {editingDishId ? 'Salvar' : 'Adicionar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Aspects Section */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setAspectsOpen(!aspectsOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-gray-600" />
                <span className="font-medium">Aspectos do Restaurante</span>
              </div>
              {aspectsOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            
            {aspectsOpen && (
              <div className="p-4 border-t bg-gray-50 space-y-4">
                {/* Ambiance */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Ambiente e Decoração
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={aspects.ambiance}
                      onChange={(e) => updateAspects({ ambiance: parseInt(e.target.value) })}
                      className="flex-1 h-2"
                    />
                    <span className="text-sm font-bold text-purple-600 min-w-[60px] text-center">
                      {aspects.ambiance}/10
                    </span>
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Atendimento
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={aspects.service}
                      onChange={(e) => updateAspects({ service: parseInt(e.target.value) })}
                      className="flex-1 h-2"
                    />
                    <span className="text-sm font-bold text-purple-600 min-w-[60px] text-center">
                      {aspects.service}/10
                    </span>
                  </div>
                </div>

                {/* Value for Money */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Custo-Benefício
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={aspects.value_for_money}
                      onChange={(e) => updateAspects({ value_for_money: parseInt(e.target.value) })}
                      className="flex-1 h-2"
                    />
                    <span className="text-sm font-bold text-purple-600 min-w-[60px] text-center">
                      {aspects.value_for_money}/10
                    </span>
                  </div>
                </div>

                {/* Noise Level */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Nível de Ruído
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {noiseLevelOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => updateAspects({ noise_level: option.value as any })}
                        className={`p-2 rounded-lg text-center text-sm transition-colors ${
                          aspects.noise_level === option.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-white border border-gray-300 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-lg">{option.icon}</div>
                        <div className="text-xs mt-1">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wait Time */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Tempo de Espera
                  </label>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      placeholder="Minutos"
                      value={aspects.wait_time_minutes || ''}
                      onChange={(e) => updateAspects({ 
                        wait_time_minutes: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                      min="0"
                    />
                    <span className="text-sm text-gray-600">min</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Context Section */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setContextOpen(!contextOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="font-medium">Contexto da Visita</span>
              </div>
              {contextOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            
            {contextOpen && (
              <div className="p-4 border-t bg-gray-50 space-y-4">
                {/* Occasion */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Ocasião
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {occasionOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => updateContext({ occasion: option.value as any })}
                        className={`p-2 rounded-lg text-sm transition-colors ${
                          context.occasion === option.value
                            ? 'bg-orange-500 text-white'
                            : 'bg-white border border-gray-300 hover:border-orange-300'
                        }`}
                      >
                        {option.icon} {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Party Size */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Tamanho do Grupo
                  </label>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={context.party_size}
                      onChange={(e) => updateContext({ party_size: parseInt(e.target.value) || 1 })}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      min="1"
                      max="20"
                    />
                    <span className="text-sm text-gray-600">pessoas</span>
                  </div>
                </div>

                {/* Meal Type */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Tipo de Refeição
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {mealTypeOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => updateContext({ meal_type: option.value as any })}
                        className={`p-2 rounded-lg text-xs transition-colors ${
                          context.meal_type === option.value
                            ? 'bg-orange-500 text-white'
                            : 'bg-white border border-gray-300 hover:border-orange-300'
                        }`}
                      >
                        <div className="text-lg">{option.icon}</div>
                        <div className="mt-1">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date and Time */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Data e Hora da Visita
                  </label>
                  <input
                    type="datetime-local"
                    value={context.time_of_visit || ''}
                    onChange={(e) => {
                      const date = e.target.value;
                      const dayOfWeek = date ? new Date(date).toLocaleDateString('pt-BR', { weekday: 'long' }) : undefined;
                      updateContext({ 
                        time_of_visit: date,
                        day_of_week: dayOfWeek
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Total Spent */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Gasto Total
                  </label>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">R$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={context.total_spent || ''}
                      onChange={(e) => updateContext({ 
                        total_spent: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                {/* Visit Duration */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Duração da Visita
                  </label>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      placeholder="Minutos"
                      value={context.visit_duration_minutes || ''}
                      onChange={(e) => updateContext({ 
                        visit_duration_minutes: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      min="0"
                    />
                    <span className="text-sm text-gray-600">min</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6 pt-6 border-t">
          <button
            onClick={() => setStep('restaurant')}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={() => setStep('preview')}
            disabled={!canProceedToNextStep()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            Adicionar Texto & Fotos
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER FUNCTIONS - PREVIEW STEP
  // ============================================

  const renderPreviewStep = () => {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setStep('essentials')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Revisar & Publicar</h2>
        </div>

        {/* Selected Restaurant Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-900">{draft.restaurant?.name}</h3>
          <p className="text-gray-600 flex items-center text-sm">
            <MapPin className="h-4 w-4 mr-1" />
            {draft.restaurant?.address}, {draft.restaurant?.city}
          </p>
          <div className="flex items-center space-x-4 mt-2 text-sm">
            <span className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
              <span className="font-bold">{draft.overall_rating}/10</span>
            </span>
            {draft.dishes.length > 0 && (
              <span className="text-gray-600">
                {draft.dishes.length} prato{draft.dishes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título da Recomendação *
            </label>
            <input
              type="text"
              placeholder="ex: Melhor pizza napolitana de Brasília!"
              value={draft.title}
              onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria (opcional)
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

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sua Recomendação *
            </label>
            <textarea
              placeholder="Compartilhe o que tornou este lugar especial. O que você recomendaria para um amigo?"
              value={draft.body}
              onChange={(e) => setDraft(prev => ({ ...prev, body: e.target.value }))}
              rows={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {draft.body.length}/2000 caracteres
            </p>
          </div>

          {/* Photos */}
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
            {draft.photos.length > 0 && (
              <p className="text-xs text-green-600 mt-2">
                Bônus: +{(draft.photos.length * 0.2).toFixed(1)} TOK por {draft.photos.length} foto{draft.photos.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Trust Score 2.0 Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Resumo Trust Score 2.0</h3>
            
            <div className="space-y-3 text-sm">
              {/* Overall Rating */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Avaliação Geral:</span>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                  <span className="font-bold text-blue-600">{draft.overall_rating}/10</span>
                  <span className="text-gray-500 ml-2">({ratingLabels[draft.overall_rating]})</span>
                </div>
              </div>

              {/* Dishes */}
              {draft.dishes.length > 0 && (
                <div>
                  <span className="text-gray-700 block mb-2">Pratos Avaliados: ({draft.dishes.length})</span>
                  <div className="ml-4 space-y-1">
                    {draft.dishes.slice(0, 3).map(dish => (
                      <div key={dish.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{dish.name}</span>
                        <span className="flex items-center text-blue-600 font-medium">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mr-1" />
                          {dish.rating}/10
                        </span>
                      </div>
                    ))}
                    {draft.dishes.length > 3 && (
                      <span className="text-xs text-gray-500">+ {draft.dishes.length - 3} mais...</span>
                    )}
                  </div>
                </div>
              )}

              {/* Aspects */}
              {draft.aspects && (
                <div>
                  <span className="text-gray-700 block mb-2">Aspectos:</span>
                  <div className="ml-4 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ambiente:</span>
                      <span className="text-purple-600 font-medium">{draft.aspects.ambiance}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Atendimento:</span>
                      <span className="text-purple-600 font-medium">{draft.aspects.service}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custo-Benefício:</span>
                      <span className="text-purple-600 font-medium">{draft.aspects.value_for_money}/10</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Context */}
              {draft.context && (
                <div>
                  <span className="text-gray-700 block mb-2">Contexto:</span>
                  <div className="ml-4 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ocasião:</span>
                      <span className="text-orange-600 font-medium">
                        {occasionOptions.find(o => o.value === draft.context?.occasion)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pessoas:</span>
                      <span className="text-orange-600 font-medium">{draft.context.party_size}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              {draft.context_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {draft.context_tags.map(tag => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expected Rewards */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">💰 Recompensas Esperadas</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>• Recompensa base: 1.00 TOK</p>
              {draft.dishes.length > 0 && (
                <p>• Bônus de pratos: +{(draft.dishes.length * 0.1).toFixed(1)} TOK</p>
              )}
              {draft.aspects && <p>• Bônus de aspectos: +0.3 TOK</p>}
              {draft.context && <p>• Bônus de contexto: +0.2 TOK</p>}
              {draft.photos.length > 0 && (
                <p>• Bônus de fotos: +{(draft.photos.length * 0.2).toFixed(1)} TOK</p>
              )}
              {draft.context_tags.length > 0 && (
                <p>• Bônus de tags: +{(draft.context_tags.length * 0.05).toFixed(2)} TOK</p>
              )}
              <p className="font-bold pt-2 border-t border-green-300">
                Total estimado: {calculateExpectedRewards()} TOK
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => setStep('essentials')}
            disabled={isLoading || isSubmitting}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Editar
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isLoading || isSubmitting || !draft.title || !draft.body}
            className="flex-2 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-lg font-semibold transition-colors flex items-center justify-center"
          >
            {isLoading || isSubmitting ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Publicando...
              </>
            ) : (
              <>
                <Star className="h-5 w-5 mr-2 fill-white" />
                Publicar Recomendação
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER - AUTHENTICATION & STEP ROUTING
  // ============================================

  // Check authentication
  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Autenticação Necessária</h2>
          <p className="text-gray-600 mb-6">
            Você precisa conectar sua carteira para criar recomendações e ganhar tokens.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Conectar Carteira
          </button>
        </div>
      </div>
    );
  }

  // Route to appropriate step
  switch (step) {
    case 'restaurant':
      return renderRestaurantStep();
    case 'essentials':
      return renderEssentialsStep();
    case 'preview':
      return renderPreviewStep();
    default:
      return null;
  }
};

export default RecommendationCreationFlow;