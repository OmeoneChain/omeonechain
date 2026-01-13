// File: code/poc/frontend/components/discover/RequestCard.tsx
// Discovery Request Card - Display restaurant recommendation requests in feed
// Updated with BocaBoca brand colors, bounty stake display, and dark mode support

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
  Award,
  Trophy
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
  bounty_status?: 'pending' | 'awarded' | 'refunded' | 'expired' | 'none';
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

  // Check request status for color theming
  const isOpen = request.status === 'open';
  const hasBounty = request.bounty_amount > 0;
  const bountyStatus = request.bounty_status || (hasBounty ? 'pending' : 'none');
  const isAwardedBounty = hasBounty && bountyStatus === 'awarded';
  const isExpired = request.status === 'expired' || bountyStatus === 'expired';
  const isClosed = request.status === 'closed';
  const isAnswered = request.status === 'answered';

  // Get header gradient based on status
  const getHeaderGradient = () => {
    if (isOpen && hasBounty) {
      return "bg-gradient-to-r from-amber-500 to-amber-600";
    } else if (isOpen) {
      return "bg-gradient-to-r from-[#FF644A] to-[#E65441]";
    } else if (isAnswered || isAwardedBounty) {
      return "bg-gradient-to-r from-[#BFE2D9] to-[#9DD4C5]";
    } else {
      return "bg-gradient-to-r from-stone-400 to-stone-500";
    }
  };

  // Get border color based on status
  const getBorderClass = () => {
    if (isOpen && hasBounty) {
      return "border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-600";
    } else if (isOpen) {
      return "border-[#FF644A]/30 dark:border-[#FF644A]/40 hover:border-[#FF644A]/50 dark:hover:border-[#FF644A]/60";
    } else if (isAnswered || isAwardedBounty) {
      return "border-[#BFE2D9] dark:border-[#BFE2D9]/40 hover:border-[#9DD4C5] dark:hover:border-[#9DD4C5]/60";
    } else {
      return "border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500";
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.(request.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700';
      case 'answered': return 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700';
      case 'closed': return 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600';
      default: return 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600';
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
  
    let budgetArray: string[];
    if (Array.isArray(budget)) {
      budgetArray = budget;
    } else if (budget.includes(',')) {
      budgetArray = budget.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      return budget;
    }
  
    if (budgetArray.length === 0) return null;
    if (budgetArray.length === 1) return budgetArray[0];
  
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
    const normalizedDate = dateString.endsWith('Z') ? dateString : dateString.replace(' ', 'T') + 'Z';
    const date = new Date(normalizedDate);
    return format.relativeTime(date, now);
  };

  // Bounty Badge Component
  const BountyBadge = ({ size = 'default' }: { size?: 'default' | 'small' }) => {
    if (!hasBounty) return null;
    
    const isSmall = size === 'small';
    
    return (
      <span 
        className={cn(
          "inline-flex items-center gap-1 font-semibold rounded-full",
          isSmall ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
          isOpen 
            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700" 
            : isAwardedBounty
              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
              : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-600"
        )}
        title={isOpen ? "Open request - bounty available" : isAwardedBounty ? "Bounty awarded" : "Request closed"}
      >
        <Trophy className={cn(isSmall ? "w-2.5 h-2.5" : "w-3 h-3")} />
        <span>{request.bounty_amount} BOCA</span>
      </span>
    );
  };

  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <motion.div
        className={cn(
          "bg-white dark:bg-[#2D2C3A] rounded-xl border overflow-hidden transition-all duration-200",
          "hover:shadow-soft dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] cursor-pointer",
          getBorderClass(),
          className
        )}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Compact Header - Gradient stays same (looks great on both modes) */}
        <div className={cn(
          "relative px-3 py-2.5",
          getHeaderGradient()
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white flex-1 min-w-0">
              {isOpen ? (
                <Trophy className="w-4 h-4 flex-shrink-0" />
              ) : (
                <HelpCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="font-semibold text-base truncate">{request.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasBounty && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white">
                  🏆 {request.bounty_amount} BOCA
                </span>
              )}
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
              <p className="text-sm text-stone-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {request.description}
              </p>
            )}

            {/* Context Tags - Horizontal Scroll */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-gray-600 scrollbar-track-stone-100 dark:scrollbar-track-gray-800 pb-1">
              {request.location && (
                <span className="flex items-center gap-1 px-2 py-1 bg-[#FFF4E1] dark:bg-[#FF644A]/20 text-[#FF644A] text-xs rounded-full font-medium whitespace-nowrap">
                  <MapPin size={10} />
                  {request.location}
                </span>
              )}
              {request.cuisine_type && (
                <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full font-medium whitespace-nowrap">
                  <Utensils size={10} />
                  {request.cuisine_type}
                </span>
              )}
              {request.occasion && (
                <span className="flex items-center gap-1 px-2 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs rounded-full font-medium whitespace-nowrap">
                  <Calendar size={10} />
                  {getOccasionDisplay(request.occasion)}
                </span>
              )}
              {request.budget_range && (
                <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full font-medium whitespace-nowrap">
                  <DollarSign size={10} />
                  {getBudgetDisplay(request.budget_range)}
                </span>
              )}
              {request.dietary_restrictions && request.dietary_restrictions.length > 0 && (
                <span className="px-2 py-1 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 text-xs rounded-full font-medium whitespace-nowrap">
                  {t('tags.dietaryCount', { count: request.dietary_restrictions.length })}
                </span>
              )}
            </div>

            {/* Creator & Stats - Single compact row */}
            <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-stone-100 dark:border-[#3D3C4A]">
              {/* Creator */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-[#FFF4E1] dark:bg-[#FF644A]/20 flex-shrink-0">
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
                <span className="font-medium text-[#1F1E2A] dark:text-white truncate text-xs">
                  {request.creator.display_name || request.creator.username}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-gray-400 flex-shrink-0">
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
        <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-stone-100 dark:border-[#3D3C4A] bg-stone-50 dark:bg-[#353444]">
          <div className="flex items-center gap-2.5 text-xs text-stone-500 dark:text-gray-400">
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
                  ? "text-[#FF644A] bg-[#FFF4E1] dark:bg-[#FF644A]/20" 
                  : "text-stone-500 dark:text-gray-400 hover:text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#FF644A]/20"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <Bookmark size={14} fill={request.is_bookmarked ? "currentColor" : "none"} />
            </motion.button>
            
            <Link href={`/discovery/requests/${request.id}`}>
              <motion.button
                className="p-1.5 rounded-lg text-stone-500 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#404050] transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <ChevronRight size={14} />
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute right-3 top-12 bg-white dark:bg-[#2D2C3A] border border-stone-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-10 min-w-[120px]">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReport?.(request.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-[#353444] flex items-center text-red-600 dark:text-red-400"
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
        "bg-white dark:bg-[#2D2C3A] rounded-xl border overflow-hidden transition-all duration-200",
        "hover:shadow-soft dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
        getBorderClass(),
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient Header - stays same (looks great on both modes) */}
      <div className={cn(
        "relative px-4 py-3",
        getHeaderGradient()
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            {isOpen ? (
              <>
                <Trophy className="w-4 h-4" />
                <span className="font-medium text-sm">{t('header.bounty') || 'Bounty Request'}</span>
              </>
            ) : (
              <>
                <HelpCircle className="w-4 h-4" />
                <span className="font-medium text-sm">{t('header.title')}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasBounty && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white">
                🏆 {request.bounty_amount} BOCA
              </span>
            )}
            <span className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full border",
              getStatusColor(request.status)
            )}>
              {getStatusText(request.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header with Title and Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-[#1F1E2A] dark:text-white text-lg leading-tight">
                {request.title}
              </h3>
              {hasBounty && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
                  isOpen 
                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                    : isAwardedBounty
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                )}>
                  {isOpen && "Active Bounty"}
                  {isAwardedBounty && "✓ Awarded"}
                  {bountyStatus === 'expired' && "Expired"}
                  {bountyStatus === 'refunded' && "Refunded"}
                </span>
              )}
            </div>
            {request.description && (
              <p className="text-sm text-stone-600 dark:text-gray-400 line-clamp-2">
                {request.description}
              </p>
            )}
          </div>

          {onReport && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-stone-100 dark:hover:bg-[#353444] rounded-lg transition-colors"
              >
                <MoreHorizontal size={16} className="text-stone-500 dark:text-gray-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white dark:bg-[#2D2C3A] border border-stone-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      onReport(request.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-[#353444] flex items-center text-red-600 dark:text-red-400"
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
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#FFF4E1] dark:bg-[#FF644A]/20">
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
            <span className="text-sm font-medium text-[#1F1E2A] dark:text-white">
              {request.creator.display_name || request.creator.username}
            </span>
            {request.creator.reputation_score > 0 && (
              <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-gray-400">
                <Award size={10} />
                <span>{t('creator.reputation', { score: request.creator.reputation_score })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Context Tags */}
        <div className="flex flex-wrap gap-2">
          {request.location && (
            <span className="flex items-center gap-1 px-2 py-1 bg-[#FFF4E1] dark:bg-[#FF644A]/20 text-[#FF644A] text-xs rounded-full font-medium">
              <MapPin size={12} />
              {request.location}
            </span>
          )}
          {request.cuisine_type && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full font-medium">
              <Utensils size={12} />
              {request.cuisine_type}
            </span>
          )}
          {request.occasion && (
            <span className="flex items-center gap-1 px-2 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs rounded-full font-medium">
              <Calendar size={12} />
              {getOccasionDisplay(request.occasion)}
            </span>
          )}
          {request.budget_range && (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full font-medium">
              <DollarSign size={12} />
              {getBudgetDisplay(request.budget_range)}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-gray-400 pt-2 border-t border-stone-100 dark:border-[#3D3C4A]">
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

        {/* View Request Button - Gradients stay same (look great on both modes) */}
        <Link
          href={`/discovery/requests/${request.id}`}
          className={cn(
            "block w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium text-center",
            isOpen && hasBounty
              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              : isOpen
                ? "bg-gradient-to-r from-[#FF644A] to-[#E65441] hover:from-[#E65441] hover:to-[#d14a38] text-white"
                : isAnswered || isAwardedBounty
                  ? "bg-gradient-to-r from-[#BFE2D9] to-[#9DD4C5] hover:from-[#9DD4C5] hover:to-[#8BCABC] text-[#1F1E2A]"
                  : "bg-gradient-to-r from-stone-400 to-stone-500 hover:from-stone-500 hover:to-stone-600 text-white"
          )}
        >
          {request.response_count > 0 
            ? t('actions.viewResponses', { count: request.response_count })
            : isOpen && hasBounty
              ? `🏆 ${t('actions.beFirstToRespond')} (${request.bounty_amount} BOCA)`
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
                    ? "text-[#FF644A] bg-[#FFF4E1] dark:bg-[#FF644A]/20" 
                    : "text-stone-500 dark:text-gray-400 hover:text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#FF644A]/20"
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