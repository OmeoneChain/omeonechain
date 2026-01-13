// File: code/poc/frontend/components/discover/AwardBountyModal.tsx
// Modal for bounty creators to select winning restaurant
// Groups responses by restaurant and shows first responder for each
// System auto-awards 90% to first person who suggested winning restaurant
// UPDATED: Dark mode support + i18n translations

"use client"

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trophy,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronRight,
  User,
  Flame,
  Star
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { formatRelativeTime } from '@/lib/utils/dateLocale';

// BocaBoca Brand Colors
const BRAND = {
  coral: '#FF644A',
  terracotta: '#E65441',
  navy: '#1F1E2A',
  cream: '#FFF4E1',
  mint: '#BFE2D9',
};

interface Responder {
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
  responder: Responder;
  recommendation: Recommendation;
}

// Grouped restaurant with all responses that suggested it
interface RestaurantGroup {
  restaurant: Restaurant;
  responses: DiscoveryResponse[];
  firstResponse: DiscoveryResponse;
  responseCount: number;
}

interface AwardBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAward: (restaurantId: string, firstResponseId: string) => Promise<void>;
  responses: DiscoveryResponse[];
  stakeAmount: number;
  requestTitle: string;
}

const AwardBountyModal: React.FC<AwardBountyModalProps> = ({
  isOpen,
  onClose,
  onAward,
  responses,
  stakeAmount,
  requestTitle
}) => {
  const t = useTranslations('discover');
  const locale = useLocale();
  
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  // Group responses by restaurant, sorted by first response time
  const restaurantGroups = useMemo((): RestaurantGroup[] => {
    const groupMap = new Map<string, RestaurantGroup>();

    // Sort responses by creation time (earliest first)
    const sortedResponses = [...responses].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const response of sortedResponses) {
      const restaurantId = response.recommendation?.restaurant?.id;
      if (!restaurantId) continue;
      
      if (!groupMap.has(restaurantId)) {
        // First response for this restaurant
        groupMap.set(restaurantId, {
          restaurant: response.recommendation.restaurant,
          responses: [response],
          firstResponse: response,
          responseCount: 1
        });
      } else {
        // Additional response for existing restaurant
        const group = groupMap.get(restaurantId)!;
        group.responses.push(response);
        group.responseCount++;
      }
    }

    // Sort groups by first response time
    return Array.from(groupMap.values()).sort(
      (a, b) => new Date(a.firstResponse.created_at).getTime() - 
                new Date(b.firstResponse.created_at).getTime()
    );
  }, [responses]);

  const selectedGroup = useMemo(() => {
    return restaurantGroups.find(g => g.restaurant.id === selectedRestaurantId) || null;
  }, [restaurantGroups, selectedRestaurantId]);

  const winnerEarnings = stakeAmount * 0.9;
  const burnAmount = stakeAmount * 0.1;

  const handleSelectRestaurant = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setError(null);
  };

  const handleProceedToConfirm = () => {
    if (selectedRestaurantId) {
      setStep('confirm');
    }
  };

  const handleBackToSelect = () => {
    setStep('select');
  };

  const handleAward = async () => {
    if (!selectedGroup) return;

    setIsAwarding(true);
    setError(null);

    try {
      await onAward(selectedGroup.restaurant.id, selectedGroup.firstResponse.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('awardModal.error.failed'));
    } finally {
      setIsAwarding(false);
    }
  };

  // Reset state when modal closes
  const handleClose = () => {
    setSelectedRestaurantId(null);
    setStep('select');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-2xl dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden max-h-[90vh] flex flex-col"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#FF644A] to-[#E65441] px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {step === 'select' 
                      ? t('awardModal.title.select') 
                      : t('awardModal.title.confirm')
                    }
                  </h2>
                  <p className="text-sm text-white/80 truncate max-w-[200px]">
                    {requestTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {step === 'select' ? (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6 space-y-4"
                >
                  {/* Prize Info */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                        <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm text-stone-600 dark:text-gray-400">{t('awardModal.winnerReceives')}</p>
                        <p className="text-xl font-bold text-[#1F1E2A] dark:text-white">{winnerEarnings.toFixed(2)} BOCA</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-stone-500 dark:text-gray-400">
                      <p>{t('awardModal.percentOfStake', { percent: 90 })}</p>
                      <p className="text-xs">{t('awardModal.percentBurned', { percent: 10 })}</p>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="p-3 bg-[#BFE2D9]/30 dark:bg-emerald-900/20 rounded-lg border border-[#BFE2D9] dark:border-emerald-800">
                    <p className="text-sm text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                      <Flame className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#FF644A]" />
                      <span>
                        {t('awardModal.firstResponderNote')}
                      </span>
                    </p>
                  </div>

                  {/* Restaurant List */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-stone-700 dark:text-gray-300">
                      {t('awardModal.restaurantsSuggested', { count: restaurantGroups.length })}
                    </p>

                    {restaurantGroups.map((group, index) => (
                      <motion.button
                        key={group.restaurant.id}
                        onClick={() => handleSelectRestaurant(group.restaurant.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 transition-all",
                          selectedRestaurantId === group.restaurant.id
                            ? "border-[#FF644A] bg-[#FFF4E1] dark:bg-[#FF644A]/20"
                            : "border-stone-200 dark:border-[#3D3C4A] bg-white dark:bg-[#353444] hover:border-stone-300 dark:hover:border-[#4D4C5A] hover:bg-stone-50 dark:hover:bg-[#404050]"
                        )}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Selection indicator */}
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                            selectedRestaurantId === group.restaurant.id
                              ? "border-[#FF644A] bg-[#FF644A]"
                              : "border-stone-300 dark:border-gray-500"
                          )}>
                            {selectedRestaurantId === group.restaurant.id && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Restaurant name */}
                            <h4 className="font-semibold text-[#1F1E2A] dark:text-white truncate">
                              {group.restaurant.name}
                            </h4>

                            {/* Restaurant details */}
                            <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-gray-400 mt-1">
                              {group.restaurant.cuisine_type && (
                                <span>{group.restaurant.cuisine_type}</span>
                              )}
                              {group.restaurant.location && (
                                <>
                                  {group.restaurant.cuisine_type && <span>•</span>}
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {group.restaurant.location}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* First responder info */}
                            <div className="mt-3 p-2 bg-stone-50 dark:bg-[#2D2C3A] rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-white dark:bg-[#353444] flex-shrink-0">
                                  {group.firstResponse.responder.avatar_url ? (
                                    <Image
                                      src={group.firstResponse.responder.avatar_url}
                                      alt={group.firstResponse.responder.username}
                                      width={24}
                                      height={24}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-[#FF644A] font-semibold bg-[#FFF4E1] dark:bg-[#FF644A]/20">
                                      {group.firstResponse.responder.display_name?.charAt(0) || '?'}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-stone-700 dark:text-gray-300 truncate">
                                      {group.firstResponse.responder.display_name || group.firstResponse.responder.username}
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FF644A]/10 dark:bg-[#FF644A]/20 text-[#FF644A]">
                                      {t('responseCard.first')}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-stone-500 dark:text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatRelativeTime(group.firstResponse.created_at, locale)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Other responders count */}
                            {group.responseCount > 1 && (
                              <p className="text-xs text-stone-500 dark:text-gray-400 mt-2">
                                {t('awardModal.othersAlsoSuggested', { count: group.responseCount - 1 })}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6 space-y-6"
                >
                  {selectedGroup && (
                    <>
                      {/* Winner Summary */}
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4">
                          <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-[#1F1E2A] dark:text-white">
                          {selectedGroup.restaurant.name}
                        </h3>
                        {selectedGroup.restaurant.cuisine_type && (
                          <p className="text-stone-500 dark:text-gray-400">{selectedGroup.restaurant.cuisine_type}</p>
                        )}
                      </div>

                      {/* Winner info */}
                      <div className="p-4 bg-[#FFF4E1] dark:bg-[#FF644A]/20 rounded-xl">
                        <p className="text-sm text-stone-600 dark:text-gray-300 mb-3 text-center">
                          {t('awardModal.bountyGoesToFirst')}
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-[#353444]">
                            {selectedGroup.firstResponse.responder.avatar_url ? (
                              <Image
                                src={selectedGroup.firstResponse.responder.avatar_url}
                                alt={selectedGroup.firstResponse.responder.username}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl text-[#FF644A] font-semibold bg-[#FFF4E1] dark:bg-[#FF644A]/20">
                                {selectedGroup.firstResponse.responder.display_name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1F1E2A] dark:text-white">
                              {selectedGroup.firstResponse.responder.display_name || selectedGroup.firstResponse.responder.username}
                            </p>
                            <p className="text-sm text-stone-500 dark:text-gray-400">
                              {t('awardModal.firstSuggested', { time: formatRelativeTime(selectedGroup.firstResponse.created_at, locale) })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Award breakdown */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-[#353444] rounded-lg">
                          <span className="text-stone-600 dark:text-gray-400">{t('awardModal.totalStaked')}</span>
                          <span className="font-semibold text-[#1F1E2A] dark:text-white">{stakeAmount.toFixed(2)} BOCA</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            {t('awardModal.winnerReceivesPercent', { percent: 90 })}
                          </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{winnerEarnings.toFixed(2)} BOCA</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <span className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                            <Flame className="w-4 h-4" />
                            {t('awardModal.burnedPercent', { percent: 10 })}
                          </span>
                          <span className="font-semibold text-orange-700 dark:text-orange-400">{burnAmount.toFixed(2)} BOCA</span>
                        </div>
                      </div>

                      {/* Note about tipping */}
                      <div className="p-3 bg-[#BFE2D9]/30 dark:bg-emerald-900/20 rounded-lg border border-[#BFE2D9] dark:border-emerald-800">
                        <p className="text-sm text-emerald-800 dark:text-emerald-300">
                          💡 {t('awardModal.tipNote')}
                        </p>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-stone-50 dark:bg-[#353444] border-t border-stone-200 dark:border-[#3D3C4A] flex-shrink-0">
            {step === 'select' ? (
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-stone-600 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white font-medium transition-colors"
                >
                  {t('awardModal.cancel')}
                </button>
                <motion.button
                  onClick={handleProceedToConfirm}
                  disabled={!selectedRestaurantId}
                  className={cn(
                    "px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all",
                    selectedRestaurantId
                      ? "bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white hover:from-[#E65441] hover:to-[#d14a38] shadow-md hover:shadow-lg"
                      : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed"
                  )}
                  whileHover={selectedRestaurantId ? { scale: 1.02 } : {}}
                  whileTap={selectedRestaurantId ? { scale: 0.98 } : {}}
                >
                  {t('awardModal.continue')}
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToSelect}
                  disabled={isAwarding}
                  className="px-4 py-2 text-stone-600 dark:text-gray-400 hover:text-stone-800 dark:hover:text-white font-medium transition-colors"
                >
                  ← {t('awardModal.back')}
                </button>
                <motion.button
                  onClick={handleAward}
                  disabled={isAwarding}
                  className={cn(
                    "px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all",
                    !isAwarding
                      ? "bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white hover:from-[#E65441] hover:to-[#d14a38] shadow-md hover:shadow-lg"
                      : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed"
                  )}
                  whileHover={!isAwarding ? { scale: 1.02 } : {}}
                  whileTap={!isAwarding ? { scale: 0.98 } : {}}
                >
                  {isAwarding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('awardModal.awarding')}
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      {t('awardModal.awardAmount', { amount: winnerEarnings.toFixed(2) })}
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AwardBountyModal;