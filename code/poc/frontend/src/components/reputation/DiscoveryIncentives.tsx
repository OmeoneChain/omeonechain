/**
 * DiscoveryIncentives.tsx - Discovery Incentive Campaign Component
 * 
 * Location: code/poc/frontend/src/components/reputation/DiscoveryIncentives.tsx
 * 
 * Displays active discovery campaigns and user eligibility
 */

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  GiftIcon, 
  MapPinIcon, 
  TagIcon, 
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface DiscoveryIncentivesProps {
  userId: string;
  region?: string;
  category?: string;
  className?: string;
}

interface DiscoveryScore {
  eligibilityScore: number;
  activeIncentives: ActiveIncentive[];
  potentialBonus: number;
  regionCoverage: number;
  categoryExpertise: number;
  recommendations: {
    eligible: number;
    needed: number;
  };
}

interface ActiveIncentive {
  campaignId: string;
  title: string;
  description: string;
  bonusMultiplier: number;
  targetRecommendations: number;
  currentProgress: number;
  region: string;
  category: string;
  expiresAt: string;
  minTrustScore: number;
  bonusPool: number;
  participantCount: number;
}

interface ClaimableBonus {
  campaignId: string;
  bonusAmount: number;
  recommendationIds: string[];
  eligibleAt: string;
}

