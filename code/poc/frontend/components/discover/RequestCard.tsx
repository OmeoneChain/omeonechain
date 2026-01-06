// File: code/poc/frontend/components/discover/RequestCard.tsx
// Discovery Request Card - Display restaurant recommendation requests in feed
// Updated with BocaBoca brand colors

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
import { useTranslations, useFormatter, useNow } from 'next-intl';

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
  budget_range: string | string[] | null;
  dietary_restrictions: string[] | null;
  bounty_amount: number;
  status: 'open' | 'answered' | 'closed';
  response_count: number;
  view_count: number;
  created_at: string;
  expires_at: string | null;
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

// BocaBoca Brand Colors
const BRAND = {
  coral: '#FF644A',
  terracotta: '#E65441',
  navy: '#1F1E2A',
  cream: '#FFF4E1',
  mint: '#BFE2D9',
};

const RequestCard: React.FC<RequestCardProps> = ({
  request,
  variant = 'default',
  onBookmark,
  onReport,
  className
}) => {
  const t = useTranslations('requestCard');
  const format = useFormatter();
  const now = useNow({ updateInterval: 1000 * 60 }); 
  
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.(request.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'answered': return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'closed': return 'text-stone-600 bg-stone-100 border-stone-300';
      default: return 'text-stone-600 bg-stone-100 border-stone-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return t('status.open');
      case 'answered': return t('status.answered');
      case 'closed': return t('status.closed');
      default: return status;
    }
  };

  const getBudgetDisplay = (budget: string | string[] | null) => {
    if (!budget) return null;
  
    // Handle array format from backend
    let budgetArray: string[];
    if (Array.isArray(budget)) {
      budgetArray = budget;
    } else if (budget.includes(',')) {
      // Handle comma-separated string
      budgetArray = budget.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      // Single value like "$$"
      return budget;
    }
  
    if (budgetArray.length === 0) return null;
    if (budgetArray.length === 1) return budgetArray[0];
  
    // Sort by length ($ < $$ < $$$ < $$$$) and show as range
    budgetArray.sort((a, b) => a.length - b.length);
    return `${budgetArray[0]} - ${budgetArray[budgetArray.length - 1]}`;
  };

  const getOccasionDisplay = (occasion: string | null) => {
    if (!occasion) return null;
    return occasion.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimeAgo = (dateString: string): string => {
    // Ensure UTC interpretation - Supabase returns timestamps without 'Z'
    const normalizedDate = dateString.endsWith('Z') ? dateString : dateString.replace(' ', 'T') + 'Z';
    const date = new Date(normalizedDate);
    return format.relativeTime(date, now);
  };

  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <motion.div
        className={cn(
          "bg-white rounded-xl border border-stone-200 overflow-hidden transition-all duration-200",
          "hover:shadow-soft hover:border-[#FF644A]/40 cursor-pointer",
          className
        )}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Compact Header - BocaBoca Coral Gradient */}
        <div className="relative bg-gradient-to-r from-[#FF644A] to-[#E65441] px-3 py-2.5">
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
              <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed">
                {request.description}
              </p>
            )}

            {/* Context Tags - Horizontal Scroll */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100 pb-1">
              {request.location && (
                <span className="flex items-center gap-1 px-2 py-1 bg-[#FFF4E1] text-[#FF644A] text-xs rounded-full font-medium whitespace-nowrap">
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
                <span className="flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-700 text-xs rounded-full font-medium whitespace-nowrap">
                  <Calendar size={10} />
                  {getOccasionDisplay(request.occasion)}
                </span>
              )}
              {request.budget_range && (
                <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium whitespace-nowrap">
                  <DollarSign size={10} />
                  {getBudgetDisplay(request.budget_range)}
                </span>
              )}
              {request.dietary_restrictions && request.dietary_restrictions.length > 0 && (
                <span className="px-2 py-1 bg-pink-50 text-pink-700 text-xs rounded-full font-medium whitespace-nowrap">
                  {t('tags.dietaryCount', { count: request.dietary_restrictions.length })}
                </span>
              )}
            </div>

            {/* Creator & Stats - Single compact row */}
            <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-stone-100">
              {/* Creator */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-[#FFF4E1] flex-shrink-0">
                  {request.creator.avatar_url ? (
                    <Image
                      src={request.creator.avatar_url}
                      alt={request.creator.username}
                      width={20}
                      height={20}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-[#FF644A] font-semibold">
                      {request.creator.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <span className="font-medium text-[#1F1E2A] truncate text-xs">
                  {request.creator.display_name || request.creator.username}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 text-xs text-stone-500 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <MessageCircle size={11} />
                  <span>{request.response_count}</span>
                </div>
                <span>•</span>
                <span>{request.expires_at ? formatTimeAgo(request.expires_at) : formatTimeAgo(request.created_at)}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Actions Footer */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-stone-100 bg-stone-50">
          <div className="flex items-center gap-2.5 text-xs text-stone-500">
            <div className="flex items-center gap-1">
              <Users size={11} />
              <span>{t('stats.views', { count: request.view_count })}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5">
            <motion.button
              onClick={handleBookmark}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                request.is_bookmarked 
                  ? "text-[#FF644A] bg-[#FFF4E1]" 
                  : "text-stone-500 hover:text-[#FF644A] hover:bg-[#FFF4E1]"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <Bookmark size={14} fill={request.is_bookmarked ? "currentColor" : "none"} />
            </motion.button>
            
            <Link href={`/discovery/requests/${request.id}`}>
              <motion.button
                className="p-1.5 rounded-lg text-stone-500 hover:text-[#1F1E2A] hover:bg-stone-100 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <ChevronRight size={14} />
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute right-3 top-12 bg-white border border-stone-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReport?.(request.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50 flex items-center text-red-600"
            >
              <Flag size={14} className="mr-2" />
              {t('actions.report')}
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
        "bg-white rounded-xl border border-stone-200 overflow-hidden transition-all duration-200",
        "hover:shadow-soft hover:border-[#FF644A]/40",
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient Header - BocaBoca Coral */}
      <div className="relative bg-gradient-to-r from-[#FF644A] to-[#E65441] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <HelpCircle className="w-4 h-4" />
            <span className="font-medium text-sm">{t('header.title')}</span>
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
            <h3 className="font-semibold text-[#1F1E2A] text-lg leading-tight mb-1">
              {request.title}
            </h3>
            {request.description && (
              <p className="text-sm text-stone-600 line-clamp-2">
                {request.description}
              </p>
            )}
          </div>

          {onReport && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <MoreHorizontal size={16} className="text-stone-500" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border border-stone-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      onReport(request.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50 flex items-center text-red-600"
                  >
                    <Flag size={14} className="mr-2" />
                    {t('actions.report')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Creator Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#FFF4E1]">
            {request.creator.avatar_url ? (
              <Image
                src={request.creator.avatar_url}
                alt={request.creator.username}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg text-[#FF644A] font-semibold">
                {request.creator.display_name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className="text-left">
            <span className="text-sm font-medium text-[#1F1E2A]">
              {request.creator.display_name || request.creator.username}
            </span>
            {request.creator.reputation_score > 0 && (
              <div className="flex items-center gap-1 text-xs text-stone-500">
                <Award size={10} />
                <span>{t('creator.reputation', { score: request.creator.reputation_score })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Context Tags */}
        <div className="flex flex-wrap gap-2">
          {request.location && (
            <span className="flex items-center gap-1 px-2 py-1 bg-[#FFF4E1] text-[#FF644A] text-xs rounded-full font-medium">
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
            <span className="flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-700 text-xs rounded-full font-medium">
              <Calendar size={12} />
              {getOccasionDisplay(request.occasion)}
            </span>
          )}
          {request.budget_range && (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">
              <DollarSign size={12} />
              {getBudgetDisplay(request.budget_range)}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MessageCircle size={12} />
              <span>{t('stats.responses', { count: request.response_count })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{t('stats.views', { count: request.view_count })}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{request.expires_at ? formatTimeAgo(request.expires_at) : formatTimeAgo(request.created_at)}</span>
          </div>
        </div>

        {/* View Request Button - BocaBoca Coral Gradient */}
        <Link
          href={`/discovery/requests/${request.id}`}
          className="block w-full px-4 py-2 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white rounded-lg hover:from-[#E65441] hover:to-[#d14a38] transition-colors text-sm font-medium text-center"
        >
          {request.response_count > 0 
            ? t('actions.viewResponses', { count: request.response_count })
            : t('actions.beFirstToRespond')
          }
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
                    ? "text-[#FF644A] bg-[#FFF4E1]" 
                    : "text-stone-500 hover:text-[#FF644A] hover:bg-[#FFF4E1]"
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