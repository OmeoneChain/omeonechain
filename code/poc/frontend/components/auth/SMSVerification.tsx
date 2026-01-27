// File: code/poc/frontend/components/auth/SMSVerification.tsx
// SMS code verification with 6 individual boxes, auto-advance, and auto-submit

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { MessageSquare, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface SMSVerificationProps {
  phoneNumber: string; // Formatted display version
  countryCode: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
  resendCooldown?: number; // seconds until resend allowed
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
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
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
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setInternalError(null);
    
    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // If current is empty, go back and clear previous
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
      e.preventDefault();
    }
    
    // Handle arrow keys
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
      
      // Focus the next empty input or the last one
      const nextEmptyIndex = newCode.findIndex(c => c === '');
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    
    setIsResending(true);
    try {
      await onResend();
      setCountdown(60); // Reset to 60 seconds after successful resend
      setCode(['', '', '', '', '', '']);
      setInternalError(null);
      inputRefs.current[0]?.focus();
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsResending(false);
    }
  };

  const displayError = externalError || internalError;

  // Mask phone number for display: +55 11 *****-9999
  const maskedPhone = phoneNumber;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        disabled={isLoading}
      >
        <span className="mr-2">←</span>
        {t('common.back') || 'Voltar'}
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-coral-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-coral-500" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">
          {t('smsVerification.title') || 'Digite o código'}
        </h1>
        <p className="text-gray-600">
          {t('smsVerification.subtitle') || 'Enviamos um código de 6 dígitos para'}
        </p>
        <p className="text-gray-900 font-medium mt-1">
          {countryCode} {maskedPhone}
        </p>
      </div>

      {/* Code Input Boxes */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-6">
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
            disabled={isLoading}
            className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold text-[#1F1E2A] rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500 ${
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

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 text-coral-600 mb-4"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('smsVerification.verifying') || 'Verificando...'}</span>
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
          {t('smsVerification.didntReceive') || 'Não recebeu?'}
        </p>
        
        {countdown > 0 ? (
          <p className="text-gray-500 text-sm">
            {t('smsVerification.resendIn') || 'Reenviar disponível em'}{' '}
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
                {t('smsVerification.resending') || 'Reenviando...'}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {t('smsVerification.resendCode') || 'Reenviar código'}
              </>
            )}
          </button>
        )}
      </div>

      {/* Help text */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-600 text-center">
          {t('smsVerification.helpText') || 'O código expira em 10 minutos. Verifique sua caixa de SMS e certifique-se de que o número está correto.'}
        </p>
      </div>
    </div>
  );
}