export const DiscoveryIncentives: React.FC<DiscoveryIncentivesProps> = ({
  userId,
  region,
  category,
  className = ''
}) => {
  const t = useTranslations('common');
  const [discoveryScore, setDiscoveryScore] = useState<DiscoveryScore | null>(null);
  const [claimableBonuses, setClaimableBonuses] = useState<ClaimableBonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'eligible' | 'completed'>('active');

  useEffect(() => {
    const fetchDiscoveryData = async () => {
      try {
        setLoading(true);

        // Fetch discovery score and active incentives
        const params = new URLSearchParams();
        if (region) params.append('region', region);
        if (category) params.append('category', category);

        const discoveryResponse = await fetch(`/api/v1/users/${userId}/discovery-score?${params}`);
        if (discoveryResponse.ok) {
          const discoveryData = await discoveryResponse.json();
          setDiscoveryScore(discoveryData);

          // Find claimable bonuses
          const claimable = discoveryData.activeIncentives.filter(
            (incentive: ActiveIncentive) => incentive.currentProgress >= incentive.targetRecommendations
          ).map((incentive: ActiveIncentive) => ({
            campaignId: incentive.campaignId,
            bonusAmount: incentive.bonusMultiplier * incentive.currentProgress,
            recommendationIds: [], // Would be populated from backend
            eligibleAt: new Date().toISOString()
          }));

          setClaimableBonuses(claimable);
        }
      } catch (error) {
        console.error('Error fetching discovery data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscoveryData();
  }, [userId, region, category]);

  const handleClaimBonus = async (campaignId: string, recommendationIds: string[]) => {
    try {
      setClaimLoading(campaignId);

      const response = await fetch(`/api/v1/users/${userId}/claim-discovery-bonus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          campaignId,
          recommendationIds
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Remove claimed bonus from claimable list
        setClaimableBonuses(prev => prev.filter(bonus => bonus.campaignId !== campaignId));
        
        // Refresh discovery data
        const refreshResponse = await fetch(`/api/v1/users/${userId}/discovery-score`);
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setDiscoveryScore(refreshData);
        }

        console.log('Bonus claimed successfully:', result);
      }
    } catch (error) {
      console.error('Error claiming bonus:', error);
    } finally {
      setClaimLoading(null);
    }
  };

  const getProgressColor = (progress: number, target: number): string => {
    const percentage = (progress / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return t('reputation.discovery.time.expired');
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return t('reputation.discovery.time.daysHoursRemaining', { days, hours });
    return t('reputation.discovery.time.hoursRemaining', { hours });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium text-gray-900">{t('reputation.discovery.title')}</h3>
          </div>
          
          {discoveryScore && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-purple-600">{discoveryScore.potentialBonus}</div>
                <div className="text-gray-500">{t('reputation.discovery.tokAvailable')}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{discoveryScore.eligibilityScore.toFixed(1)}</div>
                <div className="text-gray-500">{t('reputation.discovery.eligibilityScore')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claimable Bonuses Alert */}
      {claimableBonuses.length > 0 && (
        <div className="p-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <GiftIcon className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">
              {t('reputation.discovery.bonusesReadyToClaim', { count: claimableBonuses.length })}
            </span>
          </div>
          <div className="space-y-2">
            {claimableBonuses.map((bonus) => (
              <div key={bonus.campaignId} className="flex items-center justify-between">
                <span className="text-sm text-green-700">
                  {t('reputation.discovery.campaignBonus', { 
                    id: bonus.campaignId.slice(-6), 
                    amount: bonus.bonusAmount 
                  })}
                </span>
                <button
                  onClick={() => handleClaimBonus(bonus.campaignId, bonus.recommendationIds)}
                  disabled={claimLoading === bonus.campaignId}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {claimLoading === bonus.campaignId 
                    ? t('reputation.discovery.claiming') 
                    : t('reputation.discovery.claim')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('reputation.discovery.tabs.activeCampaigns')}
          </button>
          <button
            onClick={() => setActiveTab('eligible')}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'eligible'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('reputation.discovery.tabs.eligibility')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'active' && discoveryScore && (
          <div className="space-y-4">
            {discoveryScore.activeIncentives.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('reputation.discovery.empty.noCampaigns')}</p>
                <p className="text-sm">{t('reputation.discovery.empty.checkBackSoon')}</p>
              </div>
            ) : (
              discoveryScore.activeIncentives.map((incentive) => (
                <div key={incentive.campaignId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{incentive.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{incentive.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-purple-600">
                        {incentive.bonusMultiplier}x
                      </div>
                      <div className="text-xs text-gray-500">{t('reputation.discovery.multiplier')}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-1">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{incentive.region}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TagIcon className="w-4 h-4" />
                      <span>{incentive.category}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{formatTimeRemaining(incentive.expiresAt)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t('reputation.discovery.progress')}</span>
                      <span className="font-medium">
                        {incentive.currentProgress} / {incentive.targetRecommendations}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getProgressColor(
                          incentive.currentProgress,
                          incentive.targetRecommendations
                        )}`}
                        style={{
                          width: `${Math.min(
                            (incentive.currentProgress / incentive.targetRecommendations) * 100,
                            100
                          )}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Campaign Stats */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <div>
                      {t('reputation.discovery.stats.pool', { amount: incentive.bonusPool.toLocaleString() })}
                    </div>
                    <div>
                      {t('reputation.discovery.stats.participants', { count: incentive.participantCount })}
                    </div>
                    <div>
                      {t('reputation.discovery.stats.minTrust', { score: (incentive.minTrustScore / 100).toFixed(2) })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'eligible' && discoveryScore && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">{t('reputation.discovery.eligibility.title')}</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {discoveryScore.eligibilityScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">{t('reputation.discovery.eligibility.overallScore')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {discoveryScore.potentialBonus}
                  </div>
                  <div className="text-sm text-gray-500">{t('reputation.discovery.tokAvailable')}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('reputation.discovery.eligibility.regionCoverage')}</span>
                  <span className="font-medium">{(discoveryScore.regionCoverage * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('reputation.discovery.eligibility.categoryExpertise')}</span>
                  <span className="font-medium">{(discoveryScore.categoryExpertise * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('reputation.discovery.eligibility.eligibleRecommendations')}</span>
                  <span className="font-medium">{discoveryScore.recommendations.eligible}</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <TrophyIcon className="w-4 h-4 mr-1 text-yellow-500" />
                {t('reputation.discovery.improve.title')}
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>{t('reputation.discovery.improve.createMore', { count: discoveryScore.recommendations.needed })}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>{t('reputation.discovery.improve.focusAreas')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>{t('reputation.discovery.improve.buildExpertise')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryIncentives;