// File: code/poc/frontend/components/auth/SMSVerification.tsx
// SMS code verification with iOS autofill support
// Uses single hidden input for autofill + visual digit boxes display
// Updated: Jan 31, 2026 - Fixed iOS SMS autofill with single-input approach

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { MessageSquare, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface SMSVerificationProps {
  phoneNumber: string;
  countryCode: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
  resendCooldown?: number;
}

export default function SMSVerification({
  phoneNumber,
  countryCode,
  onVerify,
  onResend,
  onBack,
  isLoading = false,
  error: externalError,
  resendCooldown = 30
}: SMSVerificationProps) {
  const t = useTranslations('auth');
  
  // Single string for the code (easier for autofill)
  const [code, setCode] = useState('');
  const [internalError, setInternalError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(resendCooldown);
  const [isResending, setIsResending] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (code.length === 6) {
      handleSubmit(code);
    }
  }, [code]);

  // Focus input on mount
  useEffect(() => {
    // Small delay to ensure keyboard appears properly on mobile
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (fullCode: string) => {
    if (fullCode.length !== 6) {
      setInternalError(t('smsVerification.errorIncomplete') || 'Please enter all 6 digits');
      return;
    }
    
    setInternalError(null);
    
    try {
      await onVerify(fullCode);
    } catch (err) {
      // Error handling done by parent
      // Clear the code on error so user can retry
      setCode('');
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 6
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setInternalError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 46, 9, 27, 13].includes(e.keyCode)) {
      return;
    }
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
      return;
    }
    // Block non-numeric keys
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    
    setIsResending(true);
    try {
      await onResend();
      setCountdown(60);
      setCode('');
      setInternalError(null);
      inputRef.current?.focus();
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsResending(false);
    }
  };

  // Focus the input when user taps on the digit boxes
  const handleBoxesClick = () => {
    inputRef.current?.focus();
  };

  const displayError = externalError || internalError;

  // Check if phoneNumber already includes country code to avoid duplication
  const displayPhone = phoneNumber.startsWith(countryCode) 
    ? phoneNumber 
    : `${countryCode} ${phoneNumber}`;

  // Mask phone number for display (show last 4 digits)
  const maskedPhone = (() => {
    const digits = displayPhone.replace(/\D/g, '');
    if (digits.length > 4) {
      const codeDigits = countryCode.replace('+', '');
      const lastFour = digits.slice(-4);
      const middleLength = digits.length - codeDigits.length - 4;
      const maskedMiddle = '*'.repeat(Math.max(0, middleLength));
      return `${countryCode} ${maskedMiddle} ${lastFour}`;
    }
    return displayPhone;
  })();

  // Split code into array for display
  const codeDigits = code.split('');

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        disabled={isLoading}
      >
        <span className="mr-2">←</span>
        {t('common.back') || 'Back'}
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-coral-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-coral-500" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">
          {t('smsVerification.title') || 'Enter the code'}
        </h1>
        <p className="text-gray-600">
          {t('smsVerification.subtitle') || 'We sent a 6-digit code to'}
        </p>
        <p className="text-gray-900 font-medium mt-1">
          {maskedPhone}
        </p>
      </div>

      {/* Code Input Area */}
      <div className="relative mb-6">
        {/* Hidden input for autofill - positioned over the boxes */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={6}
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
          aria-label="Verification code"
        />

        {/* Visual digit boxes */}
        <div 
          className="flex justify-center gap-2 sm:gap-3"
          onClick={handleBoxesClick}
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`w-11 h-14 sm:w-12 sm:h-16 flex items-center justify-center text-2xl font-bold text-[#1F1E2A] rounded-lg border-2 transition-all ${
                displayError 
                  ? 'border-red-500 bg-red-50' 
                  : codeDigits[index] 
                    ? 'border-coral-500 bg-coral-50' 
                    : index === code.length
                      ? 'border-coral-500 bg-white' // Current position
                      : 'border-gray-300 bg-white'
              } ${isLoading ? 'opacity-50' : ''}`}
            >
              {codeDigits[index] || ''}
            </div>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 text-coral-600 mb-4"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('smsVerification.verifying') || 'Verifying...'}</span>
        </motion.div>
      )}

      {/* Error Message */}
      {displayError && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-red-600 text-sm mb-4"
        >
          <AlertCircle className="w-4 h-4" />
          {displayError}
        </motion.div>
      )}

      {/* Resend Section */}
      <div className="text-center">
        <p className="text-gray-600 text-sm mb-2">
          {t('smsVerification.didntReceive') || "Didn't receive it?"}
        </p>
        
        {countdown > 0 ? (
          <p className="text-gray-500 text-sm">
            {t('smsVerification.resendIn') || 'Resend available in'}{' '}
            <span className="font-medium text-gray-700">
              {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={isResending || isLoading}
            className="inline-flex items-center gap-2 text-coral-600 hover:text-coral-700 font-medium text-sm transition-colors disabled:opacity-50"
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('smsVerification.resending') || 'Resending...'}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {t('smsVerification.resendCode') || 'Resend code'}
              </>
            )}
          </button>
        )}
      </div>

      {/* Help text */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-600 text-center">
          {t('smsVerification.helpText') || 'The code expires in 10 minutes. Check your SMS inbox and make sure the number is correct.'}
        </p>
      </div>
    </div>
  );
}