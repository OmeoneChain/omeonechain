// File: code/poc/frontend/components/auth/PhoneAuthFlow.tsx
// Main orchestrator for phone-first authentication flow
// Manages state machine: welcome → phone → sms → profile → checklist → feed
// Updated: Skips to checklist if user is already authenticated
// Updated: Passes auth context to ProfileSetup for avatar upload

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

// Import auth components
import PhoneEntry from './PhoneEntry';
import SMSVerification from './SMSVerification';
import ProfileSetup, { ProfileData } from './ProfileSetup';
import OnboardingChecklist from './OnboardingChecklist';
import AppleSignIn from './AppleSignIn';

// Import hooks
import { useAuth } from '@/hooks/useAuth';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jfxqjp-3001.app.github.dev';

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
  const { login, updateUser, user, isAuthenticated } = useAuth();
  
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [userName, setUserName] = useState('');

  // NEW: Check auth state on mount and update step accordingly
  useEffect(() => {
    if (isAuthenticated && user) {
      // User is already logged in, show checklist
      setUserName(user.display_name || user.username || 'User');
      setCurrentStep('checklist');
    }
  }, [isAuthenticated, user]);

  // Navigate to specific step
  const goToStep = useCallback((step: AuthStep) => {
    setError(null);
    setCurrentStep(step);
  }, []);

  // Request SMS code
  const handlePhoneSubmit = async (phoneNumber: string, countryCode: string) => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  // Verify SMS code
  const handleCodeVerify = async (code: string) => {
    setIsLoading(true);
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
      
      // Store auth data
      setPhoneState(prev => ({
        ...prev,
        isNewUser: data.isNewUser,
        userId: data.user.id,
        token: data.token
      }));
      
      // If new user, go to profile setup
      // If returning user, log them in and redirect
      if (data.isNewUser) {
        setUserName(data.user.displayName || 'User');
        goToStep('profile');
      } else {
        // Returning user - log in and redirect
        login(data.token, {
          id: data.user.id,
          phone: data.user.phone,
          username: data.user.username,
          display_name: data.user.displayName,
          auth_mode: 'phone' as const,
          tokens_earned: data.user.tokensEarned || 0,
          trust_score: data.user.trustScore || 0,
        });
        
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
      throw err; // Re-throw so SMSVerification can clear the code
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
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
      
      // Log the user in
      login(phoneState.token!, {
        id: phoneState.userId!,
        username: profileData.username,
        display_name: profileData.displayName,
        avatar_url: profileData.avatarUrl,
        auth_mode: 'phone' as const,
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
      setIsLoading(false);
    }
  };

  // Skip profile setup
  const handleProfileSkip = () => {
    // Log in with default profile
    login(phoneState.token!, {
      id: phoneState.userId!,
      auth_mode: 'phone' as const,
      tokens_earned: 0,
      trust_score: 0,
    });
    
    goToStep('checklist');
  };

  // NEW: Handle task click - navigate to relevant page
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

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {/* Welcome Screen */}
          {currentStep === 'welcome' && (
            <motion.div
              key="welcome"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <div className="text-center mb-8">
                {/* Logo */}
                <div className="mb-6">
                  <Image
                    src="/BocaBoca_Logo.png"
                    alt="BocaBoca"
                    width={80}
                    height={80}
                    className="mx-auto"
                    priority
                  />
                </div>
                
                <h1 className="text-3xl font-bold text-navy-900 mb-2">
                  BocaBoca
                </h1>
                <p className="text-lg text-coral-600 font-medium mb-2">
                  {t('welcome.tagline') || 'Recomendações de Quem Você Confia'}
                </p>
                <p className="text-gray-600">
                  {t('welcome.subtitle') || 'Descubra os melhores restaurantes através de pessoas que você conhece'}
                </p>
              </div>

              <div className="space-y-3">
                {/* Phone Sign In - Primary CTA */}
                <button
                  onClick={() => goToStep('phone')}
                  className="w-full py-4 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
                >
                  <span className="text-xl">📱</span>
                  {t('welcome.continueWithPhone') || 'Continuar com Telefone'}
                </button>

                {/* Apple Sign In */}
                <AppleSignIn
                  onSuccess={handleAppleSuccess}
                  onError={handleAppleError}
                  mode="signup"
                />

                {/* Login Link */}
                <div className="text-center pt-4">
                  <p className="text-gray-600">
                    {t('welcome.hasAccount') || 'Já tem conta?'}{' '}
                    <button
                      onClick={() => goToStep('phone')}
                      className="text-coral-600 hover:text-coral-700 font-semibold"
                    >
                      {t('welcome.login') || 'Entrar'}
                    </button>
                  </p>
                </div>
              </div>

              {/* Terms */}
              <p className="text-center text-xs text-gray-500 mt-8">
                {t('welcome.termsPrefix') || 'Ao continuar, você aceita nossos'}{' '}
                <a href="/terms" className="underline hover:text-gray-700">
                  {t('welcome.terms') || 'Termos de Uso'}
                </a>{' '}
                {t('welcome.and') || 'e'}{' '}
                <a href="/privacy" className="underline hover:text-gray-700">
                  {t('welcome.privacy') || 'Política de Privacidade'}
                </a>
              </p>
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
              className="w-full max-w-md"
            >
              <PhoneEntry
                onSubmit={handlePhoneSubmit}
                onBack={showWelcome ? () => goToStep('welcome') : undefined}
                isLoading={isLoading}
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
              className="w-full max-w-md"
            >
              <SMSVerification
                phoneNumber={phoneState.formattedPhone}
                countryCode={phoneState.countryCode}
                onVerify={handleCodeVerify}
                onResend={handleResendCode}
                onBack={() => goToStep('phone')}
                isLoading={isLoading}
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
              className="w-full max-w-md"
            >
              <ProfileSetup
                onComplete={handleProfileComplete}
                onSkip={handleProfileSkip}
                isLoading={isLoading}
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
              className="w-full max-w-md"
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