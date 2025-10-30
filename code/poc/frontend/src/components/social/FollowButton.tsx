// Reusable Follow Button Component - FIXED API CALLS

import React, { useState } from 'react';
import { Users, UserPlus, UserMinus } from 'lucide-react';

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string;
  isFollowing: boolean;
  onFollowChange: (isFollowing: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  showIcon?: boolean;
  disabled?: boolean;
}

export function FollowButton({
  targetUserId,
  currentUserId,
  isFollowing,
  onFollowChange,
  size = 'medium',
  variant = 'primary',
  showIcon = true,
  disabled = false
}: FollowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Don't show follow button for own profile
  if (currentUserId === targetUserId) {
    return null;
  }

  const handleFollow = async () => {
    if (isLoading || disabled) return;

    try {
      setIsLoading(true);
      
      // FIXED: Both follow and unfollow use the same URL pattern with userId in path
      const method = isFollowing ? 'DELETE' : 'POST';
      const url = `/api/social/users/${targetUserId}/follow`;

      // FIXED: No body needed since userId is now in the URL path
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
        // FIXED: Removed body since userId is in URL path, not request body
      });

      if (response.ok) {
        const data = await response.json();
        // FIXED: Update state based on the action performed
        onFollowChange(!isFollowing);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to follow/unfollow user:', errorData.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Size styles
  const sizeClasses = {
    small: 'px-3 py-1.5 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base'
  };

  // Variant styles
  const getVariantClasses = () => {
    if (isFollowing) {
      // Following state - always secondary style regardless of variant
      return 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-300';
    }

    switch (variant) {
      case 'primary':
        return 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-500';
      case 'secondary':
        return 'bg-gray-500 text-white hover:bg-gray-600 border border-gray-500';
      case 'outline':
        return 'bg-white text-blue-500 hover:bg-blue-50 border border-blue-500';
      default:
        return 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-500';
    }
  };

  // Icon selection
  const getIcon = () => {
    if (!showIcon) return null;
    
    if (isLoading) {
      return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
    }
    
    if (isFollowing) {
      return <UserMinus className="w-4 h-4" />;
    }
    
    return <UserPlus className="w-4 h-4" />;
  };

  // Button text
  const getButtonText = () => {
    if (isLoading) {
      return isFollowing ? 'Unfollowing...' : 'Following...';
    }
    return isFollowing ? 'Following' : 'Follow';
  };

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading || disabled}
      className={`
        inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200
        ${sizeClasses[size]}
        ${getVariantClasses()}
        ${isLoading || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
    >
      {getIcon()}
      <span>{getButtonText()}</span>
    </button>
  );
}

// Hook for managing follow state - FIXED API CALL
export function useFollowState(targetUserId: string, currentUserId?: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (!currentUserId || currentUserId === targetUserId) {
      setIsLoading(false);
      return;
    }

    checkFollowStatus();
  }, [targetUserId, currentUserId]);

  const checkFollowStatus = async () => {
    try {
      setIsLoading(true);
      // FIXED: Use the correct endpoint path that matches backend
      const response = await fetch(`/api/social/users/${targetUserId}/follow-status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.data.is_following);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowChange = (newFollowState: boolean) => {
    setIsFollowing(newFollowState);
  };

  return {
    isFollowing,
    isLoading,
    handleFollowChange
  };
}

// Quick Follow Button for use in lists
interface QuickFollowButtonProps {
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  currentUserId: string;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export function QuickFollowButton({ user, currentUserId, onFollowChange }: QuickFollowButtonProps) {
  const { isFollowing, isLoading, handleFollowChange } = useFollowState(user.id, currentUserId);

  const onInternalFollowChange = (newState: boolean) => {
    handleFollowChange(newState);
    onFollowChange?.(user.id, newState);
  };

  return (
    <FollowButton
      targetUserId={user.id}
      currentUserId={currentUserId}
      isFollowing={isFollowing}
      onFollowChange={onInternalFollowChange}
      size="small"
      variant="outline"
      disabled={isLoading}
    />
  );
}