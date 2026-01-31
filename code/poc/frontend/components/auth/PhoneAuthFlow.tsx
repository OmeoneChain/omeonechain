// File: code/poc/frontend/components/auth/PhoneAuthFlow.tsx
// Main orchestrator for phone-first authentication flow
// Manages state machine: welcome → phone → sms → profile → checklist → feed
// Updated: Skips to checklist if user is already authenticated
// Updated: Passes auth context to ProfileSetup for avatar upload
// Updated: Integrated WelcomeCarousel for better onboarding (Jan 26, 2026)
// Updated: Fixed async login calls and auth hydration check (Jan 28, 2026)
// Updated: Fixed AuthMode type mismatch and added defensive null checks (Jan 31, 2026)

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
  startAtChecklist?: boolean;
}

// Task ID to route mapping
const TASK_ROUTES: Record<string, string> = {
  follow: '/community',
  recommend: '/create',
  engage: '/discover'
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
      
      setPhoneState(prev => ({
        ...prev,
        phoneNumber,
        countryCode,
        formattedPhone: data.phoneNumber
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
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }
      
      if (!data.token) {
        throw new Error('Server response missing authentication token');
      }
      
      const userData = data.user || {};
      
      setPhoneState(prev => ({
        ...prev,
        isNewUser: data.isNewUser || false,
        userId: userData.id || '',
        token: data.token
      }));
      
      if (data.isNewUser) {
        setUserName(userData.displayName || userData.display_name || userData.username || 'User');
        goToStep('profile');
      } else {
        // Returning user - build safe user data object
        const safeUserData = {
          id: userData.id || `phone_${phoneState.phoneNumber}`,
          phone: userData.phone || phoneState.phoneNumber,
          username: userData.username || '',
          display_name: userData.displayName || userData.display_name || userData.username || '',
          avatar_url: userData.avatarUrl || userData.avatar_url || '',
          auth_mode: 'email' as const,
          tokens_earned: userData.tokensEarned || userData.tokens_earned || 0,
          trust_score: userData.trustScore || userData.trust_score || 0,
        };
        
        await login(data.token, safeUserData, data.refreshToken || undefined);
        
        toast.success(t('phoneAuth.welcomeBack') || 'Bem-vindo de volta!');
        
        if (onComplete) {
          onComplete();
        } else {
          router.push(redirectTo);
        }
      }
      
    } catch (err: any) {
      console.error('Code verify error:', err);
      setError(err.message || 'Invalid code');
      throw err;
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
      
      setUserName(profileData.displayName);
      
      await login(phoneState.token!, {
        id: phoneState.userId || '',
        username: profileData.username || '',
        display_name: profileData.displayName || '',
        avatar_url: profileData.avatarUrl || '',
        auth_mode: 'email' as const,
        tokens_earned: 0,
        trust_score: 0,
      });
      
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
    await login(phoneState.token!, {
      id: phoneState.userId || '',
      auth_mode: 'email' as const,
      tokens_earned: 0,
      trust_score: 0,
    });
    
    goToStep('checklist');
  };

  // Handle task click
  const handleTaskClick = (taskId: string) => {
    const route = TASK_ROUTES[taskId];
    if (route) {
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

  // Start onboarding tasks
  const handleChecklistStart = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push('/discover');
    }
  };

  // Skip checklist
  const handleChecklistSkip = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push('/discover');
    }
  };

  // Handle Apple Sign-in
  const handleAppleSuccess = async (appleUser: any) => {
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
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
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

      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}