// components/recommendation/RecommendationCreationFlow.tsx
// SINGLE SCREEN VERSION: inline restaurant search when none selected
// Uses existing reusable components: CollapsibleSection, RestaurantHeader, StickyPublishButton
//
// UPDATED: Dark mode support
// UPDATED: 0.5 increments for Restaurant Aspects
// UPDATED: Cancel button added
// UPDATED: Touch-friendly rating sliders (Jan 25, 2026)
// UPDATED: All optional sections visible upfront (Jan 30, 2026)
// UPDATED: Autosave draft to localStorage (Jan 30, 2026)
// UPDATED: Scroll-on-focus for restaurant search to avoid keyboard obstruction (Feb 1, 2026)
// UPDATED: Tighter header spacing for mobile search visibility (Feb 1, 2026)
// UPDATED: Edit mode support — editMode prop, PATCH endpoint, locked restaurant (Feb 9, 2026)
// UPDATED: Reordered sections (Photos before Dishes), simplified Dishes, removed Labels (Feb 13, 2026)
// UPDATED: Integrated dish rating into Photos (per-photo annotation), removed Individual Dishes section (Feb 14, 2026)
// UPDATED: Categories refreshed (added Brunch, Happy Hour, Business Meal, Date Night, Family Friendly) (Feb 14, 2026)
// UPDATED: Visit Context section hidden for beta (overlaps with Categories) (Feb 14, 2026)

import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Star,
  AlertCircle,
  Clock,
  X,
  ArrowLeft,
  Save,
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
// DRAFT STORAGE KEY
// ============================================
const DRAFT_STORAGE_KEY = 'bocaboca_recommendation_draft';
const DRAFT_SAVE_DELAY = 2000; // 2 seconds debounce

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
  // NEW: Per-photo annotation (Feb 14, 2026) — replaces Individual Dishes section
  annotation?: string;        // Free text: "Lasagna", "the patio", etc.
  dishRating?: number;        // 0-10 rating (set via auto-appearing slider)
  showRating?: boolean;       // UI state for rating slider visibility
}

