/**
 * TrustScoreBadge.tsx - Trust Score Display Component
 * 
 * Location: code/poc/frontend/src/components/reputation/TrustScoreBadge.tsx
 * 
 * Displays trust scores with social context and interactive details
 */

import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface TrustScoreProps {
  userId: string;
  targetId?: string; // For calculating trust between specific users
  entityId?: string; // For recommendations or businesses
  style?: 'compact' | 'detailed' | 'inline';
  showBreakdown?: boolean;
  className?: string;
}

interface TrustScoreData {
  trustScore: number;
  pathAnalysis: {
    directConnection: boolean;
    shortestPath: number;
    trustMultiplier: number;
  };
  sourceId: string;
  targetId: string;
}

interface ReputationData {
  reputationScore: number;
  verificationLevel: 'basic' | 'verified' | 'expert';
  socialMetrics: {
    networkDensity: number;
    avgTrustWeight: number;
    connectionQuality: string;
  };
  followers: number;
  following: number;
}

export const TrustScoreBadge: React.FC<TrustScoreProps> = ({
  userId,
  targetId,
  entityId,
  style = 'compact',
  showBreakdown = false,
  className = ''
}) => {
  const [trustData, setTrustData] = useState<TrustScoreData | null>(null);
  const [reputationData, setReputationData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrustData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch trust score if we have both users
        if (userId && targetId) {
          const trustResponse = await fetch(`/api/v1/users/${userId}/trust/${targetId}`);
          if (trustResponse.ok) {
            const trustResult = await trustResponse.json();
            setTrustData(trustResult);
          }
        }

        // Fetch reputation data for the target user
        const reputationTarget = targetId || userId;
        const reputationResponse = await fetch(`/api/v1/users/${reputationTarget}/reputation`);
        if (reputationResponse.ok) {
          const reputationResult = await reputationResponse.json();
          setReputationData(reputationResult);
        }
      } catch (err) {
        setError('Failed to load trust data');
        console.error('Trust data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrustData();
  }, [userId, targetId]);

  const getTrustScoreColor = (score: number): string => {
    if (score >= 0.75) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.5) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 0.25) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getVerificationIcon = (level: string) => {
    switch (level) {
      case 'expert':
        return <CheckCircleIcon className="w-4 h-4 text-purple-600" />;
      case 'verified':
        return <CheckCircleIcon className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const formatTrustScore = (score: number): string => {
    return (score * 10).toFixed(1);
  };

  const getTrustLabel = (score: number): string => {
    if (score >= 0.75) return 'High Trust';
    if (score >= 0.5) return 'Medium Trust';
    if (score >= 0.25) return 'Low Trust';
    return 'No Trust';
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  const displayScore = trustData?.trustScore ?? (reputationData?.reputationScore ? reputationData.reputationScore / 1000 : 0);
  const scoreColorClass = getTrustScoreColor(displayScore);

  if (style === 'inline') {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${scoreColorClass} ${className}`}>
        Trust {formatTrustScore(displayScore)}
        {reputationData && getVerificationIcon(reputationData.verificationLevel)}
      </span>
    );
  }

  if (style === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className={`px-3 py-1 text-sm font-medium rounded-lg border ${scoreColorClass}`}>
          Trust {formatTrustScore(displayScore)}
        </div>
        {reputationData && getVerificationIcon(reputationData.verificationLevel)}
        {trustData?.pathAnalysis?.directConnection && (
          <UserGroupIcon className="w-4 h-4 text-green-600" title="Direct Connection" />
        )}
      </div>
    );
  }

  // Detailed style with expandable breakdown
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`px-4 py-2 rounded-lg border font-semibold ${scoreColorClass}`}>
              Trust {formatTrustScore(displayScore)} / 10
            </div>
            {reputationData && (
              <div className="flex items-center space-x-1">
                {getVerificationIcon(reputationData.verificationLevel)}
                <span className="text-sm text-gray-600 capitalize">
                  {reputationData.verificationLevel}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {trustData?.pathAnalysis?.directConnection && (
              <UserGroupIcon className="w-5 h-5 text-green-600" title="Direct Connection" />
            )}
            {showBreakdown && (
              expanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />
            )}
          </div>
        </div>
        
        <div className="mt-2">
          <span className="text-sm text-gray-600">
            {getTrustLabel(displayScore)}
            {trustData && ` (±${trustData.pathAnalysis.shortestPath} hop${trustData.pathAnalysis.shortestPath !== 1 ? 's' : ''})`}
          </span>
        </div>
      </div>

      {expanded && showBreakdown && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {trustData && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Trust Path Analysis</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Connection Type:</span>
                  <span className="ml-2 font-medium">
                    {trustData.pathAnalysis.directConnection ? 'Direct' : 'Friend-of-Friend'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Trust Multiplier:</span>
                  <span className="ml-2 font-medium">
                    {(trustData.pathAnalysis.trustMultiplier * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {reputationData && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Social Metrics</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Followers:</span>
                  <span className="ml-2 font-medium">{reputationData.followers.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Following:</span>
                  <span className="ml-2 font-medium">{reputationData.following.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Network Quality:</span>
                  <span className="ml-2 font-medium capitalize">{reputationData.socialMetrics.connectionQuality}</span>
                </div>
                <div>
                  <span className="text-gray-500">Avg Trust Weight:</span>
                  <span className="ml-2 font-medium">
                    {(reputationData.socialMetrics.avgTrustWeight * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrustScoreBadge;