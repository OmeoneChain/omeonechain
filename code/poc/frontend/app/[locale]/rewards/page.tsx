// File: code/poc/frontend/app/[locale]/rewards/page.tsx
// Rewards hub page - Lottery, Photo Contest, Bounties
// UPDATED: Full i18n support with useTranslations

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Camera, Target, Wallet, ArrowRight, TrendingUp, Clock, Users, AlertCircle, Gift, Star, MessageSquare, Share2, Bookmark  } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import lotteryApiService, { LotteryStandings } from '@/services/LotteryApiService';
import photoContestApiService, { PhotoContestCurrent } from '@/services/PhotoContestApiService';
import bountyApiService, { ActiveBounties } from '@/services/BountyApiService';
import CleanHeader from '@/components/CleanHeader';

// ============================================
// WHITE PAPER v1.0 TOKEN AMOUNTS - ADD THIS
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
  
  // Bounties data
  const [bountiesData, setBountiesData] = useState<ActiveBounties | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, isAuthenticated, user]);

  const loadData = async () => {
    // Overview tab is static - no data to load
    if (activeTab === 'overview') {
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
      } else if (activeTab === 'bounties') {
        const active = await bountyApiService.getActiveBounties({ limit: 20 });
        setBountiesData(active);
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
    <div className="min-h-screen" style={{ backgroundColor: '#FFF4E1' }}>
      <CleanHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1F1E2A' }}>
            {t('page.title')}
          </h1>
          <p className="text-lg" style={{ color: '#666' }}>
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
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'overview' ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'overview' ? '#FF644A' : 'white',
                  color: activeTab === 'overview' ? 'white' : '#666',
                  border: activeTab === 'overview' ? 'none' : '1px solid #E5E5E5'
                }}
              >
                <div className="flex items-center gap-2">
                  <Gift size={18} />
                  <span>{t('tabs.overview')}</span>
                </div>
              </button>
  
              <button
                onClick={() => setActiveTab('lottery')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'lottery' ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'lottery' ? '#FF644A' : 'white',
                  color: activeTab === 'lottery' ? 'white' : '#666',
                  border: activeTab === 'lottery' ? 'none' : '1px solid #E5E5E5'
                }}
              >
                <div className="flex items-center gap-2">
                  <Trophy size={18} />
                  <span>{t('tabs.lottery')}</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('photo-contest')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'photo-contest' ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'photo-contest' ? '#FF644A' : 'white',
                  color: activeTab === 'photo-contest' ? 'white' : '#666',
                  border: activeTab === 'photo-contest' ? 'none' : '1px solid #E5E5E5'
                }}
              >
                <div className="flex items-center gap-2">
                  <Camera size={18} />
                  <span>{t('tabs.photoContest')}</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('bounties')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'bounties' ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: activeTab === 'bounties' ? '#FF644A' : 'white',
                  color: activeTab === 'bounties' ? 'white' : '#666',
                  border: activeTab === 'bounties' ? 'none' : '1px solid #E5E5E5'
                }}
              >
                <div className="flex items-center gap-2">
                  <Target size={18} />
                  <span>{t('tabs.bounties')}</span>
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E5E5E5' }}>
              {/* Error State */}
              {error && (
                <div 
                  className="mb-6 p-4 rounded-lg flex items-center gap-3"
                  style={{ backgroundColor: '#FFF4E1', border: '1px solid #FFD4CC' }}
                >
                  <AlertCircle size={20} style={{ color: '#E65441' }} />
                  <div>
                    <div className="font-medium" style={{ color: '#1F1E2A' }}>{t('error.title')}</div>
                    <div className="text-sm" style={{ color: '#666' }}>{error}</div>
                  </div>
                  <button
                    onClick={loadData}
                    className="ml-auto px-4 py-2 rounded text-sm font-medium hover:opacity-90"
                    style={{ backgroundColor: '#FF644A', color: 'white' }}
                  >
                    {t('error.retry')}
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div 
                    className="animate-spin rounded-full h-8 w-8 border-b-2"
                    style={{ borderColor: '#FF644A' }}
                  ></div>
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
                      data={bountiesData}
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
            bountiesData={bountiesData}
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
  bountiesData,
  formatDate 
}: { 
  isAuthenticated: boolean;
  authMode: string | null;
  lotteryData: LotteryStandings | null;
  bountiesData: ActiveBounties | null;
  formatDate: (date: string) => string;
}) {
  const router = useRouter();
  const t = useTranslations('rewards');

  return (
    <div className="w-80 space-y-4">
      {/* Wallet Status Card */}
      {isAuthenticated ? (
        authMode === 'wallet' ? (
          <div 
            className="bg-white rounded-xl p-6"
            style={{ border: '1px solid #E5E5E5' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E3F2FD' }}
              >
                <Wallet size={20} style={{ color: '#1976D2' }} />
              </div>
              <div>
                <div className="font-semibold" style={{ color: '#1F1E2A' }}>
                  {t('sidebar.wallet.connected.title')}
                </div>
                <div className="text-sm" style={{ color: '#999' }}>
                  {t('sidebar.wallet.connected.subtitle')}
                </div>
              </div>
            </div>
            
            {lotteryData?.user_stats && (
              <div className="space-y-2 pt-4 border-t" style={{ borderColor: '#F5F5F5' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#666' }}>{t('sidebar.wallet.connected.lotteryTickets')}</span>
                  <span className="font-semibold" style={{ color: '#1F1E2A' }}>
                    {lotteryData.user_stats.ticket_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#666' }}>{t('sidebar.wallet.connected.engagementScore')}</span>
                  <span className="font-semibold" style={{ color: '#1F1E2A' }}>
                    {lotteryData.user_stats.engagement_score.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="bg-white rounded-xl p-6"
            style={{ border: '2px solid #FF644A' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FFE8E3' }}
              >
                <Wallet size={20} style={{ color: '#FF644A' }} />
              </div>
              <div>
                <div className="font-semibold" style={{ color: '#1F1E2A' }}>
                  {t('sidebar.wallet.upgrade.title')}
                </div>
                <div className="text-sm" style={{ color: '#999' }}>
                  {t('sidebar.wallet.upgrade.subtitle')}
                </div>
              </div>
            </div>
            
            <p className="text-sm mb-4" style={{ color: '#666' }}>
              {t('sidebar.wallet.upgrade.description')}
            </p>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FF644A' }}
            >
              <span>{t('sidebar.wallet.upgrade.cta')}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )
      ) : (
        <div 
          className="bg-white rounded-xl p-6"
          style={{ border: '1px solid #E5E5E5' }}
        >
          <div className="text-center mb-4">
            <div className="font-semibold mb-2" style={{ color: '#1F1E2A' }}>
              {t('sidebar.wallet.guest.title')}
            </div>
            <p className="text-sm" style={{ color: '#666' }}>
              {t('sidebar.wallet.guest.description')}
            </p>
          </div>
          <button
            onClick={() => router.push('/signup')}
            className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#FF644A' }}
          >
            {t('sidebar.wallet.guest.cta')}
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div 
        className="bg-white rounded-xl p-6"
        style={{ border: '1px solid #E5E5E5' }}
      >
        <h3 className="font-semibold mb-4" style={{ color: '#1F1E2A' }}>
          {t('sidebar.quickStats.title')}
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: '#FFE8E3' }}
            >
              <Trophy size={16} style={{ color: '#FF644A' }} />
            </div>
            <div className="flex-1">
              <div className="text-sm" style={{ color: '#666' }}>{t('sidebar.quickStats.nextLottery')}</div>
              <div className="text-sm font-semibold" style={{ color: '#1F1E2A' }}>
                {lotteryData ? formatDate(lotteryData.drawing.week_end) : t('sidebar.quickStats.loading')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: '#BFE2D9' }}
            >
              <Camera size={16} style={{ color: '#2D7A5F' }} />
            </div>
            <div className="flex-1">
              <div className="text-sm" style={{ color: '#666' }}>{t('sidebar.quickStats.prizePool')}</div>
              <div className="text-sm font-semibold" style={{ color: '#1F1E2A' }}>
                {REWARDS.LOTTERY.POOL} BOCA
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: '#E3F2FD' }}
            >
              <Users size={16} style={{ color: '#1976D2' }} />
            </div>
            <div className="flex-1">
              <div className="text-sm" style={{ color: '#666' }}>{t('sidebar.quickStats.activeBounties')}</div>
              <div className="text-sm font-semibold" style={{ color: '#1F1E2A' }}>
                {bountiesData?.bounties?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div 
        className="bg-white rounded-xl p-6"
        style={{ border: '1px solid #E5E5E5' }}
      >
        <h3 className="font-semibold mb-4" style={{ color: '#1F1E2A' }}>
          {t('sidebar.howItWorks.title')}
        </h3>
        
        <div className="space-y-4 text-sm" style={{ color: '#666' }}>
          <div>
            <div className="font-medium mb-1" style={{ color: '#1F1E2A' }}>
              {t('sidebar.howItWorks.lottery.title')}
            </div>
            <p>{t('sidebar.howItWorks.lottery.description')}</p>
          </div>
          
          <div>
            <div className="font-medium mb-1" style={{ color: '#1F1E2A' }}>
              {t('sidebar.howItWorks.photoContest.title')}
            </div>
            <p>{t('sidebar.howItWorks.photoContest.description')}</p>
          </div>
          
          <div>
            <div className="font-medium mb-1" style={{ color: '#1F1E2A' }}>
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
// OVERVIEW TAB COMPONENT - FULLY TRANSLATED
// ============================================
const OverviewContent = ({ user }: { user?: any }) => {
  const t = useTranslations('rewards');
  const isEmailUser = user?.accountTier === 'email_basic';
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#1F1E2A] mb-2">
          {t('overview.header.title')}
        </h2>
        <p className="text-gray-600">
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Gift className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A]">{t('overview.welcome.title')}</h3>
            <p className="text-sm text-gray-500">
              {t('overview.welcome.subtitle', { total: REWARDS.ONBOARDING.TOTAL })}
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.welcome.follow3')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ONBOARDING.FOLLOW_3} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.welcome.create5')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ONBOARDING.CREATE_5_RECS} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.welcome.engage10')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ONBOARDING.ENGAGE_10} BOCA</span>
          </div>
        </div>
      </div>

      {/* Content Creation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FFF4E1] rounded-lg flex items-center justify-center">
            <Star className="w-5 h-5 text-[#FF644A]" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A]">{t('overview.content.title')}</h3>
            <p className="text-sm text-gray-500">{t('overview.content.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.content.createWallet')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.CONTENT.CREATE_REC_WALLET} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.content.createEmail')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.CONTENT.CREATE_REC_EMAIL} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#FF644A]/10 rounded-lg border border-[#FF644A]/20">
            <span className="text-gray-700 font-medium">{t('overview.content.validationBonus')}</span>
            <span className="font-bold text-[#FF644A]">+{REWARDS.CONTENT.VALIDATION_BONUS} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#FF644A]/10 rounded-lg border border-[#FF644A]/20">
            <span className="text-gray-700 font-medium">{t('overview.content.firstReviewer')}</span>
            <span className="font-bold text-[#FF644A]">+{REWARDS.CONTENT.FIRST_REVIEWER} BOCA</span>
          </div>
        </div>
      </div>

      {/* Engagement Received */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A]">{t('overview.engagement.title')}</h3>
            <p className="text-sm text-gray-500">{t('overview.engagement.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3 mb-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.engagement.save')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ENGAGEMENT.SAVE} BOCA × {t('overview.engagement.tier')}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.engagement.comment')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ENGAGEMENT.COMMENT} BOCA × {t('overview.engagement.tier')}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.engagement.helpful')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.ENGAGEMENT.HELPFUL} BOCA</span>
          </div>
        </div>
        {/* Tier Weight Explainer */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <h4 className="font-medium text-blue-800 mb-2">{t('overview.tiers.title')}</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-white rounded">
              <div className="font-bold text-blue-600">{TIER_WEIGHTS.NEW.weight}×</div>
              <div className="text-gray-600">{t('overview.tiers.new')}</div>
              <div className="text-xs text-gray-400">{t('overview.tiers.newDays')}</div>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <div className="font-bold text-blue-600">{TIER_WEIGHTS.ESTABLISHED.weight}×</div>
              <div className="text-gray-600">{t('overview.tiers.established')}</div>
              <div className="text-xs text-gray-400">{t('overview.tiers.establishedDays')}</div>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <div className="font-bold text-blue-600">{TIER_WEIGHTS.TRUSTED.weight}×</div>
              <div className="text-gray-600">{t('overview.tiers.trusted')}</div>
              <div className="text-xs text-gray-400">{t('overview.tiers.trustedDays')}</div>
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            {t('overview.tiers.example', { 
              base: REWARDS.ENGAGEMENT.SAVE, 
              multiplier: TIER_WEIGHTS.TRUSTED.weight,
              result: REWARDS.ENGAGEMENT.SAVE * TIER_WEIGHTS.TRUSTED.weight 
            })}
          </p>
        </div>
      </div>

      {/* Social Amplification */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FFF4E1] rounded-lg flex items-center justify-center">
            <Share2 className="w-5 h-5 text-[#FF644A]" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A]">{t('overview.social.title')}</h3>
            <p className="text-sm text-gray-500">{t('overview.social.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.social.boost')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.SOCIAL.BOOST} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.social.reshare')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.SOCIAL.RESHARE} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.social.attribution')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.SOCIAL.ATTRIBUTION} BOCA</span>
          </div>
        </div>
      </div>

      {/* Weekly Contests */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A]">{t('overview.contests.title')}</h3>
            <p className="text-sm text-gray-500">{t('overview.contests.subtitle')}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Lottery Card */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <h4 className="font-bold text-purple-800 mb-2">🎰 {t('overview.contests.lottery.title')}</h4>
            <p className="text-sm text-purple-700 mb-3">
              {t('overview.contests.lottery.pool', { amount: REWARDS.LOTTERY.POOL })}
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>🥇 {t('overview.contests.first')}</span>
                <span className="font-bold">{REWARDS.LOTTERY.FIRST} BOCA + {t('overview.contests.lottery.spotlights', { count: 3 })}</span>
              </div>
              <div className="flex justify-between">
                <span>🥈 {t('overview.contests.second')}</span>
                <span className="font-bold">{REWARDS.LOTTERY.SECOND} BOCA + {t('overview.contests.lottery.spotlights', { count: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>🥉 {t('overview.contests.third')}</span>
                <span className="font-bold">{REWARDS.LOTTERY.THIRD} BOCA + {t('overview.contests.lottery.spotlights', { count: 1 })}</span>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">{t('overview.contests.lottery.eligible')}</p>
          </div>
          {/* Photo Contest Card */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
            <h4 className="font-bold text-amber-800 mb-2">📸 {t('overview.contests.photo.title')}</h4>
            <p className="text-sm text-amber-700 mb-3">{t('overview.contests.photo.subtitle')}</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>🥇 {t('overview.contests.first')}</span>
                <span className="font-bold">{REWARDS.PHOTO_CONTEST.FIRST} BOCA + {t('overview.contests.photo.homepage')}</span>
              </div>
              <div className="flex justify-between">
                <span>🥈 {t('overview.contests.second')}</span>
                <span className="font-bold">{REWARDS.PHOTO_CONTEST.SECOND} BOCA + {t('overview.contests.photo.banner')}</span>
              </div>
              <div className="flex justify-between">
                <span>🥉 {t('overview.contests.third')}</span>
                <span className="font-bold">{REWARDS.PHOTO_CONTEST.THIRD} BOCA + {t('overview.contests.photo.banner')}</span>
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-2">
              {t('overview.contests.photo.participation', { amount: REWARDS.PHOTO_CONTEST.PARTICIPATION })}
            </p>
          </div>
        </div>
      </div>

      {/* Bounties */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A]">{t('overview.bounties.title')}</h3>
            <p className="text-sm text-gray-500">{t('overview.bounties.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.bounties.create')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.BOUNTY.MINIMUM} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.bounties.win')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.BOUNTY.WINNER_PERCENT}% {t('overview.bounties.ofPledge')}</span>
          </div>
          <p className="text-xs text-gray-500">
            {t('overview.bounties.fee', { percent: REWARDS.BOUNTY.BURN_PERCENT })}
          </p>
        </div>
      </div>

      {/* Curation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#1F1E2A]">{t('overview.curation.title')}</h3>
            <p className="text-sm text-gray-500">{t('overview.curation.subtitle')}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.curation.createList')}</span>
            <span className="font-bold text-[#FF644A]">{REWARDS.CURATION.CREATE_LIST} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.curation.list10')}</span>
            <span className="font-bold text-[#FF644A]">+{REWARDS.CURATION.LIST_10_SAVES} BOCA</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">{t('overview.curation.list50')}</span>
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
    return <div style={{ color: '#666' }}>{t('lottery.noData')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1F1E2A' }}>
          {t('lottery.title')}
        </h2>
        <p style={{ color: '#666' }}>
          {t('lottery.description')}
        </p>
      </div>

      {/* Prize Pool */}
      <div 
        className="rounded-lg p-6"
        style={{ backgroundColor: '#FFE8E3', border: '1px solid #FFD4CC' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm mb-1" style={{ color: '#E65441' }}>{t('lottery.prizePool.title')}</div>
            <div className="text-3xl font-bold" style={{ color: '#FF644A' }}>
              {REWARDS.LOTTERY.POOL} BOCA
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm mb-1" style={{ color: '#E65441' }}>{t('lottery.prizePool.nextDrawing')}</div>
            <div className="font-semibold" style={{ color: '#FF644A' }}>
              {formatDate(data.drawing.week_end)}
            </div>
          </div>
        </div>
      </div>

      {/* Prize Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 text-center" style={{ border: '1px solid #E5E5E5' }}>
          <div className="text-2xl mb-1">🥇</div>
          <div className="font-bold" style={{ color: '#1F1E2A' }}>
            {REWARDS.LOTTERY.FIRST} BOCA
          </div>
          <div className="text-sm" style={{ color: '#999' }}>{t('lottery.prizes.first')}</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center" style={{ border: '1px solid #E5E5E5' }}>
          <div className="text-2xl mb-1">🥈</div>
          <div className="font-bold" style={{ color: '#1F1E2A' }}>
            {REWARDS.LOTTERY.SECOND} BOCA
          </div>
          <div className="text-sm" style={{ color: '#999' }}>{t('lottery.prizes.second')}</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center" style={{ border: '1px solid #E5E5E5' }}>
          <div className="text-2xl mb-1">🥉</div>
          <div className="font-bold" style={{ color: '#1F1E2A' }}>
            {REWARDS.LOTTERY.THIRD} BOCA
          </div>
          <div className="text-sm" style={{ color: '#999' }}>{t('lottery.prizes.third')}</div>
        </div>
      </div>

      {/* Participants Info */}
      <div 
        className="rounded-lg p-4 flex items-center justify-between"
        style={{ backgroundColor: '#E3F2FD', border: '1px solid #BBDEFB' }}
      >
        <div className="flex items-center gap-3">
          <Users size={24} style={{ color: '#1976D2' }} />
          <div>
            <div className="font-semibold" style={{ color: '#1F1E2A' }}>
              {t('lottery.participants.title', { count: data.drawing.total_participants })}
            </div>
            <div className="text-sm" style={{ color: '#666' }}>
              {t('lottery.participants.eligible', { max: data.drawing.max_participants })}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard - Fetch from API */}
      <LeaderboardSection drawingId={data.drawing.id} />

      {!isWalletUser && isAuthenticated && (
        <div 
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: '#FFF4E1', border: '1px solid #FFD4CC' }}
        >
          <p style={{ color: '#666' }}>
            {t('lottery.walletRequired')}
          </p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// LEADERBOARD SECTION (Separate component for cleaner code)
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
      const data = await lotteryApiService.getLeaderboard(100); // Get top 100
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
        <div 
          className="animate-spin rounded-full h-6 w-6 border-b-2"
          style={{ borderColor: '#FF644A' }}
        ></div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: '#1F1E2A' }}>
          {t('lottery.leaderboard.title')}
        </h3>
        <div className="text-sm" style={{ color: '#999' }}>
          {t('lottery.leaderboard.topParticipants', { count: Math.min(100, leaderboard.length) })}
        </div>
      </div>
      
      {/* Table Header */}
      <div 
        className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium rounded-t-lg"
        style={{ backgroundColor: '#FFF4E1', color: '#666' }}
      >
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
            className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg transition-colors hover:bg-gray-50"
            style={{ 
              backgroundColor: index < 3 ? '#FFF4E1' : 'white',
              border: '1px solid #E5E5E5'
            }}
          >
            {/* Rank */}
            <div className="col-span-1">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ 
                  backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#E5E5E5',
                  color: index < 3 ? 'white' : '#666'
                }}
              >
                {entry.rank}
              </div>
            </div>
            
            {/* User */}
            <div className="col-span-4">
              <div className="font-medium" style={{ color: '#1F1E2A' }}>
                {entry.user.username || `User #${entry.user.id.slice(0, 8)}`}
              </div>
              {entry.user.display_name && (
                <div className="text-xs" style={{ color: '#999' }}>
                  {entry.user.display_name}
                </div>
              )}
            </div>
            
            {/* Engagement */}
            <div className="col-span-3 text-right">
              <div className="font-medium" style={{ color: '#1F1E2A' }}>
                {entry.engagement_score.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: '#999' }}>{t('lottery.leaderboard.points')}</div>
            </div>
            
            {/* Tickets */}
            <div className="col-span-2 text-right">
              <div 
                className="inline-block px-2 py-1 rounded text-sm font-semibold"
                style={{ backgroundColor: '#FFE8E3', color: '#FF644A' }}
              >
                {entry.ticket_count}
              </div>
            </div>
            
            {/* Status */}
            <div className="col-span-2 text-right">
              {entry.rank <= 100 ? (
                <span 
                  className="inline-block px-2 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: '#BFE2D9', color: '#2D7A5F' }}
                >
                  {t('lottery.leaderboard.eligible')}
                </span>
              ) : (
                <span 
                  className="inline-block px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#F5F5F5', color: '#999' }}
                >
                  {t('lottery.leaderboard.notEligible')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {leaderboard.length > 20 && (
        <button
          className="w-full mt-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
          style={{ borderColor: '#E5E5E5', color: '#666' }}
        >
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
    return <div style={{ color: '#666' }}>{t('photoContest.noData')}</div>;
  }

  // Helper function to calculate time remaining
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

  // Calculate time remaining based on current phase
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
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1F1E2A' }}>
          {t('photoContest.title')}
        </h2>
        <p style={{ color: '#666' }}>
          {t('photoContest.description')}
        </p>
      </div>

      {/* Current Phase */}
      <div 
        className="rounded-lg p-4"
        style={{ 
          backgroundColor: data.round.status === 'voting' ? '#E3F2FD' : '#FFE8E3',
          border: `1px solid ${data.round.status === 'voting' ? '#BBDEFB' : '#FFD4CC'}`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'white' }}
            >
              {data.round.status === 'nominations' && <Camera size={20} style={{ color: '#FF644A' }} />}
              {data.round.status === 'voting' && <Users size={20} style={{ color: '#1976D2' }} />}
              {data.round.status === 'completed' && <Trophy size={20} style={{ color: '#FF644A' }} />}
            </div>
            <div>
              <div className="font-semibold" style={{ color: '#1F1E2A' }}>
                {getPhaseLabel(data.round.status)}
              </div>
              <div className="text-sm" style={{ color: '#666' }}>
                {t('photoContest.phase.stats', { 
                  nominations: data.round.total_nominations, 
                  finalists: data.round.total_finalists 
                })}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm" style={{ color: '#999' }}>{t('photoContest.timeLeft')}</div>
            <div className="font-semibold" style={{ color: '#1F1E2A' }}>
              {timeRemaining.days}d {timeRemaining.hours}h
            </div>
          </div>
        </div>
      </div>

      {/* Prizes */}
      <div 
        className="rounded-lg p-6"
        style={{ backgroundColor: '#FFE8E3', border: '1px solid #FFD4CC' }}
      >
        <div className="text-center">
          <div className="text-sm mb-2" style={{ color: '#E65441' }}>{t('photoContest.prizes.title')}</div>
          <div className="flex items-center justify-center gap-6">
            <div>
              <div className="text-2xl font-bold" style={{ color: '#FF644A' }}>{REWARDS.PHOTO_CONTEST.FIRST} BOCA</div>
              <div className="text-sm" style={{ color: '#999' }}>{t('photoContest.prizes.first')}</div>
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: '#FF644A' }}>{REWARDS.PHOTO_CONTEST.SECOND} BOCA</div>
              <div className="text-sm" style={{ color: '#999' }}>{t('photoContest.prizes.second')}</div>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: '#FF644A' }}>{REWARDS.PHOTO_CONTEST.THIRD} BOCA</div>
              <div className="text-sm" style={{ color: '#999' }}>{t('photoContest.prizes.third')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contest Timeline */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
            style={{ backgroundColor: data.round.status === 'nominations' ? '#FF644A' : '#FFE8E3' }}
          >
            <Camera size={20} style={{ color: data.round.status === 'nominations' ? 'white' : '#FF644A' }} />
          </div>
          <div className="font-medium text-sm" style={{ color: '#1F1E2A' }}>{t('photoContest.timeline.monWed')}</div>
          <div className="text-xs" style={{ color: '#999' }}>{t('photoContest.timeline.nominations')}</div>
        </div>
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
            style={{ backgroundColor: '#E3F2FD' }}
          >
            <TrendingUp size={20} style={{ color: '#1976D2' }} />
          </div>
          <div className="font-medium text-sm" style={{ color: '#1F1E2A' }}>{t('photoContest.timeline.thursday')}</div>
          <div className="text-xs" style={{ color: '#999' }}>{t('photoContest.timeline.finalists')}</div>
        </div>
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
            style={{ backgroundColor: data.round.status === 'voting' ? '#1976D2' : '#BFE2D9' }}
          >
            <Users size={20} style={{ color: data.round.status === 'voting' ? 'white' : '#2D7A5F' }} />
          </div>
          <div className="font-medium text-sm" style={{ color: '#1F1E2A' }}>{t('photoContest.timeline.thuSat')}</div>
          <div className="text-xs" style={{ color: '#999' }}>{t('photoContest.timeline.voting')}</div>
        </div>
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
            style={{ backgroundColor: '#FFE8E3' }}
          >
            <Trophy size={20} style={{ color: '#FF644A' }} />
          </div>
          <div className="font-medium text-sm" style={{ color: '#1F1E2A' }}>{t('photoContest.timeline.sunday')}</div>
          <div className="text-xs" style={{ color: '#999' }}>{t('photoContest.timeline.winners')}</div>
        </div>
      </div>

      {/* Current Finalists (if voting active) */}
      {data.round.status === 'voting' && <FinalistsGrid roundId={data.round.id} isWalletUser={isWalletUser} />}

      {/* Past Winners */}
      <PastWinnersSection />

      {/* How to Participate */}
      <div className="space-y-3">
        <h3 className="font-semibold" style={{ color: '#1F1E2A' }}>{t('photoContest.howToParticipate.title')}</h3>
        <div className="space-y-2 text-sm" style={{ color: '#666' }}>
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
        <div 
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: '#FFF4E1', border: '1px solid #FFD4CC' }}
        >
          <p style={{ color: '#666' }}>
            {t('photoContest.walletRequired')}
          </p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// FINALISTS GRID (Separate component)
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
      // Reload finalists to get updated vote counts
      await loadFinalists();
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('Failed to submit vote. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div 
          className="animate-spin rounded-full h-6 w-6 border-b-2"
          style={{ borderColor: '#FF644A' }}
        ></div>
      </div>
    );
  }

  if (!finalists || finalists.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="font-semibold mb-4" style={{ color: '#1F1E2A' }}>
        {t('photoContest.finalists.title')}
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {finalists.slice(0, 10).map((finalist) => (
          <div 
            key={finalist.id}
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid #E5E5E5' }}
          >
            {/* Photo */}
            <div 
              className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
              style={{
                backgroundImage: finalist.photo_url ? `url(${finalist.photo_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!finalist.photo_url && <Camera size={48} style={{ color: '#999' }} />}
            </div>
            
            {/* Info */}
            <div className="p-3">
              <div className="font-medium mb-1" style={{ color: '#1F1E2A' }}>
                {finalist.restaurant_name}
              </div>
              <div className="text-sm mb-2" style={{ color: '#999' }}>
                by @{finalist.username || 'anonymous'}
              </div>
              
              {/* Vote count and button */}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#666' }}>
                  {t('photoContest.finalists.votes', { count: finalist.vote_count })}
                </span>
                {isWalletUser ? (
                  userVote === finalist.nomination_id ? (
                    <span 
                      className="px-3 py-1 rounded text-sm font-medium"
                      style={{ backgroundColor: '#BFE2D9', color: '#2D7A5F' }}
                    >
                      {t('photoContest.finalists.voted')}
                    </span>
                  ) : userVote ? (
                    <span className="text-xs" style={{ color: '#999' }}>
                      {t('photoContest.finalists.alreadyVoted')}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleVote(finalist.nomination_id)}
                      className="px-3 py-1 rounded text-sm font-medium text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#FF644A' }}
                    >
                      {t('photoContest.finalists.vote')}
                    </button>
                  )
                ) : (
                  <span className="text-xs" style={{ color: '#999' }}>
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
          <button
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: '#FF644A' }}
          >
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
      const data = await photoContestApiService.getHistory(3, 0); // Get last 3 weeks
      
      // Extract winners from history
      const recentWinners = data.rounds
        .filter((round: any) => round.winners && round.winners.length > 0)
        .flatMap((round: any) => 
          round.winners
            .filter((w: any) => w.place === 1) // Only show first place winners
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
        <div 
          className="animate-spin rounded-full h-6 w-6 border-b-2"
          style={{ borderColor: '#FF644A' }}
        ></div>
      </div>
    );
  }

  if (!winners || winners.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="font-semibold mb-4" style={{ color: '#1F1E2A' }}>
        {t('photoContest.pastWinners.title')}
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {winners.map((winner, index) => (
          <div 
            key={index}
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid #E5E5E5' }}
          >
            {/* Photo with trophy overlay */}
            <div 
              className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
              style={{
                backgroundImage: winner.photo_url ? `url(${winner.photo_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!winner.photo_url && <Camera size={48} style={{ color: '#999' }} />}
              <div 
                className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FFD700' }}
              >
                <Trophy size={16} style={{ color: 'white' }} />
              </div>
            </div>
            
            {/* Info */}
            <div className="p-3">
              <div className="text-sm mb-1" style={{ color: '#999' }}>
                {winner.week}
              </div>
              <div className="font-medium mb-1" style={{ color: '#1F1E2A' }}>
                @{winner.username}
              </div>
              {winner.restaurant_name && (
                <div className="text-xs mb-1" style={{ color: '#666' }}>
                  {winner.restaurant_name}
                </div>
              )}
              <div 
                className="text-sm font-semibold"
                style={{ color: '#FF644A' }}
              >
                {winner.prize}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <button
          className="text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: '#FF644A' }}
        >
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
  data, 
  isWalletUser, 
  isAuthenticated 
}: { 
  data: ActiveBounties | null; 
  isWalletUser: boolean; 
  isAuthenticated: boolean;
}) {
  const t = useTranslations('rewards');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1F1E2A' }}>
          {t('bounties.title')}
        </h2>
        <p style={{ color: '#666' }}>
          {t('bounties.description')}
        </p>
      </div>

      {/* How Bounties Work */}
      <div 
        className="rounded-lg p-6"
        style={{ backgroundColor: '#E3F2FD', border: '1px solid #BBDEFB' }}
      >
        <h3 className="font-semibold mb-4" style={{ color: '#1F1E2A' }}>{t('bounties.howItWorks.title')}</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium mb-2" style={{ color: '#1976D2' }}>
              {t('bounties.howItWorks.step1.title')}
            </div>
            <p style={{ color: '#666' }}>
              {t('bounties.howItWorks.step1.description')}
            </p>
          </div>
          <div>
            <div className="font-medium mb-2" style={{ color: '#1976D2' }}>
              {t('bounties.howItWorks.step2.title')}
            </div>
            <p style={{ color: '#666' }}>
              {t('bounties.howItWorks.step2.description')}
            </p>
          </div>
          <div>
            <div className="font-medium mb-2" style={{ color: '#1976D2' }}>
              {t('bounties.howItWorks.step3.title')}
            </div>
            <p style={{ color: '#666' }}>
              {t('bounties.howItWorks.step3.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Active Bounties */}
      {data && data.bounties && data.bounties.length > 0 ? (
        <div>
          <h3 className="font-semibold mb-4" style={{ color: '#1F1E2A' }}>
            {t('bounties.active.title')}
          </h3>
          <div className="space-y-3">
            {data.bounties.map((bounty) => (
              <div 
                key={bounty.id}
                className="p-4 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                style={{ border: '1px solid #E5E5E5' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{bountyApiService.getCategoryEmoji(bounty.category)}</span>
                      <div className="font-medium" style={{ color: '#1F1E2A' }}>
                        {bounty.title}
                      </div>
                    </div>
                    <div className="text-sm mb-2" style={{ color: '#666' }}>
                      {bounty.description}
                    </div>
                    {bounty.location && (
                      <div className="text-xs" style={{ color: '#999' }}>
                        📍 {bounty.location.city}, {bounty.location.region}
                      </div>
                    )}
                  </div>
                  <div 
                    className="px-3 py-1 rounded text-sm font-semibold ml-4"
                    style={{ backgroundColor: '#FFE8E3', color: '#FF644A' }}
                  >
                    {bountyApiService.formatAmount(bounty.total_pledged)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: '#999' }}>
                  <span>{t('bounties.active.submissions', { count: bounty.submission_count })}</span>
                  <span>•</span>
                  <span>{t('bounties.active.posted', { time: bountyApiService.getTimeAgo(bounty.created_at) })}</span>
                  <span>•</span>
                  <span 
                    className="px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: bountyApiService.getStatusColor(bounty.status) + '20',
                      color: bountyApiService.getStatusColor(bounty.status)
                    }}
                  >
                    {bounty.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {data.pagination.has_more && (
            <button
              className="w-full mt-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#E5E5E5', color: '#666' }}
            >
              {t('bounties.active.viewAll', { count: data.pagination.total })}
            </button>
          )}
        </div>
      ) : (
        <div 
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: '#FFF4E1', border: '1px solid #FFD4CC' }}
        >
          <Target size={48} style={{ color: '#FF644A', margin: '0 auto 16px' }} />
          <div className="font-medium mb-2" style={{ color: '#1F1E2A' }}>
            {t('bounties.empty.title')}
          </div>
          <p className="text-sm" style={{ color: '#666' }}>
            {t('bounties.empty.description')}
          </p>
        </div>
      )}

      {!isWalletUser && isAuthenticated && (
        <div 
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: '#FFF4E1', border: '1px solid #FFD4CC' }}
        >
          <p style={{ color: '#666' }}>
            {t('bounties.walletRequired')}
          </p>
        </div>
      )}
    </div>
  );
}