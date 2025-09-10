"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Bookmark, 
  Share2, 
  MapPin, 
  Clock, 
  Star,
  Users,
  Coins,
  ChevronRight,
  Camera,
  ExternalLink,
  MoreHorizontal,
  Flag,
  Edit
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import TrustScoreBadge from './TrustScoreBadge';
import { cn, timeAgo, formatTokenAmount } from '@/lib/utils';

interface Author {
  id: string;
  name: string;
  avatar: string;
  reputation: number;
  isFollowing: boolean;
  socialDistance: 1 | 2; // 1 = direct friend, 2 = friend-of-friend
  verificationLevel?: 'basic' | 'verified' | 'expert';
}

interface Location {
  restaurant_id?: number; // Added for linking to restaurant detail pages
  name: string;
  address: string;
  city: string;
  latitude?: number; // Standardized coordinate format
  longitude?: number; // Standardized coordinate format
  placeId?: string;
}

interface TokenReward {
  amount: number;
  usdValue: number;
  earnedFrom: 'upvotes' | 'saves' | 'trust_bonus' | 'creation' | 'social_multiplier';
  multiplier?: number; // Social multiplier applied
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

interface Recommendation {
  id: string;
  title: string;
  description: string;
  // Enhanced photo support from our creation flow
  photos?: PhotoData[];
  image?: string; // Fallback for single image (legacy)
  category: string;
  location: Location;
  author: Author;
  trustScore: number;
  trustBreakdown: {
    directFriends: number;
    friendsOfFriends: number;
    totalEndorsements: number;
    socialHops: '±1 hop' | '±2 hops' | 'Mixed';
    algorithm?: string; // 'LIVE CALCULATION' indicator
  };
  engagement: {
    saves: number;
    upvotes: number;
    comments: number;
    shares?: number;
    views?: number;
  };
  tokenRewards?: TokenReward;
  createdAt: string;
  updatedAt?: string;
  tags: string[];
  isBookmarked: boolean;
  hasUpvoted: boolean;
  // Enhanced metadata from creation flow
  visitDate?: string;
  pricePoint?: number;
  atmosphere?: string[];
  accessibility?: string[];
  // Blockchain metadata
  objectId?: string;
  transactionHash?: string;
  contentHash?: string;
  verificationStatus?: 'verified' | 'unverified' | 'flagged';
  // User permissions
  canEdit?: boolean;
  canDelete?: boolean;
}

interface RecommendationCardProps {
    recommendation: Recommendation;
      variant?: 'default' | 'compact' | 'detailed' | 'creation-preview';
        showAuthor?: boolean;
          showTokenRewards?: boolean;
            showBlockchainInfo?: boolean;
              showActions?: boolean;
                onSave?: (id: string) => void;
                  onUpvote?: (id: string) => void;
                    onShare?: (id: string) => void;
                      onAuthorClick?: (authorId: string) => void;
                        onLocationClick?: (location: Location) => void;
                          onEdit?: (id: string) => void;
                            onDelete?: (id: string) => void;
                              onReport?: (id: string) => void;
                                className?: string;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  variant = 'default',
  showAuthor = true,
  showTokenRewards = false,
  showBlockchainInfo = false,
  showActions = true,
  onSave,
  onUpvote,
  onShare,
  onAuthorClick,
  onLocationClick,
  onEdit,
  onDelete,
  onReport,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  // Get photos array (enhanced support)
  const photos = recommendation.photos || (recommendation.image ? [{ url: recommendation.image }] : []);
  const hasMultiplePhotos = photos.length > 1;

  const handleSave = () => {
    onSave?.(recommendation.id);
  };

  const handleUpvote = () => {
    onUpvote?.(recommendation.id);
  };

  const handleShare = () => {
    onShare?.(recommendation.id);
  };

  // Updated location click handler to support restaurant navigation
  const handleLocationClick = () => {
    if (onLocationClick) {
      onLocationClick(recommendation.location);
    }
  };

  // New function to handle restaurant navigation
  const navigateToRestaurant = () => {
    if (recommendation.location.restaurant_id) {
      // Use Next.js router if available, or window.location as fallback
      if (typeof window !== 'undefined') {
        window.location.href = `/restaurant/${recommendation.location.restaurant_id}`;
      }
    }
  };

  const getSocialConnectionText = (author: Author) => {
    if (author.socialDistance === 1) {
      return "Your friend";
    }
    return "Friend-of-friend";
  };

  const getSocialConnectionColor = (author: Author) => {
    if (author.socialDistance === 1) {
      return "text-social-600 bg-social-50";
    }
    return "text-network-600 bg-network-50";
  };

