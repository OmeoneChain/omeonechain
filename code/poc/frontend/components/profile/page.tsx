// File: pages/profile/page.tsx or wherever your Profile page is located
// Updated to handle incomplete profiles and show onboarding

'use client';

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ProfileOnboarding } from '../../components/profile/ProfileOnboarding';
import { UserProfile } from './UserProfile'; // Your existing profile component
import { Loader2, User } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view your profile.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // User exists (even if incomplete)
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Profile
          </h1>

          {/* Show onboarding for incomplete profiles */}
          <ProfileOnboarding />

          {/* Show existing profile component or basic profile info */}
          {user.profileCompletion && user.profileCompletion >= 40 ? (
            <UserProfile user={user} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || 'user'}`}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-2 border-gray-200"
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user.display_name || user.name || 'Anonymous User'}
                  </h2>
                  <p className="text-gray-600">
                    @{user.username || 'username_not_set'}
                  </p>
                  {user.walletAddress && (
                    <p className="text-sm text-gray-500 font-mono">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-semibold text-gray-900">
                    {user.reputation || user.reputation_score || 0}
                  </div>
                  <div className="text-sm text-gray-600">Reputation</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-semibold text-gray-900">
                    {user.tokensEarned || user.tokens_earned || 0}
                  </div>
                  <div className="text-sm text-gray-600">Tokens Earned</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-semibold text-gray-900">
                    {user.followers_count || 0}
                  </div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-semibold text-gray-900">
                    {user.total_recommendations || 0}
                  </div>
                  <div className="text-sm text-gray-600">Recommendations</div>
                </div>
              </div>

              {user.bio && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">About</h3>
                  <p className="text-gray-700">{user.bio}</p>
                </div>
              )}

              {(user.location_city || user.location_country) && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Location</h3>
                  <p className="text-gray-700">
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Something went wrong. Please try refreshing the page.</p>
      </div>
    </div>
  );
}