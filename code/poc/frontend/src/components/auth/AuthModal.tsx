// File: code/poc/frontend/src/components/auth/AuthModal.tsx
// Simplified modal with email/social signup only (no wallet tab)

import React from 'react';
import { EmailAuth } from './EmailAuth';

interface AuthModalProps {
  onSuccess?: (token: string, user: any) => void;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  onSuccess, 
  onClose
}) => {

  const handleAuthSuccess = (token: string, user: any) => {
    console.log('✅ Authentication successful:', user);
    
    if (onSuccess) {
      onSuccess(token, user);
    }
    
    // Optionally close modal
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Email Authentication with Social Login Options */}
      <div>
        <EmailAuth 
          onSuccess={handleAuthSuccess}
          onError={(error) => console.error('Auth error:', error)}
        />
        
        {/* Info about wallet upgrade */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Need wallet features?</h4>
              <p className="text-sm text-blue-800">
                Start with email signup now. You can connect a wallet anytime using the 
                <strong> "Connect Wallet"</strong> button in the header to claim tokens and access NFT features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;