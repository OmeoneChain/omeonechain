// User Discovery & Search Page - Main page for finding and discovering users
// File: code/frontend/src/app/users/search/page.tsx

'use client';

import React, { useState } from 'react';
import { UserSearch, FollowSuggestions } from '@/components/social';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Users, TrendingUp, UserPlus, ArrowLeft } from 'lucide-react';

export default function UserSearchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'search' | 'suggestions' | 'trending'>('search');
  
  // Get initial search query from URL params
  const initialQuery = searchParams.get('q') || '';

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  const handleBack = () => {
    router.back();
  };

  const tabs = [
    {
      key: 'search' as const,
      label: 'Search',
      icon: Search,
      description: 'Find users by name or username'
    },
    {
      key: 'suggestions' as const,
      label: 'Suggestions',
      icon: UserPlus,
      description: 'Discover people you might want to follow'
    },
    {
      key: 'trending' as const,
      label: 'Trending',
      icon: TrendingUp,
      description: 'Popular users with recent activity'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Discover Users</h1>
              <p className="text-gray-600">Find people to follow and connect with</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                    ${activeTab === tab.key
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Tab description */}
        <div className="mb-6">
          <p className="text-gray-600">
            {tabs.find(tab => tab.key === activeTab)?.description}
          </p>
        </div>

        {/* Tab content */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-lg border p-6">
            <UserSearch 
              currentUserId={session?.user?.id || ''}
              initialFilters={{ query: initialQuery }}
              onUserClick={handleUserClick}
            />
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            {session?.user?.id ? (
              <FollowSuggestions 
                currentUserId={session.user.id}
                onUserClick={handleUserClick}
              />
            ) : (
              <div className="bg-white rounded-lg border p-8 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sign in to see suggestions
                </h3>
                <p className="text-gray-600 mb-4">
                  We'll suggest people based on your interests and connections
                </p>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="bg-white rounded-lg border p-6">
            <div className="text-center py-8">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Coming Soon
              </h3>
              <p className="text-gray-600">
                Trending users feature will be available soon
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions section for logged-in users */}
      {session?.user?.id && (
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push(`/users/${session.user.id}`)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-50"
              >
                <Users className="w-4 h-4" />
                <span>My Profile</span>
              </button>
              <button
                onClick={() => router.push(`/users/${session.user.id}/followers`)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-50"
              >
                <Users className="w-4 h-4" />
                <span>My Followers</span>
              </button>
              <button
                onClick={() => router.push(`/users/${session.user.id}/following`)}
                className="flex items-center gap-2 px-3 py-2 bg-white text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>People I Follow</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function generateMetadata() {
  return {
    title: 'Discover Users | OmeoneChain',
    description: 'Find and discover new users to follow on OmeoneChain. Search by name, get personalized suggestions, and see trending users.',
  };
}