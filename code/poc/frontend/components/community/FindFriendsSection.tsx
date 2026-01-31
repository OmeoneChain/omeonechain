// File: code/poc/frontend/components/community/FindFriendsSection.tsx
// Component for finding friends from device contacts
// Shows permission flow, syncs contacts, displays matches
// UPDATED: Hidden on iOS devices since Contact Picker API is not supported

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Smartphone, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  UserPlus,
  ChevronRight,
  X
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { 
  isNativeApp, 
  findFriendsFromContacts, 
  MatchedContact,
  checkContactPermission
} from '@/lib/services/contact-service';

interface FindFriendsSectionProps {
  onFollow: (userId: string) => Promise<void>;
  onUnfollow: (userId: string) => Promise<void>;
}

type SyncState = 'idle' | 'loading' | 'success' | 'error' | 'no-permission' | 'web-only';

// Detect if running on iOS (iPhone, iPad, iPod)
function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  
  // Check for iOS devices
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return true;
  }
  
  // Also check for iPad on iOS 13+ which reports as MacIntel but has touch
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true;
  }
  
  return false;
}

// Check if Contact Picker API is supported
function isContactPickerSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  return 'contacts' in navigator && 'ContactsManager' in window;
}

export default function FindFriendsSection({ onFollow, onUnfollow }: FindFriendsSectionProps) {
  const t = useTranslations('community');
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();

  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [matches, setMatches] = useState<MatchedContact[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  // Track if we should show this component at all
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  // Check if running in native app on mount
  const isNative = isNativeApp();

  // Check platform support on mount (client-side only)
  useEffect(() => {
    // On iOS, the Contact Picker API is not supported at all
    // Hide the entire component on iOS devices
    const isiOS = isIOSDevice();
    const hasContactPicker = isContactPickerSupported();
    
    // Hide on iOS regardless of other factors
    if (isiOS) {
      setIsSupported(false);
      return;
    }
    
    // On other platforms, show the component (it will handle web-only messaging itself)
    setIsSupported(true);
  }, []);

  const handleSyncContacts = useCallback(async () => {
    if (!isAuthenticated || !token) {
      router.push('/login');
      return;
    }

    if (!isNative) {
      setSyncState('web-only');
      return;
    }

    setSyncState('loading');
    setErrorMessage(null);

    try {
      const result = await findFriendsFromContacts(token);

      if (!result.success) {
        if (result.error?.includes('permission')) {
          setSyncState('no-permission');
        } else {
          setSyncState('error');
        }
        setErrorMessage(result.error || t('findFriends.errors.generic'));
        return;
      }

      setMatches(result.matches);
      setTotalScanned(result.totalContactsScanned);
      
      // Track which users are already being followed
      const alreadyFollowing = new Set(
        result.matches.filter(m => m.is_following).map(m => m.id)
      );
      setFollowingIds(alreadyFollowing);
      
      setSyncState('success');
      setIsExpanded(true);

    } catch (error: any) {
      console.error('Contact sync error:', error);
      setSyncState('error');
      setErrorMessage(error.message || t('findFriends.errors.generic'));
    }
  }, [isAuthenticated, token, isNative, router, t]);

  const handleFollowClick = useCallback(async (userId: string) => {
    if (processingIds.has(userId)) return;

    setProcessingIds(prev => new Set(prev).add(userId));

    try {
      const isCurrentlyFollowing = followingIds.has(userId);
      
      if (isCurrentlyFollowing) {
        await onUnfollow(userId);
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        await onFollow(userId);
        setFollowingIds(prev => new Set(prev).add(userId));
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [followingIds, processingIds, onFollow, onUnfollow]);

  const handleProfileClick = (userId: string) => {
    // FIXED: Changed from /profile/ to /users/ to match actual route
    router.push(`/users/${userId}`);
  };

  const handleDismiss = () => {
    setIsExpanded(false);
    setSyncState('idle');
    setMatches([]);
  };

  // Don't render anything while checking support
  if (isSupported === null) {
    return null;
  }

  // Don't render on iOS or unsupported platforms
  if (isSupported === false) {
    return null;
  }

  // Render the CTA card (initial state or collapsed)
  const renderCTACard = () => (
    <div 
      className="bg-gradient-to-r from-coral-50 to-orange-50 dark:from-[#3D2C2A] dark:to-[#352C3A] border border-coral-200 dark:border-[#4D3C4A] rounded-xl p-4 cursor-pointer hover:shadow-md transition-all"
      onClick={handleSyncContacts}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF644A] to-[#E65441] flex items-center justify-center flex-shrink-0">
          <Users className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#1F1E2A] dark:text-white flex items-center gap-2">
            {t('findFriends.title')}
            <Smartphone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {t('findFriends.description')}
          </p>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      </div>
    </div>
  );

  // Render loading state
  const renderLoading = () => (
    <div className="bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-xl p-6">
      <div className="flex flex-col items-center justify-center py-4">
        <Loader2 className="w-8 h-8 text-[#FF644A] animate-spin mb-3" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {t('findFriends.loading')}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          {t('findFriends.loadingHint')}
        </p>
      </div>
    </div>
  );

  // Render web-only message
  const renderWebOnly = () => (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-blue-900 dark:text-blue-100">
            {t('findFriends.webOnly.title')}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            {t('findFriends.webOnly.description')}
          </p>
        </div>
        <button 
          onClick={() => setSyncState('idle')}
          className="text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // Render permission denied state
  const renderNoPermission = () => (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-amber-900 dark:text-amber-100">
            {t('findFriends.noPermission.title')}
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            {t('findFriends.noPermission.description')}
          </p>
          <button
            onClick={() => setSyncState('idle')}
            className="mt-3 text-sm text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
          >
            {t('findFriends.noPermission.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-red-900 dark:text-red-100">
            {t('findFriends.error.title')}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {errorMessage || t('findFriends.errors.generic')}
          </p>
          <button
            onClick={handleSyncContacts}
            className="mt-3 text-sm text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
          >
            {t('findFriends.error.retry')}
          </button>
        </div>
      </div>
    </div>
  );

  // Render success state with matches
  const renderSuccess = () => (
    <div className="bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#3D3C4A]">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-[#1F1E2A] dark:text-white">
            {t('findFriends.results.title')}
          </h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Results summary */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-[#353444] text-sm text-gray-600 dark:text-gray-400">
        {matches.length > 0 ? (
          t('findFriends.results.found', { count: matches.length, total: totalScanned })
        ) : (
          t('findFriends.results.noMatches', { total: totalScanned })
        )}
      </div>

      {/* Matches list */}
      {matches.length > 0 ? (
        <div className="divide-y divide-gray-100 dark:divide-[#3D3C4A] max-h-80 overflow-y-auto">
          {matches.map((match) => {
            const isFollowing = followingIds.has(match.id);
            const isProcessing = processingIds.has(match.id);

            return (
              <div
                key={match.id}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-[#353444] transition-colors"
              >
                {/* Avatar */}
                <div 
                  className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#FF644A] to-[#E65441] flex items-center justify-center flex-shrink-0 cursor-pointer"
                  onClick={() => handleProfileClick(match.id)}
                >
                  {match.avatar_url ? (
                    <Image
                      src={match.avatar_url}
                      alt={match.display_name}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-semibold">
                      {(match.display_name || match.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleProfileClick(match.id)}
                >
                  <p className="font-medium text-[#1F1E2A] dark:text-white truncate text-sm">
                    {match.display_name || match.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{match.username}
                    {match.contact_name && (
                      <span className="text-gray-400 dark:text-gray-500">
                        {' · '}{t('findFriends.results.savedAs', { name: match.contact_name })}
                      </span>
                    )}
                  </p>
                </div>

                {/* Follow Button */}
                <button
                  onClick={() => handleFollowClick(match.id)}
                  disabled={isProcessing}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0 flex items-center gap-1 ${
                    isFollowing
                      ? 'bg-gray-100 dark:bg-[#353444] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#404050]'
                      : 'bg-[#FF644A] text-white hover:bg-[#E65441]'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isFollowing ? (
                    t('actions.following')
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3" />
                      {t('actions.follow')}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('findFriends.results.emptyState')}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            {t('findFriends.results.emptyStateHint')}
          </p>
        </div>
      )}

      {/* Footer - sync again option */}
      {matches.length > 0 && (
        <div className="p-3 border-t border-gray-100 dark:border-[#3D3C4A] bg-gray-50 dark:bg-[#353444]">
          <button
            onClick={handleSyncContacts}
            className="text-sm text-[#FF644A] hover:text-[#E65441] font-medium"
          >
            {t('findFriends.results.syncAgain')}
          </button>
        </div>
      )}
    </div>
  );

  // Main render
  return (
    <div className="mb-6">
      {syncState === 'idle' && renderCTACard()}
      {syncState === 'loading' && renderLoading()}
      {syncState === 'web-only' && renderWebOnly()}
      {syncState === 'no-permission' && renderNoPermission()}
      {syncState === 'error' && renderError()}
      {syncState === 'success' && renderSuccess()}
    </div>
  );
}