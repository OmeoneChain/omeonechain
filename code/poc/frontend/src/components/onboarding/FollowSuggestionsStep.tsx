// File: code/poc/frontend/src/components/onboarding/FollowSuggestionsStep.tsx
// Step 4: Follow food enthusiasts to build social graph
// UPDATED: Internationalized with next-intl

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';

interface SuggestedUser {
  id: string;
  username: string;
  display_name: string;
  avatar?: string;
  bio?: string;
  followers_count: number;
  recommendations_count: number;
  specialties?: string[];
}

interface FollowSuggestionsStepProps {
  onComplete: (count: number) => void;
  onSkip: () => void;
}

// Fallback mock data in case API fails
const MOCK_USERS: SuggestedUser[] = [
  {
    id: '1',
    username: 'foodie_maria',
    display_name: 'Maria Silva',
    bio: 'Italian food enthusiast 🍝 | São Paulo explorer',
    followers_count: 1234,
    recommendations_count: 156,
    specialties: ['Italian', 'Fine Dining']
  },
  {
    id: '2',
    username: 'sushi_master',
    display_name: 'Ken Yamamoto',
    bio: 'Sushi expert | Traditional Japanese cuisine',
    followers_count: 2341,
    recommendations_count: 203,
    specialties: ['Japanese', 'Sushi']
  },
  {
    id: '3',
    username: 'vegan_vibes',
    display_name: 'Ana Costa',
    bio: 'Plant-based food lover 🌱 | Healthy eating advocate',
    followers_count: 892,
    recommendations_count: 87,
    specialties: ['Vegan', 'Healthy']
  }
];

const FollowSuggestionsStep: React.FC<FollowSuggestionsStepProps> = ({
  onComplete,
  onSkip
}) => {
  const t = useTranslations('onboarding.follow');
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [isFollowing, setIsFollowing] = useState<Set<string>>(new Set());
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const minFollowsRequired = 3;
  const canContinue = followedUsers.size >= minFollowsRequired;

  // Fetch real users from API
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        console.log('🔍 Fetching user suggestions...');
        
        const response = await fetch(
          'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev/api/users/suggestions',
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('omeone_auth_token')}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Fetched user suggestions:', data);
          
          if (data.users && data.users.length > 0) {
            const mappedUsers = data.users.map((user: any) => ({
              id: user.id,
              username: user.username || user.display_name?.toLowerCase().replace(/\s+/g, '_') || 'user',
              display_name: user.display_name || user.username || 'BocaBoca User',
              bio: user.bio || '',
              avatar: user.avatar_url || user.profile_picture,
              followers_count: user.followers_count || 0,
              recommendations_count: user.recommendations_count || 0,
              specialties: user.specialties || []
            }));
            
            setSuggestedUsers(mappedUsers);
          } else {
            console.warn('⚠️ No users returned, using fallback');
            setSuggestedUsers(MOCK_USERS);
          }
        } else {
          console.error('❌ Failed to fetch user suggestions:', response.status);
          setSuggestedUsers(MOCK_USERS);
        }
      } catch (error) {
        console.error('❌ Error fetching user suggestions:', error);
        setSuggestedUsers(MOCK_USERS);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchSuggestedUsers();
  }, []);

  const handleFollow = async (userId: string) => {
    if (isFollowing.has(userId) || followedUsers.has(userId)) {
      return;
    }

    setIsFollowing(prev => new Set(prev).add(userId));

    try {
      console.log('👥 Following user:', userId);
      
      const response = await fetch(
        'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev/api/social/follow',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('omeone_auth_token')}`
          },
          body: JSON.stringify({ following_id: userId })
        }
      );

      if (response.ok) {
        setFollowedUsers(prev => new Set(prev).add(userId));
        
        const user = suggestedUsers.find(u => u.id === userId);
        toast.success(t('toast.following', { name: user?.display_name || 'user' }));

        if (followedUsers.size + 1 === minFollowsRequired) {
          toast.success(t('toast.canContinue'), {
            icon: '🎉'
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Follow error:', errorData);
        throw new Error(errorData.error || 'Failed to follow user');
      }
    } catch (error: any) {
      console.error('Follow error:', error);
      toast.error(t('toast.followFailed', { error: error.message }));
    } finally {
      setIsFollowing(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleContinue = () => {
    if (!canContinue) {
      toast.error(t('toast.followMinimum', { count: minFollowsRequired }));
      return;
    }

    onComplete(followedUsers.size);
  };

  const UserCard = ({ user }: { user: SuggestedUser }) => {
    const isFollowed = followedUsers.has(user.id);
    const isLoading = isFollowing.has(user.id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 border-2 rounded-xl transition-all ${
          isFollowed
            ? 'border-green-500 bg-green-50'
            : 'border-gray-200 hover:border-orange-300'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.display_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-lg">
                {user.display_name[0]}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {user.display_name}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  @{user.username}
                </p>
              </div>

              <button
                onClick={() => handleFollow(user.id)}
                disabled={isFollowed || isLoading}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isFollowed
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowed ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('button.following')}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {t('button.follow')}
                  </>
                )}
              </button>
            </div>

            {user.bio && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {user.bio}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{t('stats.followers', { count: user.followers_count.toLocaleString() })}</span>
              <span>•</span>
              <span>{t('stats.recommendations', { count: user.recommendations_count })}</span>
            </div>

            {user.specialties && user.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {user.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto">
          <Users className="w-8 h-8 text-white" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full">
          <span className="text-sm font-medium text-purple-800">
            {t('progress', { current: followedUsers.size, required: minFollowsRequired })}
          </span>
          {canContinue && <Check className="w-4 h-4 text-green-600" />}
        </div>
      </motion.div>

      {/* Suggested Users */}
      {isLoadingUsers ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="ml-3 text-gray-600">{t('loading')}</span>
        </div>
      ) : suggestedUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">{t('noUsers')}</p>
          <button
            onClick={onSkip}
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            {t('skipLink')}
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {suggestedUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onSkip}
          className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
        >
          {t('skip')}
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!canContinue || isLoadingUsers}
          className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all"
        >
          {t('continue')}
        </button>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-purple-50 border border-purple-200 rounded-lg"
      >
        <h3 className="text-sm font-medium text-purple-900 mb-1">
          {t('info.title')}
        </h3>
        <p className="text-sm text-purple-800">
          {t('info.description')}
        </p>
      </motion.div>
    </div>
  );
};

export default FollowSuggestionsStep;