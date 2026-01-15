// File: code/poc/frontend/app/[locale]/callback/page.tsx
// OAuth callback handler - processes social login returns and redirects appropriately

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get('token');
        const userDataParam = searchParams.get('user');
        const isNewUserParam = searchParams.get('isNewUser');
        const error = searchParams.get('error');

        console.log('🔐 OAuth callback received:', {
          hasToken: !!token,
          hasUserData: !!userDataParam,
          isNewUser: isNewUserParam,
          error
        });

        if (error) {
          console.error('❌ OAuth error:', error);
          setErrorMessage(error);
          setStatus('error');
          setTimeout(() => { router.push('/'); }, 3000);
          return;
        }

        if (!token) {
          console.error('❌ No token received from OAuth');
          setErrorMessage('Authentication failed - no token received');
          setStatus('error');
          setTimeout(() => { router.push('/'); }, 3000);
          return;
        }

        let userData;
        try {
          userData = userDataParam ? JSON.parse(decodeURIComponent(userDataParam)) : null;
        } catch (parseError) {
          console.error('❌ Failed to parse user data:', parseError);
        }

        console.log('✅ OAuth success - storing auth data');
        localStorage.setItem('omeone_auth_token', token);
        if (userData) {
          localStorage.setItem('omeone_user', JSON.stringify(userData));
        }

        setStatus('success');

        const isNewUser = isNewUserParam === 'true';
        const onboardingCompleted = userData?.onboarding_completed || false;

        if (isNewUser || !onboardingCompleted) {
          setTimeout(() => { router.push('/onboarding'); }, 1000);
        } else {
          setTimeout(() => { router.push('/feed'); }, 1000);
        }
      } catch (error) {
        console.error('❌ Error processing OAuth callback:', error);
        setErrorMessage('An unexpected error occurred');
        setStatus('error');
        setTimeout(() => { router.push('/'); }, 3000);
      }
    };

    processCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-orange-100 rounded-full mb-4">
              {status === 'processing' && (
                <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {status === 'success' && (
                <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {status === 'error' && (
                <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'processing' && 'Completing Sign In...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Authentication Failed'}
            </h2>
            
            <p className="text-gray-600">
              {status === 'processing' && 'Please wait while we set up your account'}
              {status === 'success' && 'Redirecting you to BocaBoca...'}
              {status === 'error' && errorMessage}
            </p>
          </div>

          {status === 'processing' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>Verifying authentication...</span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">Redirecting you back to the home page...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-green-600">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Taking you to your feed...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
