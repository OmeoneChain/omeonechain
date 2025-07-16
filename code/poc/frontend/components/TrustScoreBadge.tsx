"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Info, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustBreakdown {
  directFriends: number;
  friendsOfFriends: number;
  totalEndorsements: number;
  socialHops: '±1 hop' | '±2 hops' | 'Mixed';
}

interface TrustScoreProps {
  score: number; // 0-10 trust score
  breakdown: TrustBreakdown;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'compact' | 'detailed' | 'minimal';
  showProvenance?: boolean;
  animated?: boolean;
}

const getTrustColor = (score: number) => {
  if (score >= 8) return 'text-success-600 bg-success-50 border-success-200';
  if (score >= 6) return 'text-trust-600 bg-trust-50 border-trust-200';
  if (score >= 4) return 'text-warning-600 bg-warning-50 border-warning-200';
  return 'text-network-600 bg-network-50 border-network-200';
};

const getTrustLevel = (score: number) => {
  if (score >= 8) return 'Highly Trusted';
  if (score >= 6) return 'Trusted';
  if (score >= 4) return 'Some Trust';
  return 'Limited Data';
};

const TrustScoreBadge: React.FC<TrustScoreProps> = ({
  score,
  breakdown,
  className,
  size = 'md',
  variant = 'compact',
  showProvenance = false,
  animated = true
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const colorClasses = getTrustColor(score);
  const trustLevel = getTrustLevel(score);
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm', 
    lg: 'px-4 py-2 text-base'
  };

  const ScoreDisplay = () => (
    <motion.div 
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border font-medium transition-all duration-200',
        colorClasses,
        sizeClasses[size],
        'hover:shadow-trust cursor-pointer select-none',
        className
      )}
      whileHover={animated ? { scale: 1.02 } : {}}
      whileTap={animated ? { scale: 0.98 } : {}}
      onClick={() => variant !== 'minimal' && setShowDetails(!showDetails)}
    >
      {/* Trust Score */}
      <div className="flex items-center gap-1">
        <span className="font-bold">
          Trust {score.toFixed(1)}
        </span>
        <span className="opacity-75">/10</span>
      </div>

      {/* Social Context Indicator */}
      {variant !== 'minimal' && (
        <>
          <div className="h-3 w-px bg-current opacity-30" />
          <div className="flex items-center gap-1 text-xs opacity-80">
            <Users size={12} />
            <span>{breakdown.socialHops}</span>
          </div>
        </>
      )}

      {/* Expand Indicator */}
      {variant === 'detailed' && (
        <Info 
          size={14} 
          className={cn(
            "transition-transform duration-200",
            showDetails && "rotate-180"
          )} 
        />
      )}
    </motion.div>
  );

  const ProvenanceDetails = () => (
    <AnimatePresence>
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute top-full mt-2 left-0 z-50 w-72 p-4 bg-white rounded-xl border border-network-200 shadow-soft"
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-network-900">Trust Breakdown</h4>
              <span className="text-xs text-network-500 font-medium">{trustLevel}</span>
            </div>

            {/* Social Distribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-social-500"></div>
                  <span>Direct friends</span>
                </div>
                <span className="font-medium">{breakdown.directFriends}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-network-400"></div>
                  <span>Friends-of-friends</span>
                </div>
                <span className="font-medium">{breakdown.friendsOfFriends}</span>
              </div>
            </div>

            {/* Total Endorsements */}
            <div className="pt-2 border-t border-network-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-trust-500" />
                  <span className="font-medium">Total endorsements</span>
                </div>
                <span className="font-bold text-trust-600">{breakdown.totalEndorsements}</span>
              </div>
            </div>

            {/* Weight Explanation */}
            <div className="text-xs text-network-500 bg-network-50 rounded-lg p-2">
              <p>Direct friends count as 0.75x weight, friends-of-friends as 0.25x weight in Trust Score calculation.</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (variant === 'minimal') {
    return <ScoreDisplay />;
  }

  return (
    <div className="relative inline-block">
      <ScoreDisplay />
      
      {/* Provenance Details Popover */}
      {variant === 'detailed' && <ProvenanceDetails />}
      
      {/* Simple provenance text for compact variant */}
      {variant === 'compact' && showProvenance && (
        <div className="mt-1 text-xs text-network-500">
          {breakdown.totalEndorsements} saves • {breakdown.directFriends} direct friends • {breakdown.friendsOfFriends} network
        </div>
      )}
    </div>
  );
};

// Example usage component for testing
export const TrustScoreExample: React.FC = () => {
  const sampleBreakdown: TrustBreakdown = {
    directFriends: 11,
    friendsOfFriends: 12,
    totalEndorsements: 23,
    socialHops: '±1 hop'
  };

  return (
    <div className="p-8 space-y-6 bg-background-secondary min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-network-900 mb-4">Trust Score Badge Examples</h2>
          <p className="text-network-600 mb-6">
            Replacing traditional star ratings with social trust indicators
          </p>
        </div>

        {/* Size Variations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-network-800">Sizes</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <TrustScoreBadge score={8.3} breakdown={sampleBreakdown} size="sm" />
            <TrustScoreBadge score={8.3} breakdown={sampleBreakdown} size="md" />
            <TrustScoreBadge score={8.3} breakdown={sampleBreakdown} size="lg" />
          </div>
        </div>

        {/* Variant Styles */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-network-800">Variants</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <TrustScoreBadge score={8.3} breakdown={sampleBreakdown} variant="minimal" />
            <TrustScoreBadge score={8.3} breakdown={sampleBreakdown} variant="compact" />
            <TrustScoreBadge score={8.3} breakdown={sampleBreakdown} variant="detailed" />
          </div>
        </div>

        {/* Score Ranges */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-network-800">Trust Score Ranges</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TrustScoreBadge score={9.2} breakdown={sampleBreakdown} variant="compact" showProvenance />
            <TrustScoreBadge score={7.1} breakdown={sampleBreakdown} variant="compact" showProvenance />
            <TrustScoreBadge score={5.4} breakdown={sampleBreakdown} variant="compact" showProvenance />
            <TrustScoreBadge score={2.8} breakdown={sampleBreakdown} variant="compact" showProvenance />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustScoreBadge;