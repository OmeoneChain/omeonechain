// File: code/poc/frontend/components/tips/TipButton.tsx
// Reusable tip button that can be placed anywhere a tippable item appears
// Uses Coins icon consistent with CleanHeader BOCA display

'use client';

import React, { useState } from 'react';
import { Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import TipModal, { TipRecipient, TipContext } from './TipModal';

// =============================================================================
// TYPES
// =============================================================================

interface TipButtonProps {
  recipient: TipRecipient;
  context: TipContext;
  compact?: boolean;      // Icon only (default) vs icon + label
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
  onTipSuccess?: (amount: number) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TipButton({
  recipient,
  context,
  compact = true,
  size = 'md',
  variant = 'ghost',
  className = '',
  onTipSuccess
}: TipButtonProps) {
  const t = useTranslations('tips');
  const { isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error(t('button.signInRequired'));
      return;
    }
    
    setShowModal(true);
  };

  const handleTipSuccess = (amount: number) => {
    toast.success(t('button.tipSent', { amount: amount.toFixed(2) }));
    onTipSuccess?.(amount);
  };

  // Size classes
  const sizeClasses = {
    sm: compact ? 'p-1.5' : 'px-2.5 py-1.5 text-xs',
    md: compact ? 'p-2' : 'px-3 py-2 text-sm',
    lg: compact ? 'p-2.5' : 'px-4 py-2.5 text-base'
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 20
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-[#FF644A] text-white hover:bg-[#E65441]',
    ghost: 'text-gray-500 dark:text-gray-400 hover:text-[#FF644A] hover:bg-[#FFE8E4] dark:hover:bg-[#FF644A]/20',
    outline: 'border border-gray-300 dark:border-[#3D3C4A] text-gray-600 dark:text-gray-400 hover:border-[#FF644A] hover:text-[#FF644A]'
  };

  return (
    <>
      <motion.button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        whileTap={{ scale: 0.95 }}
        title={t('button.tooltip')}
        aria-label={t('button.ariaLabel', { name: recipient.display_name || recipient.username })}
      >
        <Coins size={iconSizes[size]} />
        {!compact && (
          <span className="font-medium">{t('button.label')}</span>
        )}
      </motion.button>

      {showModal && (
        <TipModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          recipient={recipient}
          context={context}
          onSuccess={handleTipSuccess}
        />
      )}
    </>
  );
}

// =============================================================================
// CONVENIENCE WRAPPER COMPONENTS
// =============================================================================

/**
 * TipButton pre-configured for recommendations
 */
export function TipRecommendationButton({
  authorId,
  authorUsername,
  authorDisplayName,
  authorAvatarUrl,
  recommendationId,
  restaurantName,
  ...props
}: {
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  recommendationId: string;
  restaurantName?: string;
} & Omit<TipButtonProps, 'recipient' | 'context'>) {
  const t = useTranslations('tips');
  
  return (
    <TipButton
      recipient={{
        id: authorId,
        username: authorUsername,
        display_name: authorDisplayName,
        avatar_url: authorAvatarUrl
      }}
      context={{
        type: 'recommendation',
        id: recommendationId,
        label: restaurantName 
          ? t('context.forRecommending', { name: restaurantName })
          : t('context.forRecommendation')
      }}
      {...props}
    />
  );
}

/**
 * TipButton pre-configured for guides
 */
export function TipGuideButton({
  creatorId,
  creatorUsername,
  creatorDisplayName,
  creatorAvatarUrl,
  guideId,
  guideTitle,
  ...props
}: {
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorAvatarUrl: string | null;
  guideId: string;
  guideTitle?: string;
} & Omit<TipButtonProps, 'recipient' | 'context'>) {
  const t = useTranslations('tips');
  
  return (
    <TipButton
      recipient={{
        id: creatorId,
        username: creatorUsername,
        display_name: creatorDisplayName,
        avatar_url: creatorAvatarUrl
      }}
      context={{
        type: 'guide',
        id: guideId,
        label: guideTitle 
          ? t('context.forGuide', { title: guideTitle })
          : t('context.forGuideGeneric')
      }}
      {...props}
    />
  );
}

/**
 * TipButton pre-configured for comments
 */
export function TipCommentButton({
  authorId,
  authorUsername,
  authorDisplayName,
  authorAvatarUrl,
  commentId,
  ...props
}: {
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  commentId: string;
} & Omit<TipButtonProps, 'recipient' | 'context'>) {
  const t = useTranslations('tips');
  
  return (
    <TipButton
      recipient={{
        id: authorId,
        username: authorUsername,
        display_name: authorDisplayName,
        avatar_url: authorAvatarUrl
      }}
      context={{
        type: 'comment',
        id: commentId,
        label: t('context.forComment')
      }}
      {...props}
    />
  );
}

/**
 * TipButton pre-configured for user profiles (direct user support)
 */
export function TipUserButton({
  userId,
  username,
  displayName,
  avatarUrl,
  ...props
}: {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
} & Omit<TipButtonProps, 'recipient' | 'context'>) {
  const t = useTranslations('tips');
  
  return (
    <TipButton
      recipient={{
        id: userId,
        username: username,
        display_name: displayName,
        avatar_url: avatarUrl
      }}
      context={{
        type: 'user',
        id: userId,
        label: t('context.toSupport', { name: displayName || username })
      }}
      {...props}
    />
  );
}