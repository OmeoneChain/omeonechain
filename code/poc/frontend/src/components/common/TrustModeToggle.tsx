/**
 * TrustModeToggle.tsx - Trust Mode Interface Toggle
 * 
 * Location: code/poc/frontend/src/components/common/TrustModeToggle.tsx
 * 
 * Progressive disclosure toggle between simplified and advanced interfaces
 */

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  ShieldCheckIcon, 
  EyeIcon, 
  EyeSlashIcon,
  InformationCircleIcon,
  SparklesIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';

interface TrustModeToggleProps {
  initialMode?: 'trust' | 'global';
  onModeChange?: (mode: 'trust' | 'global') => void;
  showExplanation?: boolean;
  className?: string;
}

interface ModeStats {
  trustRecommendations: number;
  globalRecommendations: number;
  averageTrustScore: number;
  socialConnections: number;
}

export const TrustModeToggle: React.FC<TrustModeToggleProps> = ({
  initialMode = 'trust',
  onModeChange,
  showExplanation = true,
  className = ''
}) => {
  const t = useTranslations('common');
  const [currentMode, setCurrentMode] = useState<'trust' | 'global'>(initialMode);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState<ModeStats | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    // Check if this is user's first visit to understand Trust Mode
    const hasSeenTrustMode = localStorage.getItem('hasSeenTrustMode');
    if (!hasSeenTrustMode) {
      setIsFirstVisit(true);
      setShowDetails(true);
      localStorage.setItem('hasSeenTrustMode', 'true');
    }

    // Fetch mode statistics (you might want to add this API endpoint)
    const fetchStats = async () => {
      try {
        // This would be a new endpoint to get comparison stats
        const response = await fetch('/api/v1/stats/recommendation-modes');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching mode stats:', error);
      }
    };

    fetchStats();
  }, []);

  const handleModeChange = (newMode: 'trust' | 'global') => {
    setCurrentMode(newMode);
    onModeChange?.(newMode);
    
    // Store user preference
    localStorage.setItem('preferredRecommendationMode', newMode);
  };

  const getModeDescription = (mode: 'trust' | 'global') => {
    return t(`common.trustMode.descriptions.${mode}`);
  };

  const getModeIcon = (mode: 'trust' | 'global') => {
    switch (mode) {
      case 'trust':
        return <ShieldCheckIcon className="w-5 h-5" />;
      case 'global':
        return <ChartBarIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Main Toggle */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="w-5 h-5 text-purple-600" aria-hidden="true" />
            <span className="font-medium text-gray-900">{t('common.trustMode.title')}</span>
            {isFirstVisit && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {t('common.trustMode.new')}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('common.trustMode.aria.toggleDetails')}
            aria-expanded={showDetails}
          >
            <InformationCircleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg" role="tablist">
          <button
            onClick={() => handleModeChange('trust')}
            role="tab"
            aria-selected={currentMode === 'trust'}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              currentMode === 'trust'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {getModeIcon('trust')}
            <span>{t('common.trustMode.modes.trust')}</span>
          </button>
          <button
            onClick={() => handleModeChange('global')}
            role="tab"
            aria-selected={currentMode === 'global'}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              currentMode === 'global'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {getModeIcon('global')}
            <span>{t('common.trustMode.modes.global')}</span>
          </button>
        </div>

        {/* Mode Description */}
        <div className="mt-3">
          <p className="text-sm text-gray-600">
            {getModeDescription(currentMode)}
          </p>
        </div>

        {/* Current Mode Stats */}
        {stats && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900">
                  {currentMode === 'trust' ? stats.trustRecommendations : stats.globalRecommendations}
                </div>
                <div className="text-gray-500">{t('common.trustMode.stats.available')}</div>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {currentMode === 'trust' ? stats.averageTrustScore.toFixed(1) : t('common.trustMode.stats.notApplicable')}
                </div>
                <div className="text-gray-500">{t('common.trustMode.stats.avgTrust')}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Explanation (Expandable) */}
      {showDetails && showExplanation && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="space-y-4">
            {/* Trust Mode Explanation */}
            <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
              <div className="flex items-center space-x-2 mb-2">
                <ShieldCheckIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span className="font-medium text-blue-900">{t('common.trustMode.explanation.trust.title')}</span>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5" aria-hidden="true">•</span>
                  <span>{t('common.trustMode.explanation.trust.socialNetwork')}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5" aria-hidden="true">•</span>
                  <span>{t('common.trustMode.explanation.trust.verifiesAuthenticity')}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5" aria-hidden="true">•</span>
                  <span>{t('common.trustMode.explanation.trust.filtersFake')}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5" aria-hidden="true">•</span>
                  <span>{t('common.trustMode.explanation.trust.personalized')}</span>
                </li>
              </ul>
            </div>

            {/* Global Mode Explanation */}
            <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
              <div className="flex items-center space-x-2 mb-2">
                <ChartBarIcon className="w-4 h-4 text-yellow-600" aria-hidden="true" />
                <span className="font-medium text-yellow-900">{t('common.trustMode.explanation.global.title')}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-200 text-yellow-800">
                  {t('common.trustMode.explanation.global.warning')}
                </span>
              </div>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5" aria-hidden="true">•</span>
                  <span>{t('common.trustMode.explanation.global.allPublic')}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5" aria-hidden="true">•</span>
                  <span>{t('common.trustMode.explanation.global.unverified')}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5" aria-hidden="true">•</span>
                  <span>{t('common.trustMode.explanation.global.mayIncludeFake')}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5" aria-hidden="true">•</span>
                  <span>{t('common.trustMode.explanation.global.traditional')}</span>
                </li>
              </ul>
            </div>

            {/* Social Network Status */}
            {stats && (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <EyeIcon className="w-4 h-4 text-gray-600" aria-hidden="true" />
                  <span className="font-medium text-gray-900">{t('common.trustMode.socialNetwork.title')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">{stats.socialConnections}</div>
                    <div className="text-gray-500">{t('common.trustMode.socialNetwork.connections')}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{stats.trustRecommendations}</div>
                    <div className="text-gray-500">{t('common.trustMode.socialNetwork.trustRecommendations')}</div>
                  </div>
                </div>
                {stats.socialConnections < 5 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                    {t('common.trustMode.socialNetwork.followMoreTip')}
                  </div>
                )}
              </div>
            )}

            {/* Privacy Note */}
            <div className="text-xs text-gray-500 border-t border-gray-200 pt-3">
              <div className="flex items-start space-x-1">
                <EyeSlashIcon className="w-3 h-3 mt-0.5 text-gray-400" aria-hidden="true" />
                <span>{t('common.trustMode.privacy')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustModeToggle;