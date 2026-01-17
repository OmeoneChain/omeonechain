// File: code/poc/frontend/components/onboarding/OnboardingProgressBanner.tsx
// Floating banner showing onboarding progress with link back to checklist
// Dismissible and persists state in localStorage

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Pages where the banner should appear
const BANNER_PAGES = ['/community', '/share', '/discover', '/feed', '/create'];

// localStorage keys
const BANNER_DISMISSED_KEY = 'bocaboca_onboarding_banner_dismissed';
const ONBOARDING_PROGRESS_KEY = 'bocaboca_onboarding_progress';

interface OnboardingProgress {
  followedCount: number;
  recommendationsCount: number;
  interactionsCount: number;
  uniqueAuthorsInteracted: number;
}

export default function OnboardingProgressBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('auth');
  const { user, isAuthenticated } = useAuth();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [progress, setProgress] = useState<OnboardingProgress>({
    followedCount: 0,
    recommendationsCount: 0,
    interactionsCount: 0,
    uniqueAuthorsInteracted: 0
  });

  // Check if we should show the banner
  useEffect(() => {
    // Don't show if not authenticated
    if (!isAuthenticated) {
      setIsVisible(false);
      return;
    }

    // Don't show if onboarding is completed (from user profile)
    if (user?.onboarding_completed) {
      setIsVisible(false);
      return;
    }

    // Check if banner was dismissed
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
      setIsVisible(false);
      return;
    }

    // Check if current page is in the list
    const shouldShowOnPage = BANNER_PAGES.some(page => 
      pathname?.includes(page)
    );

    // Don't show on onboarding page itself
    if (pathname?.includes('/onboarding')) {
      setIsVisible(false);
      return;
    }

    setIsDismissed(false);
    setIsVisible(shouldShowOnPage);
  }, [isAuthenticated, user, pathname]);

  // Load progress from localStorage (updated by other components)
  useEffect(() => {
    const savedProgress = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (savedProgress) {
      try {
        setProgress(JSON.parse(savedProgress));
      } catch (e) {
        console.error('Failed to parse onboarding progress:', e);
      }
    }

    // Listen for progress updates from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ONBOARDING_PROGRESS_KEY && e.newValue) {
        try {
          setProgress(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to parse onboarding progress:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Calculate completed tasks
  const tasksCompleted = [
    progress.followedCount >= 3,
    progress.recommendationsCount >= 5,
    progress.interactionsCount >= 10 && progress.uniqueAuthorsInteracted >= 3
  ].filter(Boolean).length;

  const totalTasks = 3;
  const allComplete = tasksCompleted === totalTasks;

  // If all tasks complete, mark onboarding as done and hide
  useEffect(() => {
    if (allComplete && isVisible) {
      // Could call API here to mark onboarding_completed = true
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
      setIsVisible(false);
    }
  }, [allComplete, isVisible]);

  // Dismiss handler
  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setIsDismissed(true);
    setIsVisible(false);
  };

  // Navigate to onboarding
  const handleViewAll = () => {
    router.push('/onboarding');
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Progress bar at top */}
          <div className="h-1 bg-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(tasksCompleted / totalTasks) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-coral-400 to-coral-600"
            />
          </div>

          <div className="p-3 flex items-center gap-3">
            {/* Icon */}
            <div className="w-10 h-10 bg-coral-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-coral-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {t('onboardingBanner.title') || 'Earn 50 BOCA'}
                </span>
                <span className="text-xs bg-coral-100 text-coral-700 px-2 py-0.5 rounded-full font-medium">
                  {tasksCompleted}/{totalTasks}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {tasksCompleted === 0 
                  ? (t('onboardingBanner.notStarted') || 'Complete tasks to earn tokens')
                  : (t('onboardingBanner.inProgress') || `${totalTasks - tasksCompleted} tasks remaining`)
                }
              </p>
            </div>

            {/* View All button */}
            <button
              onClick={handleViewAll}
              className="flex items-center gap-1 text-sm font-medium text-coral-600 hover:text-coral-700 transition-colors whitespace-nowrap"
            >
              {t('onboardingBanner.viewAll') || 'View'}
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper function to update progress from other components
// Call this when user follows someone, creates recommendation, or interacts
export function updateOnboardingProgress(updates: Partial<OnboardingProgress>) {
  const currentProgress = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
  let progress: OnboardingProgress = {
    followedCount: 0,
    recommendationsCount: 0,
    interactionsCount: 0,
    uniqueAuthorsInteracted: 0
  };

  if (currentProgress) {
    try {
      progress = JSON.parse(currentProgress);
    } catch (e) {
      console.error('Failed to parse onboarding progress:', e);
    }
  }

  const newProgress = { ...progress, ...updates };
  localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(newProgress));

  // Dispatch storage event for same-tab updates
  window.dispatchEvent(new StorageEvent('storage', {
    key: ONBOARDING_PROGRESS_KEY,
    newValue: JSON.stringify(newProgress)
  }));
}