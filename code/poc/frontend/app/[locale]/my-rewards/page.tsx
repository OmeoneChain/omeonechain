// File: code/poc/frontend/app/[locale]/my-rewards/page.tsx
// Mobile-optimized rewards tracking page for BocaBoca
// Shows: Balance, BOCA explainer, recent activity, ways to earn, coming soon
// UPDATED: Fixed wallet connect - opens modal instead of broken /settings/wallet (Feb 8, 2026)
// UPDATED: Added BOCA explainer, full i18n, updated Coming Soon (Feb 13, 2026)
//
// =============================================================================
// DARK MODE PATTERNS:
// =============================================================================
// Page background:      bg-[#FFF4E1] dark:bg-[#1F1E2A]
// Card/Surface:         bg-white dark:bg-[#2D2C3A]
// Elevated surface:     bg-[#FFE8E3] dark:bg-[#353444]
// Primary text:         text-[#1F1E2A] dark:text-gray-100
// Secondary text:       text-gray-600 dark:text-gray-400
// Borders:              border-gray-200 dark:border-[#3D3C4A]
// =============================================================================

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Gift,
  TrendingUp,
  ChevronRight,
  Wallet,
  Star,
  MessageCircle,
  Share2,
  Award,
  BookmarkPlus,
  Repeat2,
  ThumbsUp,
  Trophy,
  Camera,
  Ticket,
  Sparkles,
  Clock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import WalletConnect from '@/components/auth/WalletConnect';
import CleanHeader from '@/components/CleanHeader';
import tokenBalanceService from '@/services/TokenBalanceService';
import apiClient from '@/services/api';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface RewardEvent {
  id: string;
  action: string;
  amount: number;
  amountFormatted: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface RewardHistoryResponse {
  success: boolean;
  data?: {
    events: RewardEvent[];
    total_count: number;
    pagination: {
      limit: number;
      offset: number;
      has_more: boolean;
    };
  };
  error?: string;
}

// =============================================================================
// ACTION ICONS & COLORS (labels come from i18n)
// =============================================================================

const ACTION_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
  recommendation:        { icon: Star,        color: 'text-amber-500' },
  recommendation_email:  { icon: Star,        color: 'text-amber-500' },
  upvote_received:       { icon: ThumbsUp,    color: 'text-blue-500' },
  first_reviewer:        { icon: Trophy,      color: 'text-yellow-500' },
  comment_received:      { icon: MessageCircle, color: 'text-green-500' },
  list_creation:         { icon: BookmarkPlus, color: 'text-purple-500' },
  reshare_attribution:   { icon: Repeat2,     color: 'text-cyan-500' },
  share:                 { icon: Share2,       color: 'text-indigo-500' },
  save_received:         { icon: BookmarkPlus, color: 'text-pink-500' },
  validation_bonus:      { icon: CheckCircle2, color: 'text-emerald-500' },
  default:               { icon: Gift,        color: 'text-[#FF644A]' }
};

