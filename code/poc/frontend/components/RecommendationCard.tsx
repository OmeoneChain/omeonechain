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
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import TrustScoreBadge from './TrustScoreBadge';
import { cn, timeAgo, formatTokenAmount } from '@/lib/utils';

interface Author {
  id: string;
  name: string;
  avatar: string;
  reputation: number;
  isFollowing: boolean;
  socialDistance: 1 | 2; // 1 = direct friend, 2 = friend-of-friend
}

interface Location {
  name: string;
  address: string;
  city: string;
  coordinates?: [number, number];
}

interface TokenReward {
  amount: number;
  usdValue: number;
  earnedFrom: 'upvotes' | 'saves' | 'trust_bonus';
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  image?: string;
  category: string;
  location: Location;
  author: Author;
  trustScore: number;
  trustBreakdown: {
    directFriends: number;
    friendsOfFriends: number;
    totalEndorsements: number;
    socialHops: '±1 hop' | '±2 hops' | 'Mixed';
  };
  engagement: {
    saves: number;
    upvotes: number;
    comments: number;
  };
  tokenRewards?: TokenReward;
  createdAt: string;
  tags: string[];
  isBookmarked: boolean;
  hasUpvoted: boolean;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  variant?: 'default' | 'compact' | 'detailed';
  showAuthor?: boolean;
  showTokenRewards?: boolean;
  onSave?: (id: string) => void;
  onUpvote?: (id: string) => void;
  onShare?: (id: string) => void;
  onAuthorClick?: (authorId: string) => void;
  className?: string;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  variant = 'default',
  showAuthor = true,
  showTokenRewards = false,
  onSave,
  onUpvote,
  onShare,
  onAuthorClick,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSave = () => {
    onSave?.(recommendation.id);
  };

  const handleUpvote = () => {
    onUpvote?.(recommendation.id);
  };

  const handleShare = () => {
    onShare?.(recommendation.id);
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

  return (
    <motion.div
      className={cn(
        "bg-white rounded-xl border border-network-200 overflow-hidden transition-all duration-200",
        "hover:shadow-soft hover:border-network-300",
        {
          "max-w-sm": variant === 'compact',
          "max-w-2xl": variant === 'detailed'
        },
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Image */}
      {recommendation.image && !imageError && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={recommendation.image}
            alt={recommendation.title}
            fill
            className="object-cover transition-transform duration-300"
            style={{
              transform: isHovered ? 'scale(1.05)' : 'scale(1)'
            }}
            onError={() => setImageError(true)}
          />
          
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-lg backdrop-blur-sm">
              {recommendation.category}
            </span>
          </div>

          {/* Trust Score Overlay */}
          <div className="absolute top-3 right-3">
            <TrustScoreBadge
              score={recommendation.trustScore}
              breakdown={recommendation.trustBreakdown}
              variant="minimal"
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="space-y-2">
          {/* Title and Location */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-network-900 text-lg leading-tight line-clamp-2">
                {recommendation.title}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-network-600">
                <MapPin size={14} />
                <span className="text-sm truncate">{recommendation.location.name}</span>
              </div>
            </div>

            {/* Trust Score (if no image) */}
            {!recommendation.image && (
              <TrustScoreBadge
                score={recommendation.trustScore}
                breakdown={recommendation.trustBreakdown}
                variant="compact"
                size="sm"
              />
            )}
          </div>

          {/* Author Info */}
          {showAuthor && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onAuthorClick?.(recommendation.author.id)}
                className="flex items-center gap-2 hover:bg-network-50 rounded-lg p-1 -m-1 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-network-200">
                  <Image
                    src={recommendation.author.avatar}
                    alt={recommendation.author.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-network-900">
                    {recommendation.author.name}
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

        {/* Token Rewards (if enabled) */}
        {showTokenRewards && recommendation.tokenRewards && (
          <div className="flex items-center gap-2 p-2 bg-success-50 rounded-lg">
            <Coins size={16} className="text-success-600" />
            <span className="text-sm font-medium text-success-800">
              Earned {formatTokenAmount(recommendation.tokenRewards.amount)}
            </span>
            <span className="text-xs text-success-600">
              (${recommendation.tokenRewards.usdValue.toFixed(2)})
            </span>
          </div>
        )}

        {/* Actions Footer */}
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
      </div>
    </motion.div>
  );
};

// Example usage component
export const RecommendationCardExample: React.FC = () => {
  const sampleRecommendation: Recommendation = {
    id: '1',
    title: 'Brasserie du Soleil - Best Brunch in Brooklyn',
    description: 'Amazing kid-friendly brunch spot with incredible French toast and a great outdoor seating area. The staff is super accommodating and they have high chairs available.',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
    category: 'Restaurant',
    location: {
      name: 'Brasserie du Soleil',
      address: '123 Main St',
      city: 'Brooklyn, NY'
    },
    author: {
      id: 'author1',
      name: 'Alice Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b547?w=100&h=100&fit=crop&crop=face',
      reputation: 8.5,
      isFollowing: true,
      socialDistance: 1
    },
    trustScore: 8.3,
    trustBreakdown: {
      directFriends: 11,
      friendsOfFriends: 12,
      totalEndorsements: 23,
      socialHops: '±1 hop'
    },
    engagement: {
      saves: 23,
      upvotes: 18,
      comments: 5
    },
    tokenRewards: {
      amount: 2.1,
      usdValue: 0.25,
      earnedFrom: 'upvotes'
    },
    createdAt: '2025-01-10T10:30:00Z',
    tags: ['family-friendly', 'brunch', 'outdoor-seating'],
    isBookmarked: false,
    hasUpvoted: false
  };

  return (
    <div className="p-8 bg-background-secondary min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-network-900 mb-4">Recommendation Card Examples</h2>
          <p className="text-network-600 mb-6">
            Social context-rich recommendation display with Trust Score integration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecommendationCard 
            recommendation={sampleRecommendation} 
            showTokenRewards={true}
          />
          <RecommendationCard 
            recommendation={{
              ...sampleRecommendation,
              image: undefined,
              author: {
                ...sampleRecommendation.author,
                socialDistance: 2,
                name: 'Bob Martinez'
              }
            }} 
            variant="compact"
          />
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;