// File: code/poc/frontend/components/discover/RequestCard.tsx
// Discovery Request Card - Display restaurant recommendation requests in feed
// Matches ListCard styling and patterns

"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HelpCircle,
  MessageCircle,
  Bookmark,
  MapPin,
  Clock,
  Users,
  ChevronRight,
  MoreHorizontal,
  Flag,
  DollarSign,
  Utensils,
  Calendar,
  Award
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface RequestCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  reputation_score: number;
}

interface DiscoveryRequest {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  cuisine_type: string | null;
  occasion: string | null;
  budget_range: string | null;
  dietary_restrictions: string[] | null;
  bounty_amount: number;
  status: 'open' | 'answered' | 'closed';
  response_count: number;
  view_count: number;
  created_at: string;
  creator: RequestCreator;
  is_bookmarked?: boolean;
}

interface RequestCardProps {
  request: DiscoveryRequest;
  variant?: 'default' | 'compact';
  onBookmark?: (id: string) => void;
  onReport?: (id: string) => void;
  className?: string;
}

const RequestCard: React.FC<RequestCardProps> = ({
  request,
  variant = 'default',
  onBookmark,
  onReport,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.(request.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-50 border-green-200';
      case 'answered': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'closed': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return '🟢 Open';
      case 'answered': return '✅ Answered';
      case 'closed': return '🔒 Closed';
      default: return status;
    }
  };

  const getBudgetDisplay = (budget: string | null) => {
    if (!budget) return null;
    return budget; // Already in $ format
  };

  const getOccasionDisplay = (occasion: string | null) => {
    if (!occasion) return null;
    return occasion.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <motion.div
        className={cn(
          "bg-white rounded-xl border border-purple-200 overflow-hidden transition-all duration-200",
          "hover:shadow-soft hover:border-purple-300 cursor-pointer",
          className
        )}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Compact Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white flex-1 min-w-0">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-base truncate">{request.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn(
                "px-2 py-0.5 text-white text-xs font-medium rounded-full border",
                "bg-white/20 backdrop-blur-sm border-white/30"
              )}>
                {getStatusText(request.status)}
              </span>
              {onReport && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-0.5 hover:bg-white/20 rounded transition-colors"
                >
                  <MoreHorizontal size={14} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        <Link href={`/discovery/requests/${request.id}`} className="block">
          <div className="p-3.5 space-y-2.5">
            {/* Description */}
            {request.description && (
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                {request.description}
              </p>
            )}

            {/* Context Tags - Horizontal Scroll */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-1">
              {request.location && (
                <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium whitespace-nowrap">
                  <MapPin size={10} />
                  {request.location}
                </span>
              )}
              {request.cuisine_type && (
                <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full font-medium whitespace-nowrap">
                  <Utensils size={10} />
                  {request.cuisine_type}
                </span>
              )}
              {request.occasion && (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium whitespace-nowrap">
                  <Calendar size={10} />
                  {getOccasionDisplay(request.occasion)}
                </span>
              )}
              {request.budget_range && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium whitespace-nowrap">
                  <DollarSign size={10} />
                  {getBudgetDisplay(request.budget_range)}
                </span>
              )}
              {request.dietary_restrictions && request.dietary_restrictions.length > 0 && (
                <span className="px-2 py-1 bg-pink-50 text-pink-700 text-xs rounded-full font-medium whitespace-nowrap">
                  +{request.dietary_restrictions.length} dietary
                </span>
              )}
            </div>

            {/* Creator & Stats - Single compact row */}
            <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-gray-100">
              {/* Creator */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-purple-100 flex-shrink-0">
                  {request.creator.avatar_url ? (
                    <Image
                      src={request.creator.avatar_url}
                      alt={request.creator.username}
                      width={20}
                      height={20}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-purple-600 font-semibold">
                      {request.creator.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <span className="font-medium text-gray-900 truncate text-xs">
                  {request.creator.display_name || request.creator.username}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 text-xs text-gray-600 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <MessageCircle size={11} />
                  <span>{request.response_count}</span>
                </div>
                <span>•</span>
                <span>{formatTimeAgo(request.created_at)}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Actions Footer */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2.5 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Users size={11} />
              <span>{request.view_count} views</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5">
            <motion.button
              onClick={handleBookmark}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                request.is_bookmarked 
                  ? "text-purple-600 bg-purple-50" 
                  : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <Bookmark size={14} fill={request.is_bookmarked ? "currentColor" : "none"} />
            </motion.button>
            
            <Link href={`/discovery/requests/${request.id}`}>
              <motion.button
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <ChevronRight size={14} />
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute right-3 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReport?.(request.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center text-red-600"
            >
              <Flag size={14} className="mr-2" />
              Report
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // Default/Full variant
  return (
    <motion.div
      className={cn(
        "bg-white rounded-xl border border-purple-200 overflow-hidden transition-all duration-200",
        "hover:shadow-soft hover:border-purple-300",
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient Header */}
      <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <HelpCircle className="w-4 h-4" />
            <span className="font-medium text-sm">Discovery Request</span>
          </div>
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full border",
            getStatusColor(request.status)
          )}>
            {getStatusText(request.status)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header with Title and Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
              {request.title}
            </h3>
            {request.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {request.description}
              </p>
            )}
          </div>

          {onReport && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreHorizontal size={16} className="text-gray-500" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      onReport(request.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center text-red-600"
                  >
                    <Flag size={14} className="mr-2" />
                    Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Creator Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100">
            {request.creator.avatar_url ? (
              <Image
                src={request.creator.avatar_url}
                alt={request.creator.username}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg text-purple-600 font-semibold">
                {request.creator.display_name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className="text-left">
            <span className="text-sm font-medium text-gray-900">
              {request.creator.display_name || request.creator.username}
            </span>
            {request.creator.reputation_score > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Award size={10} />
                <span>{request.creator.reputation_score} rep</span>
              </div>
            )}
          </div>
        </div>

        {/* Context Tags */}
        <div className="flex flex-wrap gap-2">
          {request.location && (
            <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">
              <MapPin size={12} />
              {request.location}
            </span>
          )}
          {request.cuisine_type && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full font-medium">
              <Utensils size={12} />
              {request.cuisine_type}
            </span>
          )}
          {request.occasion && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
              <Calendar size={12} />
              {getOccasionDisplay(request.occasion)}
            </span>
          )}
          {request.budget_range && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
              <DollarSign size={12} />
              {getBudgetDisplay(request.budget_range)}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MessageCircle size={12} />
              <span>{request.response_count} responses</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{request.view_count} views</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{formatTimeAgo(request.created_at)}</span>
          </div>
        </div>

        {/* View Request Button */}
        <Link
          href={`/discovery/requests/${request.id}`}
          className="block w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors text-sm font-medium text-center"
        >
          {request.response_count > 0 ? `View ${request.response_count} Response${request.response_count !== 1 ? 's' : ''}` : 'Be the First to Respond'}
        </Link>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {onBookmark && (
              <motion.button
                onClick={handleBookmark}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  request.is_bookmarked 
                    ? "text-purple-600 bg-purple-50" 
                    : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark size={16} fill={request.is_bookmarked ? "currentColor" : "none"} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RequestCard;