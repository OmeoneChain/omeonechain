// File: code/poc/frontend/app/[locale]/onboarding/page.tsx
// Mobile-first onboarding page with phone authentication
// Implements BocaBoca Mobile Onboarding UI Design v1.2

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PhoneAuthFlow from '@/components/auth/PhoneAuthFlow';

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

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
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // If already authenticated but onboarding not complete, continue from profile/checklist
  // Otherwise show full flow starting from welcome
  return (
    <PhoneAuthFlow
      showWelcome={!isAuthenticated}
      redirectTo="/feed"
      onComplete={() => router.push('/feed')}
    />
  );
}
