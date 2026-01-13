// ==========================================================================
// DISABLED: Email authentication component (Jan 2026)
// File renamed from EmailAuth.tsx to EmailAuth.disabled.tsx
// 
// Email auth removed - phone/wallet only for BocaBoca mobile-first strategy
// May be re-enabled later for: account recovery, 2FA, B2B restaurant portal
// 
// To re-enable:
// 1. Rename this file back to EmailAuth.tsx
// 2. Uncomment emailSignup/emailLogin in frontend/lib/auth.ts
// 3. Uncomment /auth/email/* routes in server.ts
// ==========================================================================

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SocialLoginButtons } from './SocialLoginButtons.disabled';
import { AuthAPI } from '@/lib/auth';

interface EmailAuthProps {
  onSuccess?: (token: string, user: any) => void;
  onError?: (error: string) => void;
}

export const EmailAuth: React.FC<EmailAuthProps> = ({ onSuccess, onError }) => {
  const router = useRouter();
  const t = useTranslations();
  
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!email || !password) {
        throw new Error(t('auth.errors.emailAndPasswordRequired'));
      }

      if (password.length < 8) {
        throw new Error(t('auth.errors.passwordTooShort'));
      }

      if (mode === 'signup' && password !== confirmPassword) {
        throw new Error(t('auth.errors.passwordMismatch'));
      }

      // Call API
      const authAPI = new AuthAPI();
      let result;

      if (mode === 'signup') {
        console.log('📧 Email sign-up:', email);
        result = await authAPI.emailSignup(email, password, displayName || undefined);
      } else {
        console.log('📧 Email login:', email);
        result = await authAPI.emailLogin(email, password);
      }

      console.log('✅ Email auth success:', result);

      // Store token
      if (result.token) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(result.token, result.user);
      }

      // Check onboarding status and redirect accordingly
      const shouldOnboard = result.isNewUser || !result.user?.onboarding_completed;
      
      console.log('🔀 Redirect decision:', {
        isNewUser: result.isNewUser,
        onboardingCompleted: result.user?.onboarding_completed,
        willRedirectTo: shouldOnboard ? '/onboarding' : '/feed'
      });

      if (shouldOnboard) {
        console.log('➡️  Redirecting to onboarding...');
        router.push('/onboarding');
      } else {
        console.log('➡️  Redirecting to feed...');
        router.push('/feed');
      }

      // Reset form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');

    } catch (err: any) {
      const errorMessage = err.message || t('auth.errors.authFailed');
      console.error('❌ Email auth error:', errorMessage);
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'signup' ? t('auth.register.title') : t('auth.login.title')}
          </h2>
          <p className="text-gray-600 mt-2">
            {mode === 'signup' 
              ? t('auth.register.subtitle')
              : t('auth.login.subtitle')}
          </p>
        </div>

        {/* Social Login Buttons */}
        <SocialLoginButtons disabled={loading} />

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">{t('auth.form.orContinueWith')}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name (Sign-up only) */}
          {mode === 'signup' && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.register.displayNameOptional')}
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.form.displayNamePlaceholder')}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.login.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.form.emailPlaceholder')}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.login.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.form.passwordPlaceholder')}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {mode === 'signup' && (
              <p className="mt-1 text-xs text-gray-500">{t('auth.form.passwordHint')}</p>
            )}
          </div>

          {/* Confirm Password (Sign-up only) */}
          {mode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.register.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.form.confirmPasswordPlaceholder')}
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('auth.form.processing')}
              </span>
            ) : (
              mode === 'signup' ? t('auth.register.signUp') : t('auth.login.signIn')
            )}
          </button>
        </form>

        {/* Toggle Sign-up/Login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            disabled={loading}
            className="text-sm text-orange-500 hover:text-orange-600 font-medium disabled:opacity-50"
          >
            {mode === 'signup' 
              ? t('auth.register.hasAccount')
              : t('auth.login.noAccount')}
          </button>
        </div>

        {/* Account Tier Info */}
        {mode === 'signup' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>{t('auth.emailTierInfo.title')}</strong> {t('auth.emailTierInfo.description')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailAuth;