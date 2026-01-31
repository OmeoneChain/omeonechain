// File: code/poc/frontend/components/auth/PhoneAuthFlow.tsx
// Main orchestrator for phone-first authentication flow
// Manages state machine: welcome → phone → sms → profile → checklist → feed
// Updated: Skips to checklist if user is already authenticated
// Updated: Passes auth context to ProfileSetup for avatar upload
// Updated: Integrated WelcomeCarousel for better onboarding (Jan 26, 2026)
// Updated: Fixed async login calls and auth hydration check (Jan 28, 2026)
// Updated: Fixed AuthMode type mismatch and added defensive null checks (Jan 31, 2026)
// Updated: Added temporary debug alerts to identify crash location (Jan 31, 2026)

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import WelcomeCarousel from '@/components/onboarding/WelcomeCarousel';

// Import auth components
import PhoneEntry from './PhoneEntry';
import SMSVerification from './SMSVerification';
import ProfileSetup, { ProfileData } from './ProfileSetup';
import OnboardingChecklist from './OnboardingChecklist';
import AppleSignIn from './AppleSignIn';

// Import hooks
import { useAuth } from '@/hooks/useAuth';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app';

// Auth flow steps
type AuthStep = 'welcome' | 'phone' | 'sms' | 'profile' | 'checklist';

interface PhoneAuthState {
  phoneNumber: string;
  countryCode: string;
  formattedPhone: string;
  isNewUser: boolean;
  userId?: string;
  token?: string;
}

interface PhoneAuthFlowProps {
  onComplete?: () => void;
  redirectTo?: string;
  showWelcome?: boolean;
  // NEW: Allow starting directly at checklist for returning users
  startAtChecklist?: boolean;
}

// Task ID to route mapping
const TASK_ROUTES: Record<string, string> = {
  follow: '/community',      // Find people to follow
  recommend: '/create',       // Create a recommendation
  engage: '/discover'        // Find posts to interact with
};

