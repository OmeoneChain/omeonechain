// File: code/poc/frontend/app/[locale]/my-rewards/page.tsx
// Mobile-optimized rewards tracking page for BocaBoca
// Shows: Balance, recent activity, ways to earn, wallet upgrade prompt
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
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
// ACTION LABELS & ICONS
// =============================================================================

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  recommendation: {
    label: 'Created a recommendation',
    icon: Star,
    color: 'text-amber-500'
  },
  recommendation_email: {
    label: 'Created a recommendation',
    icon: Star,
    color: 'text-amber-500'
  },
  upvote_received: {
    label: 'Your post was upvoted',
    icon: ThumbsUp,
    color: 'text-blue-500'
  },
  first_reviewer: {
    label: 'First to review a restaurant!',
    icon: Trophy,
    color: 'text-yellow-500'
  },
  comment_received: {
    label: 'Someone commented on your post',
    icon: MessageCircle,
    color: 'text-green-500'
  },
  list_creation: {
    label: 'Created a saved list',
    icon: BookmarkPlus,
    color: 'text-purple-500'
  },
  reshare_attribution: {
    label: 'Your recommendation was reshared',
    icon: Repeat2,
    color: 'text-cyan-500'
  },
  share: {
    label: 'Shared content',
    icon: Share2,
    color: 'text-indigo-500'
  },
  save_received: {
    label: 'Someone saved your recommendation',
    icon: BookmarkPlus,
    color: 'text-pink-500'
  },
  validation_bonus: {
    label: 'Recommendation validated by community',
    icon: CheckCircle2,
    color: 'text-emerald-500'
  },
  // Fallback for unknown actions
  default: {
    label: 'Earned reward',
    icon: Gift,
    color: 'text-[#FF644A]'
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || ACTION_CONFIG.default;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
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
        <p className="text-white/80 text-sm font-medium mb-1">Your BOCA Balance</p>
        
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
          <span>Keep earning by staying active!</span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Wallet Upgrade Card - Only shown to phone-only users
 */
function WalletUpgradeCard({ onConnect }: { onConnect: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/30">
          <Wallet size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#1F1E2A] dark:text-gray-100 text-sm">
            Unlock More with a Wallet
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Connect a wallet to access on-chain features, NFTs, and governance voting.
          </p>
          <button
            onClick={onConnect}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Connect Wallet
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
  const config = getActionConfig(event.action);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 py-3"
    >
      <div className={cn("p-2 rounded-lg bg-gray-100 dark:bg-[#353444]", config.color)}>
        <Icon size={18} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1F1E2A] dark:text-gray-100 truncate">
          {config.label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatTimeAgo(event.created_at)}
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
            Recent Activity
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
              No rewards yet. Start earning by creating recommendations!
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
              Loading...
            </>
          ) : (
            <>
              Show More
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
  const earnOptions = [
    { icon: Star, label: 'Create recommendations', reward: '0.5-5.0', color: 'text-amber-500' },
    { icon: MessageCircle, label: 'Write helpful comments', reward: '0.2', color: 'text-green-500' },
    { icon: Share2, label: 'Share with friends', reward: '0.1-0.2', color: 'text-blue-500' },
    { icon: Trophy, label: 'Be the first reviewer', reward: '10.0', color: 'text-yellow-500' },
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
            Ways to Earn
          </h2>
          <Sparkles size={16} className="text-[#FF644A]" />
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {earnOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.div
              key={option.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex items-center gap-3"
            >
              <div className={cn("p-1.5 rounded-lg bg-gray-100 dark:bg-[#353444]", option.color)}>
                <Icon size={16} />
              </div>
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                {option.label}
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
        See All Rewards
        <ChevronRight size={16} />
      </Link>
    </motion.div>
  );
}

/**
 * Coming Soon Section - Lottery & Photo Contest teaser
 */
function ComingSoonSection() {
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
          Coming Soon
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-[#2D2C3A]/60 rounded-lg">
          <Ticket size={20} className="text-purple-500" />
          <div>
            <p className="text-xs font-medium text-[#1F1E2A] dark:text-gray-100">Weekly Lottery</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Win up to 25 BOCA</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-[#2D2C3A]/60 rounded-lg">
          <Camera size={20} className="text-pink-500" />
          <div>
            <p className="text-xs font-medium text-[#1F1E2A] dark:text-gray-100">Photo Contest</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Best food photos</p>
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
  const { isAuthenticated, user, authMode, isLoading: authLoading } = useAuth();
  
  // State
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [events, setEvents] = useState<RewardEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

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

  // Handle wallet connect
  const handleConnectWallet = () => {
    // Navigate to wallet connection flow
    router.push('/settings/wallet');
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
              My Rewards
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track your BOCA earnings and activity
            </p>
          </div>

          {/* Balance Hero */}
          <BalanceHero balance={balance} isLoading={balanceLoading} />

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
    </>
  );
}