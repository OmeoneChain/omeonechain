// Following List Page - Dedicated page for viewing users that someone follows
// File: code/frontend/src/app/users/[id]/following/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FollowingList } from '@/components/social';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';

interface FollowingPageProps {
  params: {
    id: string;
  };
}

interface UserBasicInfo {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  following_count: number;
}

export default function FollowingPage({ params }: FollowingPageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = params.id;
  
  const [userInfo, setUserInfo] = useState<UserBasicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserInfo();
  }, [userId]);

  const loadUserInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/social/users/${userId}/stats`);
      
      if (response.ok) {
        const userData = await response.json();
        setUserInfo(userData);
      } else {
        setError('User not found');
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setError('Failed to load user information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserClick = (clickedUserId: string) => {
    router.push(`/users/${clickedUserId}`);
  };

  const handleBackToProfile = () => {
    router.push(`/users/${userId}`);
  };

  const isOwnProfile = session?.user?.id === userId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading following...</p>
        </div>
      </div>
    );
  }

  if (error || !userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">User not found</h3>
          <p className="text-gray-600 mb-4">{error || 'The user you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToProfile}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Profile</span>
            </button>

            {/* Optional: Add discover users button for own profile */}
            {isOwnProfile && (
              <button
                onClick={() => router.push('/users/search')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <UserPlus className="w-4 h-4" />
                <span>Discover Users</span>
              </button>
            )}
          </div>
          
          {/* User info header */}
          <div className="mt-4 flex items-center gap-4">
            <img
              src={userInfo.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userInfo.username}`}
              alt={userInfo.display_name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isOwnProfile ? 'People you follow' : `${userInfo.display_name} follows`}
              </h1>
              <p className="text-gray-600">
                {userInfo.following_count} {userInfo.following_count === 1 ? 'person' : 'people'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto p-6">
        <FollowingList 
          userId={userId}
          currentUserId={session?.user?.id || ''}
          onUserClick={handleUserClick}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: FollowingPageProps) {
  return {
    title: 'Following | OmeoneChain',
    description: 'View following list on OmeoneChain',
  };
}