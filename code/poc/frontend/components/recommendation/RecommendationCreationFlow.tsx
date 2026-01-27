// components/recommendation/RecommendationCreationFlow.tsx
// SINGLE SCREEN VERSION (Option A): inline restaurant search when none selected
// Uses existing reusable components: CollapsibleSection, RestaurantHeader, StickyPublishButton
// Comments (optional) replaces Notes
// Required: restaurant + overall_rating only
//
// UPDATED: Dark mode support added
// UPDATED: 0.5 increments for Restaurant Aspects
// UPDATED: Cancel button added
// UPDATED: Touch-friendly rating sliders (Jan 25, 2026)

import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Plus,
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Utensils,
  DollarSign,
  Clock,
  Users,
  Calendar,
  X,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import EnhancedPhotoUpload from './EnhancedPhotoUpload';
import RestaurantAutocomplete from '../restaurant/RestaurantAutocomplete';
import CleanHeader from '../CleanHeader';

import { IOTAService } from '../../src/services/IOTAService';
import tokenBalanceService from '../../src/services/TokenBalanceService';
import { useAuth } from '../../hooks/useAuth';

// Reusable components
import CollapsibleSection from './CollapsibleSection';
import RestaurantHeader from './RestaurantHeader';
import StickyPublishButton from './StickyPublishButton';

// Cast to any so we don't get blocked by prop-type mismatches across local implementations
const CS: any = CollapsibleSection as any;
const RH: any = RestaurantHeader as any;
const SPB: any = StickyPublishButton as any;

// ============================================
// TOUCH-FRIENDLY SLIDER STYLES
// ============================================
const sliderStyles = `
  /* Track styling */
  .touch-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 12px;
    border-radius: 8px;
    outline: none;
    cursor: pointer;
  }
  
  /* Webkit (Chrome, Safari, iOS) thumb */
  .touch-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: white;
    border: 3px solid #FF644A;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    margin-top: -10px; /* Center thumb on track */
    transition: transform 0.1s ease, box-shadow 0.1s ease;
  }
  
  .touch-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  }
  
  .touch-slider::-webkit-slider-thumb:active {
    transform: scale(1.15);
    box-shadow: 0 4px 12px rgba(255, 100, 74, 0.4);
  }
  
  /* Firefox thumb */
  .touch-slider::-moz-range-thumb {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: white;
    border: 3px solid #FF644A;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
  }
  
  .touch-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  }
  
  .touch-slider::-moz-range-thumb:active {
    transform: scale(1.15);
    box-shadow: 0 4px 12px rgba(255, 100, 74, 0.4);
  }
  
  /* Firefox track */
  .touch-slider::-moz-range-track {
    height: 12px;
    border-radius: 8px;
  }
`;

// ============================================
// BRAND COLORS (BocaBoca Brand Guidelines)
// ============================================
const BRAND = {
  coral: '#FF644A',
  terracotta: '#E65441',
  cream: '#FFF4E1',
  navy: '#1F1E2A',
  mint: '#BFE2D9',
  plum: '#35273B',
  stone: '#9CA3AF',
};

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
  dish_tag?: string;
  dish_tag_other?: string;
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

