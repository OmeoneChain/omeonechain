// File: code/poc/frontend/app/[locale]/auth/page.tsx
// Auth page with error boundary protection
// Example showing how to wrap PhoneAuthFlow with AuthErrorBoundary

'use client';

import AuthErrorBoundary from '@/components/auth/AuthErrorBoundary';
import PhoneAuthFlow from '@/components/auth/PhoneAuthFlow';

export default function AuthPage() {
  return (
    <AuthErrorBoundary>
      <PhoneAuthFlow 
        showWelcome={true}
        redirectTo="/discover"
      />
    </AuthErrorBoundary>
  );
}