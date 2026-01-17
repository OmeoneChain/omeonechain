// File: code/poc/frontend/components/auth/ProfileSetup.tsx
// Profile setup for new users: display name, username, photo upload
// Updated: Integrated username availability checking with suggestions + avatar upload to IPFS

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Camera, User, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { uploadAvatar } from '@/lib/services/avatar-service';

interface ProfileSetupProps {
  onComplete: (profileData: ProfileData) => Promise<void>;
  onSkip?: () => void;
  isLoading?: boolean;
  error?: string | null;
  suggestedUsername?: string;
  // Auth context for avatar upload
  authToken?: string;
  userId?: string;
}

export interface ProfileData {
  displayName: string;
  username: string;
  avatarUrl?: string;      // IPFS URL after upload
  avatarPreview?: string;  // Local preview (fallback if upload skipped)
}

export default function ProfileSetup({
  onComplete,
  onSkip,
  isLoading = false,
  error: externalError,
  suggestedUsername = '',
  authToken,
  userId
}: ProfileSetupProps) {
  const t = useTranslations('auth');
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState(suggestedUsername);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Validate and format username
  const formatUsername = (value: string): string => {
    // Remove @ if user types it, lowercase, remove spaces and special chars
    return value
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);
  };

  // Check username availability (debounced)
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (usernameToCheck.length < 3) {
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
      return;
    }
    
    setUsernameStatus('checking');
    setUsernameSuggestions([]);
    
    try {
      const response = await fetch(`/api/users/check-username?username=${usernameToCheck}`);
      const data = await response.json();
      
      if (data.available) {
        setUsernameStatus('available');
        setUsernameSuggestions([]);
      } else {
        setUsernameStatus('taken');
        // Store suggestions if provided by API
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setUsernameSuggestions(data.suggestions);
        }
      }
    } catch (err) {
      // On error, assume available (will be validated on submit)
      setUsernameStatus('available');
      setUsernameSuggestions([]);
    }
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUsername(e.target.value);
    setUsername(formatted);
    setInternalError(null);
    setUsernameSuggestions([]);
    
    // Debounce username check (300ms)
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }
    
    usernameCheckTimeout.current = setTimeout(() => {
      checkUsernameAvailability(formatted);
    }, 300);
  };

  // Handle clicking a suggested username
  const handleSuggestionClick = (suggestion: string) => {
    setUsername(suggestion);
    setUsernameStatus('available');
    setUsernameSuggestions([]);
    setInternalError(null);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setInternalError(t('profileSetup.errorInvalidImage') || 'Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setInternalError(t('profileSetup.errorImageTooLarge') || 'Image must be less than 5MB');
      return;
    }
    
    setAvatarFile(file);
    setInternalError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    if (!displayName.trim()) {
      setInternalError(t('profileSetup.errorNameRequired') || 'Display name is required');
      return false;
    }
    
    if (displayName.trim().length < 2) {
      setInternalError(t('profileSetup.errorNameTooShort') || 'Display name must be at least 2 characters');
      return false;
    }
    
    if (!username.trim()) {
      setInternalError(t('profileSetup.errorUsernameRequired') || 'Username is required');
      return false;
    }
    
    if (username.length < 3) {
      setInternalError(t('profileSetup.errorUsernameTooShort') || 'Username must be at least 3 characters');
      return false;
    }
    
    if (usernameStatus === 'taken') {
      setInternalError(t('profileSetup.errorUsernameTaken') || 'This username is already taken');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Upload avatar if file is selected
    let avatarUrl: string | undefined;
    
    if (avatarFile) {
      setIsUploading(true);
      try {
        const uploadResult = await uploadAvatar(avatarFile, userId, authToken);
        
        if (uploadResult.success && uploadResult.url) {
          avatarUrl = uploadResult.url;
        } else {
          // Log error but don't block profile creation
          console.warn('Avatar upload failed:', uploadResult.error);
          // Optionally show a warning toast here, but continue with profile setup
        }
      } catch (err) {
        console.error('Avatar upload error:', err);
        // Continue without avatar - user can add it later
      } finally {
        setIsUploading(false);
      }
    }
    
    const profileData: ProfileData = {
      displayName: displayName.trim(),
      username: username.trim(),
      avatarUrl,
      avatarPreview: avatarPreview || undefined
    };
    
    try {
      await onComplete(profileData);
    } catch (err) {
      // Error handled by parent
    }
  };

  const displayError = externalError || internalError;
  const isSubmitting = isLoading || isUploading;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-navy-900 mb-2">
          {t('profileSetup.title') || 'Criar seu perfil'}
        </h1>
        <p className="text-gray-600">
          {t('profileSetup.subtitle') || 'Como você quer ser conhecido?'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload - Circular Frame */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={isSubmitting}
              className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 hover:border-coral-500 transition-colors flex items-center justify-center overflow-hidden bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-8 h-8 text-gray-400" />
              )}
            </button>
            
            {/* Remove photo button */}
            {avatarPreview && !isSubmitting && (
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={handlePhotoClick}
            disabled={isSubmitting}
            className="mt-2 text-sm text-coral-600 hover:text-coral-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {avatarPreview 
              ? (t('profileSetup.changePhoto') || 'Trocar foto')
              : (t('profileSetup.addPhoto') || 'Adicionar foto')
            }
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
            {t('profileSetup.displayNameLabel') || 'Nome de exibição'}
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setInternalError(null);
            }}
            placeholder={t('profileSetup.displayNamePlaceholder') || 'João Silva'}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
            disabled={isSubmitting}
            maxLength={50}
          />
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            {t('profileSetup.usernameLabel') || 'Nome de usuário'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder={t('profileSetup.usernamePlaceholder') || 'joaosilva'}
              className={`w-full pl-8 pr-12 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all ${
                usernameStatus === 'taken' ? 'border-red-500' : 
                usernameStatus === 'available' ? 'border-green-500' : 
                'border-gray-300'
              }`}
              disabled={isSubmitting}
              maxLength={20}
            />
            
            {/* Status indicator */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              )}
              {usernameStatus === 'available' && (
                <Check className="w-5 h-5 text-green-500" />
              )}
              {usernameStatus === 'taken' && (
                <X className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          
          {/* Username status message */}
          {usernameStatus === 'available' && username.length >= 3 && (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              {t('profileSetup.usernameAvailable') || 'Disponível'}
            </p>
          )}
          {usernameStatus === 'taken' && (
            <div className="mt-2">
              <p className="text-sm text-red-600 flex items-center gap-1">
                <X className="w-4 h-4" />
                {t('profileSetup.usernameTaken') || `@${username} já em uso`}
              </p>
              
              {/* Username suggestions */}
              {usernameSuggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">
                    {t('profileSetup.trySuggestions') || 'Tente um destes:'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {usernameSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-coral-100 text-gray-700 hover:text-coral-700 rounded-full transition-colors"
                      >
                        @{suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {displayError}
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || usernameStatus === 'taken' || usernameStatus === 'checking'}
          className="w-full py-4 bg-coral-500 hover:bg-coral-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isUploading 
                ? (t('profileSetup.uploadingPhoto') || 'Enviando foto...')
                : (t('profileSetup.saving') || 'Salvando...')
              }
            </>
          ) : (
            <>
              <User className="w-5 h-5" />
              {t('profileSetup.continue') || 'Continuar'}
            </>
          )}
        </button>

        {/* Skip option */}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            className="w-full py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
          >
            {t('profileSetup.skip') || 'Pular por agora'}
          </button>
        )}
      </form>
    </div>
  );
}