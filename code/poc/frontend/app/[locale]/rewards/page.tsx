// File: code/poc/frontend/app/[locale]/rewards/page.tsx
// Rewards hub page - Lottery, Photo Contest, Bounties
// UPDATED: Dark mode support added
// UPDATED: Full i18n support with useTranslations

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Camera, Target, Wallet, ArrowRight, TrendingUp, Clock, Users, AlertCircle, Gift, Star, MessageSquare, Share2, Bookmark } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import lotteryApiService, { LotteryStandings } from '@/services/LotteryApiService';
import photoContestApiService, { PhotoContestCurrent } from '@/services/PhotoContestApiService';
import CleanHeader from '@/components/CleanHeader';

// ============================================
// WHITE PAPER v1.0 TOKEN AMOUNTS
// ============================================
const REWARDS = {
  ONBOARDING: {
    FOLLOW_3: 5.0,
    CREATE_5_RECS: 25.0,
    ENGAGE_10: 20.0,
    TOTAL: 50.0
  },
  CONTENT: {
    CREATE_REC_WALLET: 5.0,
    CREATE_REC_EMAIL: 2.5,
    VALIDATION_BONUS: 10.0,
    FIRST_REVIEWER: 10.0
  },
  ENGAGEMENT: {
    SAVE: 1.0,
    COMMENT: 0.5,
    HELPFUL: 2.0
  },
  SOCIAL: {
    BOOST: 1.0,
    RESHARE: 2.0,
    ATTRIBUTION: 1.0
  },
  LOTTERY: {
    POOL: 500,
    FIRST: 250,
    SECOND: 150,
    THIRD: 100
  },
  PHOTO_CONTEST: {
    FIRST: 100,
    SECOND: 50,
    THIRD: 30,
    PARTICIPATION: 0.5
  },
  BOUNTY: {
    MINIMUM: 10.0,
    WINNER_PERCENT: 90,
    BURN_PERCENT: 10
  },
  CURATION: {
    CREATE_LIST: 5.0,
    LIST_10_SAVES: 10.0,
    LIST_50_SAVES: 20.0
  }
};

const TIER_WEIGHTS = {
  NEW: { weight: 0.5, label: 'New', days: '0-6 days' },
  ESTABLISHED: { weight: 1.0, label: 'Established', days: '7+ days' },
  TRUSTED: { weight: 1.5, label: 'Trusted', days: '30+ days + 3 validated' }
};

type TabType = 'overview' | 'lottery' | 'photo-contest' | 'bounties';

