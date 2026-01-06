"use client"

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Share2, 
  Clock,
  Star,
  Users,
  Coins,
  Camera,
  MoreHorizontal,
  Flag,
  Edit,
  ThumbsUp,
  ThumbsDown,
  Utensils,
  MessageCircle,
  Repeat2,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Volume1,
  FolderPlus,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn, timeAgo, formatTokenAmount } from '@/lib/utils';
import CommentSection from '@/components/comments/CommentSection';
import FirstReviewerBadge from './badges/FirstReviewerBadge';
import SaveToListModal from '@/src/components/saved-lists/SaveToListModal';
import toast from 'react-hot-toast';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  name, 
  size = 40,
  className = ""
}) => {
  const [hasError, setHasError] = useState(false);
  
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'U'
  )}&background=FF644A&color=fff&size=${size}`;

  const imageUrl = (!hasError && src) ? src : fallbackUrl;

  return (
    <div 
      className={cn(
        "rounded-full overflow-hidden bg-gray-200 relative flex-shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

// ============================================================================
// TYPES
// ============================================================================

interface Author {
  id: string;
  name: string;
  avatar: string;
  reputation: number;
  isFollowing: boolean;
  socialDistance: 1 | 2;
  verificationLevel?: 'basic' | 'verified' | 'expert';
}

interface Location {
  restaurant_id?: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;  // Added for location display
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

interface TokenReward {
  amount: number;
  usdValue: number;
  earnedFrom: 'upvotes' | 'saves' | 'trust_bonus' | 'creation' | 'social_multiplier';
  multiplier?: number;
  breakdown?: {
    baseReward: number;
    socialBonus: number;
    qualityBonus: number;
  };
}

interface PhotoData {
  url: string;
  ipfsHash?: string;
  caption?: string;
  hasLocation?: boolean;
  isCompressed?: boolean;
}

interface Dish {
  id: string;
  name: string;
  rating: number;
  notes?: string;
  would_order_again: boolean;
}

interface RestaurantAspects {
  ambiance?: number;
  service?: number;
  value_for_money?: number;
  noise_level?: 'quiet' | 'moderate' | 'loud';
}

interface ContextualFactors {
  occasion?: 'date_night' | 'family_dinner' | 'quick_lunch' | 'celebration' | 'business_lunch' | 'casual';
  party_size?: number;
  meal_type?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late_night';
  time_of_visit?: string;
  total_spent?: number;
}

interface Recommendation {
  id: string;
  title?: string; // Now optional
  content?: string; // Changed from description, now optional
  photos?: PhotoData[];
  image?: string; // Legacy single image support
  category?: string;
  location: Location;
  author: Author;
  
  overall_rating: number;
  dishes?: Dish[];
  aspects?: RestaurantAspects;
  context?: ContextualFactors;
  context_tags?: string[];
  
  engagement: {
    saves: number;
    upvotes: number;
    comments: number;
    reshares?: number;
    shares?: number;
    views?: number;
  };
  tokenRewards?: TokenReward;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  isBookmarked: boolean;
  hasUpvoted: boolean;
  hasReshared?: boolean;
  first_reviewer_bonus_awarded?: boolean;
  
  // Blockchain verification
  objectId?: string;
  transactionHash?: string;
  contentHash?: string;
  verificationStatus?: 'verified' | 'unverified' | 'flagged';
  
  // Permissions
  canEdit?: boolean;
  canDelete?: boolean;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  variant?: 'default' | 'creation-preview';
  showAuthor?: boolean;
  showTokenRewards?: boolean;
  showBlockchainInfo?: boolean;
  showActions?: boolean;
  showComments?: boolean;
  onUpvote?: (id: string) => void;
  onShare?: (id: string) => void;
  onSave?: (id: string) => void;
  onReshare?: (id: string, comment?: string) => Promise<void>;
  onUndoReshare?: (id: string) => Promise<void>;
  onAuthorClick?: (authorId: string) => void;
  onLocationClick?: (location: Location) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
  className?: string;
  backendUrl?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTENT_COLLAPSE_THRESHOLD = 150;

/**
 * Extract a clean location display from a full address string
 * Example: "CJG2+8WW, Boulevar de Juan Dolio, Playa Juan Dolio 21000, Dominican Republic"
 * Returns: "Playa Juan Dolio, Dominican Republic"
 */
function extractLocationFromAddress(address?: string): string {
  if (!address) return '';
  
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  
  // Take last 2 parts (usually city/area + country)
  const lastTwo = parts.slice(-2);
  
  // Clean postal codes from the first part (e.g., "Playa Juan Dolio 21000" -> "Playa Juan Dolio")
  lastTwo[0] = lastTwo[0].replace(/\s*\d{4,}$/, '').trim();
  
  return lastTwo.join(', ');
}

// ============================================================================
// COMPONENT
// ============================================================================

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  variant = 'default',
  showAuthor = true,
  showTokenRewards = false,
  showBlockchainInfo = false,
  showActions = true,
  showComments = true,
  onUpvote,
  onShare,
  onSave,
  onReshare,
  onUndoReshare,
  onAuthorClick,
  onLocationClick,
  onEdit,
  onDelete,
  onReport,
  className,
  backendUrl = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev'
}) => {
  const t = useTranslations('recommendations');
  const photoScrollRef = useRef<HTMLDivElement>(null);
  
  // UI State
  const [showMenu, setShowMenu] = useState(false);
  const [showSaveToListModal, setShowSaveToListModal] = useState(false);
  const [showAllDishes, setShowAllDishes] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  
  // Engagement State
  const [commentCount, setCommentCount] = useState(recommendation.engagement.comments);
  const [reshareCount, setReshareCount] = useState(recommendation.engagement.reshares || 0);
  const [hasReshared, setHasReshared] = useState(recommendation.hasReshared || false);
  const [isResharing, setIsResharing] = useState(false);

  // Derived data
  const photos = recommendation.photos || (recommendation.image ? [{ url: recommendation.image }] : []);
  const hasPhotos = photos.length > 0;
  const hasContent = recommendation.content && recommendation.content.length > 0;
  // Check if title is auto-generated fallback (redundant with restaurant name)
  const isAutoGeneratedTitle = recommendation.title && 
    recommendation.location?.name && 
    recommendation.title.toLowerCase() === `recommendation for ${recommendation.location.name.toLowerCase()}`;

  const hasTitle = recommendation.title && recommendation.title.length > 0 && !isAutoGeneratedTitle;
  const hasDishes = recommendation.dishes && recommendation.dishes.length > 0;
  const hasAspects = recommendation.aspects && (
    recommendation.aspects.ambiance || 
    recommendation.aspects.service || 
    recommendation.aspects.value_for_money
  );
  const hasSmartTags = !!(
    recommendation.category ||
    recommendation.context?.meal_type ||
    recommendation.context_tags?.length ||
    recommendation.aspects?.noise_level ||
    (recommendation.context?.party_size && recommendation.context.party_size > 4)
  );
  const showDishesAndTagsRow = hasDishes || hasSmartTags;
  
  // Location display: extract clean location from full address for context (especially useful for trips)
  // Uses the address field which is more reliable than parsed city/country
  
  // DEBUG: Log location data to diagnose what's coming from the API
  console.log('📍 Location data for', recommendation.location.name, ':', {
    address: recommendation.location.address,
    city: recommendation.location.city,
    country: recommendation.location.country
  });
  
  const parsedLocation = extractLocationFromAddress(recommendation.location.address);
  console.log('📍 Parsed location:', parsedLocation);
  
  const locationDisplay = parsedLocation ||
    // Fallback to city/country if address parsing fails
    [recommendation.location.city, recommendation.location.country].filter(Boolean).join(', ');
  const hasLocationInfo = locationDisplay.length > 0;
  
  const isLongContent = hasContent && recommendation.content!.length > CONTENT_COLLAPSE_THRESHOLD;
  const displayContent = isLongContent && !isContentExpanded 
    ? recommendation.content!.slice(0, CONTENT_COLLAPSE_THRESHOLD) + '...'
    : recommendation.content;

  console.log('📋 RecommendationCard props:', {
    id: recommendation.id,
    title: recommendation.title,
    content: recommendation.content,
    contentType: typeof recommendation.content,
    contentLength: recommendation.content?.length,
    allKeys: Object.keys(recommendation)
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleUpvote = () => onUpvote?.(recommendation.id);
  const handleShare = () => onShare?.(recommendation.id);
  const handleSave = () => onSave?.(recommendation.id);

  const handleReshareToggle = async () => {
    if (isResharing) return;
    
    setIsResharing(true);
    
    try {
      const token = localStorage.getItem('omeone_auth_token');
      
      if (hasReshared) {
        const response = await fetch(
          `${backendUrl}/recommendations/${recommendation.id}/reshare`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || t('reshare.failed'));
        }

        setHasReshared(false);
        setReshareCount(prev => Math.max(0, prev - 1));
        toast.success(t('reshare.removed'));
        
        if (onUndoReshare) {
          await onUndoReshare(recommendation.id);
        }
      } else {
        const response = await fetch(
          `${backendUrl}/recommendations/${recommendation.id}/reshare`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || t('reshare.failed'));
        }

        setHasReshared(true);
        setReshareCount(prev => prev + 1);
        toast.success(t('reshare.success'));
        
        if (onReshare) {
          await onReshare(recommendation.id);
        }
      }
    } catch (error: any) {
      console.error('Failed to toggle reshare:', error);
      toast.error(error.message || t('reshare.failed'));
    } finally {
      setIsResharing(false);
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getSocialConnectionText = (author: Author) => {
    if (author.socialDistance === 1) return t('card.social.yourFriend');
    return t('card.social.friendOfFriend');
  };

  const getSocialConnectionColor = (author: Author) => {
    if (author.socialDistance === 1) return "text-coral bg-[#FFE8E4]";
    return "text-[#E65441] bg-[#FFF0ED]";
  };

  const getVerificationBadge = (level?: string) => {
    switch (level) {
      case 'expert':
        return <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{t('card.badges.expert')}</span>;
      case 'verified':
        return <span className="text-xs bg-[#BFE2D9] text-[#2D7A5F] px-1.5 py-0.5 rounded-full">{t('card.badges.verified')}</span>;
      default:
        return null;
    }
  };

  const getNoiseIcon = (level?: 'quiet' | 'moderate' | 'loud') => {
    switch (level) {
      case 'quiet':
        return <VolumeX size={12} className="text-green-600" />;
      case 'moderate':
        return <Volume1 size={12} className="text-yellow-600" />;
      case 'loud':
        return <Volume2 size={12} className="text-red-500" />;
      default:
        return null;
    }
  };

  const formatAspectRatings = (aspects: RestaurantAspects) => {
    const parts: string[] = [];
    if (aspects.ambiance) parts.push(`A${aspects.ambiance}`);
    if (aspects.service) parts.push(`S${aspects.service}`);
    if (aspects.value_for_money) parts.push(`V${aspects.value_for_money}`);
    return parts.join(' · ');
  };

  const getMealTypeLabel = (mealType: string) => {
    const keyMap: Record<string, string> = {
      'late_night': 'lateNight',
      'breakfast': 'breakfast',
      'brunch': 'brunch',
      'lunch': 'lunch',
      'dinner': 'dinner'
    };
    return t(`mealTypes.${keyMap[mealType] || mealType}`);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderAuthorSection = () => (
    <div className="flex items-center justify-between">
      <button
        onClick={() => onAuthorClick?.(recommendation.author.id)}
        className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors min-w-0 flex-1"
      >
        {/* Avatar */}
        <UserAvatar 
          src={recommendation.author.avatar}
          name={recommendation.author.name}
          size={40}
        />
        
        {/* Author Info */}
        <div className="text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-navy truncate">
              {recommendation.author.name}
            </span>
            {getVerificationBadge(recommendation.author.verificationLevel)}
            {recommendation.first_reviewer_bonus_awarded && (
              <FirstReviewerBadge />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={cn(
              "px-1.5 py-0.5 rounded-full font-medium",
              getSocialConnectionColor(recommendation.author)
            )}>
              {getSocialConnectionText(recommendation.author)}
            </span>
            <span>·</span>
            <span>{timeAgo(recommendation.createdAt)}</span>
          </div>
        </div>
      </button>

      {/* More Menu */}
      {showActions && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal size={18} className="text-gray-500" />
          </button>
          
          {showMenu && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                {recommendation.canEdit && (
                  <button
                    onClick={() => {
                      onEdit?.(recommendation.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit size={14} />
                    {t('card.edit')}
                  </button>
                )}
                {/* Add to List */}
                <button
                  onClick={() => {
                    setShowSaveToListModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <FolderPlus size={14} />
                  {t('card.addToList')}
                </button>
                <button
                  onClick={() => {
                    onReport?.(recommendation.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                >
                  <Flag size={14} />
                  {t('card.report')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderRestaurantHeader = () => (
    <div className="space-y-1">
      {/* Restaurant Name + Rating Row */}
      <div className="flex items-start justify-between gap-3">
        {/* Restaurant Name + Location (left side) */}
        <div className="min-w-0 flex-1">
          {/* Restaurant Name */}
          {recommendation.location.restaurant_id ? (
            <Link 
              href={`/restaurant/${recommendation.location.restaurant_id}`}
              className="text-lg font-semibold text-navy hover:text-coral transition-colors line-clamp-2"
            >
              {recommendation.location.name}
            </Link>
          ) : (
            <button
              onClick={() => onLocationClick?.(recommendation.location)}
              className="text-lg font-semibold text-navy hover:text-coral transition-colors text-left line-clamp-2"
            >
              {recommendation.location.name}
            </button>
          )}
          
          {/* City, Country - provides trip context in social feed */}
          {hasLocationInfo && (
            <p className="text-xs text-gray-500 mt-0.5">
              {locationDisplay}
            </p>
          )}
        </div>

        {/* Overall Rating + Aspects (stacked on right) */}
        <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
          {/* Rating Badge */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-lg font-bold text-gray-900">{recommendation.overall_rating}</span>
              <span className="text-xs text-gray-500">/10</span>
            </div>
          </div>
          
          {/* Aspect Ratings (single line below rating, full words) */}
          {hasAspects && (
            <div className="text-[10px] text-gray-400">
              {[
                recommendation.aspects!.ambiance && `Amb ${recommendation.aspects!.ambiance}`,
                recommendation.aspects!.service && `Ser ${recommendation.aspects!.service}`,
                recommendation.aspects!.value_for_money && `Val ${recommendation.aspects!.value_for_money}`
              ].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* User Title (optional, quoted, italic) */}
      {hasTitle && (
        <p className="text-sm text-gray-600 italic">
          "{recommendation.title}"
        </p>
      )}
    </div>
  );

  const renderPhotoCarousel = () => {
    const validPhotos = photos.filter((_, index) => !imageErrors.has(index));
    if (validPhotos.length === 0) return null;

    return (
      <div className="relative -mx-4">
        <div 
          ref={photoScrollRef}
          className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {photos.map((photo, index) => {
            if (imageErrors.has(index)) return null;
            
            return (
              <div 
                key={index}
                className="relative flex-shrink-0 w-32 h-28 rounded-lg overflow-hidden snap-start"
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || `Photo ${index + 1}`}
                  fill
                  className="object-cover"
                  onError={() => handleImageError(index)}
                />
              </div>
            );
          })}
        </div>
        
        {/* Photo count indicator */}
        {validPhotos.length > 3 && (
          <div className="absolute top-2 right-6 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full flex items-center gap-1">
            <Camera size={10} />
            {validPhotos.length}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (!hasContent) return null;

    return (
      <div className="text-sm text-gray-700 leading-relaxed">
        {displayContent}
        {isLongContent && (
          <button
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            className="text-coral hover:text-[#E65441] ml-1 font-medium"
          >
            {isContentExpanded ? t('card.showLess') : t('card.readMore')}
          </button>
        )}
      </div>
    );
  };

  const renderDishesSection = () => {
    if (!hasDishes) return null;
    
    const dishes = recommendation.dishes!;
    const displayDishes = showAllDishes ? dishes : dishes.slice(0, 2);
    const hasMoreDishes = dishes.length > 2;

    return (
      <div className="space-y-2">
        {/* Dishes Header */}
        <button
          onClick={() => setShowAllDishes(!showAllDishes)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-coral transition-colors"
        >
          <Utensils size={14} />
          <span className="font-medium">
            {dishes.length} {dishes.length === 1 ? t('card.dish') : t('card.dishes')}
          </span>
          {hasMoreDishes && (
            showAllDishes ? <ChevronUp size={14} /> : <ChevronDown size={14} />
          )}
        </button>

        {/* Dishes List (collapsed by default) */}
        {showAllDishes && (
          <div className="space-y-1.5 pl-1">
            {displayDishes.map((dish) => (
              <div 
                key={dish.id} 
                className="flex items-center justify-between bg-[#FFF8F0] rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-navy truncate">{dish.name}</span>
                  {dish.would_order_again ? (
                    <ThumbsUp size={12} className="text-green-600 flex-shrink-0" />
                  ) : (
                    <ThumbsDown size={12} className="text-red-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <span className="text-sm font-semibold text-gray-900">{dish.rating}</span>
                  <span className="text-xs text-gray-500">/10</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSmartTags = () => {
    const tags: React.ReactNode[] = [];

    // Category
    if (recommendation.category) {
      tags.push(
        <span key="category" className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
          {recommendation.category}
        </span>
      );
    }

    // Meal type
    if (recommendation.context?.meal_type) {
      tags.push(
        <span key="meal" className="px-2 py-1 bg-[#FFE8E4] text-coral text-xs rounded-full">
          {getMealTypeLabel(recommendation.context.meal_type)}
        </span>
      );
    }

    // Context tags
    if (recommendation.context_tags) {
      recommendation.context_tags.slice(0, 3).forEach((tag, index) => {
        tags.push(
          <span key={`tag-${index}`} className="px-2 py-1 bg-[#FFE8E4] text-coral text-xs rounded-full">
            #{tag}
          </span>
        );
      });
    }

    // Party size (only if notable, >4 people)
    if (recommendation.context?.party_size && recommendation.context.party_size > 4) {
      tags.push(
        <span key="party" className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
          <Users size={10} />
          {recommendation.context.party_size}+
        </span>
      );
    }

    // Noise level
    if (recommendation.aspects?.noise_level) {
      const noiseIcon = getNoiseIcon(recommendation.aspects.noise_level);
      tags.push(
        <span key="noise" className="px-2 py-1 bg-gray-100 text-xs rounded-full flex items-center gap-1">
          {noiseIcon}
        </span>
      );
    }

    if (tags.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5">
        {tags}
      </div>
    );
  };

  const renderDishesAndTagsRow = () => {
    if (!showDishesAndTagsRow) return null;

    return (
      <div className="space-y-2 pt-2 border-t border-gray-100">
        {/* Dishes (collapsible) */}
        {renderDishesSection()}
        
        {/* Smart Tags */}
        {renderSmartTags()}
      </div>
    );
  };

  const renderEngagementActions = () => (
    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      {/* Engagement Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <button 
          onClick={handleUpvote}
          className={cn(
            "flex items-center gap-1 transition-colors",
            recommendation.hasUpvoted ? "text-coral" : "hover:text-coral"
          )}
        >
          <Heart size={14} fill={recommendation.hasUpvoted ? 'currentColor' : 'none'} />
          <span>{recommendation.engagement.upvotes}</span>
        </button>
        
        <div className="flex items-center gap-1">
          <MessageCircle size={14} />
          <span>{commentCount}</span>
        </div>
        
        {reshareCount > 0 && (
          <div className="flex items-center gap-1">
            <Repeat2 size={14} />
            <span>{reshareCount}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Like */}
        <motion.button
          onClick={handleUpvote}
          className={cn(
            "p-2 rounded-lg transition-colors",
            recommendation.hasUpvoted 
              ? "text-coral bg-[#FFE8E4]" 
              : "text-gray-500 hover:text-coral hover:bg-[#FFE8E4]"
          )}
          whileTap={{ scale: 0.95 }}
          aria-label="Like"
        >
          <Heart size={18} fill={recommendation.hasUpvoted ? "currentColor" : "none"} />
        </motion.button>

        {/* Reshare */}
        <motion.button
          onClick={handleReshareToggle}
          disabled={isResharing}
          className={cn(
            "p-2 rounded-lg transition-colors",
            hasReshared
              ? "text-green-600 bg-green-50"
              : "text-gray-500 hover:text-green-600 hover:bg-green-50"
          )}
          whileTap={{ scale: 0.95 }}
          aria-label="Reshare"
        >
          <Repeat2 size={18} />
        </motion.button>

        {/* Bookmark/Save */}
        {onSave && (
          <motion.button
            onClick={handleSave}
            className={cn(
              "p-2 rounded-lg transition-colors",
              recommendation.isBookmarked
                ? "text-coral bg-[#FFE8E4]"
                : "text-gray-500 hover:text-coral hover:bg-[#FFE8E4]"
            )}
            whileTap={{ scale: 0.95 }}
            aria-label="Save"
          >
            <svg 
              className="w-[18px] h-[18px]" 
              fill={recommendation.isBookmarked ? "currentColor" : "none"} 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
              />
            </svg>
          </motion.button>
        )}

        {/* Share */}
        <motion.button
          onClick={handleShare}
          className="p-2 rounded-lg text-gray-500 hover:text-coral hover:bg-[#FFE8E4] transition-colors"
          whileTap={{ scale: 0.95 }}
          aria-label="Share"
        >
          <Share2 size={18} />
        </motion.button>
      </div>
    </div>
  );

  const renderTokenRewards = () => {
    if (!showTokenRewards || !recommendation.tokenRewards) return null;

    return (
      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
        <Coins size={16} className="text-green-600" />
        <div className="flex-1">
          <span className="text-sm font-medium text-green-800">
            {formatTokenAmount(recommendation.tokenRewards.amount)} BOCA
          </span>
          <div className="text-xs text-green-600">
            ${recommendation.tokenRewards.usdValue.toFixed(3)}
          </div>
        </div>
      </div>
    );
  };

  const renderBlockchainInfo = () => {
    if (!showBlockchainInfo || !recommendation.objectId) return null;

    return (
      <div className="p-2 bg-[#BFE2D9] rounded-lg text-xs text-[#2D7A5F]">
        <div className="flex items-center justify-between">
          <span>{t('card.onChainVerified')}</span>
          <span className="font-mono">{recommendation.objectId.slice(0, 8)}...</span>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <motion.div
        className={cn(
          "bg-white rounded-xl border overflow-hidden transition-all duration-200",
          "hover:shadow-lg",
          variant === 'creation-preview' 
            ? "border-green-300 bg-green-50/30" 
            : "border-gray-200 hover:border-coral",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4 space-y-3">
          {/* Creation Preview Banner */}
          {variant === 'creation-preview' && (
            <div className="bg-green-100 border border-green-200 rounded-lg p-3">
              <div className="flex items-center text-green-800">
                <Clock size={16} className="mr-2" />
                <span className="text-sm font-medium">{t('card.previewMode')}</span>
              </div>
            </div>
          )}

          {/* 1. Author Info Row */}
          {showAuthor && renderAuthorSection()}

          {/* 2. Restaurant Header */}
          {renderRestaurantHeader()}

          {/* 3. Photo Carousel */}
          {hasPhotos && renderPhotoCarousel()}

          {/* 4. Content */}
          {renderContent()}

          {/* 5. Dishes + Smart Tags Row */}
          {renderDishesAndTagsRow()}

          {/* Token Rewards (optional) */}
          {renderTokenRewards()}

          {/* Blockchain Info (optional) */}
          {renderBlockchainInfo()}

          {/* 6. Engagement Actions */}
          {showActions && renderEngagementActions()}

          {/* 7. Comment Section */}
          {showComments && (
            <CommentSection
              recommendationId={recommendation.id}
              recommendationAuthorId={recommendation.author.id}
              initialCommentCount={commentCount}
              onCommentCountChange={setCommentCount}
              onAuthorClick={onAuthorClick}
              collapsedByDefault={true}
            />
          )}
        </div>
      </motion.div>

      {/* Save to List Modal */}
      {showSaveToListModal && (
        <SaveToListModal
          itemType="recommendation"
          itemId={recommendation.id}
          onClose={() => setShowSaveToListModal(false)}
          onSave={() => {
            setShowSaveToListModal(false);
            toast.success(t('card.addedToList'));
          }}
        />
      )}
    </>
  );
};

export default RecommendationCard;