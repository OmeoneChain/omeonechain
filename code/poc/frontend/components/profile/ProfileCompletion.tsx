// FILE: components/profile/ProfileCompletion.tsx
// FIXED: Profile completion progress widget with backend data integration
// =============================================================================

import React from 'react';
import { CheckCircle2, Circle, User, MapPin, FileText, Camera, Shield } from 'lucide-react';

interface ProfileCompletionProps {
  user: any; // Using your existing user type
  completionScore?: number;
  onEditProfile?: () => void;
  showDetails?: boolean;
}

interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
  points: number;
  icon: React.ElementType;
  description: string;
}

export function ProfileCompletion({ 
  user, 
  completionScore, 
  onEditProfile, 
  showDetails = false 
}: ProfileCompletionProps) {
  // FIXED: Calculate completion based on actual backend data
  const calculateActualCompletion = (userData: any): number => {
    let score = 0;
    
    // Basic information (40 points total)
    if (userData?.username && userData.username !== userData?.id) score += 10;
    if (userData?.display_name && userData.display_name !== userData?.username && userData.display_name.length > 3) score += 10;
    if (userData?.bio && userData.bio.length > 10) score += 10;
    if (userData?.avatar_url && !userData.avatar_url.includes('dicebear')) score += 10;
    
    // Location information (20 points total)
    if (userData?.location_city) score += 10;
    if (userData?.location_country && userData.location_country !== 'BR') score += 10; // BR is default
    
    // Social activity (30 points total)
    if ((userData?.total_recommendations || userData?.reputation_score || userData?.reputation || 0) > 0) score += 15;
    if ((userData?.following_count || 0) > 0) score += 5;
    if ((userData?.followers_count || 0) > 0) score += 10;
    
    // Verification (10 points total)
    if (userData?.authMode === 'wallet' || userData?.auth_mode === 'wallet' || userData?.walletAddress) score += 10;
    
    return Math.min(score, 100);
  };

  // Use provided completionScore or calculate from user data
  const actualCompletion = completionScore || calculateActualCompletion(user);

  // FIXED: Completion items based on actual backend fields
  const completionItems: CompletionItem[] = [
    {
      id: 'username',
      label: 'Username',
      completed: !!user?.username && user.username !== user?.id && user.username.length > 3,
      points: 10,
      icon: User,
      description: 'Choose a unique username'
    },
    {
      id: 'display_name',
      label: 'Display Name',
      completed: !!user?.display_name && user.display_name !== user?.username && user.display_name.length > 3,
      points: 10,
      icon: User,
      description: 'Add a friendly display name'
    },
    {
      id: 'bio',
      label: 'Bio',
      completed: !!user?.bio && user.bio.length > 10,
      points: 10,
      icon: FileText,
      description: 'Tell others about yourself'
    },
    {
      id: 'avatar',
      label: 'Profile Photo',
      completed: !!user?.avatar_url && !user.avatar_url.includes('dicebear'),
      points: 10,
      icon: Camera,
      description: 'Upload a profile photo'
    },
    {
      id: 'location_city',
      label: 'City',
      completed: !!user?.location_city && user.location_city.length > 0,
      points: 10,
      icon: MapPin,
      description: 'Add your city'
    },
    {
      id: 'location_country',
      label: 'Country',
      completed: !!user?.location_country && user.location_country !== 'BR' && user.location_country.length > 0,
      points: 10,
      icon: MapPin,
      description: 'Add your country'
    },
    {
      id: 'social_activity',
      label: 'First Recommendation',
      completed: (user?.total_recommendations || user?.reputation_score || user?.reputation || 0) > 0,
      points: 15,
      icon: FileText,
      description: 'Create your first recommendation'
    },
    {
      id: 'social_following',
      label: 'Follow Someone',
      completed: (user?.following_count || 0) > 0,
      points: 5,
      icon: User,
      description: 'Follow other food experts'
    },
    {
      id: 'social_followers',
      label: 'Gain Followers',
      completed: (user?.followers_count || 0) > 0,
      points: 10,
      icon: User,
      description: 'Build your network'
    },
    {
      id: 'verification',
      label: 'Verify Account',
      completed: user?.authMode === 'wallet' || user?.auth_mode === 'wallet' || !!user?.walletAddress,
      points: 10,
      icon: Shield,
      description: 'Connect your wallet for verification'
    }
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const totalItems = completionItems.length;

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressText = (score: number) => {
    if (score >= 80) return 'Excellent profile! 🌟';
    if (score >= 60) return 'Great progress! 👍';
    if (score >= 40) return 'Good start! 📈';
    return 'Let\'s complete your profile! 🚀';
  };

  const getMissingItems = () => {
    return completionItems.filter(item => !item.completed).slice(0, 3);
  };

  return (
    <div className="card">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Profile Completion</h3>
          <p className="text-sm text-gray-600">{getProgressText(actualCompletion)}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{actualCompletion}%</div>
          <div className="text-sm text-gray-500">{completedCount} of {totalItems}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(actualCompletion)}`}
            style={{ width: `${actualCompletion}%` }}
          />
        </div>
      </div>

      {/* Quick Actions for Missing Items */}
      {actualCompletion < 100 && !showDetails && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick wins:</h4>
          <div className="space-y-2">
            {getMissingItems().map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-gray-50 text-sm"
                >
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{item.description}</span>
                  <span className="ml-auto text-xs text-gray-500">+{item.points} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Completion Items */}
      {showDetails && (
        <div className="space-y-3 mb-6">
          {completionItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  item.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex-shrink-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <Icon className={`w-4 h-4 ${item.completed ? 'text-green-600' : 'text-gray-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${item.completed ? 'text-green-900' : 'text-gray-900'}`}>
                      {item.label}
                    </span>
                    <span className={`text-sm ${item.completed ? 'text-green-600' : 'text-gray-500'}`}>
                      {item.points} pts
                    </span>
                  </div>
                  <p className={`text-sm ${item.completed ? 'text-green-700' : 'text-gray-600'}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Button */}
      {actualCompletion < 100 && onEditProfile && (
        <button
          onClick={onEditProfile}
          className="w-full btn-primary"
        >
          {actualCompletion < 50 ? 'Complete Profile' : 'Finish Profile'}
        </button>
      )}

      {/* Completion Badge */}
      {actualCompletion >= 100 && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Profile Complete!
          </div>
        </div>
      )}

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Debug:</strong> Completion: {actualCompletion}% 
          {user?.profileCompletion && user.profileCompletion !== actualCompletion && 
            ` (Backend: ${user.profileCompletion}%)`
          }
          <br />
          <strong>User fields:</strong> {Object.keys(user || {}).join(', ')}
        </div>
      )}
    </div>
  );
}

// Optional: Hook for profile completion logic
export function useProfileCompletion(user: any) {
  const calculateCompletion = React.useCallback((userData: any): number => {
    let score = 0;
    
    // Basic information (40 points total)
    if (userData?.username && userData.username !== userData?.id) score += 10;
    if (userData?.display_name && userData.display_name !== userData?.username && userData.display_name.length > 3) score += 10;
    if (userData?.bio && userData.bio.length > 10) score += 10;
    if (userData?.avatar_url && !userData.avatar_url.includes('dicebear')) score += 10;
    
    // Location information (20 points total)
    if (userData?.location_city) score += 10;
    if (userData?.location_country && userData.location_country !== 'BR') score += 10;
    
    // Social activity (30 points total)
    if ((userData?.total_recommendations || userData?.reputation_score || userData?.reputation || 0) > 0) score += 15;
    if ((userData?.following_count || 0) > 0) score += 5;
    if ((userData?.followers_count || 0) > 0) score += 10;
    
    // Verification (10 points total)
    if (userData?.authMode === 'wallet' || userData?.auth_mode === 'wallet' || userData?.walletAddress) score += 10;
    
    return Math.min(score, 100);
  }, []);

  const completion = React.useMemo(() => {
    return calculateCompletion(user);
  }, [user, calculateCompletion]);

  const getMissingFields = React.useCallback((userData: any) => {
    const missing = [];
    
    if (!userData?.username || userData.username === userData?.id) {
      missing.push({ field: 'username', label: 'Username', points: 10 });
    }
    if (!userData?.display_name || userData.display_name === userData?.username) {
      missing.push({ field: 'display_name', label: 'Display Name', points: 10 });
    }
    if (!userData?.bio || userData.bio.length <= 10) {
      missing.push({ field: 'bio', label: 'Bio', points: 10 });
    }
    if (!userData?.avatar_url || userData.avatar_url.includes('dicebear')) {
      missing.push({ field: 'avatar_url', label: 'Profile Photo', points: 10 });
    }
    if (!userData?.location_city) {
      missing.push({ field: 'location_city', label: 'City', points: 10 });
    }
    if (!userData?.location_country || userData.location_country === 'BR') {
      missing.push({ field: 'location_country', label: 'Country', points: 10 });
    }
    
    return missing;
  }, []);

  return {
    completion,
    getMissingFields: () => getMissingFields(user),
    isComplete: completion >= 100,
    needsImprovement: completion < 60
  };
}