interface RecommendationCreationFlowProps {
  onSuccess?: (recommendationId: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  setIsSubmitting?: (loading: boolean) => void;
}

const RecommendationCreationFlow: React.FC<RecommendationCreationFlowProps> = ({
  onSuccess,
  onError,
  onCancel,
  isSubmitting = false,
  setIsSubmitting,
}) => {
  const t = useTranslations('recommendations');
  const router = useRouter();

  // ============================================
  // CONSTANTS (using translations)
  // ============================================

  const categories = [
    { value: 'breakfast', label: t('categories.breakfast') },
    { value: 'lunch', label: t('categories.lunch') },
    { value: 'dinner', label: t('categories.dinner') },
    { value: 'coffee', label: t('categories.coffee') },
    { value: 'desserts', label: t('categories.desserts') },
    { value: 'special', label: t('categories.special') },
    { value: 'snack', label: t('categories.snack') },
    { value: 'lateNight', label: t('categories.lateNight') },
  ];

  const occasionOptions = [
    { value: 'date_night', label: t('occasions.dateNight'), icon: '💕' },
    { value: 'family_dinner', label: t('occasions.familyDinner'), icon: '👨‍👩‍👧‍👦' },
    { value: 'quick_lunch', label: t('occasions.quickLunch'), icon: '⚡' },
    { value: 'celebration', label: t('occasions.celebration'), icon: '🎉' },
    { value: 'business_lunch', label: t('occasions.businessLunch'), icon: '💼' },
    { value: 'casual', label: t('occasions.casual'), icon: '😊' },
  ];

  const mealTypeOptions = [
    { value: 'breakfast', label: t('mealTypes.breakfast'), icon: '🌅' },
    { value: 'brunch', label: t('mealTypes.brunch'), icon: '🥐' },
    { value: 'lunch', label: t('mealTypes.lunch'), icon: '🍽️' },
    { value: 'dinner', label: t('mealTypes.dinner'), icon: '🌙' },
    { value: 'late_night', label: t('mealTypes.lateNight'), icon: '🌃' },
  ];

  const noiseLevelOptions = [
    { value: 'quiet', label: t('noiseLevel.quiet'), icon: '🤫' },
    { value: 'moderate', label: t('noiseLevel.moderate'), icon: '🗣️' },
    { value: 'loud', label: t('noiseLevel.loud'), icon: '📢' },
  ];

  const ratingLabels: { [key: number]: string } = {
    0: t('ratings.0'),
    1: t('ratings.1'),
    2: t('ratings.2'),
    3: t('ratings.3'),
    4: t('ratings.4'),
    5: t('ratings.5'),
    6: t('ratings.6'),
    7: t('ratings.7'),
    8: t('ratings.8'),
    9: t('ratings.9'),
    10: t('ratings.10'),
  };

  const getRatingLabel = (value: number) => {
    const nearestInt = Math.round(value);
    return ratingLabels[nearestInt] || '';
  };

  const quickContextTags = [
    { id: 'romantic', label: t('contextTags.romantic'), icon: '💕' },
    { id: 'family', label: t('contextTags.family'), icon: '👨‍👩‍👧‍👦' },
    { id: 'quick', label: t('contextTags.quick'), icon: '⚡' },
    { id: 'celebration', label: t('contextTags.celebration'), icon: '🎉' },
  ];

  // ============================================
  // STATE
  // ============================================

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
    cuisine_type: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [iotaService, setIotaService] = useState<IOTAService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'fallback'>('testing');
  const { user, isAuthenticated } = useAuth();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [hasInteractedWithRating, setHasInteractedWithRating] = useState(false);

  const [currentDish, setCurrentDish] = useState<Dish>({
    id: '',
    name: '',
    rating: 7,
    notes: '',
    would_order_again: true,
  });
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState('');

  const API_BASE_URL = 'https://omeonechain-production.up.railway.app';

  const location = {
    latitude: -15.8052,
    longitude: -47.889,
    accuracy: 10,
    address: 'Asa Sul',
    city: 'Brasília',
    country: 'Brazil',
  };

  // ============================================
  // HELPERS
  // ============================================

  const getCurrentUser = () => {
    if (!isAuthenticated || !user) {
      throw new Error(t('errors.noUserLoggedIn'));
    }
    return {
      id: user.id,
      name: user.name || (user as any).display_name || (user as any).username || 'User',
      walletAddress: (user as any).address || (user as any).walletAddress || user.id,
    };
  };

  const generateDishId = () => `dish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const canPublish = useMemo(() => {
    const hasRestaurant = !!draft.restaurant;
    const ratingValid = Number.isFinite(draft.overall_rating) && draft.overall_rating >= 0 && draft.overall_rating <= 10;
    return hasRestaurant && ratingValid && !isLoading && !isSubmitting;
  }, [draft.restaurant, draft.overall_rating, isLoading, isSubmitting]);

  const formatRating = (val: number) => (Number.isInteger(val) ? String(val) : val.toFixed(1));

  // Check if user has made any changes worth saving
  const hasUnsavedChanges = useMemo(() => {
    return (
      draft.restaurant !== null ||
      draft.title.trim() !== '' ||
      draft.body.trim() !== '' ||
      draft.dishes.length > 0 ||
      draft.photos.length > 0 ||
      draft.context_tags.length > 0 ||
      draft.aspects !== null ||
      draft.context !== null
    );
  }, [draft]);

  // ============================================
  // CANCEL HANDLING
  // ============================================

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      handleConfirmCancel();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    const initIOTA = async () => {
      try {
        const service = new IOTAService();
        setIotaService(service);
        const isConnected = await service.testConnection();
        if (isConnected) setConnectionStatus('connected');
        else setConnectionStatus('fallback');
      } catch {
        setConnectionStatus('fallback');
      }
    };
    initIOTA();
  }, []);

  // ============================================
  // RESTAURANT SELECTION
  // ============================================

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setDraft(prev => ({
      ...prev,
      restaurant,
      cuisine_type: restaurant.cuisine || restaurant.category || '',
    }));
  };

  const handleChangeRestaurant = () => {
    setDraft(prev => ({
      ...prev,
      restaurant: null,
      cuisine_type: '',
    }));
  };

  // ============================================
  // DISH MANAGEMENT
  // ============================================

  const handleAddDish = () => {
    if (!currentDish.name.trim()) {
      alert(t('dishes.validation.enterName'));
      return;
    }

    if (editingDishId) {
      setDraft(prev => ({
        ...prev,
        dishes: prev.dishes.map(dish => (dish.id === editingDishId ? { ...currentDish, id: editingDishId } : dish)),
      }));
      setEditingDishId(null);
    } else {
      const newDish: Dish = { ...currentDish, id: generateDishId() };
      setDraft(prev => ({ ...prev, dishes: [...prev.dishes, newDish] }));
    }

    setCurrentDish({
      id: '',
      name: '',
      rating: 7,
      notes: '',
      would_order_again: true,
    });
  };

  const handleEditDish = (dish: Dish) => {
    setCurrentDish(dish);
    setEditingDishId(dish.id);
  };

  const handleDeleteDish = (dishId: string) => {
    setDraft(prev => ({
      ...prev,
      dishes: prev.dishes.filter(d => d.id !== dishId),
      photos: prev.photos.map(p => (p.dish_tag === dishId ? { ...p, dish_tag: 'skip', dish_tag_other: undefined } : p)),
    }));
  };

  const handleCancelEditDish = () => {
    setCurrentDish({ id: '', name: '', rating: 7, notes: '', would_order_again: true });
    setEditingDishId(null);
  };

  // ============================================
  // TAGS
  // ============================================

  const handleAddCustomTag = () => {
    const tag = customTag.trim().replace(/^#/, '').toLowerCase();
    if (tag && !draft.context_tags.includes(tag)) {
      setDraft(prev => ({ ...prev, context_tags: [...prev.context_tags, tag] }));
      setCustomTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setDraft(prev => ({ ...prev, context_tags: prev.context_tags.filter(tg => tg !== tag) }));
  };

  // ============================================
  // ASPECTS / CONTEXT UPDATERS
  // ============================================

  const aspects: RestaurantAspects = draft.aspects || {
    ambiance: 7,
    service: 7,
    value_for_money: 7,
    noise_level: undefined,
    wait_time_minutes: undefined,
  };

  const context: ContextualFactors = draft.context || {
    occasion: 'casual',
    party_size: 2,
    time_of_visit: undefined,
    meal_type: undefined,
    day_of_week: undefined,
    total_spent: undefined,
    visit_duration_minutes: undefined,
  };

  const updateAspects = (updates: Partial<RestaurantAspects>) => {
    setDraft(prev => ({
      ...prev,
      aspects: { ...(prev.aspects || aspects), ...updates },
    }));
  };

  const updateContext = (updates: Partial<ContextualFactors>) => {
    setDraft(prev => ({
      ...prev,
      context: { ...(prev.context || context), ...updates },
    }));
  };

  // ============================================
  // PHOTOS
  // ============================================

  const handlePhotosChange = (photos: PhotoData[]) => {
    setDraft(prev => ({ ...prev, photos }));
  };

  const uploadPhotosToIPFS = async (photos: PhotoData[]): Promise<string[]> => {
    if (photos.length === 0) return [];

    const formData = new FormData();
    photos.forEach(photo => {
      formData.append('photos', photo.file);
    });

    try {
      const token = localStorage.getItem('omeone_auth_token');
      if (!token) {
        throw new Error('Not authenticated - please log in');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/upload/photos`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success && data.cids && data.cids.length > 0) {
        console.log(`✓ Successfully uploaded ${data.cids.length} photo(s) to IPFS:`, data.cids);
        return data.cids;
      } else {
        throw new Error(data.error || data.message || 'No CIDs returned from upload');
      }
    } catch (error: any) {
      console.error('IPFS upload error:', error);
      throw new Error(`Failed to upload photos: ${error.message}`);
    }
  };

  // ============================================
  // PHOTO TAGGING HELPERS
  // ============================================

  const dishOptions = useMemo(() => {
    return draft.dishes
      .filter(d => d.name && d.name.trim().length > 0)
      .map(d => ({ id: d.id, name: d.name.trim() }));
  }, [draft.dishes]);

  const getDishNameById = (id?: string) => {
    if (!id) return '';
    const found = draft.dishes.find(d => d.id === id);
    return found?.name || '';
  };

  const updatePhotoTag = (index: number, updates: Partial<PhotoData>) => {
    setDraft(prev => {
      const next = [...prev.photos];
      next[index] = { ...next[index], ...updates };
      return { ...prev, photos: next };
    });
  };

  // ============================================
  // REWARDS
  // ============================================

  const REWARDS = {
    createRecommendationWallet: 5.0,
    createRecommendationEmail: 2.5,
    firstReviewerBonus: 10.0,
    validationBonusAt3Points: 10.0,
  };

  const round1 = (n: number) => Math.round(n * 10) / 10;

  const calculateExpectedRewards = (): number => {
    let immediate = REWARDS.createRecommendationWallet;
    return round1(immediate);
  };

  // ============================================
  // SUBMIT
  // ============================================

  const handleSubmit = async () => {
    if (!draft.restaurant) {
      alert(t('validation.fillRequired'));
      return;
    }
    if (!(draft.overall_rating >= 0 && draft.overall_rating <= 10)) {
      alert(t('validation.fillRequired'));
      return;
    }

    try {
      getCurrentUser();
    } catch (e: any) {
      alert(t('errors.connectWalletFirst'));
      return;
    }

    setIsSubmitting?.(true);
    setIsLoading(true);

    try {
      const currentUser = getCurrentUser();

      let photoHashes: string[] = [];
      if (draft.photos.length > 0) {
        try {
          photoHashes = await uploadPhotosToIPFS(draft.photos);
        } catch (uploadError: any) {
          console.warn('Photo upload failed:', uploadError.message);
          toast.error(
            t('errors.photoUploadFailed') || 'Photo upload failed. Your recommendation will be saved without photos.',
            { duration: 4000, icon: '📷' }
          );
        }
      }

      const CATEGORY_TAGS = ['vibe', 'menu', 'drink', 'food'];
      
      const photo_tagging = (photoHashes || []).map((cid, idx) => {
        const p = draft.photos[idx];
        const tag = p?.dish_tag;

        if (!p) return { cid, tag: 'skip' };
        if (!tag || tag === 'skip') return { cid, tag: 'skip' };

        if (tag === 'other') {
          const other = (p.dish_tag_other || '').trim();
          return other ? { cid, tag: 'other', other } : { cid, tag: 'skip' };
        }

        if (CATEGORY_TAGS.includes(tag)) {
          return { cid, tag: tag };
        }

        const dishName = getDishNameById(tag);
        return dishName ? { cid, tag: 'dish', dish_id: tag, dish_name: dishName } : { cid, tag: 'skip' };
      });

      const titleTrim = draft.title.trim();
      const bodyTrim = draft.body.trim();
      const categoryTrim = draft.category?.trim();

      const apiPayload: any = {
        restaurant_id: draft.restaurant.id,
        restaurantName: draft.restaurant.name,
        authorId: currentUser.walletAddress,
        overall_rating: draft.overall_rating,
        latitude: draft.restaurant.latitude,
        longitude: draft.restaurant.longitude,
        location: {
          city: draft.restaurant.city,
          latitude: draft.restaurant.latitude,
          longitude: draft.restaurant.longitude,
        },
        ...(titleTrim ? { title: titleTrim } : {}),
        ...(bodyTrim ? { content: bodyTrim } : {}),
        ...(categoryTrim ? { category: categoryTrim } : {}),
        dishes: draft.dishes.length
          ? draft.dishes.map(dish => ({
              name: dish.name,
              rating: dish.rating,
              notes: dish.notes,
              would_order_again: dish.would_order_again,
            }))
          : undefined,
        aspects: draft.aspects
          ? {
              ambiance: draft.aspects.ambiance,
              service: draft.aspects.service,
              value_for_money: draft.aspects.value_for_money,
              noise_level: draft.aspects.noise_level,
              wait_time_minutes: draft.aspects.wait_time_minutes,
            }
          : undefined,
        context: draft.context
          ? {
              occasion: draft.context.occasion,
              party_size: draft.context.party_size,
              time_of_visit: draft.context.time_of_visit,
              meal_type: draft.context.meal_type,
              day_of_week: draft.context.day_of_week,
              total_spent: draft.context.total_spent,
              visit_duration_minutes: draft.context.visit_duration_minutes,
            }
          : undefined,
        context_tags: draft.context_tags,
        cuisine_type: draft.cuisine_type,
        photos: photoHashes,
        photo_tagging: photo_tagging.length ? photo_tagging : undefined,
      };

      const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('omeone_auth_token'),
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API call failed with status ${response.status}`);
      }

      const result = await response.json();

      if (iotaService && connectionStatus === 'connected') {
        const blockchainData = {
          title: titleTrim || '',
          body: bodyTrim || '',
          author: currentUser.walletAddress,
          category: categoryTrim || '',
          location: {
            latitude: draft.restaurant.latitude || 0,
            longitude: draft.restaurant.longitude || 0,
            address: draft.restaurant.address,
            city: draft.restaurant.city,
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
            photoTagging: photo_tagging,
            createdAt: new Date().toISOString(),
            language: 'pt-BR',
            platform: 'bocaboca-web',
            version: 'single-screen',
            databaseId: result.recommendation?.id,
          },
        };

        try {
          await iotaService.storeRecommendation(blockchainData);
        } catch {
          // ignore; DB success is primary
        }
      }

      const recommendationId = result.recommendation?.id || 'unknown';
      const tokensEarned = result.tokens_earned || result.reward?.amount || calculateExpectedRewards();

      if (user?.id) {
        await tokenBalanceService.optimisticUpdate(user.id, tokensEarned);
      }

      toast.success(t('success.published', { tokens: Number(tokensEarned).toFixed(2) }), {
        duration: 5000,
        icon: '💰',
      });

      onSuccess?.(recommendationId);

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
        cuisine_type: '',
      });

      setCurrentDish({ id: '', name: '', rating: 7, notes: '', would_order_again: true });
      setEditingDishId(null);
      setCustomTag('');
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(error instanceof Error ? error : new Error(msg));
      alert(t('errors.createFailed', { error: msg }));
    } finally {
      setIsSubmitting?.(false);
      setIsLoading(false);
    }
  };

  // ============================================
  // AUTH GATE
  // ============================================

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <CleanHeader />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-8 text-center">
            <AlertCircle className="h-16 w-16 text-[#FF644A] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#1F1E2A] dark:text-white mb-4">{t('auth.required')}</h2>
            <p className="text-[#9CA3AF] dark:text-gray-400 mb-6">{t('auth.connectWalletMessage')}</p>
            <button
              onClick={() => (window.location.href = '/login')}
              className="bg-[#FF644A] text-white px-8 py-3 rounded-xl hover:bg-[#E65441] transition-colors font-medium shadow-md"
            >
              {t('auth.connectWallet')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER (SINGLE SCREEN)
  // ============================================

  const hasRestaurant = !!draft.restaurant;

  return (
    <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
      {/* Inject slider styles */}
      <style>{sliderStyles}</style>
      
      <CleanHeader />

      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
        <div className="bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-6 md:p-8 transition-all duration-300">
          {/* Cancel Button */}
          <button
            onClick={handleCancelClick}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A] transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{t('actions.cancel') || 'Cancel'}</span>
          </button>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-[#1F1E2A] dark:text-white mb-2">
              {t('singleScreen.title') || 'Create a Recommendation'}
            </h2>
            <p className="text-[#9CA3AF] dark:text-gray-400 text-lg">
              {t('singleScreen.subtitle') || "Restaurant + rating, and you're done."}
            </p>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center justify-center text-sm text-[#9CA3AF] dark:text-gray-500 mb-6">
              <MapPin className="h-4 w-4 mr-1" />
              <span>
                {location.city}, {location.country}
              </span>
            </div>
          )}

          {/* Restaurant: Option A inline search when none selected */}
          {!hasRestaurant ? (
            <div className="mb-6">
              <div className="mb-3 text-sm font-semibold text-[#1F1E2A] dark:text-white">
                {t('singleScreen.restaurantLabel') || 'Restaurant'} <span className="text-[#FF644A]">*</span>
              </div>
              <RestaurantAutocomplete
                onSelect={handleRestaurantSelect}
                placeholder={t('steps.restaurant.searchPlaceholder')}
                userLocation={
                  location
                    ? {
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }
                    : undefined
                }
              />
              <p className="text-center text-sm text-[#9CA3AF] dark:text-gray-500 mt-3">
                {t('steps.restaurant.helpText') || 'Search by name or address to find your restaurant'}
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <RH restaurant={draft.restaurant} onChangeRestaurant={handleChangeRestaurant} onEdit={handleChangeRestaurant} />
            </div>
          )}

          {/* Rating (required) - TOUCH FRIENDLY */}
          <div className={`mb-8 ${!hasRestaurant ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-sm font-semibold text-[#1F1E2A] dark:text-white mb-3">
              {t('steps.essentials.overallRating') || 'Overall rating'} <span className="text-[#FF644A]">*</span>
            </label>

            <div className="flex items-center space-x-3">
              {/* Touch-friendly slider with larger hit area */}
              <div className="flex-1 py-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={draft.overall_rating}
                  onChange={e => {
                    setHasInteractedWithRating(true);
                    setDraft(prev => ({ ...prev, overall_rating: parseFloat(e.target.value) }));
                  }}
                  className="w-full touch-slider"
                  style={{
                    background: `linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)`,
                  }}
                />
              </div>
              <div className="flex items-center space-x-1 min-w-[90px]">
                <Star className="h-5 w-5 text-[#FF644A] fill-[#FF644A]" />
                <span className="text-2xl font-bold text-[#FF644A]">{formatRating(draft.overall_rating)}</span>
                <span className="text-[#9CA3AF] dark:text-gray-500">/10</span>
              </div>
            </div>

            <p className="text-sm text-[#9CA3AF] dark:text-gray-400 text-center mt-2">{getRatingLabel(draft.overall_rating)}</p>
          </div>

          {/* Optional sections only show once restaurant is selected */}
          {hasRestaurant && hasInteractedWithRating && (
            <>
              {/* Completion Divider - Shows users they can publish now, optional sections below */}
              <div className="my-6 py-4 px-4 bg-[#BFE2D9]/30 dark:bg-[#BFE2D9]/10 border border-[#BFE2D9] dark:border-[#BFE2D9]/30 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-lg">✅</span>
                  <span className="font-semibold text-[#1F1E2A] dark:text-white">
                    {t('singleScreen.readyToPublish') || 'Good to go!'}
                  </span>
                </div>
                <p className="text-sm text-[#1F1E2A]/70 dark:text-gray-400">
                  {t('singleScreen.optionalDetails') || 'Want to add more? More details = smarter recommendations for you, and better tips for your network.'}
                </p>
              </div>

              <div className="space-y-4">
              {/* 1) Restaurant Aspects */}
              <CS
                title={t('singleScreen.sections.aspects') || t('aspects.title') || 'Restaurant Aspects'}
                icon={<Star className="h-5 w-5 text-[#FF644A]" />}
                defaultOpen={!!draft.aspects}
              >
                <div className="space-y-5">
                  {/* Ambiance - TOUCH FRIENDLY */}
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('aspects.ambiance')}</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 py-2">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={aspects.ambiance}
                          onChange={e => updateAspects({ ambiance: parseFloat(e.target.value) })}
                          className="w-full touch-slider"
                          style={{
                            background: `linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#FF644A] min-w-[50px] text-center">{formatRating(aspects.ambiance)}/10</span>
                    </div>
                  </div>

                  {/* Service - TOUCH FRIENDLY */}
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('aspects.service')}</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 py-2">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={aspects.service}
                          onChange={e => updateAspects({ service: parseFloat(e.target.value) })}
                          className="w-full touch-slider"
                          style={{
                            background: `linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#FF644A] min-w-[50px] text-center">{formatRating(aspects.service)}/10</span>
                    </div>
                  </div>

                  {/* Value for Money - TOUCH FRIENDLY */}
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('aspects.valueForMoney')}</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 py-2">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={aspects.value_for_money}
                          onChange={e => updateAspects({ value_for_money: parseFloat(e.target.value) })}
                          className="w-full touch-slider"
                          style={{
                            background: `linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#FF644A] min-w-[50px] text-center">{formatRating(aspects.value_for_money)}/10</span>
                    </div>
                  </div>

                  {/* Noise Level */}
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('aspects.noiseLevel')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {noiseLevelOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => updateAspects({ noise_level: option.value as any })}
                          className={`p-3 rounded-xl text-center text-sm transition-colors ${
                            aspects.noise_level === option.value
                              ? 'bg-[#FF644A] text-white'
                              : 'bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] text-[#1F1E2A] dark:text-white hover:border-[#FF644A]'
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
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('aspects.waitTime')}</label>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-[#9CA3AF] dark:text-gray-500" />
                      <input
                        type="number"
                        placeholder={t('aspects.minutesPlaceholder')}
                        value={aspects.wait_time_minutes || ''}
                        onChange={e => updateAspects({ wait_time_minutes: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        className="flex-1 px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                        min="0"
                      />
                      <span className="text-sm text-[#9CA3AF] dark:text-gray-500">{t('aspects.minutes')}</span>
                    </div>
                  </div>
                </div>
              </CS>

              {/* 2) Individual Dishes */}
              <CS
                title={t('singleScreen.sections.dishes') || t('dishes.title') || 'Individual Dishes'}
                icon={<Utensils className="h-5 w-5 text-[#FF644A]" />}
                badgeCount={draft.dishes.length}
                defaultOpen={draft.dishes.length > 0}
              >
                <div className="space-y-4">
                  {/* Existing dishes */}
                  {draft.dishes.length > 0 && (
                    <div className="space-y-2">
                      {draft.dishes.map(dish => (
                        <div key={dish.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#353444] border border-gray-100 dark:border-[#3D3C4A] rounded-xl shadow-sm">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#1F1E2A] dark:text-white">{dish.name}</span>
                              <div className="flex items-center text-sm">
                                <Star className="h-3 w-3 text-[#FF644A] fill-[#FF644A] mr-1" />
                                <span className="font-bold text-[#FF644A]">{formatRating(dish.rating)}/10</span>
                              </div>
                            </div>
                            {dish.notes && <p className="text-sm text-[#9CA3AF] dark:text-gray-400 mt-1">{dish.notes}</p>}
                            <div className="flex items-center text-xs mt-1">
                              {dish.would_order_again ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center">
                                  <ThumbsUp className="h-3 w-3 mr-1" /> {t('dishes.wouldOrderAgain')}
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400 flex items-center">
                                  <ThumbsDown className="h-3 w-3 mr-1" /> {t('dishes.wouldNotOrderAgain')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEditDish(dish)}
                              className="p-2 text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#FF644A]/20 rounded-lg transition-colors"
                              title={t('actions.edit')}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteDish(dish.id)}
                              className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={t('actions.remove')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add/edit dish - TOUCH FRIENDLY SLIDER */}
                  <div className="space-y-3 bg-white dark:bg-[#353444] p-4 rounded-xl border-2 border-dashed border-[#FF644A]/30 dark:border-[#FF644A]/40">
                    <p className="text-sm font-medium text-[#1F1E2A] dark:text-white">{editingDishId ? t('dishes.editDish') : t('dishes.addDish')}</p>

                    <input
                      type="text"
                      placeholder={t('dishes.namePlaceholder')}
                      value={currentDish.name}
                      onChange={e => setCurrentDish(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#2D2C3A] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                    />

                    <div className="flex items-center space-x-2">
                      <div className="flex-1 py-2">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={currentDish.rating}
                          onChange={e => setCurrentDish(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                          className="w-full touch-slider"
                          style={{
                            background: `linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#FF644A] min-w-[50px] text-center">{formatRating(currentDish.rating)}/10</span>
                    </div>

                    <textarea
                      placeholder={t('dishes.notesPlaceholder')}
                      value={currentDish.notes || ''}
                      onChange={e => setCurrentDish(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#2D2C3A] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentDish(prev => ({ ...prev, would_order_again: true }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                          currentDish.would_order_again ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-[#2D2C3A] text-[#1F1E2A] dark:text-white hover:bg-gray-200 dark:hover:bg-[#404050]'
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4 inline mr-1" /> {t('actions.yes')}
                      </button>
                      <button
                        onClick={() => setCurrentDish(prev => ({ ...prev, would_order_again: false }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                          !currentDish.would_order_again ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-[#2D2C3A] text-[#1F1E2A] dark:text-white hover:bg-gray-200 dark:hover:bg-[#404050]'
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4 inline mr-1" /> {t('actions.no')}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      {editingDishId && (
                        <button
                          onClick={handleCancelEditDish}
                          className="flex-1 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm text-[#1F1E2A] dark:text-white hover:bg-gray-50 dark:hover:bg-[#404050] transition-colors"
                        >
                          {t('actions.cancel')}
                        </button>
                      )}
                      <button
                        onClick={handleAddDish}
                        disabled={!currentDish.name.trim()}
                        className="flex-1 py-3 bg-[#FF644A] text-white rounded-xl hover:bg-[#E65441] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      >
                        <Plus className="h-4 w-4 inline mr-1" />
                        {editingDishId ? t('actions.save') : t('actions.add')}
                      </button>
                    </div>
                  </div>
                </div>
              </CS>

              {/* 3) Photos */}
              <CS
                title={t('singleScreen.sections.photos') || 'Photos'}
                icon={<span className="text-lg">📷</span>}
                badgeCount={draft.photos.length}
                defaultOpen={draft.photos.length > 0}
              >
                <div className="space-y-4">
                  <EnhancedPhotoUpload photos={draft.photos} onPhotosChange={handlePhotosChange} maxPhotos={5} />

                  {draft.photos.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {t('steps.preview.photoBonus', {
                        bonus: (draft.photos.length * 0.2).toFixed(1),
                        count: draft.photos.length,
                      })}
                    </p>
                  )}

                  {/* Tagging UI */}
                  {draft.photos.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-[#1F1E2A] dark:text-white mb-1">
                        {t('photos.tagging.title')}
                      </div>
                      <p className="text-xs text-[#9CA3AF] dark:text-gray-500 mb-3">{t('photos.tagging.help')}</p>

                      <div className="space-y-3">
                        {draft.photos.map((photo, idx) => {
                          const currentTag = photo.dish_tag || 'skip';
                          const isOther = currentTag === 'other';

                          const getTagLabel = () => {
                            if (currentTag === 'skip') return t('photos.tagging.notTagged');
                            if (currentTag === 'other') return `${t('photos.tagging.current')} ${photo.dish_tag_other || ''}`;
                            if (currentTag === 'vibe') return `${t('photos.tagging.current')} 🏮 ${t('photos.tagging.vibe') || 'Ambiance/Vibe'}`;
                            if (currentTag === 'menu') return `${t('photos.tagging.current')} 📋 ${t('photos.tagging.menu') || 'Menu'}`;
                            if (currentTag === 'drink') return `${t('photos.tagging.current')} 🍹 ${t('photos.tagging.drink') || 'Drink'}`;
                            return `${t('photos.tagging.current')} ${getDishNameById(currentTag)}`;
                          };

                          const taggedLabel = getTagLabel();

                          return (
                            <div key={photo.preview + idx} className="flex gap-3 items-start p-3 border border-gray-100 dark:border-[#3D3C4A] rounded-xl bg-white dark:bg-[#353444]">
                              <img
                                src={photo.preview}
                                alt={`photo-${idx}`}
                                className="w-14 h-14 rounded-lg object-cover border border-gray-100 dark:border-[#3D3C4A]"
                              />

                              <div className="flex-1">
                                <label className="block text-xs font-medium text-[#1F1E2A] dark:text-white mb-1">
                                  {t('photos.tagging.label')} <span className="text-[#9CA3AF] dark:text-gray-500">({t('singleScreen.optional')})</span>
                                </label>

                                <select
                                  value={currentTag}
                                  onChange={e => {
                                    const next = e.target.value;
                                    if (next === 'other') {
                                      updatePhotoTag(idx, { dish_tag: 'other' });
                                    } else if (next === 'skip') {
                                      updatePhotoTag(idx, { dish_tag: 'skip', dish_tag_other: undefined });
                                    } else {
                                      updatePhotoTag(idx, { dish_tag: next, dish_tag_other: undefined });
                                    }
                                  }}
                                  className="w-full px-3 py-3 text-sm border border-gray-200 dark:border-[#3D3C4A] rounded-xl bg-white dark:bg-[#2D2C3A] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all"
                                >
                                  <option value="skip">{t('photos.tagging.skip')}</option>
                
                                  <optgroup label={t('photos.tagging.categories') || 'Categories'}>
                                    <option value="vibe">🏮 {t('photos.tagging.vibe') || 'Ambiance/Vibe'}</option>
                                    <option value="menu">📋 {t('photos.tagging.menu') || 'Menu'}</option>
                                    <option value="drink">🍹 {t('photos.tagging.drink') || 'Drink'}</option>
                                  </optgroup>

                                  {dishOptions.length > 0 && (
                                    <optgroup label={t('photos.tagging.fromDishes')}>
                                      {dishOptions.map(d => (
                                        <option key={d.id} value={d.id}>
                                          🍽️ {d.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}

                                  <option value="other">{t('photos.tagging.other')}</option>
                                </select>

                                {isOther && (
                                  <input
                                    type="text"
                                    value={photo.dish_tag_other || ''}
                                    onChange={e => updatePhotoTag(idx, { dish_tag_other: e.target.value })}
                                    placeholder={t('photos.tagging.otherPlaceholder')}
                                    className="mt-2 w-full px-3 py-3 text-sm border border-gray-200 dark:border-[#3D3C4A] rounded-xl bg-white dark:bg-[#2D2C3A] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all"
                                  />
                                )}

                                <p className="text-[11px] text-[#9CA3AF] dark:text-gray-500 mt-2">{taggedLabel}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CS>

              {/* 4) Comments */}
              <CS title={t('singleScreen.sections.comments') || 'Comments'} icon={<span className="text-lg">💬</span>} defaultOpen={false}>
                <div className="space-y-5">
                  {/* Title (optional) */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1F1E2A] dark:text-white mb-2">
                      {t('steps.preview.titleLabel') || 'Title'}{' '}
                      <span className="text-xs text-[#9CA3AF] dark:text-gray-500">({t('singleScreen.optional') || 'optional'})</span>
                    </label>
                    <input
                      type="text"
                      placeholder={t('steps.preview.titlePlaceholder')}
                      value={draft.title}
                      onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Category (optional) */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1F1E2A] dark:text-white mb-2">
                      {t('steps.preview.categoryLabel') || 'Category'}{' '}
                      <span className="text-xs text-[#9CA3AF] dark:text-gray-500">({t('singleScreen.optional') || 'optional'})</span>
                    </label>
                    <select
                      value={draft.category}
                      onChange={e => setDraft(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all"
                    >
                      <option value="">{t('steps.preview.selectCategory')}</option>
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Body/content (optional) */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1F1E2A] dark:text-white mb-2">
                      {t('steps.preview.reviewLabel') || 'Comments'}{' '}
                      <span className="text-xs text-[#9CA3AF] dark:text-gray-500">({t('singleScreen.optional') || 'optional'})</span>
                    </label>
                    <textarea
                      placeholder={t('steps.preview.reviewPlaceholder')}
                      value={draft.body}
                      onChange={e => setDraft(prev => ({ ...prev, body: e.target.value }))}
                      rows={6}
                      className="w-full p-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-[#9CA3AF] dark:text-gray-500 mt-1">
                      {t('steps.preview.characterCount', { count: draft.body.length, max: 2000 })}
                    </p>
                  </div>
                </div>
              </CS>

              {/* 5) Labels */}
              <CS
                title={t('singleScreen.sections.labels') || 'Labels'}
                icon={<span className="text-lg">🏷️</span>}
                badgeCount={draft.context_tags.length}
                defaultOpen={draft.context_tags.length > 0}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {quickContextTags.map(tag => {
                      const active = draft.context_tags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => {
                            const newTags = active ? draft.context_tags.filter(tg => tg !== tag.id) : [...draft.context_tags, tag.id];
                            setDraft(prev => ({ ...prev, context_tags: newTags }));
                          }}
                          className={`px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                            active
                              ? 'bg-[#FF644A] text-white shadow-md'
                              : 'bg-[#FFF4E1] dark:bg-[#353444] hover:bg-[#FFE4D6] dark:hover:bg-[#404050] text-[#1F1E2A] dark:text-white border border-gray-200 dark:border-[#3D3C4A]'
                          }`}
                        >
                          {tag.icon} {tag.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom tag input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('steps.essentials.customTagPlaceholder')}
                      value={customTag}
                      onChange={e => setCustomTag(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTag();
                        }
                      }}
                      className="flex-1 px-4 py-3 text-sm border border-gray-200 dark:border-[#3D3C4A] rounded-xl bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all"
                    />
                    <button
                      onClick={handleAddCustomTag}
                      disabled={!customTag.trim()}
                      className="px-4 py-3 bg-[#FF644A] text-white rounded-xl text-sm hover:bg-[#E65441] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Display custom tags */}
                  {draft.context_tags.filter(tg => !quickContextTags.some(qt => qt.id === tg)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {draft.context_tags
                        .filter(tg => !quickContextTags.some(qt => qt.id === tg))
                        .map(tag => (
                          <span
                            key={tag}
                            className="px-3 py-2 bg-[#BFE2D9] dark:bg-[#BFE2D9]/20 text-[#1F1E2A] dark:text-[#6EE7B7] rounded-full text-sm flex items-center gap-1.5"
                          >
                            #{tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:bg-[#9DD5C5] dark:hover:bg-[#6EE7B7]/30 rounded-full p-0.5 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </CS>

              {/* 6) Visit Context */}
              <CS
                title={t('singleScreen.sections.context') || t('context.title') || 'Visit Context'}
                icon={<Calendar className="h-5 w-5 text-[#FF644A]" />}
                defaultOpen={!!draft.context}
              >
                <div className="space-y-4">
                  {/* Occasion */}
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.occasion')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {occasionOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => updateContext({ occasion: option.value as any })}
                          className={`p-3 rounded-xl text-sm transition-colors ${
                            context.occasion === option.value 
                              ? 'bg-[#FF644A] text-white' 
                              : 'bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] text-[#1F1E2A] dark:text-white hover:border-[#FF644A]'
                          }`}
                        >
                          {option.icon} {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Party Size */}
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.partySize')}</label>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-[#9CA3AF] dark:text-gray-500" />
                      <input
                        type="number"
                        value={context.party_size}
                        onChange={e => updateContext({ party_size: parseInt(e.target.value, 10) || 1 })}
                        className="flex-1 px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                        min="1"
                        max="20"
                      />
                      <span className="text-sm text-[#9CA3AF] dark:text-gray-500">{t('context.people')}</span>
                    </div>
                  </div>

                  {/* Meal Type */}
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.mealType')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {mealTypeOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => updateContext({ meal_type: option.value as any })}
                          className={`p-3 rounded-xl text-xs transition-colors ${
                            context.meal_type === option.value 
                              ? 'bg-[#FF644A] text-white' 
                              : 'bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] text-[#1F1E2A] dark:text-white hover:border-[#FF644A]'
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
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.dateTime')}</label>
                    <input
                      type="datetime-local"
                      value={context.time_of_visit || ''}
                      onChange={e => {
                        const date = e.target.value;
                        const dayOfWeek = date ? new Date(date).toLocaleDateString('pt-BR', { weekday: 'long' }) : undefined;
                        updateContext({
                          time_of_visit: date,
                          day_of_week: dayOfWeek,
                        });
                      }}
                      className="w-full px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                    />
                  </div>

                  {/* Total Spent */}
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.totalSpent')}</label>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-[#9CA3AF] dark:text-gray-500" />
                      <span className="text-sm text-[#9CA3AF] dark:text-gray-500">R$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={context.total_spent || ''}
                        onChange={e => updateContext({ total_spent: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="flex-1 px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Visit Duration */}
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.visitDuration')}</label>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-[#9CA3AF] dark:text-gray-500" />
                      <input
                        type="number"
                        placeholder={t('aspects.minutesPlaceholder')}
                        value={context.visit_duration_minutes || ''}
                        onChange={e => updateContext({ visit_duration_minutes: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        className="flex-1 px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                        min="0"
                      />
                      <span className="text-sm text-[#9CA3AF] dark:text-gray-500">{t('aspects.minutes')}</span>
                    </div>
                  </div>
                </div>
              </CS>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[#1F1E2A] dark:text-white mb-2">
              {t('singleScreen.cancelConfirm.title') || 'Discard changes?'}
            </h3>
            <p className="text-sm text-[#9CA3AF] dark:text-gray-400 mb-6">
              {t('singleScreen.cancelConfirm.message') || 'You have unsaved changes. Are you sure you want to leave?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm font-medium text-[#1F1E2A] dark:text-white hover:bg-gray-50 dark:hover:bg-[#353444] transition-colors"
              >
                {t('singleScreen.cancelConfirm.stay') || 'Keep editing'}
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                {t('singleScreen.cancelConfirm.discard') || 'Discard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Publish Button */}
      <SPB
        disabled={!canPublish}
        disabledReason={t('singleScreen.publishHint') || 'Select a restaurant and rating to publish'}
        onPublish={handleSubmit}
        isPublishing={isLoading || isSubmitting}
        estimatedReward={calculateExpectedRewards()}
        t={t}
      />
    </div>
  );
};

export default RecommendationCreationFlow;