// Serializable version for localStorage (without File objects)
interface SerializableDraft {
  restaurant: Restaurant | null;
  title: string;
  body: string;
  category: string;
  overall_rating: number;
  dishes: Dish[];
  aspects: RestaurantAspects | null;
  context: ContextualFactors | null;
  context_tags: string[];
  cuisine_type?: string;
  // Photos can't be serialized, so we just track count
  photoCount: number;
  savedAt: string;
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

interface EditData {
  id: string;
  restaurant: any;
  title: string;
  body: string;
  category: string;
  overall_rating: number;
  cuisine_type?: string;
  context_tags: string[];
  dishes: any[];
  aspects: any;
  context: any;
  existingPhotos: Array<{
    cid: string | null;
    url: string;
    caption?: string;
    tag?: string | null;
    isModified?: boolean;
    newFile?: File;
  }>;
  photoTagging: any[];
  created_at: string;
  blockchain_status?: string;
}

interface RecommendationCreationFlowProps {
  onSuccess?: (recommendationId: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  setIsSubmitting?: (loading: boolean) => void;
  /** Edit mode — if true, pre-fills form from editData */
  editMode?: boolean;
  editData?: EditData;
}

const RecommendationCreationFlow: React.FC<RecommendationCreationFlowProps> = ({
  onSuccess,
  onError,
  onCancel,
  isSubmitting = false,
  setIsSubmitting,
  editMode = false,
  editData,
}) => {
  const t = useTranslations('recommendations');
  const router = useRouter();

  // ============================================
  // CONSTANTS (using translations)
  // ============================================

  const categories = [
    { value: 'breakfast', label: t('categories.breakfast') },
    { value: 'brunch', label: t('categories.brunch') },
    { value: 'lunch', label: t('categories.lunch') },
    { value: 'dinner', label: t('categories.dinner') },
    { value: 'coffee', label: t('categories.coffee') },
    { value: 'happyHour', label: t('categories.happyHour') },
    { value: 'desserts', label: t('categories.desserts') },
    { value: 'special', label: t('categories.special') },
    { value: 'snack', label: t('categories.snack') },
    { value: 'lateNight', label: t('categories.lateNight') },
    { value: 'business', label: t('categories.business') },
    { value: 'dateNight', label: t('categories.dateNight') },
    { value: 'familyFriendly', label: t('categories.familyFriendly') },
  ];

  // NOTE: occasionOptions and mealTypeOptions hidden with Visit Context (Feb 14, 2026)
  // Kept for future restoration. Categories now cover these use cases.
  /*
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
  */

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

  // NOTE: Labels section removed for launch. Context tags kept in data model
  // for backward compatibility but no longer exposed in UI.
  // Future: NLP-based categorization from recommendation text.

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

  // Edit mode: existing photos from server (IPFS)
  const [existingPhotos, setExistingPhotos] = useState<
    Array<{ cid: string | null; url: string; caption?: string; tag?: string | null; isModified?: boolean; newFile?: File }>
  >(editData?.existingPhotos || []);

  const [isLoading, setIsLoading] = useState(false);
  const [iotaService, setIotaService] = useState<IOTAService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'fallback'>('testing');
  const { user, isAuthenticated } = useAuth();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<SerializableDraft | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // NOTE: Individual dish state removed (Feb 14, 2026)
  // Dishes are now built from photo annotations at submit time

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
  // DRAFT SAVE/LOAD FUNCTIONS
  // ============================================

  const saveDraftToStorage = (draftToSave: RecommendationDraft) => {
    try {
      const serializableDraft: SerializableDraft = {
        restaurant: draftToSave.restaurant,
        title: draftToSave.title,
        body: draftToSave.body,
        category: draftToSave.category,
        overall_rating: draftToSave.overall_rating,
        dishes: draftToSave.dishes,
        aspects: draftToSave.aspects,
        context: draftToSave.context,
        context_tags: draftToSave.context_tags,
        cuisine_type: draftToSave.cuisine_type,
        photoCount: draftToSave.photos.length,
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(serializableDraft));
      setLastSavedAt(new Date());
      setIsSaving(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
      setIsSaving(false);
    }
  };

  const loadDraftFromStorage = (): SerializableDraft | null => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  };

  const clearDraftFromStorage = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setLastSavedAt(null);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  const applyRecoveredDraft = () => {
    if (recoveredDraft) {
      setDraft({
        restaurant: recoveredDraft.restaurant,
        title: recoveredDraft.title,
        body: recoveredDraft.body,
        category: recoveredDraft.category,
        overall_rating: recoveredDraft.overall_rating,
        dishes: recoveredDraft.dishes,
        aspects: recoveredDraft.aspects,
        context: recoveredDraft.context,
        context_tags: recoveredDraft.context_tags,
        cuisine_type: recoveredDraft.cuisine_type,
        photos: [], // Photos can't be recovered
      });
      
      if (recoveredDraft.photoCount > 0) {
        toast(t('draft.photosNotRecovered') || `Note: ${recoveredDraft.photoCount} photo(s) could not be recovered. Please re-add them.`, {
          icon: '📷',
          duration: 5000,
        });
      }
      
      toast.success(t('draft.restored') || 'Draft restored!');
      setShowDraftRecovery(false);
      setRecoveredDraft(null);
    }
  };

  const discardRecoveredDraft = () => {
    clearDraftFromStorage();
    setShowDraftRecovery(false);
    setRecoveredDraft(null);
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
    clearDraftFromStorage();
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

  // Check for saved draft on mount
  useEffect(() => {
    if (editMode) return; // Don't show draft recovery when editing
    const savedDraft = loadDraftFromStorage();
    if (savedDraft && savedDraft.restaurant) {
      // Only show recovery if there's meaningful content
      const hasContent = savedDraft.restaurant || 
                         savedDraft.title.trim() || 
                         savedDraft.body.trim() || 
                         savedDraft.dishes.length > 0;
      
      if (hasContent) {
        setRecoveredDraft(savedDraft);
        setShowDraftRecovery(true);
      }
    }
  }, []);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (editMode && editData) {
      setDraft({
        restaurant: editData.restaurant,
        title: editData.title || '',
        body: editData.body || '',
        category: editData.category || '',
        overall_rating: editData.overall_rating || 7,
        dishes: editData.dishes || [],
        aspects: editData.aspects || null,
        context: editData.context || null,
        photos: [], // New photos start empty; existing tracked separately
        context_tags: editData.context_tags || [],
        cuisine_type: editData.cuisine_type || '',
      });
      setExistingPhotos(editData.existingPhotos || []);
    }
  }, [editMode, editData]);