export default function PhoneAuthFlow({
  onComplete,
  redirectTo = '/feed',
  showWelcome = true,
  startAtChecklist = false
}: PhoneAuthFlowProps) {
  const router = useRouter();
  const t = useTranslations('auth');
  const { login, updateUser, user, isAuthenticated, isHydrated, isLoading } = useAuth();
  
  // Determine initial step based on auth state
  const getInitialStep = (): AuthStep => {
    // If explicitly starting at checklist or user is already authenticated
    if (startAtChecklist || isAuthenticated) {
      return 'checklist';
    }
    return showWelcome ? 'welcome' : 'phone';
  };
  
  const [currentStep, setCurrentStep] = useState<AuthStep>(getInitialStep());
  const [phoneState, setPhoneState] = useState<PhoneAuthState>({
    phoneNumber: '',
    countryCode: '+55',
    formattedPhone: '',
    isNewUser: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [userName, setUserName] = useState('');

  // Check auth state on mount and update step accordingly
  useEffect(() => {
    if (isHydrated && isAuthenticated && user) {
      // User is already logged in, show checklist
      setUserName(user.display_name || user.username || 'User');
      setCurrentStep('checklist');
    }
  }, [isHydrated, isAuthenticated, user]);

  // Navigate to specific step
  const goToStep = useCallback((step: AuthStep) => {
    setError(null);
    setCurrentStep(step);
  }, []);

  // Request SMS code
  const handlePhoneSubmit = async (phoneNumber: string, countryCode: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/phone/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, countryCode })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code');
      }
      
      // Store phone info and navigate to SMS step
      setPhoneState(prev => ({
        ...prev,
        phoneNumber,
        countryCode,
        formattedPhone: data.phoneNumber // Masked version from API
      }));
      
      setResendCooldown(30);
      goToStep('sms');
      toast.success(t('phoneAuth.codeSent') || 'Código enviado!');
      
    } catch (err: any) {
      console.error('Phone submit error:', err);
      setError(err.message || 'Failed to send code');
      toast.error(err.message || 'Failed to send code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify SMS code
  const handleCodeVerify = async (code: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneState.phoneNumber,
          countryCode: phoneState.countryCode,
          code
        })
      });
      
      const data = await response.json();
      
      // Debug logging
      console.log('📱 Verify response:', JSON.stringify(data, null, 2));
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }
      
      // Defensive check: ensure we have minimum required data
      if (!data.token) {
        throw new Error('Server response missing authentication token');
      }
      
      // Store auth data with defensive access
      const userData = data.user || {};
      
      setPhoneState(prev => ({
        ...prev,
        isNewUser: data.isNewUser || false,
        userId: userData.id || '',
        token: data.token
      }));
      
      // TEMPORARY DEBUG WRAPPER - Shows any error on device
      try {
        // If new user, go to profile setup
        // If returning user, log them in and redirect
        if (data.isNewUser) {
          // DEBUG: Alert for new user path
          alert('DEBUG: New user detected, going to profile setup');
          
          setUserName(userData.displayName || userData.display_name || userData.username || 'User');
          goToStep('profile');
        } else {
          // Returning user - log in and redirect
          // Defensive checks for user data to prevent crashes
          const safeUserData = {
            id: userData.id || `phone_${phoneState.phoneNumber}`,
            phone: userData.phone || phoneState.phoneNumber,
            username: userData.username || '',
            display_name: userData.displayName || userData.display_name || userData.username || '',
            avatar_url: userData.avatarUrl || userData.avatar_url || '',
            // Use 'email' as AuthMode since 'phone' is not defined in AuthMode type
            auth_mode: 'email' as const,
            tokens_earned: userData.tokensEarned || userData.tokens_earned || 0,
            trust_score: userData.trustScore || userData.trust_score || 0,
          };
          
          console.log('📱 Logging in with user data:', JSON.stringify(safeUserData, null, 2));
          
          // DEBUG: Alert before login
          alert('DEBUG 1: About to call login()');
          
          // IMPORTANT: await the login to ensure auth state is saved before navigation
          await login(data.token, safeUserData, data.refreshToken || undefined);
          
          // DEBUG: Alert after login
          alert('DEBUG 2: Login succeeded, about to show toast');
          
          toast.success(t('phoneAuth.welcomeBack') || 'Bem-vindo de volta!');
          
          // DEBUG: Alert before navigation
          alert('DEBUG 3: Toast shown, about to navigate to ' + (onComplete ? 'onComplete callback' : redirectTo));
          
          if (onComplete) {
            onComplete();
          } else {
            router.push(redirectTo);
          }
          
          // DEBUG: Alert after navigation
          alert('DEBUG 4: Navigation initiated');
        }
      } catch (innerErr: any) {
        // TEMPORARY: Show the actual error on device
        alert('LOGIN ERROR: ' + (innerErr?.message || innerErr?.toString() || JSON.stringify(innerErr) || 'Unknown error'));
        console.error('Inner error:', innerErr);
        throw innerErr;
      }
      // END TEMPORARY DEBUG
      
    } catch (err: any) {
      console.error('Code verify error:', err);
      setError(err.message || 'Invalid code');
      throw err; // Re-throw so SMSVerification can clear the code
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend SMS code
  const handleResendCode = async () => {
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/phone/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneState.phoneNumber,
          countryCode: phoneState.countryCode
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend code');
      }
      
      toast.success(t('phoneAuth.codeResent') || 'Novo código enviado!');
      
    } catch (err: any) {
      console.error('Resend error:', err);
      toast.error(err.message || 'Failed to resend code');
      throw err;
    }
  };

  // Complete profile setup
  const handleProfileComplete = async (profileData: ProfileData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Avatar is now uploaded by ProfileSetup component
      // profileData.avatarUrl contains the IPFS URL (if upload succeeded)
      
      // Update user profile via API
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${phoneState.token}`
        },
        body: JSON.stringify({
          display_name: profileData.displayName,
          username: profileData.username,
          avatar_url: profileData.avatarUrl
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }
      
      // Update local user name for checklist
      setUserName(profileData.displayName);
      
      // Log the user in - IMPORTANT: await to ensure state is saved
      // Use 'email' as AuthMode since 'phone' is not defined in AuthMode type
      await login(phoneState.token!, {
        id: phoneState.userId || '',
        username: profileData.username || '',
        display_name: profileData.displayName || '',
        avatar_url: profileData.avatarUrl || '',
        auth_mode: 'email' as const,
        tokens_earned: 0,
        trust_score: 0,
      });
      
      // Go to onboarding checklist
      goToStep('checklist');
      
    } catch (err: any) {
      console.error('Profile setup error:', err);
      setError(err.message || 'Failed to save profile');
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skip profile setup
  const handleProfileSkip = async () => {
    // Log in with default profile - IMPORTANT: await to ensure state is saved
    // Use 'email' as AuthMode since 'phone' is not defined in AuthMode type
    await login(phoneState.token!, {
      id: phoneState.userId || '',
      auth_mode: 'email' as const,
      tokens_earned: 0,
      trust_score: 0,
    });
    
    goToStep('checklist');
  };

  // Handle task click - navigate to relevant page
  const handleTaskClick = (taskId: string) => {
    const route = TASK_ROUTES[taskId];
    if (route) {
      // Show a helpful toast based on task
      switch (taskId) {
        case 'follow':
          toast.success(t('onboardingChecklist.findPeopleToast') || 'Find people to follow!');
          break;
        case 'recommend':
          toast.success(t('onboardingChecklist.createRecommendationToast') || 'Share your favorite place!');
          break;
        case 'engage':
          toast.success(t('onboardingChecklist.discoverToast') || 'Discover great recommendations!');
          break;
      }
      router.push(route);
    }
  };

  // Start onboarding tasks - go to Discover (best for new users)
  const handleChecklistStart = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push('/discover'); // Go to discover to find content
    }
  };

  // Skip checklist - ALSO go to Discover (empty feed is useless)
  const handleChecklistSkip = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push('/discover'); // Changed from redirectTo (/feed) to /discover
    }
  };

  // Handle Apple Sign-in
  const handleAppleSuccess = async (appleUser: any) => {
    // TODO: Implement Apple sign-in backend flow
    toast.error('Apple Sign-in coming soon!');
  };

  const handleAppleError = (error: Error) => {
    toast.error(error.message || 'Apple Sign-in failed');
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  // Show loading while auth is hydrating
  // This prevents showing welcome screen to already-authenticated users
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Welcome Carousel - 3-slide intro explaining BocaBoca */}
          {currentStep === 'welcome' && (
            <motion.div
              key="welcome"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <WelcomeCarousel
                onGetStarted={() => goToStep('phone')}
                onLogin={() => goToStep('phone')}
              />
            </motion.div>
          )}

          {/* Phone Entry */}
          {currentStep === 'phone' && (
            <motion.div
              key="phone"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md p-4 sm:p-6"
            >
              <PhoneEntry
                onSubmit={handlePhoneSubmit}
                onBack={showWelcome ? () => goToStep('welcome') : undefined}
                isLoading={isSubmitting}
                error={error}
                defaultCountryCode={phoneState.countryCode}
              />
            </motion.div>
          )}

          {/* SMS Verification */}
          {currentStep === 'sms' && (
            <motion.div
              key="sms"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md p-4 sm:p-6"
            >
              <SMSVerification
                phoneNumber={phoneState.formattedPhone}
                countryCode={phoneState.countryCode}
                onVerify={handleCodeVerify}
                onResend={handleResendCode}
                onBack={() => goToStep('phone')}
                isLoading={isSubmitting}
                error={error}
                resendCooldown={resendCooldown}
              />
            </motion.div>
          )}

          {/* Profile Setup - Now with auth context for avatar upload */}
          {currentStep === 'profile' && (
            <motion.div
              key="profile"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md p-4 sm:p-6"
            >
              <ProfileSetup
                onComplete={handleProfileComplete}
                onSkip={handleProfileSkip}
                isLoading={isSubmitting}
                error={error}
                suggestedUsername={`user_${phoneState.phoneNumber.slice(-6)}`}
                authToken={phoneState.token}
                userId={phoneState.userId}
              />
            </motion.div>
          )}

          {/* Onboarding Checklist */}
          {currentStep === 'checklist' && (
            <motion.div
              key="checklist"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md p-4 sm:p-6"
            >
              <OnboardingChecklist
                userName={userName || user?.display_name || user?.username || 'User'}
                onStart={handleChecklistStart}
                onSkip={handleChecklistSkip}
                onTaskClick={handleTaskClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Safe area padding for mobile */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}