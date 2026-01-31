// File: code/poc/frontend/components/auth/SMSVerification.tsx
// SMS code verification with 6 individual boxes, auto-advance, and auto-submit
// Updated: Fixed iOS SMS autofill - hidden input now overlays boxes for better capture

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(resendCooldown);
  const [isResending, setIsResending] = useState(false);
  const [isHiddenInputFocused, setIsHiddenInputFocused] = useState(true);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6 && !code.includes('')) {
      handleSubmit(fullCode);
    }
  }, [code]);

  // Focus hidden input on mount for iOS autofill
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      hiddenInputRef.current?.focus();
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
      setCode(['', '', '', '', '', '']);
      hiddenInputRef.current?.focus();
      setIsHiddenInputFocused(true);
    }
  };

  // Handle input in the hidden field (for iOS autofill)
  const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 0) {
      const newCode = ['', '', '', '', '', ''];
      for (let i = 0; i < Math.min(value.length, 6); i++) {
        newCode[i] = value[i];
      }
      setCode(newCode);
      setInternalError(null);
      
      // If we got a full code, stay on hidden input (will auto-submit)
      // If partial, switch to individual boxes
      if (value.length < 6) {
        setIsHiddenInputFocused(false);
        inputRefs.current[value.length]?.focus();
      }
    }
  };

  // When user taps on the code boxes area, focus appropriately
  const handleContainerClick = () => {
    if (code.every(d => d === '')) {
      // All empty - focus hidden input for autofill
      hiddenInputRef.current?.focus();
      setIsHiddenInputFocused(true);
    } else {
      // Some digits entered - focus first empty box
      const firstEmpty = code.findIndex(d => d === '');
      if (firstEmpty !== -1) {
        inputRefs.current[firstEmpty]?.focus();
        setIsHiddenInputFocused(false);
      } else {
        inputRefs.current[5]?.focus();
        setIsHiddenInputFocused(false);
      }
    }
  };

  const handleInputChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setInternalError(null);
    
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
      e.preventDefault();
    }
    
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);
      
      const nextEmptyIndex = newCode.findIndex(c => c === '');
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
    }
  };

  const handleIndividualInputFocus = (index: number) => {
    setIsHiddenInputFocused(false);
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    
    setIsResending(true);
    try {
      await onResend();
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      setInternalError(null);
      hiddenInputRef.current?.focus();
      setIsHiddenInputFocused(true);
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsResending(false);
    }
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
      const countryPart = countryCode;
      const lastFour = digits.slice(-4);
      const maskedMiddle = '*'.repeat(Math.max(0, digits.length - countryCode.replace('+', '').length - 4));
      return `${countryPart} ${maskedMiddle} ${lastFour}`;
    }
    return displayPhone;
  })();

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
      <div 
        ref={containerRef}
        className="relative mb-6"
        onClick={handleContainerClick}
      >
        {/* Hidden input for iOS SMS autofill - positioned over the boxes */}
        <input
          ref={hiddenInputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code.join('')}
          onChange={handleHiddenInputChange}
          onFocus={() => setIsHiddenInputFocused(true)}
          disabled={isLoading}
          className={`absolute inset-0 w-full h-full opacity-0 ${isHiddenInputFocused ? 'z-10' : 'z-0'}`}
          style={{ caretColor: 'transparent' }}
          aria-label="SMS verification code"
        />

        {/* Visible Code Boxes */}
        <div className="flex justify-center gap-2 sm:gap-3">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={() => handleIndividualInputFocus(index)}
              disabled={isLoading}
              className={`relative z-20 w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold text-[#1F1E2A] rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500 ${
                displayError 
                  ? 'border-red-500 bg-red-50' 
                  : digit 
                    ? 'border-coral-500 bg-coral-50' 
                    : 'border-gray-300 bg-white'
              } ${isLoading ? 'opacity-50' : ''}`}
              aria-label={`Digit ${index + 1}`}
            />
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