function getActionStyle(action: string) {
  return ACTION_STYLE[action] || ACTION_STYLE.default;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatTimeAgo(dateString: string, t: (key: string, values?: Record<string, unknown>) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('time.justNow');
  if (diffMins < 60) return t('time.minutesAgo', { minutes: diffMins });
  if (diffHours < 24) return t('time.hoursAgo', { hours: diffHours });
  if (diffDays < 7) return t('time.daysAgo', { days: diffDays });
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Balance Hero Section
 */
function BalanceHero({ 
  balance, 
  isLoading 
}: { 
  balance: number; 
  isLoading: boolean;
}) {
  const t = useTranslations('myRewards');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FF644A] via-[#E65441] to-[#C94232] p-6 text-white shadow-lg"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Gift size={128} strokeWidth={1} />
      </div>
      
      <div className="relative z-10">
        <p className="text-white/80 text-sm font-medium mb-1">{t('balance.title')}</p>
        
        {isLoading ? (
          <div className="h-12 w-32 bg-white/20 rounded-lg animate-pulse" />
        ) : (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-baseline gap-2"
          >
            <span className="text-4xl font-bold tracking-tight">
              {balance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xl font-semibold text-white/90">BOCA</span>
          </motion.div>
        )}
        
        <div className="mt-4 flex items-center gap-2 text-white/70 text-sm">
          <TrendingUp size={16} />
          <span>{t('balance.keepEarning')}</span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * BOCA Explainer Card - Compact version for mobile my-rewards page
 */
function BocaExplainerCard() {
  const t = useTranslations('myRewards');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-xl bg-gradient-to-br from-[#FFF4E1] to-[#FFE8E3] dark:from-[#FF644A]/10 dark:to-[#FF644A]/5 border border-[#FFD4CC] dark:border-[#FF644A]/20 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-[#FF644A] flex-shrink-0">
          <HelpCircle size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#1F1E2A] dark:text-gray-100 text-sm mb-1">
            {t('bocaExplainer.title')}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('bocaExplainer.description')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Wallet Upgrade Card - Only shown to phone-only users
 */
function WalletUpgradeCard({ onConnect }: { onConnect: () => void }) {
  const t = useTranslations('myRewards');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-[#FFF4E1] dark:bg-[#FF644A]/10 border-2 border-[#FF644A]/30 dark:border-[#FF644A]/40 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[#FFE8E3] dark:bg-[#FF644A]/20">
          <Wallet size={20} className="text-[#FF644A]" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#1F1E2A] dark:text-gray-100 text-sm">
            {t('walletUpgrade.title')}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {t('walletUpgrade.description')}
          </p>
          <button
            onClick={onConnect}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF644A] hover:bg-[#E65441] text-white text-xs font-medium rounded-lg transition-colors"
          >
            {t('walletUpgrade.button')}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Single Reward Event Item
 */
function RewardEventItem({ event, index }: { event: RewardEvent; index: number }) {
  const t = useTranslations('myRewards');
  const style = getActionStyle(event.action);
  const Icon = style.icon;

  // Get translated label for this action, falling back to default
  const actionKey = `actions.${event.action}` as const;
  const label = t.has(actionKey) ? t(actionKey) : t('actions.default');

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 py-3"
    >
      <div className={cn("p-2 rounded-lg bg-gray-100 dark:bg-[#353444]", style.color)}>
        <Icon size={18} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1F1E2A] dark:text-gray-100 truncate">
          {label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatTimeAgo(event.created_at, t)}
        </p>
      </div>
      
      <div className="text-right">
        <span className="text-sm font-semibold text-[#FF644A]">
          +{event.amount.toFixed(1)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">BOCA</span>
      </div>
    </motion.div>
  );
}

/**
 * Recent Activity Section
 */
function RecentActivity({ 
  events, 
  isLoading, 
  hasMore,
  onShowMore,
  loadingMore = false
}: { 
  events: RewardEvent[];
  isLoading: boolean;
  hasMore: boolean;
  onShowMore: () => void;
  loadingMore?: boolean;
}) {
  const t = useTranslations('myRewards');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-100 dark:border-[#3D3C4A]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#1F1E2A] dark:text-gray-100">
            {t('recentActivity.title')}
          </h2>
          <Clock size={16} className="text-gray-400" />
        </div>
      </div>
      
      <div className="px-4 divide-y divide-gray-100 dark:divide-[#3D3C4A]">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))
        ) : events.length === 0 ? (
          // Empty state
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-[#353444] flex items-center justify-center">
              <Gift size={24} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('recentActivity.empty')}
            </p>
          </div>
        ) : (
          // Events list
          <AnimatePresence mode="popLayout">
            {events.map((event, index) => (
              <RewardEventItem key={event.id} event={event} index={index} />
            ))}
          </AnimatePresence>
        )}
      </div>
      
      {/* Show More button */}
      {events.length > 0 && hasMore && (
        <button
          onClick={onShowMore}
          disabled={loadingMore}
          className="w-full px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#353444] transition-colors border-t border-gray-100 dark:border-[#3D3C4A] disabled:opacity-50"
        >
          {loadingMore ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              {t('recentActivity.loading')}
            </>
          ) : (
            <>
              {t('recentActivity.showMore')}
              <ChevronRight size={16} />
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}

/**
 * Ways to Earn Section
 */
function WaysToEarn() {
  const t = useTranslations('myRewards');

  const earnOptions = [
    { icon: Star, labelKey: 'waysToEarn.options.recommendations', reward: '0.5-5.0', color: 'text-amber-500' },
    { icon: MessageCircle, labelKey: 'waysToEarn.options.comments', reward: '0.2', color: 'text-green-500' },
    { icon: Share2, labelKey: 'waysToEarn.options.share', reward: '0.1-0.2', color: 'text-blue-500' },
    { icon: Trophy, labelKey: 'waysToEarn.options.firstReviewer', reward: '10.0', color: 'text-yellow-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-100 dark:border-[#3D3C4A]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#1F1E2A] dark:text-gray-100">
            {t('waysToEarn.title')}
          </h2>
          <Sparkles size={16} className="text-[#FF644A]" />
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {earnOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.div
              key={option.labelKey}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex items-center gap-3"
            >
              <div className={cn("p-1.5 rounded-lg bg-gray-100 dark:bg-[#353444]", option.color)}>
                <Icon size={16} />
              </div>
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                {t(option.labelKey)}
              </span>
              <span className="text-xs font-medium text-[#FF644A] bg-[#FFE8E3] dark:bg-[#FF644A]/20 px-2 py-0.5 rounded-full">
                {option.reward} BOCA
              </span>
            </motion.div>
          );
        })}
      </div>
      
      <Link
        href="/rewards"
        className="w-full px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#353444] transition-colors border-t border-gray-100 dark:border-[#3D3C4A]"
      >
        {t('waysToEarn.seeAll')}
        <ChevronRight size={16} />
      </Link>
    </motion.div>
  );
}

/**
 * Coming Soon Section - Lottery & Photo Contest teaser
 * NOTE: Updated for launch - removed specific BOCA amounts since
 * lottery/photo contest are hidden from the main Rewards page.
 */
function ComingSoonSection() {
  const t = useTranslations('myRewards');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl bg-gradient-to-br from-[#FFF4E1] to-[#FFE8E3] dark:from-[#353444] dark:to-[#2D2C3A] border border-[#FFD4CC] dark:border-[#3D3C4A] p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-[#FF644A]" />
        <h3 className="font-semibold text-[#1F1E2A] dark:text-gray-100 text-sm">
          {t('comingSoon.title')}
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-[#2D2C3A]/60 rounded-lg">
          <Ticket size={20} className="text-purple-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#1F1E2A] dark:text-gray-100">{t('comingSoon.lottery.title')}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('comingSoon.lottery.description')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-[#2D2C3A]/60 rounded-lg">
          <Camera size={20} className="text-pink-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#1F1E2A] dark:text-gray-100">{t('comingSoon.photoContest.title')}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('comingSoon.photoContest.description')}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function MyRewardsPage() {
  const router = useRouter();
  const t = useTranslations('myRewards');
  const { isAuthenticated, user, authMode, isLoading: authLoading, login, refreshAuth } = useAuth();
  
  // State
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [events, setEvents] = useState<RewardEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  // Determine if user is phone-only (no wallet)
  const isPhoneOnly = authMode !== 'wallet';

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!isAuthenticated || !user?.id) {
        setBalanceLoading(false);
        return;
      }

      try {
        setBalanceLoading(true);
        const result = await tokenBalanceService.getRealTokenBalance(user.id);
        setBalance(result.balance);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalance(0);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();
  }, [isAuthenticated, user?.id]);

  // Fetch reward history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated || !user?.id) {
        setEventsLoading(false);
        return;
      }

      try {
        setEventsLoading(true);
        const response = await apiClient.get('/rewards/history?limit=5') as RewardHistoryResponse;
        
        if (response.success && response.data) {
          setEvents(response.data.events);
          setTotalEvents(response.data.total_count);
          setHasMore(response.data.pagination.has_more);
        }
      } catch (error) {
        console.error('Failed to fetch reward history:', error);
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated, user?.id]);

  // Handle wallet connect - open modal
  const handleConnectWallet = () => {
    setShowWalletConnect(true);
  };

  // Handle show more (load more events in-place)
  const handleShowMore = async () => {
    if (!isAuthenticated || !user?.id || loadingMore) return;

    try {
      setLoadingMore(true);
      const newOffset = offset + 5;
      const response = await apiClient.get(`/rewards/history?limit=5&offset=${newOffset}`) as RewardHistoryResponse;
    
      if (response.success && response.data) {
        setEvents(prev => [...prev, ...response.data!.events]);
        setOffset(newOffset);
        setHasMore(response.data.pagination.has_more);
      }
    } catch (error) {
      console.error('Failed to load more events:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/onboarding');
    }
  }, [authLoading, isAuthenticated, router]);

  // Loading state
  if (authLoading) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center">
          <RefreshCw size={24} className="text-[#FF644A] animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <CleanHeader />
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] pb-24">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Page Title */}
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-[#1F1E2A] dark:text-gray-100">
              {t('pageTitle')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('pageDescription')}
            </p>
          </div>

          {/* Balance Hero */}
          <BalanceHero balance={balance} isLoading={balanceLoading} />

          {/* BOCA Explainer - always visible */}
          <BocaExplainerCard />

          {/* Wallet Upgrade Card - only for phone users */}
          {isPhoneOnly && (
            <WalletUpgradeCard onConnect={handleConnectWallet} />
          )}

          {/* Recent Activity */}
          <RecentActivity
            events={events}
            isLoading={eventsLoading}
            hasMore={hasMore}
            onShowMore={handleShowMore}
            loadingMore={loadingMore}
          />

          {/* Ways to Earn */}
          <WaysToEarn />

          {/* Coming Soon */}
          <ComingSoonSection />
        </div>
      </div>

      {/* WalletConnect Modal */}
      <AnimatePresence>
        {showWalletConnect && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
            >
              <WalletConnect 
                onSuccess={async (token, userData) => {
                  console.log('✅ MyRewards: Wallet connection successful!');
                  try {
                    setShowWalletConnect(false);
                    login(token, userData);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await refreshAuth();
                    // Stay on my-rewards page - balance will refresh
                  } catch (error) {
                    console.error('❌ Error during post-auth processing:', error);
                    window.location.reload();
                  }
                }}
                onCancel={() => {
                  console.log('❌ Wallet connection cancelled');
                  setShowWalletConnect(false);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}