  // Autosave draft when content changes (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    setIsSaving(true);
    const timeoutId = setTimeout(() => {
      saveDraftToStorage(draft);
    }, DRAFT_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [draft, hasUnsavedChanges]);

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
  // DISH BUILDING (from photo annotations)
  // NOTE: Individual Dishes section removed Feb 14, 2026.
  // Dishes are now built from photo annotations at submit time.
  // ============================================

  const buildDishesFromPhotos = (): Dish[] => {
    const dishes: Dish[] = [];

    // Collect from existing photos (edit mode)
    existingPhotos.forEach(p => {
      if (p.annotation?.trim() && p.dishRating !== undefined) {
        // Avoid duplicates by dish name
        const name = p.annotation.trim();
        if (!dishes.find(d => d.name.toLowerCase() === name.toLowerCase())) {
          dishes.push({
            id: generateDishId(),
            name,
            rating: p.dishRating,
            notes: '',
            would_order_again: true,
          });
        }
      }
    });

    // Collect from new photos
    draft.photos.forEach(p => {
      if (p.annotation?.trim() && p.dishRating !== undefined) {
        const name = p.annotation.trim();
        if (!dishes.find(d => d.name.toLowerCase() === name.toLowerCase())) {
          dishes.push({
            id: generateDishId(),
            name,
            rating: p.dishRating,
            notes: '',
            would_order_again: true,
          });
        }
      }
    });

    return dishes;
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

  // NOTE: updateContext hidden with Visit Context (Feb 14, 2026)
  // const updateContext = (updates: Partial<ContextualFactors>) => {
  //   setDraft(prev => ({
  //     ...prev,
  //     context: { ...(prev.context || context), ...updates },
  //   }));
  // };

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

  // NOTE: dishOptions, getDishNameById, updatePhotoTag removed (Feb 14, 2026)
  // Photo tagging now uses the annotation text directly.

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
      toast.error(t('validation.fillRequired'));
      return;
    }
    if (!(draft.overall_rating >= 0 && draft.overall_rating <= 10)) {
      toast.error(t('validation.fillRequired'));
      return;
    }

    try {
      getCurrentUser();
    } catch (e: any) {
      toast.error(t('errors.connectWalletFirst'));
      return;
    }

    setIsSubmitting?.(true);
    setIsLoading(true);