  const getVerificationBadge = (level?: string) => {
    switch (level) {
      case 'expert':
        return <span className="text-xs bg-gold-100 text-gold-700 px-1.5 py-0.5 rounded-full">Expert</span>;
      case 'verified':
        return <span className="text-xs bg-trust-100 text-trust-700 px-1.5 py-0.5 rounded-full">Verified</span>;
      default:
        return null;
    }
  };

  const getTokenRewardText = (tokenReward: TokenReward) => {
    const baseText = `${formatTokenAmount(tokenReward.amount)} TOK`;
    if (tokenReward.multiplier && tokenReward.multiplier > 1) {
      return `${baseText} (${tokenReward.multiplier}× social boost)`;
    }
    return baseText;
  };

  return (
    <motion.div
      className={cn(
        "bg-white rounded-xl border border-network-200 overflow-hidden transition-all duration-200",
        "hover:shadow-soft hover:border-network-300",
        {
          "max-w-sm": variant === 'compact',
          "max-w-2xl": variant === 'detailed',
          "border-green-200 bg-green-50/30": variant === 'creation-preview'
        },
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Enhanced Photo Display */}
      {photos.length > 0 && !imageError && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={photos[currentPhotoIndex]?.url || ''}
            alt={recommendation.title}
            fill
            className="object-cover transition-transform duration-300"
            style={{
              transform: isHovered ? 'scale(1.05)' : 'scale(1)'
            }}
            onError={() => setImageError(true)}
          />
          
          {/* Photo Navigation for Multiple Photos */}
          {hasMultiplePhotos && (
            <>
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === currentPhotoIndex ? "bg-white" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-lg backdrop-blur-sm flex items-center">
                  <Camera size={12} className="mr-1" />
                  {photos.length}
                </span>
              </div>
            </>
          )}

          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-lg backdrop-blur-sm">
              {recommendation.category}
            </span>
          </div>

          {/* Trust Score Overlay with Live Indicator */}
          <div className="absolute top-3 right-3">
            <TrustScoreBadge
              score={recommendation.trustScore}
              breakdown={recommendation.trustBreakdown}
              variant="minimal"
              size="sm"
            />
            {recommendation.trustBreakdown.algorithm === 'LIVE CALCULATION' && (
              <div className="absolute -bottom-1 -right-1">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
              </div>
            )}
          </div>

          {/* Location GPS indicator */}
          {photos[currentPhotoIndex]?.hasLocation && (
            <div className="absolute bottom-3 right-3">
              <div className="bg-black/60 text-white text-xs px-1.5 py-1 rounded-lg backdrop-blur-sm flex items-center">
                <MapPin size={12} className="mr-1" />
                GPS
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Creation Preview Banner */}
        {variant === 'creation-preview' && (
          <div className="bg-green-100 border border-green-200 rounded-lg p-3 mb-3">
            <div className="flex items-center text-green-800">
              <Clock size={16} className="mr-2" />
              <span className="text-sm font-medium">Preview Mode - Ready to Publish</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="space-y-2">
          {/* Title and Location */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-network-900 text-lg leading-tight line-clamp-2">
                {recommendation.title}
              </h3>
              
              {/* Enhanced location click handling */}
              {recommendation.location.restaurant_id ? (
                <Link 
                  href={`/restaurant/${recommendation.location.restaurant_id}`}
                  className="flex items-center gap-1 mt-1 text-network-600 hover:text-trust-600 transition-colors group"
                >
                  <MapPin size={14} />
                  <span className="text-sm truncate group-hover:underline">
                    {recommendation.location.name}
                  </span>
                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ) : (
                <button
                  onClick={handleLocationClick}
                  className="flex items-center gap-1 mt-1 text-network-600 hover:text-trust-600 transition-colors group"
                >
                  <MapPin size={14} />
                  <span className="text-sm truncate group-hover:underline">
                    {recommendation.location.name}
                  </span>
                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              
              {recommendation.location.address && (
                <p className="text-xs text-network-500 truncate">
                  {recommendation.location.address}, {recommendation.location.city}
                </p>
              )}
            </div>

            {/* Trust Score (if no image) */}
            {photos.length === 0 && (
              <TrustScoreBadge
                score={recommendation.trustScore}
                breakdown={recommendation.trustBreakdown}
                variant="compact"
                size="sm"
              />
            )}

            {/* Actions Menu */}
            {showActions && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-network-100 rounded-lg transition-colors"
                >
                  <MoreHorizontal size={16} className="text-network-500" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-white border border-network-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                    {recommendation.canEdit && (
                      <button
                        onClick={() => {
                          onEdit?.(recommendation.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-network-50 flex items-center"
                      >
                        <Edit size={14} className="mr-2" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onReport?.(recommendation.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-network-50 flex items-center text-red-600"
                    >
                      <Flag size={14} className="mr-2" />
                      Report
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Author Info */}
          {showAuthor && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onAuthorClick?.(recommendation.author.id)}
                className="flex items-center gap-2 hover:bg-network-50 rounded-lg p-1 -m-1 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-network-200 relative">
                  <Image
                    src={recommendation.author.avatar}
                    alt={recommendation.author.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-network-900">
                      {recommendation.author.name}
                    </span>
                    {getVerificationBadge(recommendation.author.verificationLevel)}
                  </div>
                  <div className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-medium",
                    getSocialConnectionColor(recommendation.author)
                  )}>
                    {getSocialConnectionText(recommendation.author)}
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-network-700 text-sm leading-relaxed line-clamp-3">
          {recommendation.description}
        </p>

        {/* Enhanced Metadata */}
        {variant === 'detailed' && (
          <div className="space-y-2 text-xs text-network-600">
            {recommendation.visitDate && (
              <p className="flex items-center gap-1">
                <Clock size={12} />
                Visited: {new Date(recommendation.visitDate).toLocaleDateString()}
              </p>
            )}
            {recommendation.pricePoint && (
              <p className="flex items-center gap-1">
                <Coins size={12} />
                Price point: {recommendation.pricePoint}/10
              </p>
            )}
          </div>
        )}

        {/* Tags */}
        {recommendation.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recommendation.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-network-100 text-network-700 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
            {recommendation.tags.length > 3 && (
              <span className="px-2 py-1 text-network-500 text-xs">
                +{recommendation.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Token Rewards (Enhanced) */}
        {showTokenRewards && recommendation.tokenRewards && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-success-50 rounded-lg">
              <Coins size={16} className="text-success-600" />
              <div className="flex-1">
                <span className="text-sm font-medium text-success-800">
                  {getTokenRewardText(recommendation.tokenRewards)}
                </span>
                <div className="text-xs text-success-600">
                  ${recommendation.tokenRewards.usdValue.toFixed(3)} • {recommendation.tokenRewards.earnedFrom}
                </div>
              </div>
            </div>
            
            {/* Detailed breakdown for detailed variant */}
            {variant === 'detailed' && recommendation.tokenRewards.breakdown && (
              <div className="text-xs text-network-600 space-y-1 pl-4 border-l-2 border-success-200">
                <p>Base: {recommendation.tokenRewards.breakdown.baseReward} TOK</p>
                <p>Social bonus: +{recommendation.tokenRewards.breakdown.socialBonus} TOK</p>
                <p>Quality bonus: +{recommendation.tokenRewards.breakdown.qualityBonus} TOK</p>
              </div>
            )}
          </div>
        )}

        {/* Blockchain Info */}
        {showBlockchainInfo && recommendation.objectId && (
          <div className="p-2 bg-trust-50 rounded-lg text-xs text-trust-700">
            <div className="flex items-center justify-between">
              <span>On-chain verified</span>
              <span className="font-mono">{recommendation.objectId.slice(0, 8)}...</span>
            </div>
            {recommendation.contentHash && (
              <div className="mt-1 font-mono text-trust-600">
                IPFS: {recommendation.contentHash.slice(0, 12)}...
              </div>
            )}
          </div>
        )}

        {/* Actions Footer */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t border-network-100">
            {/* Engagement Stats */}
            <div className="flex items-center gap-4 text-xs text-network-500">
              <div className="flex items-center gap-1">
                <Users size={12} />
                <span>{recommendation.engagement.saves} saves</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart size={12} />
                <span>{recommendation.engagement.upvotes}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{timeAgo(recommendation.createdAt)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <motion.button
                onClick={handleUpvote}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  recommendation.hasUpvoted 
                    ? "text-red-600 bg-red-50" 
                    : "text-network-500 hover:text-red-600 hover:bg-red-50"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Heart size={16} fill={recommendation.hasUpvoted ? "currentColor" : "none"} />
              </motion.button>

              <motion.button
                onClick={handleSave}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  recommendation.isBookmarked 
                    ? "text-trust-600 bg-trust-50" 
                    : "text-network-500 hover:text-trust-600 hover:bg-trust-50"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark size={16} fill={recommendation.isBookmarked ? "currentColor" : "none"} />
              </motion.button>

              <motion.button
                onClick={handleShare}
                className="p-2 rounded-lg text-network-500 hover:text-network-700 hover:bg-network-50 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Share2 size={16} />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Enhanced example with new features
export const RecommendationCardExample: React.FC = () => {
  const [showTokenRewards, setShowTokenRewards] = useState(true);
  const [showBlockchainInfo, setShowBlockchainInfo] = useState(false);

  const sampleRecommendation: Recommendation = {
    id: '1',
    title: 'Brasserie du Soleil - Best Brunch in Brooklyn',
    description: 'Amazing kid-friendly brunch spot with incredible French toast and a great outdoor seating area. The staff is super accommodating and they have high chairs available. Their weekend bottomless mimosas are a steal!',
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
        hasLocation: true,
        isCompressed: true,
        caption: 'Beautiful outdoor seating'
      },
      {
        url: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
        hasLocation: true,
        isCompressed: true,
        caption: 'Famous French toast'
      },
      {
        url: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
        hasLocation: false,
        isCompressed: true,
        caption: 'Cozy interior'
      }
    ],
    category: 'Brunch',
    location: {
      restaurant_id: 1, // Added integer restaurant ID for navigation
      name: 'Brasserie du Soleil',
      address: '123 Main St',
      city: 'Brooklyn, NY',
      latitude: 40.6782,
      longitude: -73.9442
    },
    author: {
      id: 'author1',
      name: 'Alice Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b547?w=100&h=100&fit=crop&crop=face',
      reputation: 8.5,
      isFollowing: true,
      socialDistance: 1,
      verificationLevel: 'verified'
    },
    trustScore: 8.3,
    trustBreakdown: {
      directFriends: 11,
      friendsOfFriends: 12,
      totalEndorsements: 23,
      socialHops: '±1 hop',
      algorithm: 'LIVE CALCULATION'
    },
    engagement: {
      saves: 23,
      upvotes: 18,
      comments: 5,
      shares: 7,
      views: 156
    },
    tokenRewards: {
      amount: 3.4,
      usdValue: 0.41,
      earnedFrom: 'social_multiplier',
      multiplier: 2.3,
      breakdown: {
        baseReward: 1.0,
        socialBonus: 1.8,
        qualityBonus: 0.6
      }
    },
    createdAt: '2025-01-20T10:30:00Z',
    updatedAt: '2025-01-20T14:22:00Z',
    visitDate: '2025-01-18T09:00:00Z',
    pricePoint: 7,
    tags: ['family-friendly', 'brunch', 'outdoor-seating', 'bottomless-mimosas'],
    isBookmarked: false,
    hasUpvoted: false,
    objectId: '0x8e2115e374da187479791caf2a6591b5a3b8579c8550089e922ce673453e0f80',
    transactionHash: '0xabcdef123456789...',
    contentHash: 'QmXoZ9H7K2pQ8...',
    verificationStatus: 'verified',
    canEdit: true,
    canDelete: true
  };

  return (
    <div className="p-8 bg-background-secondary min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-network-900 mb-4">Enhanced Recommendation Cards</h2>
          <p className="text-network-600 mb-6">
            Featuring multi-photo support, enhanced location data, blockchain verification, and token rewards
          </p>
          
          {/* Controls */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setShowTokenRewards(!showTokenRewards)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                showTokenRewards ? "bg-success-100 text-success-700" : "bg-network-100 text-network-700"
              )}
            >
              {showTokenRewards ? 'Hide' : 'Show'} Token Rewards
            </button>
            <button
              onClick={() => setShowBlockchainInfo(!showBlockchainInfo)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                showBlockchainInfo ? "bg-trust-100 text-trust-700" : "bg-network-100 text-network-700"
              )}
            >
              {showBlockchainInfo ? 'Hide' : 'Show'} Blockchain Info
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Default variant with all features */}
          <RecommendationCard 
            recommendation={sampleRecommendation} 
            showTokenRewards={showTokenRewards}
            showBlockchainInfo={showBlockchainInfo}
            onLocationClick={(location) => console.log('Navigate to:', location)}
            onSave={(id) => console.log('Saved:', id)}
            onUpvote={(id) => console.log('Upvoted:', id)}
            onShare={(id) => console.log('Shared:', id)}
            onAuthorClick={(id) => console.log('View author:', id)}
          />
          
          {/* Creation preview variant */}
          <RecommendationCard 
            recommendation={{
              ...sampleRecommendation,
              id: 'preview',
              trustScore: 0,
              engagement: { saves: 0, upvotes: 0, comments: 0 },
              tokenRewards: {
                amount: 1.0,
                usdValue: 0.12,
                earnedFrom: 'creation'
              },
              author: {
                ...sampleRecommendation.author,
                name: 'You',
                socialDistance: 1
              }
            }}
            variant="creation-preview"
            showTokenRewards={true}
            showActions={false}
          />
          
          {/* Detailed variant */}
          <div className="lg:col-span-2">
            <RecommendationCard 
              recommendation={sampleRecommendation}
              variant="detailed"
              showTokenRewards={showTokenRewards}
              showBlockchainInfo={showBlockchainInfo}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;