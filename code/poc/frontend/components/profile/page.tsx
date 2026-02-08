// File: pages/profile/page.tsx or wherever your Profile page is located
// Updated to handle incomplete profiles and show onboarding
// ✅ UPDATED: Dark mode support and BocaBoca brand colors

'use client';

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslations } from 'next-intl';
import { ProfileOnboarding } from '../../components/profile/ProfileOnboarding';
import { UserProfile } from './UserProfile'; // Your existing profile component
import { Loader2, User } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const t = useTranslations('profile');

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF644A] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1F1E2A] dark:text-white mb-2">
            {t('authRequired.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('authRequired.description')}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2.5 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors font-medium"
          >
            {t('authRequired.goHome')}
          </button>
        </div>
      </div>
    );
  }

  // User exists (even if incomplete)
  if (user) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <div className="max-w-4xl mx-auto pt-4 pb-32 px-4">

          {/* Show onboarding for incomplete profiles */}
          <ProfileOnboarding />

          {/* Show existing profile component or basic profile info */}
          {user.profileCompletion && user.profileCompletion >= 40 ? (
            <UserProfile user={user} />
          ) : (
            <div className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-6 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || 'user'}`}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-[#3D3C4A]"
                />
                <div>
                  <h2 className="text-xl font-semibold text-[#1F1E2A] dark:text-white">
                    {user.display_name || user.name || t('anonymousUser')}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    @{user.username || t('usernameNotSet')}
                  </p>
                  {user.walletAddress && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 font-mono">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-[#FFF4E1] dark:bg-[#353444] rounded-lg">
                  <div className="text-xl font-semibold text-[#1F1E2A] dark:text-white">
                    {user.reputation || user.reputation_score || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('stats.reputation')}</div>
                </div>
                <div className="p-3 bg-[#FFF4E1] dark:bg-[#353444] rounded-lg">
                  <div className="text-xl font-semibold text-[#1F1E2A] dark:text-white">
                    {user.tokensEarned || user.tokens_earned || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('stats.tokensEarned')}</div>
                </div>
                <div className="p-3 bg-[#FFF4E1] dark:bg-[#353444] rounded-lg">
                  <div className="text-xl font-semibold text-[#1F1E2A] dark:text-white">
                    {user.followers_count || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('stats.followers')}</div>
                </div>
                <div className="p-3 bg-[#FFF4E1] dark:bg-[#353444] rounded-lg">
                  <div className="text-xl font-semibold text-[#1F1E2A] dark:text-white">
                    {user.total_recommendations || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('stats.recommendations')}</div>
                </div>
              </div>

              {user.bio && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#3D3C4A]">
                  <h3 className="font-medium text-[#1F1E2A] dark:text-white mb-2">{t('about')}</h3>
                  <p className="text-gray-700 dark:text-gray-300">{user.bio}</p>
                </div>
              )}

              {(user.location_city || user.location_country) && (
                <div className="mt-4">
                  <h3 className="font-medium text-[#1F1E2A] dark:text-white mb-2">{t('location')}</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {[user.location_city, user.location_country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">{t('error.fallback')}</p>
      </div>
    </div>
  );
}