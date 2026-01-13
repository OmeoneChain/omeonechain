// File: code/poc/frontend/components/discover/ResponseCard.tsx
// Individual response card for Discovery Request detail page
// Shows responder info, restaurant recommendation, and tip action
// UPDATED: Dark mode support + i18n translations
// FIXED: Restaurant link now uses /restaurant/ instead of /restaurants/

"use client"

import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Trophy,
  Gift
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { formatRelativeTime } from '@/lib/utils/dateLocale';

// Types
interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  reputation_score: number;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine_type: string | null;
  location: string | null;
  image_url?: string | null;
}

interface Recommendation {
  id: string;
  title: string;
  restaurant: Restaurant;
}

interface DiscoveryResponse {
  id: string;
  comment: string | null;
  created_at: string;
  is_winner: boolean;
  tokens_earned: number;
  responder: User;
  recommendation: Recommendation;
}

interface ResponseCardProps {
  response: DiscoveryResponse;
  isCreator: boolean;
  canTip: boolean;
  onTip: (response: DiscoveryResponse) => void;
  winningRestaurantId: string | null;
}

const ResponseCard: React.FC<ResponseCardProps> = ({ 
  response, 
  isCreator, 
  canTip, 
  onTip, 
  winningRestaurantId 
}) => {
  const t = useTranslations('discover');
  const locale = useLocale();
  const { responder, recommendation, comment, created_at, is_winner, tokens_earned } = response;
  const isWinningRestaurant = winningRestaurantId === recommendation.restaurant.id;

  return (
    <motion.div
      className={cn(
        "p-4 rounded-xl border-2 transition-all",
        is_winner
          ? "border-amber-300 dark:border-amber-600 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30"
          : isWinningRestaurant
            ? "border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20"
            : "border-stone-200 dark:border-[#3D3C4A] bg-white dark:bg-[#2D2C3A] hover:border-stone-300 dark:hover:border-[#4D4C5A]"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Winner badge */}
      {is_winner && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-amber-200 dark:border-amber-700">
          <div className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            {t('responseCard.winner')}
          </span>
          <span className="text-amber-600 dark:text-amber-500 text-sm">
            {t('responseCard.earned', { amount: tokens_earned.toFixed(2) })}
          </span>
        </div>
      )}

      {/* Responder info */}
      <div className="flex items-start gap-3">
        <Link href={`/users/${responder.id}`}>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 dark:bg-[#353444] flex-shrink-0">
            {responder.avatar_url ? (
              <Image
                src={responder.avatar_url}
                alt={responder.username}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg text-[#FF644A] font-semibold bg-[#FFF4E1] dark:bg-[#FF644A]/20">
                {responder.display_name?.charAt(0) || '?'}
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link 
              href={`/users/${responder.id}`} 
              className="font-semibold text-[#1F1E2A] dark:text-white hover:text-[#FF644A] dark:hover:text-[#FF644A] transition-colors"
            >
              {responder.display_name || responder.username}
            </Link>
            <span className="text-xs text-stone-500 dark:text-gray-400">
              {formatRelativeTime(created_at, locale)}
            </span>
            {is_winner && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-100">
                {t('responseCard.first')}
              </span>
            )}
          </div>

          {/* Restaurant recommendation - FIXED: /restaurant/ instead of /restaurants/ */}
          <div className="mt-2 p-3 bg-stone-50 dark:bg-[#353444] rounded-lg">
            <Link href={`/restaurant/${recommendation.restaurant.id}`}>
              <h4 className="font-semibold text-[#1F1E2A] dark:text-white hover:text-[#FF644A] dark:hover:text-[#FF644A] transition-colors">
                {recommendation.restaurant.name}
              </h4>
            </Link>
            <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-gray-400 mt-1">
              {recommendation.restaurant.cuisine_type && (
                <span>{recommendation.restaurant.cuisine_type}</span>
              )}
              {recommendation.restaurant.location && (
                <>
                  {recommendation.restaurant.cuisine_type && <span>•</span>}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {recommendation.restaurant.location}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Comment */}
          {comment && (
            <p className="mt-2 text-stone-600 dark:text-gray-300 text-sm">{comment}</p>
          )}

          {/* Tip button for creator (after award, for non-winners) */}
          {isCreator && canTip && !is_winner && (
            <button
              onClick={() => onTip(response)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#FF644A]/20 rounded-lg transition-colors"
            >
              <Gift className="w-4 h-4" />
              {t('responseCard.sendTip')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ResponseCard;

// Re-export types for use in parent components
export type { DiscoveryResponse, ResponseCardProps };