export default function RewardsPage() {
  const router = useRouter();
  const t = useTranslations('rewards');
  const { isAuthenticated, user, authMode } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); 

  // Lottery data
  const [lotteryData, setLotteryData] = useState<LotteryStandings | null>(null);
  
  // Photo contest data
  const [photoContestData, setPhotoContestData] = useState<PhotoContestCurrent | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, isAuthenticated, user]);

  const loadData = async () => {
    if (activeTab === 'overview' || activeTab === 'bounties') {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'lottery') {
        const standings = await lotteryApiService.getCurrentStandings();
        setLotteryData(standings);
      } else if (activeTab === 'photo-contest') {
        const current = await photoContestApiService.getCurrentContest();
        setPhotoContestData(current);
      }
    } catch (error) {
      console.error('Failed to load rewards data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
      <CleanHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[#1F1E2A] dark:text-white">
            {t('page.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('page.subtitle')}
          </p>
        </div>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'bg-[#FF644A] text-white'
                    : 'bg-white dark:bg-[#2D2C3A] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3D3C4A] hover:bg-gray-50 dark:hover:bg-[#353444]'
                }`}
              >
                <Gift size={18} />
                <span>{t('tabs.overview')}</span>
              </button>

              <button
                onClick={() => setActiveTab('lottery')}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'lottery'
                    ? 'bg-[#FF644A] text-white'
                    : 'bg-white dark:bg-[#2D2C3A] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3D3C4A] hover:bg-gray-50 dark:hover:bg-[#353444]'
                }`}
              >
                <Trophy size={18} />
                <span>{t('tabs.lottery')}</span>
              </button>
              
              <button
                onClick={() => setActiveTab('photo-contest')}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'photo-contest'
                    ? 'bg-[#FF644A] text-white'
                    : 'bg-white dark:bg-[#2D2C3A] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3D3C4A] hover:bg-gray-50 dark:hover:bg-[#353444]'
                }`}
              >
                <Camera size={18} />
                <span>{t('tabs.photoContest')}</span>
              </button>
              
              <button
                onClick={() => setActiveTab('bounties')}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'bounties'
                    ? 'bg-[#FF644A] text-white'
                    : 'bg-white dark:bg-[#2D2C3A] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#3D3C4A] hover:bg-gray-50 dark:hover:bg-[#353444]'
                }`}
              >
                <Target size={18} />
                <span>{t('tabs.bounties')}</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 border border-gray-200 dark:border-[#3D3C4A]">
              {/* Error State */}
              {error && (
                <div className="mb-6 p-4 rounded-lg flex items-center gap-3 bg-[#FFF4E1] dark:bg-red-900/20 border border-[#FFD4CC] dark:border-red-800">
                  <AlertCircle size={20} className="text-[#E65441] dark:text-red-400" />
                  <div>
                    <div className="font-medium text-[#1F1E2A] dark:text-white">{t('error.title')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{error}</div>
                  </div>
                  <button
                    onClick={loadData}
                    className="ml-auto px-4 py-2 rounded text-sm font-medium hover:opacity-90 bg-[#FF644A] text-white"
                  >
                    {t('error.retry')}
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF644A]"></div>
                </div>
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <OverviewContent user={user} />
                  )}
                  
                  {activeTab === 'lottery' && (
                    <LotteryContent 
                      data={lotteryData} 
                      isWalletUser={authMode === 'wallet'}
                      isAuthenticated={isAuthenticated}
                      formatDate={formatDate}
                    />
                  )}
                  
                  {activeTab === 'photo-contest' && (
                    <PhotoContestContent 
                      data={photoContestData}
                      isWalletUser={authMode === 'wallet'}
                      isAuthenticated={isAuthenticated}
                      formatDate={formatDate}
                    />
                  )}
                  
                  {activeTab === 'bounties' && (
                    <BountiesContent 
                      isWalletUser={authMode === 'wallet'}
                      isAuthenticated={isAuthenticated}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <Sidebar 
            isAuthenticated={isAuthenticated}
            authMode={authMode}
            lotteryData={lotteryData}
            formatDate={formatDate}
          />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SIDEBAR COMPONENT
// ==========================================

function Sidebar({ 
  isAuthenticated, 
  authMode, 
  lotteryData, 
  formatDate 
}: { 
  isAuthenticated: boolean;
  authMode: string | null;
  lotteryData: LotteryStandings | null;
  formatDate: (date: string) => string;
}) {
  const router = useRouter();
  const t = useTranslations('rewards');

  return (
    <div className="w-80 space-y-4">
      {/* Wallet Status Card */}
      {isAuthenticated ? (
        authMode === 'wallet' ? (
          <div className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 border border-gray-200 dark:border-[#3D3C4A]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                <Wallet size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-semibold text-[#1F1E2A] dark:text-white">
                  {t('sidebar.wallet.connected.title')}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('sidebar.wallet.connected.subtitle')}
                </div>
              </div>
            </div>
            
            {lotteryData?.user_stats && (
              <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-[#3D3C4A]">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('sidebar.wallet.connected.lotteryTickets')}</span>
                  <span className="font-semibold text-[#1F1E2A] dark:text-white">
                    {lotteryData.user_stats.ticket_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('sidebar.wallet.connected.engagementScore')}</span>
                  <span className="font-semibold text-[#1F1E2A] dark:text-white">
                    {lotteryData.user_stats.engagement_score.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 border-2 border-[#FF644A]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#FFE8E3] dark:bg-[#FF644A]/20">
                <Wallet size={20} className="text-[#FF644A]" />
              </div>
              <div>
                <div className="font-semibold text-[#1F1E2A] dark:text-white">
                  {t('sidebar.wallet.upgrade.title')}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('sidebar.wallet.upgrade.subtitle')}
                </div>
              </div>
            </div>
            
            <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
              {t('sidebar.wallet.upgrade.description')}
            </p>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 bg-[#FF644A]"
            >
              <span>{t('sidebar.wallet.upgrade.cta')}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 border border-gray-200 dark:border-[#3D3C4A]">
          <div className="text-center mb-4">
            <div className="font-semibold mb-2 text-[#1F1E2A] dark:text-white">
              {t('sidebar.wallet.guest.title')}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('sidebar.wallet.guest.description')}
            </p>
          </div>
          <button
            onClick={() => router.push('/signup')}
            className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity bg-[#FF644A]"
          >
            {t('sidebar.wallet.guest.cta')}
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 border border-gray-200 dark:border-[#3D3C4A]">
        <h3 className="font-semibold mb-4 text-[#1F1E2A] dark:text-white">
          {t('sidebar.quickStats.title')}
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center bg-[#FFE8E3] dark:bg-[#FF644A]/20">
              <Trophy size={16} className="text-[#FF644A]" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('sidebar.quickStats.nextLottery')}</div>
              <div className="text-sm font-semibold text-[#1F1E2A] dark:text-white">
                {lotteryData ? formatDate(lotteryData.drawing.week_end) : t('sidebar.quickStats.loading')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center bg-[#BFE2D9] dark:bg-[#BFE2D9]/20">
              <Camera size={16} className="text-[#2D7A5F] dark:text-[#BFE2D9]" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('sidebar.quickStats.prizePool')}</div>
              <div className="text-sm font-semibold text-[#1F1E2A] dark:text-white">
                {REWARDS.LOTTERY.POOL} BOCA
              </div>
            </div>
          </div>
          
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#353444] -mx-2 px-2 py-1 rounded-lg transition-colors"
            onClick={() => router.push('/discover?tab=requests')}
          >
            <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
              <Target size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('sidebar.quickStats.discoveryRequests')}</div>
              <div className="text-sm font-semibold text-[#FF644A]">
                {t('sidebar.quickStats.viewRequests')}
              </div>
            </div>
            <ArrowRight size={14} className="text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white dark:bg-[#2D2C3A] rounded-xl p-6 border border-gray-200 dark:border-[#3D3C4A]">
        <h3 className="font-semibold mb-4 text-[#1F1E2A] dark:text-white">
          {t('sidebar.howItWorks.title')}
        </h3>
        
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <div className="font-medium mb-1 text-[#1F1E2A] dark:text-white">
              {t('sidebar.howItWorks.lottery.title')}
            </div>
            <p>{t('sidebar.howItWorks.lottery.description')}</p>
          </div>
          
          <div>
            <div className="font-medium mb-1 text-[#1F1E2A] dark:text-white">
              {t('sidebar.howItWorks.photoContest.title')}
            </div>
            <p>{t('sidebar.howItWorks.photoContest.description')}</p>
          </div>
          
          <div>
            <div className="font-medium mb-1 text-[#1F1E2A] dark:text-white">
              {t('sidebar.howItWorks.bounties.title')}
            </div>
            <p>{t('sidebar.howItWorks.bounties.description')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// OVERVIEW TAB COMPONENT
// ============================================
const OverviewContent = ({ user }: { user?: any }) => {
  const t = useTranslations('rewards');
  const isEmailUser = user?.accountTier === 'email_basic';
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#1F1E2A] dark:text-white mb-2">
          {t('overview.header.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('overview.header.subtitle')}
        </p>
      </div>

      {/* Wallet Upgrade CTA for Email Users */}
      {isEmailUser && (
        <div className="bg-gradient-to-r from-[#FF644A] to-[#E65441] rounded-xl p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">{t('overview.upgradeWallet.title')}</h3>
              <p className="text-white/90 text-sm">
                {t('overview.upgradeWallet.description', { 
                  walletAmount: REWARDS.CONTENT.CREATE_REC_WALLET, 
                  emailAmount: REWARDS.CONTENT.CREATE_REC_EMAIL 
                })}
              </p>
            </div>
            <button className="bg-white text-[#FF644A] px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              {t('overview.upgradeWallet.cta')}
            </button>
          </div>
        </div>
      )}

      {/* Welcome Rewards */}
      <div className="bg-white dark:bg-[#353444] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <Gift className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A] dark:text-white">{t('overview.welcome.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('overview.welcome.subtitle', { total: REWARDS.ONBOARDING.TOTAL })}
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.welcome.follow3')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ONBOARDING.FOLLOW_3} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.welcome.create5')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ONBOARDING.CREATE_5_RECS} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.welcome.engage10')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ONBOARDING.ENGAGE_10} BOCA</span>
          </div>
        </div>
      </div>

      {/* Content Creation */}
      <div className="bg-white dark:bg-[#353444] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FFF4E1] dark:bg-[#FF644A]/20 rounded-lg flex items-center justify-center">
            <Star className="w-5 h-5 text-[#FF644A]" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A] dark:text-white">{t('overview.content.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.content.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.content.createWallet')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.CONTENT.CREATE_REC_WALLET} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.content.createEmail')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.CONTENT.CREATE_REC_EMAIL} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#FF644A]/10 dark:bg-[#FF644A]/20 rounded-lg border border-[#FF644A]/20 dark:border-[#FF644A]/30">
            <span className="text-gray-700 dark:text-gray-300 font-medium">{t('overview.content.validationBonus')}</span>
            <span className="font-bold text-[#FF644A]">+{REWARDS.CONTENT.VALIDATION_BONUS} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#FF644A]/10 dark:bg-[#FF644A]/20 rounded-lg border border-[#FF644A]/20 dark:border-[#FF644A]/30">
            <span className="text-gray-700 dark:text-gray-300 font-medium">{t('overview.content.firstReviewer')}</span>
            <span className="font-bold text-[#FF644A]">+{REWARDS.CONTENT.FIRST_REVIEWER} BOCA</span>
          </div>
        </div>
      </div>

      {/* Engagement Received */}
      <div className="bg-white dark:bg-[#353444] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A] dark:text-white">{t('overview.engagement.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.engagement.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3 mb-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.engagement.save')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ENGAGEMENT.SAVE} BOCA × {t('overview.engagement.tier')}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.engagement.comment')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ENGAGEMENT.COMMENT} BOCA × {t('overview.engagement.tier')}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.engagement.helpful')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ENGAGEMENT.HELPFUL} BOCA</span>
          </div>
        </div>
        {/* Tier Weight Explainer */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">{t('overview.tiers.title')}</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-white dark:bg-[#2D2C3A] rounded">
              <div className="font-bold text-blue-600 dark:text-blue-400">{TIER_WEIGHTS.NEW.weight}×</div>
              <div className="text-gray-600 dark:text-gray-400">{t('overview.tiers.new')}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{t('overview.tiers.newDays')}</div>
            </div>
            <div className="text-center p-2 bg-white dark:bg-[#2D2C3A] rounded">
              <div className="font-bold text-blue-600 dark:text-blue-400">{TIER_WEIGHTS.ESTABLISHED.weight}×</div>
              <div className="text-gray-600 dark:text-gray-400">{t('overview.tiers.established')}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{t('overview.tiers.establishedDays')}</div>
            </div>
            <div className="text-center p-2 bg-white dark:bg-[#2D2C3A] rounded">
              <div className="font-bold text-blue-600 dark:text-blue-400">{TIER_WEIGHTS.TRUSTED.weight}×</div>
              <div className="text-gray-600 dark:text-gray-400">{t('overview.tiers.trusted')}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{t('overview.tiers.trustedDays')}</div>
            </div>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
            {t('overview.tiers.example', { 
              base: REWARDS.ENGAGEMENT.SAVE, 
              multiplier: TIER_WEIGHTS.TRUSTED.weight,
              result: REWARDS.ENGAGEMENT.SAVE * TIER_WEIGHTS.TRUSTED.weight 
            })}
          </p>
        </div>
      </div>

      {/* Social Amplification */}
      <div className="bg-white dark:bg-[#353444] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FFF4E1] dark:bg-[#FF644A]/20 rounded-lg flex items-center justify-center">
            <Share2 className="w-5 h-5 text-[#FF644A]" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A] dark:text-white">{t('overview.social.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.social.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.social.boost')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.SOCIAL.BOOST} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.social.reshare')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.SOCIAL.RESHARE} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.social.attribution')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.SOCIAL.ATTRIBUTION} BOCA</span>
          </div>
        </div>
      </div>

      {/* Weekly Contests */}
      <div className="bg-white dark:bg-[#353444] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A] dark:text-white">{t('overview.contests.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.contests.subtitle')}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Lottery Card */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-2">🎰 {t('overview.contests.lottery.title')}</h4>
            <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
              {t('overview.contests.lottery.pool', { amount: REWARDS.LOTTERY.POOL })}
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-700 dark:text-purple-400">🥇 {t('overview.contests.first')}</span>
                <span className="font-bold text-purple-800 dark:text-purple-300">{REWARDS.LOTTERY.FIRST} BOCA + {t('overview.contests.lottery.spotlights', { count: 3 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700 dark:text-purple-400">🥈 {t('overview.contests.second')}</span>
                <span className="font-bold text-purple-800 dark:text-purple-300">{REWARDS.LOTTERY.SECOND} BOCA + {t('overview.contests.lottery.spotlights', { count: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700 dark:text-purple-400">🥉 {t('overview.contests.third')}</span>
                <span className="font-bold text-purple-800 dark:text-purple-300">{REWARDS.LOTTERY.THIRD} BOCA + {t('overview.contests.lottery.spotlights', { count: 1 })}</span>
              </div>
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">{t('overview.contests.lottery.eligible')}</p>
          </div>
          {/* Photo Contest Card */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 rounded-lg border border-amber-200 dark:border-amber-700">
            <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-2">📸 {t('overview.contests.photo.title')}</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">{t('overview.contests.photo.subtitle')}</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-amber-700 dark:text-amber-400">🥇 {t('overview.contests.first')}</span>
                <span className="font-bold text-amber-800 dark:text-amber-300">{REWARDS.PHOTO_CONTEST.FIRST} BOCA + {t('overview.contests.photo.homepage')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700 dark:text-amber-400">🥈 {t('overview.contests.second')}</span>
                <span className="font-bold text-amber-800 dark:text-amber-300">{REWARDS.PHOTO_CONTEST.SECOND} BOCA + {t('overview.contests.photo.banner')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700 dark:text-amber-400">🥉 {t('overview.contests.third')}</span>
                <span className="font-bold text-amber-800 dark:text-amber-300">{REWARDS.PHOTO_CONTEST.THIRD} BOCA + {t('overview.contests.photo.banner')}</span>
              </div>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              {t('overview.contests.photo.participation', { amount: REWARDS.PHOTO_CONTEST.PARTICIPATION })}
            </p>
          </div>
        </div>
      </div>

      {/* Bounties */}
      <div className="bg-white dark:bg-[#353444] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A] dark:text-white">{t('overview.bounties.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.bounties.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.bounties.create')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.BOUNTY.MINIMUM} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.bounties.win')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.BOUNTY.WINNER_PERCENT}% {t('overview.bounties.ofPledge')}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('overview.bounties.fee', { percent: REWARDS.BOUNTY.BURN_PERCENT })}
          </p>
        </div>
      </div>

      {/* Curation */}
      <div className="bg-white dark:bg-[#353444] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A] dark:text-white">{t('overview.curation.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.curation.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.curation.createList')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.CURATION.CREATE_LIST} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.curation.list10')}</span>
            <span className="font-bold text-[#FF644A]">+{REWARDS.CURATION.LIST_10_SAVES} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('overview.curation.list50')}</span>
            <span className="font-bold text-[#FF644A]">+{REWARDS.CURATION.LIST_50_SAVES} BOCA</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// LOTTERY TAB CONTENT
// ==========================================

function LotteryContent({ 
  data, 
  isWalletUser, 
  isAuthenticated,
  formatDate 
}: { 
  data: LotteryStandings | null; 
  isWalletUser: boolean; 
  isAuthenticated: boolean;
  formatDate: (date: string) => string;
}) {
  const t = useTranslations('rewards');

  if (!data) {
    return <div className="text-gray-600 dark:text-gray-400">{t('lottery.noData')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-[#1F1E2A] dark:text-white">
          {t('lottery.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('lottery.description')}
        </p>
      </div>

      {/* Prize Pool */}
      <div className="rounded-lg p-6 bg-[#FFE8E3] dark:bg-[#FF644A]/20 border border-[#FFD4CC] dark:border-[#FF644A]/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm mb-1 text-[#E65441] dark:text-[#FF644A]">{t('lottery.prizePool.title')}</div>
            <div className="text-3xl font-bold text-[#FF644A]">
              {REWARDS.LOTTERY.POOL} BOCA
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm mb-1 text-[#E65441] dark:text-[#FF644A]">{t('lottery.prizePool.nextDrawing')}</div>
            <div className="font-semibold text-[#FF644A]">
              {formatDate(data.drawing.week_end)}
            </div>
          </div>
        </div>
      </div>

      {/* Prize Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#353444] rounded-lg p-4 text-center border border-gray-200 dark:border-[#3D3C4A]">
          <div className="text-2xl mb-1">🥇</div>
          <div className="font-bold text-[#1F1E2A] dark:text-white">
            {REWARDS.LOTTERY.FIRST} BOCA
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('lottery.prizes.first')}</div>
        </div>
        <div className="bg-white dark:bg-[#353444] rounded-lg p-4 text-center border border-gray-200 dark:border-[#3D3C4A]">
          <div className="text-2xl mb-1">🥈</div>
          <div className="font-bold text-[#1F1E2A] dark:text-white">
            {REWARDS.LOTTERY.SECOND} BOCA
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('lottery.prizes.second')}</div>
        </div>
        <div className="bg-white dark:bg-[#353444] rounded-lg p-4 text-center border border-gray-200 dark:border-[#3D3C4A]">
          <div className="text-2xl mb-1">🥉</div>
          <div className="font-bold text-[#1F1E2A] dark:text-white">
            {REWARDS.LOTTERY.THIRD} BOCA
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('lottery.prizes.third')}</div>
        </div>
      </div>

      {/* Participants Info */}
      <div className="rounded-lg p-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-blue-600 dark:text-blue-400" />
          <div>
            <div className="font-semibold text-[#1F1E2A] dark:text-white">
              {t('lottery.participants.title', { count: data.drawing.total_participants })}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('lottery.participants.eligible', { max: data.drawing.max_participants })}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <LeaderboardSection drawingId={data.drawing.id} />

      {!isWalletUser && isAuthenticated && (
        <div className="rounded-lg p-4 text-center bg-[#FFF4E1] dark:bg-[#FF644A]/10 border border-[#FFD4CC] dark:border-[#FF644A]/30">
          <p className="text-gray-600 dark:text-gray-400">
            {t('lottery.walletRequired')}
          </p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// LEADERBOARD SECTION
// ==========================================

function LeaderboardSection({ drawingId }: { drawingId: string }) {
  const t = useTranslations('rewards');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [drawingId]);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      const data = await lotteryApiService.getLeaderboard(100);
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF644A]"></div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1F1E2A] dark:text-white">
          {t('lottery.leaderboard.title')}
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('lottery.leaderboard.topParticipants', { count: Math.min(100, leaderboard.length) })}
        </div>
      </div>
      
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium rounded-t-lg bg-[#FFF4E1] dark:bg-[#353444] text-gray-600 dark:text-gray-400">
        <div className="col-span-1">{t('lottery.leaderboard.columns.rank')}</div>
        <div className="col-span-4">{t('lottery.leaderboard.columns.user')}</div>
        <div className="col-span-3 text-right">{t('lottery.leaderboard.columns.engagement')}</div>
        <div className="col-span-2 text-right">{t('lottery.leaderboard.columns.tickets')}</div>
        <div className="col-span-2 text-right">{t('lottery.leaderboard.columns.status')}</div>
      </div>
      
      {/* Leaderboard Rows */}
      <div className="space-y-1">
        {leaderboard.slice(0, 20).map((entry, index) => (
          <div 
            key={entry.user.id}
            className={`grid grid-cols-12 gap-4 items-center p-4 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] ${
              index < 3 ? 'bg-[#FFF4E1] dark:bg-[#FF644A]/10' : 'bg-white dark:bg-[#2D2C3A]'
            }`}
          >
            {/* Rank */}
            <div className="col-span-1">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-400 text-white' : 
                  index === 1 ? 'bg-gray-400 text-white' : 
                  index === 2 ? 'bg-amber-600 text-white' : 
                  'bg-gray-200 dark:bg-[#3D3C4A] text-gray-600 dark:text-gray-400'
                }`}
              >
                {entry.rank}
              </div>
            </div>
            
            {/* User */}
            <div className="col-span-4">
              <div className="font-medium text-[#1F1E2A] dark:text-white">
                {entry.user.username || `User #${entry.user.id.slice(0, 8)}`}
              </div>
              {entry.user.display_name && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.user.display_name}
                </div>
              )}
            </div>
            
            {/* Engagement */}
            <div className="col-span-3 text-right">
              <div className="font-medium text-[#1F1E2A] dark:text-white">
                {entry.engagement_score.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('lottery.leaderboard.points')}</div>
            </div>
            
            {/* Tickets */}
            <div className="col-span-2 text-right">
              <div className="inline-block px-2 py-1 rounded text-sm font-semibold bg-[#FFE8E3] dark:bg-[#FF644A]/20 text-[#FF644A]">
                {entry.ticket_count}
              </div>
            </div>
            
            {/* Status */}
            <div className="col-span-2 text-right">
              {entry.rank <= 100 ? (
                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-[#BFE2D9] dark:bg-[#BFE2D9]/20 text-[#2D7A5F] dark:text-[#BFE2D9]">
                  {t('lottery.leaderboard.eligible')}
                </span>
              ) : (
                <span className="inline-block px-2 py-1 rounded text-xs bg-gray-100 dark:bg-[#3D3C4A] text-gray-500 dark:text-gray-400">
                  {t('lottery.leaderboard.notEligible')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {leaderboard.length > 20 && (
        <button className="w-full mt-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-[#3D3C4A] text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-[#353444]">
          {t('lottery.leaderboard.viewFull', { count: leaderboard.length })}
        </button>
      )}
    </div>
  );
}

// ==========================================
// PHOTO CONTEST TAB CONTENT
// ==========================================

function PhotoContestContent({ 
  data, 
  isWalletUser, 
  isAuthenticated,
  formatDate 
}: { 
  data: PhotoContestCurrent | null; 
  isWalletUser: boolean; 
  isAuthenticated: boolean;
  formatDate: (date: string) => string;
}) {
  const t = useTranslations('rewards');

  if (!data) {
    return <div className="text-gray-600 dark:text-gray-400">{t('photoContest.noData')}</div>;
  }

  const getTimeRemaining = (targetDate: string) => {
    const now = new Date();
    const target = new Date(targetDate);
    const total = target.getTime() - now.getTime();
    return {
      days: Math.max(0, Math.floor(total / (1000 * 60 * 60 * 24))),
      hours: Math.max(0, Math.floor((total / (1000 * 60 * 60)) % 24)),
      minutes: Math.max(0, Math.floor((total / (1000 * 60)) % 60))
    };
  };

  const getTargetDate = () => {
    switch (data.round.status) {
      case 'nominations':
        return data.round.timeline.nomination_end;
      case 'voting':
        return data.round.timeline.voting_end;
      default:
        return data.round.timeline.winner_announcement_at;
    }
  };

  const timeRemaining = getTimeRemaining(getTargetDate());

  const getPhaseLabel = (status: string) => {
    switch (status) {
      case 'nominations':
        return t('photoContest.phase.nominations');
      case 'voting':
        return t('photoContest.phase.voting');
      case 'completed':
        return t('photoContest.phase.completed');
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-[#1F1E2A] dark:text-white">
          {t('photoContest.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('photoContest.description')}
        </p>
      </div>

      {/* Current Phase */}
      <div className={`rounded-lg p-4 border ${
        data.round.status === 'voting' 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
          : 'bg-[#FFE8E3] dark:bg-[#FF644A]/20 border-[#FFD4CC] dark:border-[#FF644A]/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-[#2D2C3A]">
              {data.round.status === 'nominations' && <Camera size={20} className="text-[#FF644A]" />}
              {data.round.status === 'voting' && <Users size={20} className="text-blue-600 dark:text-blue-400" />}
              {data.round.status === 'completed' && <Trophy size={20} className="text-[#FF644A]" />}
            </div>
            <div>
              <div className="font-semibold text-[#1F1E2A] dark:text-white">
                {getPhaseLabel(data.round.status)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('photoContest.phase.stats', { 
                  nominations: data.round.total_nominations, 
                  finalists: data.round.total_finalists 
                })}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('photoContest.timeLeft')}</div>
            <div className="font-semibold text-[#1F1E2A] dark:text-white">
              {timeRemaining.days}d {timeRemaining.hours}h
            </div>
          </div>
        </div>
      </div>

      {/* Prizes */}
      <div className="rounded-lg p-6 bg-[#FFE8E3] dark:bg-[#FF644A]/20 border border-[#FFD4CC] dark:border-[#FF644A]/30">
        <div className="text-center">
          <div className="text-sm mb-2 text-[#E65441] dark:text-[#FF644A]">{t('photoContest.prizes.title')}</div>
          <div className="flex items-center justify-center gap-6">
            <div>
              <div className="text-2xl font-bold text-[#FF644A]">{REWARDS.PHOTO_CONTEST.FIRST} BOCA</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('photoContest.prizes.first')}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-[#FF644A]">{REWARDS.PHOTO_CONTEST.SECOND} BOCA</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('photoContest.prizes.second')}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#FF644A]">{REWARDS.PHOTO_CONTEST.THIRD} BOCA</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('photoContest.prizes.third')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contest Timeline */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
            data.round.status === 'nominations' ? 'bg-[#FF644A]' : 'bg-[#FFE8E3] dark:bg-[#FF644A]/20'
          }`}>
            <Camera size={20} className={data.round.status === 'nominations' ? 'text-white' : 'text-[#FF644A]'} />
          </div>
          <div className="font-medium text-sm text-[#1F1E2A] dark:text-white">{t('photoContest.timeline.monWed')}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('photoContest.timeline.nominations')}</div>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 bg-blue-100 dark:bg-blue-900/30">
            <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="font-medium text-sm text-[#1F1E2A] dark:text-white">{t('photoContest.timeline.thursday')}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('photoContest.timeline.finalists')}</div>
        </div>
        <div className="text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
            data.round.status === 'voting' ? 'bg-blue-600 dark:bg-blue-500' : 'bg-[#BFE2D9] dark:bg-[#BFE2D9]/20'
          }`}>
            <Users size={20} className={data.round.status === 'voting' ? 'text-white' : 'text-[#2D7A5F] dark:text-[#BFE2D9]'} />
          </div>
          <div className="font-medium text-sm text-[#1F1E2A] dark:text-white">{t('photoContest.timeline.thuSat')}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('photoContest.timeline.voting')}</div>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 bg-[#FFE8E3] dark:bg-[#FF644A]/20">
            <Trophy size={20} className="text-[#FF644A]" />
          </div>
          <div className="font-medium text-sm text-[#1F1E2A] dark:text-white">{t('photoContest.timeline.sunday')}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('photoContest.timeline.winners')}</div>
        </div>
      </div>

      {/* Current Finalists (if voting active) */}
      {data.round.status === 'voting' && <FinalistsGrid roundId={data.round.id} isWalletUser={isWalletUser} />}

      {/* Past Winners */}
      <PastWinnersSection />

      {/* How to Participate */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[#1F1E2A] dark:text-white">{t('photoContest.howToParticipate.title')}</h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <span>1.</span>
            <span>{t('photoContest.howToParticipate.step1')}</span>
          </div>
          <div className="flex items-start gap-2">
            <span>2.</span>
            <span>{t('photoContest.howToParticipate.step2')}</span>
          </div>
          <div className="flex items-start gap-2">
            <span>3.</span>
            <span>{t('photoContest.howToParticipate.step3')}</span>
          </div>
          <div className="flex items-start gap-2">
            <span>4.</span>
            <span>{t('photoContest.howToParticipate.step4')}</span>
          </div>
          <div className="flex items-start gap-2">
            <span>5.</span>
            <span>{t('photoContest.howToParticipate.step5')}</span>
          </div>
        </div>
      </div>

      {!isWalletUser && isAuthenticated && (
        <div className="rounded-lg p-4 text-center bg-[#FFF4E1] dark:bg-[#FF644A]/10 border border-[#FFD4CC] dark:border-[#FF644A]/30">
          <p className="text-gray-600 dark:text-gray-400">
            {t('photoContest.walletRequired')}
          </p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// FINALISTS GRID
// ==========================================

function FinalistsGrid({ roundId, isWalletUser }: { roundId: string; isWalletUser: boolean }) {
  const t = useTranslations('rewards');
  const [finalists, setFinalists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userVote, setUserVote] = useState<string | null>(null);

  useEffect(() => {
    loadFinalists();
  }, [roundId]);

  const loadFinalists = async () => {
    try {
      setIsLoading(true);
      const data = await photoContestApiService.getFinalists();
      setFinalists(data.finalists || []);
      setUserVote(data.user_vote?.voted_for || null);
    } catch (error) {
      console.error('Failed to load finalists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (nominationId: string) => {
    try {
      await photoContestApiService.vote(nominationId);
      setUserVote(nominationId);
      await loadFinalists();
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('Failed to submit vote. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF644A]"></div>
      </div>
    );
  }

  if (!finalists || finalists.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="font-semibold mb-4 text-[#1F1E2A] dark:text-white">
        {t('photoContest.finalists.title')}
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {finalists.slice(0, 10).map((finalist) => (
          <div 
            key={finalist.id}
            className="rounded-lg overflow-hidden border border-gray-200 dark:border-[#3D3C4A] bg-white dark:bg-[#2D2C3A]"
          >
            {/* Photo */}
            <div 
              className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#353444] dark:to-[#2D2C3A] flex items-center justify-center"
              style={{
                backgroundImage: finalist.photo_url ? `url(${finalist.photo_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!finalist.photo_url && <Camera size={48} className="text-gray-400 dark:text-gray-600" />}
            </div>
            
            {/* Info */}
            <div className="p-3">
              <div className="font-medium mb-1 text-[#1F1E2A] dark:text-white">
                {finalist.restaurant_name}
              </div>
              <div className="text-sm mb-2 text-gray-500 dark:text-gray-400">
                by @{finalist.username || 'anonymous'}
              </div>
              
              {/* Vote count and button */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('photoContest.finalists.votes', { count: finalist.vote_count })}
                </span>
                {isWalletUser ? (
                  userVote === finalist.nomination_id ? (
                    <span className="px-3 py-1 rounded text-sm font-medium bg-[#BFE2D9] dark:bg-[#BFE2D9]/20 text-[#2D7A5F] dark:text-[#BFE2D9]">
                      {t('photoContest.finalists.voted')}
                    </span>
                  ) : userVote ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('photoContest.finalists.alreadyVoted')}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleVote(finalist.nomination_id)}
                      className="px-3 py-1 rounded text-sm font-medium text-white hover:opacity-90 transition-opacity bg-[#FF644A]"
                    >
                      {t('photoContest.finalists.vote')}
                    </button>
                  )
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('photoContest.finalists.loginToVote')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {finalists.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-sm font-medium hover:opacity-70 transition-opacity text-[#FF644A]">
            {t('photoContest.finalists.viewAll', { count: finalists.length })}
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// PAST WINNERS SECTION
// ==========================================

function PastWinnersSection() {
  const t = useTranslations('rewards');
  const [winners, setWinners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWinners();
  }, []);

  const loadWinners = async () => {
    try {
      setIsLoading(true);
      const data = await photoContestApiService.getHistory(3, 0);
      
      const recentWinners = data.rounds
        .filter((round: any) => round.winners && round.winners.length > 0)
        .flatMap((round: any) => 
          round.winners
            .filter((w: any) => w.place === 1)
            .map((w: any) => ({
              week: `${new Date(round.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
              username: w.username,
              display_name: w.display_name,
              photo_url: w.photo_url,
              restaurant_name: w.restaurant_name,
              prize: photoContestApiService.formatPrize(w.prize)
            }))
        );
      
      setWinners(recentWinners);
    } catch (error) {
      console.error('Failed to load past winners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF644A]"></div>
      </div>
    );
  }

  if (!winners || winners.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="font-semibold mb-4 text-[#1F1E2A] dark:text-white">
        {t('photoContest.pastWinners.title')}
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {winners.map((winner, index) => (
          <div 
            key={index}
            className="rounded-lg overflow-hidden border border-gray-200 dark:border-[#3D3C4A] bg-white dark:bg-[#2D2C3A]"
          >
            {/* Photo with trophy overlay */}
            <div 
              className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#353444] dark:to-[#2D2C3A] flex items-center justify-center"
              style={{
                backgroundImage: winner.photo_url ? `url(${winner.photo_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!winner.photo_url && <Camera size={48} className="text-gray-400 dark:text-gray-600" />}
              <div className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center bg-yellow-400">
                <Trophy size={16} className="text-white" />
              </div>
            </div>
            
            {/* Info */}
            <div className="p-3">
              <div className="text-sm mb-1 text-gray-500 dark:text-gray-400">
                {winner.week}
              </div>
              <div className="font-medium mb-1 text-[#1F1E2A] dark:text-white">
                @{winner.username}
              </div>
              {winner.restaurant_name && (
                <div className="text-xs mb-1 text-gray-600 dark:text-gray-400">
                  {winner.restaurant_name}
                </div>
              )}
              <div className="text-sm font-semibold text-[#FF644A]">
                {winner.prize}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <button className="text-sm font-medium hover:opacity-70 transition-opacity text-[#FF644A]">
          {t('photoContest.pastWinners.viewAll')}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// BOUNTIES TAB CONTENT
// ==========================================

function BountiesContent({ 
  isWalletUser, 
  isAuthenticated 
}: { 
  isWalletUser: boolean; 
  isAuthenticated: boolean;
}) {
  const t = useTranslations('rewards');
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-[#1F1E2A] dark:text-white">
          {t('bounties.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('bounties.description')}
        </p>
      </div>

      {/* How Bounties Work */}
      <div className="rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold mb-4 text-[#1F1E2A] dark:text-white">{t('bounties.howItWorks.title')}</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium mb-2 text-blue-600 dark:text-blue-400">
              {t('bounties.howItWorks.step1.title')}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('bounties.howItWorks.step1.description')}
            </p>
          </div>
          <div>
            <div className="font-medium mb-2 text-blue-600 dark:text-blue-400">
              {t('bounties.howItWorks.step2.title')}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('bounties.howItWorks.step2.description')}
            </p>
          </div>
          <div>
            <div className="font-medium mb-2 text-blue-600 dark:text-blue-400">
              {t('bounties.howItWorks.step3.title')}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {t('bounties.howItWorks.step3.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Reward Structure */}
      <div className="bg-white dark:bg-[#353444] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6">
        <h3 className="font-semibold mb-4 text-[#1F1E2A] dark:text-white">
          {t('bounties.rewards.title')}
        </h3>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('bounties.rewards.minStake')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.BOUNTY.MINIMUM} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#BFE2D9] dark:bg-[#BFE2D9]/20 rounded-lg">
            <span className="text-gray-700 dark:text-gray-300 font-medium">{t('bounties.rewards.winnerReceives')}</span>
            <span className="font-bold text-[#2D7A5F] dark:text-[#BFE2D9]">{REWARDS.BOUNTY.WINNER_PERCENT}% {t('bounties.rewards.ofStake')}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2D2C3A] rounded-lg">
            <span className="text-gray-700 dark:text-gray-300">{t('bounties.rewards.platformFee')}</span>
            <span className="font-medium text-gray-600 dark:text-gray-400">{REWARDS.BOUNTY.BURN_PERCENT}% {t('bounties.rewards.burned')}</span>
          </div>
        </div>
      </div>

      {/* Browse Discovery Requests CTA */}
      <div className="rounded-xl p-6 bg-gradient-to-br from-[#FF644A]/5 to-[#FF644A]/10 dark:from-[#FF644A]/10 dark:to-[#FF644A]/20 border-2 border-[#FF644A]/20 dark:border-[#FF644A]/30">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#FF644A] flex items-center justify-center flex-shrink-0">
            <Target size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-[#1F1E2A] dark:text-white mb-2">
              {t('bounties.discover.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('bounties.discover.description')}
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
              <li className="flex items-center gap-2">
                <span className="text-[#FF644A]">•</span>
                {t('bounties.discover.bullet1')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#FF644A]">•</span>
                {t('bounties.discover.bullet2')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#FF644A]">•</span>
                {t('bounties.discover.bullet3')}
              </li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/discover?tab=requests')}
                className="px-5 py-2.5 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 bg-[#FF644A]"
              >
                {t('bounties.discover.viewRequests')}
                <ArrowRight size={16} />
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => router.push('/discover?tab=requests&create=true')}
                  className="px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] text-[#1F1E2A] dark:text-white hover:bg-gray-50 dark:hover:bg-[#353444]"
                >
                  {t('bounties.discover.createRequest')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Required Notice */}
      {!isWalletUser && isAuthenticated && (
        <div className="rounded-lg p-4 text-center bg-[#FFF4E1] dark:bg-[#FF644A]/10 border border-[#FFD4CC] dark:border-[#FF644A]/30">
          <p className="text-gray-600 dark:text-gray-400">
            {t('bounties.walletRequired')}
          </p>
        </div>
      )}

      {/* Not Logged In Notice */}
      {!isAuthenticated && (
        <div className="rounded-lg p-4 text-center bg-gray-50 dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A]">
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            {t('bounties.loginRequired')}
          </p>
          <button
            onClick={() => router.push('/signup')}
            className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity bg-[#FF644A]"
          >
            {t('bounties.signUp')}
          </button>
        </div>
      )}
    </div>
  );
}