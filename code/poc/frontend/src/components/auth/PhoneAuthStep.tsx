// File: code/poc/frontend/src/components/auth/PhoneAuthStep.tsx
// Phone verification step for the auth flow
// Handles phone number entry and SMS code verification

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Phone, ArrowRight, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Country codes for Brazil (primary market) and common alternatives
const COUNTRY_CODES = [
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brasil' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+351', country: 'PT', flag: '🇵🇹', name: 'Portugal' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'España' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Deutschland' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italia' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: '日本' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: '中国' },
];

interface PhoneAuthStepProps {
  onSuccess: (token: string, user: any) => void;
  onCancel?: () => void;
  existingToken?: string; // If adding phone to existing wallet account
}

type PhoneStep = 'entry' | 'verification';

const PhoneAuthStep: React.FC<PhoneAuthStepProps> = ({
  onSuccess,
  onCancel,
  existingToken
}) => {
  const t = useTranslations('auth');
  
  const [step, setStep] = useState<PhoneStep>('entry');
  const [countryCode, setCountryCode] = useState('+55'); // Default to Brazil
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState('');
  
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // API base URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
      }
    };
  }, []);

  // Start resend cooldown timer
  const startResendCooldown = () => {
    setResendCooldown(60);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Format phone number as user types (Brazilian format: XX XXXXX-XXXX)
  const formatPhoneDisplay = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (countryCode === '+55') {
      // Brazilian format
      if (digits.length <= 2) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    // Generic format
    return digits;
  };

  // Handle phone number input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setPhoneNumber(value);
    }
    setError(null);
  };

  // Request verification code
  const handleRequestCode = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // If upgrading existing account, include auth token
      if (existingToken) {
        headers['Authorization'] = `Bearer ${existingToken}`;
      }

      const response = await fetch(`${API_URL}/auth/phone/request-code`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneNumber,
          countryCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      console.log('✅ Verification code sent');
      setMaskedPhone(data.phoneNumber || `${countryCode} *** ${phoneNumber.slice(-4)}`);
      setStep('verification');
      startResendCooldown();
      toast.success(t('phone.codeSent') || 'Verification code sent!');
      
      // Focus first code input
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 100);

    } catch (err: any) {
      console.error('❌ Request code error:', err);
      setError(err.message || t('phone.errors.sendFailed') || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code input
  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = [...verificationCode];
    newCode[index] = digit;
    setVerificationCode(newCode);
    setError(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5 && newCode.every(d => d)) {
      handleVerifyCode(newCode.join(''));
    }
  };

  // Handle backspace in code input
  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste in code input
  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setVerificationCode(newCode);
      handleVerifyCode(pastedData);
    }
  };

  // Verify the code
  const handleVerifyCode = async (code?: string) => {
    const codeToVerify = code || verificationCode.join('');
    
    if (codeToVerify.length !== 6) {
      setError(t('phone.errors.invalidCode') || 'Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (existingToken) {
        headers['Authorization'] = `Bearer ${existingToken}`;
      }

      const response = await fetch(`${API_URL}/auth/phone/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneNumber,
          countryCode,
          code: codeToVerify,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      console.log('✅ Phone verified successfully');
      toast.success(t('phone.verifySuccess') || 'Phone verified!');
      
      onSuccess(data.token, data.user);

    } catch (err: any) {
      console.error('❌ Verification error:', err);
      setError(err.message || t('phone.errors.verifyFailed') || 'Verification failed');
      // Clear code on error
      setVerificationCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/phone/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          countryCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      toast.success(t('phone.codeResent') || 'New code sent!');
      startResendCooldown();
      setVerificationCode(['', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();

    } catch (err: any) {
      console.error('❌ Resend error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Go back to phone entry
  const handleEditPhone = () => {
    setStep('entry');
    setVerificationCode(['', '', '', '', '', '']);
    setError(null);
  };

  return (
    <div>
      {step === 'entry' ? (
        // Phone number entry step
        <div>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('phone.title') || 'Enter your phone number'}
            </h2>
            <p className="text-gray-600">
              {t('phone.subtitle') || "We'll send you a verification code"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Country code + phone number input */}
          <div className="flex gap-2 mb-4">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={loading}
            >
              {COUNTRY_CODES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.code}
                </option>
              ))}
            </select>
            
            <input
              type="tel"
              value={formatPhoneDisplay(phoneNumber)}
              onChange={handlePhoneChange}
              placeholder={countryCode === '+55' ? '11 99999-9999' : 'Phone number'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleRequestCode}
            disabled={loading || phoneNumber.length < 8}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('phone.sending') || 'Sending...'}
              </>
            ) : (
              <>
                {t('phone.sendCode') || 'Send Verification Code'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Privacy note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            {t('phone.privacyNote') || "We'll only use your phone number for verification and account security."}
          </p>

          {/* Cancel button */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
          )}
        </div>
      ) : (
        // Verification code step
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('phone.verifyTitle') || 'Enter verification code'}
            </h2>
            <p className="text-gray-600">
              {t('phone.verifySubtitle') || 'We sent a 6-digit code to'}
            </p>
            <p className="font-medium text-gray-900 mt-1">{maskedPhone}</p>
            <button
              onClick={handleEditPhone}
              className="text-sm text-orange-500 hover:text-orange-600 mt-1"
            >
              {t('phone.changeNumber') || 'Change number'}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 6-digit code input */}
          <div className="flex justify-center gap-2 mb-6" onPaste={handleCodePaste}>
            {verificationCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (codeInputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={loading}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            onClick={() => handleVerifyCode()}
            disabled={loading || verificationCode.some(d => !d)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('phone.verifying') || 'Verifying...'}
              </>
            ) : (
              t('phone.verify') || 'Verify'
            )}
          </button>

          {/* Resend code */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600 mb-2">
              {t('phone.noCode') || "Didn't receive the code?"}
            </p>
            <button
              onClick={handleResendCode}
              disabled={loading || resendCooldown > 0}
              className="inline-flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {resendCooldown > 0
                ? `${t('phone.resendIn') || 'Resend in'} ${resendCooldown}s`
                : t('phone.resend') || 'Resend code'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneAuthStep;