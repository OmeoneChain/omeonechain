// File: code/poc/frontend/src/components/onboarding/WelcomeStep.tsx
// Step 1: Welcome message and username selection
// UPDATED: Internationalized with next-intl

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';

interface WelcomeStepProps {
  user: any;
  onComplete: (username: string) => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ user, onComplete }) => {
  const t = useTranslations('onboarding.welcome');
  const { updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Suggest initial username from user data
  useEffect(() => {
    if (user) {
      const suggested = 
        user.username ||
        user.display_name?.toLowerCase().replace(/\s+/g, '') ||
        user.email?.split('@')[0] ||
        user.name?.toLowerCase().replace(/\s+/g, '') ||
        '';
      
      if (suggested) {
        setUsername(suggested);
      }
    }
  }, [user]);

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username.length < 3) {
      setIsAvailable(null);
      setError('');
      return;
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError(t('username.invalidFormat'));
      setIsAvailable(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsChecking(true);
      setError('');
      
      try {
        // Check with backend API
        const response = await fetch(
          `https://omeonechain-production.up.railway.app/api/auth/profile/availability/${username}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setIsAvailable(data.available);
          
          if (!data.available) {
            setError(t('username.taken'));
          }
        } else {
          // If API fails, allow it (will validate on submit)
          setIsAvailable(true);
        }
      } catch (error) {
        console.error('Username check failed:', error);
        // If check fails, allow it (will validate on submit)
        setIsAvailable(true);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || username.length < 3) {
      toast.error(t('username.tooShort'));
      return;
    }

    if (!isAvailable) {
      toast.error(t('username.chooseAvailable'));
      return;
    }

    setIsSaving(true);
    
    try {
      // Save username to profile
      await updateProfile({
        username: username.toLowerCase(),
        profileCompletion: 35 // Username = 35%
      });
      
      toast.success(t('toast.saved'));
      onComplete(username.toLowerCase());
      
    } catch (error: any) {
      console.error('Failed to save username:', error);
      toast.error(error.message || t('toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const getUsernameStatus = () => {
    if (isChecking) {
      return (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('username.checking')}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <X className="w-4 h-4" />
          {error}
        </div>
      );
    }

    if (isAvailable === true && username.length >= 3) {
      return (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Check className="w-4 h-4" />
          {t('username.available')}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center mx-auto">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('title')} 🍽️
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </motion.div>

      {/* Username Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="max-w-md mx-auto space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('username.label')}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder={t('username.placeholder')}
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              required
            />
          </div>
          
          <div className="mt-2">
            {getUsernameStatus()}
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            {t('username.hint')}
          </p>
        </div>

        <button
          type="submit"
          disabled={!isAvailable || isChecking || isSaving || username.length < 3}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              {t('continue')}
              <Sparkles className="w-5 h-5" />
            </>
          )}
        </button>
      </motion.form>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="max-w-md mx-auto mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg"
      >
        <h3 className="text-sm font-medium text-orange-900 mb-2">
          {t('info.title')}
        </h3>
        <p className="text-sm text-orange-800">
          {t('info.description')}
        </p>
      </motion.div>
    </div>
  );
};

export default WelcomeStep;