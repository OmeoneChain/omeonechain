// File: code/poc/frontend/app/[locale]/onboarding/page.tsx
// Mobile-first onboarding page with phone authentication
// Implements BocaBoca Mobile Onboarding UI Design v1.2
// Updated: Added AuthErrorBoundary for crash protection (Jan 31, 2026)
// Updated: Reads ?step=phone query param to skip carousel when coming from web landing page (Feb 7, 2026)

'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PhoneAuthFlow from '@/components/auth/PhoneAuthFlow';
import AuthErrorBoundary from '@/components/auth/AuthErrorBoundary';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Check if we should skip the welcome carousel (e.g. coming from web landing page)
  const skipWelcome = searchParams.get('step') === 'phone';

  // If user is already authenticated and has completed onboarding, redirect to feed
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Check if onboarding is already completed
      // This prevents authenticated users from seeing onboarding again
      const onboardingCompleted = user.profileCompletion && user.profileCompletion >= 35;
      
      if (onboardingCompleted) {
        router.push('/feed');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#FF644A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#666666] dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // If already authenticated but onboarding not complete, continue from profile/checklist
  // If skipWelcome (from web landing page), go straight to phone entry
  // Otherwise show full flow starting from welcome (mobile app path)
  return (
    <AuthErrorBoundary>
      <PhoneAuthFlow
        showWelcome={!isAuthenticated && !skipWelcome}
        redirectTo="/feed"
        onComplete={() => router.push('/feed')}
      />
    </AuthErrorBoundary>
  );
}