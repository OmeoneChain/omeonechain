'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Repeat2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ReshareHeaderProps {
  resharer: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  comment?: string | null;
  createdAt: string;
}

const ReshareHeader: React.FC<ReshareHeaderProps> = ({ resharer, comment, createdAt }) => {
  const t = useTranslations('social');
  
  const displayName = resharer.display_name || resharer.username || t('reshare.someone');
  const avatarUrl = resharer.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

  // Calculate time ago
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('reshare.timeAgo.now');
    if (diffInSeconds < 3600) return t('reshare.timeAgo.minutes', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('reshare.timeAgo.hours', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 604800) return t('reshare.timeAgo.days', { count: Math.floor(diffInSeconds / 86400) });
    return t('reshare.timeAgo.weeks', { count: Math.floor(diffInSeconds / 604800) });
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-t-xl px-4 py-3 -mb-2 z-10 relative">
      {/* Reshare Attribution */}
      <div className="flex items-center gap-2 mb-2">
        {/* User Avatar (Small) */}
        <Link href={`/users/${resharer.id}`} className="flex-shrink-0">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 relative">
            <Image
              src={avatarUrl}
              alt={displayName}
              width={24}
              height={24}
              className="w-full h-full object-cover"
            />
          </div>
        </Link>

        {/* Reshare Icon */}
        <Repeat2 size={14} className="text-gray-500 flex-shrink-0" aria-hidden="true" />

        {/* Reshare Text */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
          <Link 
            href={`/users/${resharer.id}`}
            className="font-semibold hover:text-[#FF644A] transition-colors hover:underline"
          >
            {displayName}
          </Link>
          <span>{t('reshare.reshared')}</span>
          <span className="text-gray-400" aria-hidden="true">•</span>
          <time dateTime={createdAt} className="text-gray-500">{getTimeAgo(createdAt)}</time>
        </div>
      </div>

      {/* User's Commentary (Quote Reshare) */}
      {comment && comment.trim() && (
        <div className="mt-2 pl-8">
          <p className="text-gray-900 text-sm leading-relaxed">
            {comment}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReshareHeader;