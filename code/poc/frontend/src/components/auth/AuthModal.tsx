// File: code/poc/frontend/src/components/auth/AuthModal.tsx
// UPDATED: Phone-first authentication for web (January 2026)
// Flow: Phone verification (required) → Wallet connection (optional upgrade)
//
// FIXED (Jan 25, 2026): Use useAuth login() function for proper storage
// This ensures tokens are saved with correct keys (omeone_*) and state is updated

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Phone, Wallet, CheckCircle, ArrowRight, X } from 'lucide-react';
import PhoneAuthStep from './PhoneAuthStep';
import WalletUpgradeStep from './WalletUpgradeStep';
import { useAuth } from '../../../hooks/useAuth';

type AuthStep = 'phone' | 'success' | 'wallet-upgrade';

interface AuthModalProps {
  onSuccess?: (token: string, user: any) => void;
  onClose?: () => void;
  initialStep?: AuthStep;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  onSuccess, 
  onClose,
  initialStep = 'phone'
}) => {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login } = useAuth();
  
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Handle successful phone verification
  const handlePhoneSuccess = async (token: string, userData: any) => {
    console.log('✅ Phone auth successful:', userData);
    setAuthToken(token);
    setUser(userData);
    
    // Use the centralized login function from useAuth
    // This saves to the correct storage keys (omeone_*) and updates auth state
    try {
      await login(token, userData, userData.refreshToken);
      console.log('✅ Auth state updated via useAuth login()');
    } catch (error) {
      console.error('Failed to update auth state via useAuth:', error);
      // Fallback: store directly with correct keys
      localStorage.setItem('omeone_auth_token', token);
      localStorage.setItem('omeone_user', JSON.stringify(userData));
    }
    
    // Move to success/upgrade prompt
    setStep('success');
  };

  // Handle wallet upgrade success
  const handleWalletUpgradeSuccess = async (token: string, userData: any) => {
    console.log('✅ Wallet upgrade successful:', userData);
    setAuthToken(token);
    setUser(userData);
    
    // Use the centralized login function from useAuth
    try {
      await login(token, userData, userData.refreshToken);
      console.log('✅ Auth state updated via useAuth login()');
    } catch (error) {
      console.error('Failed to update auth state via useAuth:', error);
      // Fallback: store directly with correct keys
      localStorage.setItem('omeone_auth_token', token);
      localStorage.setItem('omeone_user', JSON.stringify(userData));
    }
    
    // Call parent success handler
    if (onSuccess) {
      onSuccess(token, userData);
    }
    
    // Redirect to feed or onboarding
    if (userData.isNewUser || !userData.onboarding_completed) {
      router.push('/onboarding');
    } else {
      router.push('/feed');
    }
    
    if (onClose) {
      onClose();
    }
  };

  // Handle "Continue without wallet" - go straight to app
  const handleSkipWallet = () => {
    if (onSuccess && authToken && user) {
      onSuccess(authToken, user);
    }
    
    // Redirect based on user state
    if (user?.isNewUser || !user?.onboarding_completed) {
      router.push('/onboarding');
    } else {
      router.push('/feed');
    }
    
    if (onClose) {
      onClose();
    }
  };

  // Handle "Connect Wallet" button click
  const handleConnectWalletClick = () => {
    setStep('wallet-upgrade');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Progress indicator */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'phone' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
            }`}>
              {step === 'phone' ? (
                <Phone className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
            </div>
            <div className={`w-12 h-1 rounded ${
              step !== 'phone' ? 'bg-green-500' : 'bg-gray-200'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'wallet-upgrade' ? 'bg-orange-500 text-white' : 
              step === 'success' ? 'bg-gray-200 text-gray-400' : 'bg-gray-200 text-gray-400'
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 pb-6">
          {step === 'phone' && (
            <PhoneAuthStep
              onSuccess={handlePhoneSuccess}
              onCancel={onClose}
            />
          )}

          {step === 'success' && (
            <SuccessStep
              user={user}
              onConnectWallet={handleConnectWalletClick}
              onSkip={handleSkipWallet}
            />
          )}

          {step === 'wallet-upgrade' && (
            <WalletUpgradeStep
              authToken={authToken!}
              user={user}
              onSuccess={handleWalletUpgradeSuccess}
              onSkip={handleSkipWallet}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Success step component - shown after phone verification
interface SuccessStepProps {
  user: any;
  onConnectWallet: () => void;
  onSkip: () => void;
}

const SuccessStep: React.FC<SuccessStepProps> = ({ user, onConnectWallet, onSkip }) => {
  const t = useTranslations('auth');

  return (
    <div className="text-center">
      {/* Success icon */}
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('phoneSuccess.title') || "You're in!"}
      </h2>
      
      <p className="text-gray-600 mb-6">
        {t('phoneSuccess.subtitle') || 'Your phone is verified. You can now discover and share restaurant recommendations.'}
      </p>

      {/* Benefits of connecting wallet */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4 mb-6 text-left">
        <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          {t('walletUpgrade.title') || 'Unlock Full Features'}
        </h3>
        <ul className="space-y-2 text-sm text-orange-800">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>{t('walletUpgrade.benefit1') || 'Claim your BOCA rewards on-chain'}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>{t('walletUpgrade.benefit2') || 'View your NFT loyalty cards'}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>{t('walletUpgrade.benefit3') || 'Participate in governance voting'}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span>{t('walletUpgrade.benefit4') || 'Transfer tokens to external wallets'}</span>
          </li>
        </ul>
      </div>

      {/* Primary CTA: Connect Wallet */}
      <button
        onClick={onConnectWallet}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors mb-3"
      >
        <Wallet className="w-5 h-5" />
        {t('walletUpgrade.connectButton') || 'Connect Wallet'}
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Secondary: Skip for now */}
      <button
        onClick={onSkip}
        className="w-full py-3 px-4 text-gray-600 hover:text-gray-800 font-medium transition-colors"
      >
        {t('walletUpgrade.skipButton') || 'Maybe Later'}
      </button>

      <p className="text-xs text-gray-500 mt-4">
        {t('walletUpgrade.skipNote') || 'You can always connect a wallet later from your profile settings.'}
      </p>
    </div>
  );
};

export default AuthModal;