    try {
      const currentUser = getCurrentUser();

      // ── EDIT MODE: PATCH existing recommendation ──
      if (editMode && editData?.id) {
        // Upload NEW photos + RE-CROPPED existing photos
        let allPhotoCids: string[] = [];

        // 1. Keep unchanged existing photos (their original CIDs)
        const unchangedCids = existingPhotos
          .filter(p => !p.isModified && p.cid)
          .map(p => p.cid as string);

        // 2. Upload re-cropped existing photos
        const recropPhotos = existingPhotos.filter(p => p.isModified && p.newFile);
        let recropCids: string[] = [];
        if (recropPhotos.length > 0) {
          try {
            const recropFormData = new FormData();
            recropPhotos.forEach(p => recropFormData.append('photos', p.newFile!));
            const token = localStorage.getItem('omeone_auth_token');
            const recropRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/upload/photos`,
              { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: recropFormData }
            );
            const recropData = await recropRes.json();
            recropCids = recropData.cids || [];
          } catch (err) {
            console.warn('Re-crop upload failed:', err);
          }
        }

        // 3. Upload brand new photos
        let newPhotoCids: string[] = [];
        if (draft.photos.length > 0) {
          try {
            newPhotoCids = await uploadPhotosToIPFS(draft.photos);
          } catch (err) {
            console.warn('New photo upload failed:', err);
          }
        }

        allPhotoCids = [...unchangedCids, ...recropCids, ...newPhotoCids];

        const editPayload: any = {
          title: draft.title.trim() || undefined,
          content: draft.body.trim() || undefined,
          category: draft.category?.trim() || undefined,
          overall_rating: draft.overall_rating,
          context_tags: draft.context_tags,
          cuisine_type: draft.cuisine_type,
          photos: allPhotoCids.length > 0 ? allPhotoCids : undefined,
          dishes: draft.dishes.length > 0
            ? draft.dishes.map(dish => ({
                name: dish.name,
                rating: dish.rating,
                notes: dish.notes,
                would_order_again: dish.would_order_again,
              }))
            : undefined,
          aspects: draft.aspects || undefined,
          context: draft.context || undefined,
        };

        const response = await fetch(`${API_BASE_URL}/api/recommendations/${editData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + localStorage.getItem('omeone_auth_token'),
          },
          body: JSON.stringify(editPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Edit failed with status ${response.status}`);
        }

        const result = await response.json();

        toast.success(
          result.within_grace_period
            ? (t('edit.savedSilently') || 'Changes saved!')
            : (t('edit.savedWithFlag') || 'Changes saved (marked as edited)'),
          { duration: 4000, icon: '✅' }
        );

        onSuccess?.(editData.id);
        return; // Skip the normal POST flow below
      }
      // ── END EDIT MODE ──

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
      
      // Build photo_tagging from annotations (NEW — Feb 14, 2026)
      const photo_tagging = (photoHashes || []).map((cid, idx) => {
        const p = draft.photos[idx];
        if (!p) return { cid, tag: 'skip' };

        const annotationText = p.annotation?.trim();
        if (!annotationText) return { cid, tag: 'skip' };

        // If user rated this as a dish
        if (p.dishRating !== undefined) {
          return { cid, tag: 'dish', dish_name: annotationText };
        }

        // Otherwise it's a general annotation (ambiance, menu, drink, etc.)
        return { cid, tag: 'other', other: annotationText };
      });

      // Build dishes from photo annotations (replaces manual dish management)
      const dishesFromPhotos = buildDishesFromPhotos();

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
        dishes: dishesFromPhotos.length
          ? dishesFromPhotos.map(dish => ({
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
            dishCount: dishesFromPhotos.length,
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

      // Clear draft on successful publish
      clearDraftFromStorage();

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
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(error instanceof Error ? error : new Error(msg));
      toast.error(t('errors.createFailed', { error: msg }));
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
  // Section order: Aspects → Photos → Comments (Visit Context hidden for beta)
  // (Labels removed for launch)
  // ============================================

  const hasRestaurant = !!draft.restaurant;

  return (
    <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
      {/* Inject slider styles */}
      <style>{sliderStyles}</style>
      
      <CleanHeader />

      {/* Draft Recovery Modal */}
      {showDraftRecovery && recoveredDraft && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-xl dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#BFE2D9] dark:bg-[#BFE2D9]/20 rounded-full flex items-center justify-center">
                <Save className="h-5 w-5 text-[#1F1E2A] dark:text-[#BFE2D9]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1F1E2A] dark:text-white">
                  {t('draft.found') || 'Draft Found'}
                </h3>
                <p className="text-xs text-[#9CA3AF] dark:text-gray-500">
                  {t('draft.savedAt', { 
                    time: new Date(recoveredDraft.savedAt).toLocaleString() 
                  }) || `Saved ${new Date(recoveredDraft.savedAt).toLocaleString()}`}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-[#353444] rounded-lg p-3 mb-4">
              <p className="text-sm text-[#1F1E2A] dark:text-white font-medium">
                {recoveredDraft.restaurant?.name || t('draft.noRestaurant')}
              </p>
              {recoveredDraft.title && (
                <p className="text-xs text-[#9CA3AF] dark:text-gray-400 mt-1">"{recoveredDraft.title}"</p>
              )}
              <div className="flex gap-2 mt-2 text-xs text-[#9CA3AF] dark:text-gray-500">
                {recoveredDraft.dishes.length > 0 && (
                  <span>🍽️ {recoveredDraft.dishes.length} dishes</span>
                )}
                {recoveredDraft.photoCount > 0 && (
                  <span>📷 {recoveredDraft.photoCount} photos</span>
                )}
              </div>
            </div>
            
            <p className="text-sm text-[#9CA3AF] dark:text-gray-400 mb-6">
              {t('draft.restoreQuestion') || 'Would you like to continue where you left off?'}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={discardRecoveredDraft}
                className="flex-1 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm font-medium text-[#1F1E2A] dark:text-white hover:bg-gray-50 dark:hover:bg-[#353444] transition-colors"
              >
                {t('draft.startFresh') || 'Start Fresh'}
              </button>
              <button
                onClick={applyRecoveredDraft}
                className="flex-1 py-3 bg-[#FF644A] text-white rounded-xl text-sm font-medium hover:bg-[#E65441] transition-colors"
              >
                {t('draft.restore') || 'Restore Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGED: py-8 → py-4 to reduce top padding on mobile */}
      <div className="max-w-2xl mx-auto px-4 py-4 pb-28">
        <div className="bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-6 md:p-8 transition-all duration-300">
          {/* Header with Cancel and Save Status */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleCancelClick}
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">{t('actions.cancel') || 'Cancel'}</span>
            </button>
            
            {/* Autosave indicator */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-xs text-[#9CA3AF] dark:text-gray-500">
                {isSaving ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <span>{t('draft.saving') || 'Saving...'}</span>
                  </>
                ) : lastSavedAt ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span>{t('draft.saved') || 'Draft saved'}</span>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Title — CHANGED: mb-6 → mb-3, text-3xl → text-2xl, text-lg → text-sm */}
          <div className="text-center mb-3">
            <h2 className="text-2xl font-bold text-[#1F1E2A] dark:text-white mb-2">
              {editMode
                ? (t('edit.title') || 'Edit Recommendation')
                : (t('singleScreen.title') || 'Create a Recommendation')}
            </h2>
            <p className="text-[#9CA3AF] dark:text-gray-400 text-sm">
              {t('singleScreen.subtitle') || "Restaurant + rating, and you're done."}
            </p>
          </div>

          {/* Location — CHANGED: mb-6 → mb-3 */}
          {location && (
            <div className="flex items-center justify-center text-sm text-[#9CA3AF] dark:text-gray-500 mb-3">
              <MapPin className="h-4 w-4 mr-1" />
              <span>
                {location.city}, {location.country}
              </span>
            </div>
          )}

          {/* Restaurant: inline autocomplete with scroll-on-focus — CHANGED: mb-6 → mb-4 */}
          {/* Change 1.6: Lock restaurant in edit mode */}
          {!hasRestaurant ? (
            <div className="mb-4" id="restaurant-search-section">
              <div className="mb-3 text-sm font-semibold text-[#1F1E2A] dark:text-white">
                {t('singleScreen.restaurantLabel') || 'Restaurant'} <span className="text-[#FF644A]">*</span>
              </div>
              <div
                onFocus={() => {
                  // Scroll search to top of viewport so results aren't hidden by keyboard
                  setTimeout(() => {
                    document.getElementById('restaurant-search-section')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }, 300);
                }}
              >
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
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <RH
                restaurant={draft.restaurant}
                onChangeRestaurant={editMode ? undefined : handleChangeRestaurant}
                onEdit={editMode ? undefined : handleChangeRestaurant}
              />
              {editMode && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
                  {t('edit.restaurantLocked') || 'Restaurant cannot be changed after publishing'}
                </p>
              )}
            </div>
          )}

          {/* Rating (required) - TOUCH FRIENDLY */}
          <div className={`mb-6 ${!hasRestaurant ? 'opacity-50 pointer-events-none' : ''}`}>
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

          {/* Optional sections - always visible once restaurant selected */}
          {hasRestaurant && (
            <>
              {/* Info text about optional fields */}
              <div className="mb-6 py-3 px-4 bg-[#BFE2D9]/20 dark:bg-[#BFE2D9]/10 border border-[#BFE2D9]/50 dark:border-[#BFE2D9]/20 rounded-xl">
                <p className="text-sm text-[#1F1E2A]/80 dark:text-gray-300 text-center">
                  <span className="font-medium">{t('singleScreen.optionalHint') || 'Optional:'}</span>{' '}
                  {t('singleScreen.optionalDetails') || 'Add more details to help your network and build your taste profile.'}
                </p>
              </div>

              <div className="space-y-4">
              {/* ========================================== */}
              {/* 1) Restaurant Aspects                     */}
              {/* ========================================== */}
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

              {/* ========================================== */}
              {/* 2) Photos (MOVED UP from position 3)      */}
              {/* ========================================== */}
              <CS
                title={t('singleScreen.sections.photos') || 'Photos'}
                icon={<span className="text-lg">📷</span>}
                badgeCount={draft.photos.length + existingPhotos.length}
                defaultOpen={draft.photos.length > 0 || existingPhotos.length > 0}
              >
                {/* EnhancedPhotoUpload now handles:
                    - Single "Add Photo" zone (no separate Take Photo / From Gallery)
                    - Crop queue for multi-select
                    - Per-photo annotation ("What's in this photo?")
                    - Auto-showing dish rating slider with dismiss
                    Individual Dishes section REMOVED — dishes are built from photo annotations on publish */}
                <EnhancedPhotoUpload
                  photos={draft.photos}
                  onPhotosChange={handlePhotosChange}
                  maxPhotos={5}
                  existingPhotos={existingPhotos}
                  onExistingPhotosChange={setExistingPhotos}
                />
              </CS>

              {/* NOTE: Individual Dishes section REMOVED (Feb 14, 2026)
                  Dish ratings are now integrated into the Photos section.
                  Users annotate each photo with a dish name and the rating slider
                  auto-appears. Dishes are built from these annotations on publish.
                  The Dish interface and draft.dishes are preserved for API compatibility. */}

              {/* ========================================== */}
              {/* 3) Comments (unchanged)                    */}
              {/* ========================================== */}
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

              {/* ========================================== */}
              {/* Labels section REMOVED for launch.         */}
              {/* Future: NLP-based categorization.          */}
              {/* context_tags kept in data model for compat */}
              {/* ========================================== */}

              {/* ==========================================
                  Visit Context — HIDDEN for beta (Feb 14, 2026)
                  Tester feedback: overlaps with Categories, adds friction.
                  Categories now cover: Brunch, Business Meal, Date Night,
                  Family Friendly, Happy Hour/Drinks, etc.
                  Data model (ContextualFactors) preserved for future use.
                  To restore: uncomment this <CS> block and re-enable
                  occasionOptions, mealTypeOptions, updateContext above.
                  Also re-add imports: Calendar, Users, DollarSign.
              ========================================== */}
              {/*
              <CS
                title={t('singleScreen.sections.context') || t('context.title') || 'Visit Context'}
                icon={<Calendar className="h-5 w-5 text-[#FF644A]" />}
                defaultOpen={!!draft.context}
              >
                <div className="space-y-4">
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
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.partySize')}</label>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-[#9CA3AF] dark:text-gray-500" />
                      <input type="number" value={context.party_size}
                        onChange={e => updateContext({ party_size: parseInt(e.target.value, 10) || 1 })}
                        className="flex-1 px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                        min="1" max="20" />
                      <span className="text-sm text-[#9CA3AF] dark:text-gray-500">{t('context.people')}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.mealType')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {mealTypeOptions.map(option => (
                        <button key={option.value}
                          onClick={() => updateContext({ meal_type: option.value as any })}
                          className={`p-3 rounded-xl text-xs transition-colors ${
                            context.meal_type === option.value 
                              ? 'bg-[#FF644A] text-white' 
                              : 'bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] text-[#1F1E2A] dark:text-white hover:border-[#FF644A]'
                          }`}>
                          <div className="text-lg">{option.icon}</div>
                          <div className="mt-1">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.dateTime')}</label>
                    <input type="datetime-local" value={context.time_of_visit || ''}
                      onChange={e => {
                        const date = e.target.value;
                        const dayOfWeek = date ? new Date(date).toLocaleDateString('pt-BR', { weekday: 'long' }) : undefined;
                        updateContext({ time_of_visit: date, day_of_week: dayOfWeek });
                      }}
                      className="w-full px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.totalSpent')}</label>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-[#9CA3AF] dark:text-gray-500" />
                      <span className="text-sm text-[#9CA3AF] dark:text-gray-500">R$</span>
                      <input type="number" placeholder="0.00" value={context.total_spent || ''}
                        onChange={e => updateContext({ total_spent: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="flex-1 px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                        step="0.01" min="0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-2 block">{t('context.visitDuration')}</label>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-[#9CA3AF] dark:text-gray-500" />
                      <input type="number" placeholder={t('aspects.minutesPlaceholder')} value={context.visit_duration_minutes || ''}
                        onChange={e => updateContext({ visit_duration_minutes: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        className="flex-1 px-3 py-3 border border-gray-200 dark:border-[#3D3C4A] rounded-xl text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A] focus:border-transparent"
                        min="0" />
                      <span className="text-sm text-[#9CA3AF] dark:text-gray-500">{t('aspects.minutes')}</span>
                    </div>
                  </div>
                </div>
              </CS>
              */}
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

      {/* Sticky Publish Button — Change 1.10: Edit mode text + hide rewards */}
      <SPB
        disabled={!canPublish}
        disabledReason={t('singleScreen.publishHint') || 'Select a restaurant and rating to publish'}
        onPublish={handleSubmit}
        isPublishing={isLoading || isSubmitting}
        estimatedReward={editMode ? undefined : calculateExpectedRewards()}
        publishLabel={editMode ? (t('edit.saveChanges') || 'Save Changes') : undefined}
        t={t}
      />
    </div>
  );
};

export default RecommendationCreationFlow;