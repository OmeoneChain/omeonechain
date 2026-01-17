// =============================================================================
// FILE: components/profile/ProfileEditor.tsx
// FIXED VERSION: Uses authApi.updateProfile method cleanly
// UPDATED: Internationalized with next-intl
// UPDATED: Added avatar upload via avatar-service.ts (IPFS/Pinata)
// UPDATED: Added username availability checking with debounce + suggestions
// UPDATED: Added dark mode support
// =============================================================================

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, X, Save, Loader2, MapPin, Camera, Check, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../src/services/api';
import { uploadAvatar } from '../../lib/services/avatar-service';
import { toast } from 'react-hot-toast';

interface ProfileData {
  username?: string;
  display_name?: string;
  bio?: string;
  location_city?: string;
  location_country?: string;
  email?: string;
  avatar_url?: string;
}

interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: ProfileData) => void;
}

export function ProfileEditor({ isOpen, onClose, onSave }: ProfileEditorProps) {
  const t = useTranslations();
  const { user, token } = useAuth();
  
  const [formData, setFormData] = useState<ProfileData>({});
  const [originalData, setOriginalData] = useState<ProfileData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiDebug, setApiDebug] = useState<string[]>([]);

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize form data when component opens
  useEffect(() => {
    if (isOpen && user) {
      console.log('🎯 Initializing ProfileEditor with user data:', user);
      
      const initial: ProfileData = {
        username: user.username || '',
        display_name: user.display_name || user.displayName || '',
        bio: user.bio || '',
        location_city: user.location_city || user.city || '',
        location_country: user.location_country || user.country || 'Brazil',
        email: user.email || '',
        avatar_url: user.avatar_url || user.avatar || user.avatarUrl || ''
      };
      
      console.log('📝 Initial form data:', initial);
      
      setFormData(initial);
      setOriginalData(initial);
      setHasChanges(false);
      setErrors({});
      setApiDebug([t('profile.editor.debug.initialized')]);
      
      // Reset avatar state
      setAvatarFile(null);
      setAvatarPreview(null);
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
    }
  }, [isOpen, user, t]);

  // Check for changes (including avatar)
  useEffect(() => {
    const formChanged = Object.keys(formData).some(key => 
      formData[key as keyof ProfileData] !== originalData[key as keyof ProfileData]
    );
    const avatarChanged = avatarFile !== null;
    setHasChanges(formChanged || avatarChanged);
  }, [formData, originalData, avatarFile]);

  // Username availability check (debounced)
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    // Don't check if it's the same as the original username
    if (usernameToCheck === originalData.username) {
      setUsernameStatus('idle');
      setUsernameSuggestions([]);
      return;
    }

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
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setUsernameSuggestions(data.suggestions);
        }
      }
    } catch (err) {
      // On error, assume available (will be validated on submit)
      setUsernameStatus('available');
      setUsernameSuggestions([]);
    }
  }, [originalData.username]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Debounced username check
    if (field === 'username') {
      setUsernameSuggestions([]);
      
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
      
      usernameCheckTimeout.current = setTimeout(() => {
        checkUsernameAvailability(value);
      }, 300);
    }
  };

  // Handle clicking a suggested username
  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, username: suggestion }));
    setUsernameStatus('available');
    setUsernameSuggestions([]);
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: '' }));
    }
  };

  // Avatar file handling
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.editor.errors.invalidImageType') || 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.editor.errors.imageTooLarge') || 'Image must be less than 5MB');
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addDebugLog = (message: string) => {
    setApiDebug(prev => [message, ...prev.slice(0, 9)]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username?.trim()) {
      newErrors.username = t('profile.editor.errors.usernameRequired');
    } else if (formData.username.length < 3) {
      newErrors.username = t('profile.editor.errors.usernameMinLength');
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = t('profile.editor.errors.usernameFormat');
    } else if (usernameStatus === 'taken') {
      newErrors.username = t('profile.editor.errors.usernameTaken') || 'This username is already taken';
    }

    if (!formData.display_name?.trim()) {
      newErrors.display_name = t('profile.editor.errors.displayNameRequired');
    } else if (formData.display_name.length < 2) {
      newErrors.display_name = t('profile.editor.errors.displayNameMinLength');
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('profile.editor.errors.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    if (!validateForm()) {
      toast.error(t('profile.editor.errors.fixErrors'));
      return;
    }

    if (!token) {
      toast.error(t('profile.editor.errors.notLoggedIn'));
      addDebugLog('❌ NO TOKEN - User needs to log in');
      return;
    }

    addDebugLog(`🔑 Token found: ${token.substring(0, 20)}...`);

    setIsLoading(true);
    setApiDebug([]);

    try {
      // Upload avatar if a new file was selected
      let newAvatarUrl: string | undefined;
      
      if (avatarFile) {
        setIsUploadingAvatar(true);
        addDebugLog('📤 Uploading avatar to IPFS...');
        
        try {
          const uploadResult = await uploadAvatar(
            avatarFile, 
            user?.id || user?.address, 
            token
          );
          
          if (uploadResult.success && uploadResult.url) {
            newAvatarUrl = uploadResult.url;
            addDebugLog(`✅ Avatar uploaded: ${uploadResult.url.substring(0, 50)}...`);
          } else {
            addDebugLog(`⚠️ Avatar upload failed: ${uploadResult.error}`);
            // Don't block profile save, just warn
            toast.error(t('profile.editor.errors.avatarUploadFailed') || 'Avatar upload failed, but profile will be saved');
          }
        } catch (uploadError: any) {
          addDebugLog(`⚠️ Avatar upload error: ${uploadError.message}`);
          console.error('Avatar upload error:', uploadError);
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      console.log('💾 Saving profile data:', formData);
      
      const cleanProfileData = {
        username: formData.username?.trim() || '',
        display_name: formData.display_name?.trim() || '',
        bio: formData.bio?.trim() || '',
        location_city: formData.location_city?.trim() || '',
        location_country: formData.location_country?.trim() || '',
        email: formData.email?.trim() || '',
        // Include new avatar URL if uploaded, otherwise keep existing
        avatar_url: newAvatarUrl || formData.avatar_url || ''
      };

      console.log('🧼 Clean profile data being sent:', cleanProfileData);
      addDebugLog(`Sending profile data: ${JSON.stringify(cleanProfileData).substring(0, 100)}...`);
      addDebugLog(`🎯 Using authApi.updateProfile method`);

      const result = await authApi.updateProfile(cleanProfileData);

      if (!result.success) {
        throw new Error(result.error || t('profile.editor.errors.updateFailed'));
      }

      addDebugLog(`✅ Success: Profile updated via authApi`);
      
      console.log('✅ Profile saved successfully:', result);
      
      // Pass updated data including new avatar URL
      onSave?.({ ...formData, avatar_url: newAvatarUrl || formData.avatar_url });
      
      toast.success(t('profile.editor.success'));
      
      onClose();
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Profile save failed:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        toast.error(t('profile.editor.errors.connectionFailed'));
        addDebugLog('❌ CONNECTION_REFUSED - Backend not running or wrong URL');
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        toast.error(t('profile.editor.errors.authFailed'));
        addDebugLog('❌ UNAUTHORIZED - Invalid token or session expired');
      } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
        toast.error(t('profile.editor.errors.invalidData'));
        addDebugLog('❌ BAD_REQUEST - Server rejected the data');
      } else {
        toast.error(error.message || t('profile.editor.errors.generic'));
        addDebugLog(`❌ ERROR: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Determine which avatar to display
  const displayAvatarUrl = avatarPreview 
    || formData.avatar_url 
    || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.username || formData.display_name || 'user'}`;

  const isSubmitDisabled = !hasChanges || isLoading || usernameStatus === 'taken' || usernameStatus === 'checking' || Object.keys(errors).length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#2D2C3A] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#3D3C4A]">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('profile.editor.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-lg transition-colors text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex">
          {/* Form - Left Side */}
          <div className="flex-1 p-6 space-y-6">
            {/* Avatar Section - Now with upload support */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={isLoading}
                  className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 dark:border-[#3D3C4A] hover:border-coral-500 dark:hover:border-coral-500 transition-colors group"
                >
                  <img
                    src={displayAvatarUrl}
                    alt={t('profile.editor.avatar.alt')}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.display_name || 'User')}&background=3b82f6&color=fff`;
                    }}
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </button>
                
                {/* Remove avatar button (only show if custom avatar is set) */}
                {(avatarPreview || (formData.avatar_url && !formData.avatar_url.includes('dicebear'))) && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    disabled={isLoading}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('profile.editor.avatar.title')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">{t('profile.editor.avatar.description')}</p>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={isLoading}
                  className="mt-2 text-sm text-coral-600 dark:text-coral-400 hover:text-coral-700 dark:hover:text-coral-300 font-medium disabled:opacity-50"
                >
                  {avatarPreview || formData.avatar_url 
                    ? (t('profile.editor.avatar.change') || 'Change photo')
                    : (t('profile.editor.avatar.upload') || 'Upload photo')
                  }
                </button>
              </div>
            </div>

            {/* Username Field - Now with availability checking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.editor.fields.username')} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">@</span>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className={`w-full pl-8 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-[#353444] text-gray-900 dark:text-gray-100 ${
                    errors.username || usernameStatus === 'taken'
                      ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                      : usernameStatus === 'available' && formData.username !== originalData.username
                        ? 'border-green-300 dark:border-green-700 focus:ring-green-500'
                        : 'border-gray-300 dark:border-[#3D3C4A] focus:ring-blue-500'
                  }`}
                  placeholder={t('profile.editor.placeholders.username')}
                  maxLength={30}
                />
                
                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                  {usernameStatus === 'available' && formData.username !== originalData.username && formData.username && formData.username.length >= 3 && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {usernameStatus === 'taken' && (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              
              {/* Username status messages */}
              {usernameStatus === 'available' && formData.username !== originalData.username && formData.username && formData.username.length >= 3 && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  {t('profile.editor.usernameAvailable') || 'Username available'}
                </p>
              )}
              
              {usernameStatus === 'taken' && (
                <div className="mt-2">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    {t('profile.editor.errors.usernameTaken') || `@${formData.username} is already taken`}
                  </p>
                  
                  {/* Username suggestions */}
                  {usernameSuggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {t('profile.editor.trySuggestions') || 'Try one of these:'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {usernameSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-1 text-sm bg-gray-100 dark:bg-[#353444] hover:bg-coral-100 dark:hover:bg-coral-900/30 text-gray-700 dark:text-gray-300 hover:text-coral-700 dark:hover:text-coral-300 rounded-full transition-colors"
                          >
                            @{suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {errors.username && usernameStatus !== 'taken' && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.editor.fields.displayName')} *
              </label>
              <input
                type="text"
                value={formData.display_name || ''}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-[#353444] text-gray-900 dark:text-gray-100 ${
                  errors.display_name
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                    : 'border-gray-300 dark:border-[#3D3C4A] focus:ring-blue-500'
                }`}
                placeholder={t('profile.editor.placeholders.displayName')}
                maxLength={50}
              />
              {errors.display_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.display_name}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.editor.fields.bio')}
              </label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#3D3C4A] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-[#353444] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder={t('profile.editor.placeholders.bio')}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                {(formData.bio || '').length}/500 {t('common.characters')}
              </p>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {t('profile.editor.fields.city')}
                </label>
                <input
                  type="text"
                  value={formData.location_city || ''}
                  onChange={(e) => handleInputChange('location_city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#3D3C4A] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#353444] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={t('profile.editor.placeholders.city')}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.editor.fields.country')}
                </label>
                <select
                  value={formData.location_country || 'Brazil'}
                  onChange={(e) => handleInputChange('location_country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#3D3C4A] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#353444] text-gray-900 dark:text-gray-100"
                >
                  <option value="Brazil">{t('profile.editor.countries.brazil')}</option>
                  <option value="United States">{t('profile.editor.countries.usa')}</option>
                  <option value="Portugal">{t('profile.editor.countries.portugal')}</option>
                  <option value="United Kingdom">{t('profile.editor.countries.uk')}</option>
                  <option value="Canada">{t('profile.editor.countries.canada')}</option>
                  <option value="Germany">{t('profile.editor.countries.germany')}</option>
                  <option value="France">{t('profile.editor.countries.france')}</option>
                  <option value="Spain">{t('profile.editor.countries.spain')}</option>
                  <option value="Italy">{t('profile.editor.countries.italy')}</option>
                  <option value="Australia">{t('profile.editor.countries.australia')}</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('profile.editor.fields.email')}
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-[#353444] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
                  errors.email
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                    : 'border-gray-300 dark:border-[#3D3C4A] focus:ring-blue-500'
                }`}
                placeholder={t('profile.editor.placeholders.email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Debug Panel - Right Side */}
          <div className="w-96 border-l border-gray-200 dark:border-[#3D3C4A] bg-gray-50 dark:bg-[#353444] p-4">
            <h3 className="font-bold text-sm mb-3 text-gray-900 dark:text-gray-100">🔍 {t('profile.editor.debug.title')}</h3>
            
            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <div>
                <strong>{t('profile.editor.debug.userId')}:</strong> {user?.address || user?.id || t('profile.editor.debug.notFound')}
              </div>
              <div className={`${token ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <strong>{t('profile.editor.debug.hasToken')}:</strong> {token ? `${t('common.yes')} (${token.substring(0, 10)}...)` : `${t('common.no')} - ${t('profile.editor.debug.needLogin')}`}
              </div>
              <div>
                <strong>{t('profile.editor.debug.method')}:</strong> authApi.updateProfile()
              </div>
              <div>
                <strong>{t('profile.editor.debug.backend')}:</strong> {t('profile.editor.debug.usingEnvVars')}
              </div>
              <div>
                <strong>{t('profile.editor.debug.hasChanges')}:</strong> {hasChanges ? t('common.yes') : t('common.no')}
              </div>
              <div>
                <strong>Username status:</strong> {usernameStatus}
              </div>
              <div>
                <strong>Avatar pending:</strong> {avatarFile ? 'Yes (new file selected)' : 'No'}
              </div>
            </div>

            <div className="mt-4">
              <strong className="text-sm text-gray-900 dark:text-gray-100">{t('profile.editor.debug.apiLog')}:</strong>
              <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                {apiDebug.map((log, index) => (
                  <div key={index} className={`text-xs p-2 rounded ${
                    log.includes('❌') ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                    log.includes('✅') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    log.includes('🎯') ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    log.includes('📤') ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                    log.includes('⚠️') ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                    log.includes('Response:') ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                    'bg-gray-100 dark:bg-[#2D2C3A] text-gray-800 dark:text-gray-300'
                  }`}>
                    {log}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg">
              <div className="text-xs text-green-800 dark:text-green-300">
                <strong>✅ {t('profile.editor.debug.fixedIssues')}:</strong><br/>
                • {t('profile.editor.debug.fix1')}<br/>
                • {t('profile.editor.debug.fix2')}<br/>
                • {t('profile.editor.debug.fix3')}<br/>
                • {t('profile.editor.debug.fix4')}<br/>
                • Avatar upload via IPFS<br/>
                • Username availability check
              </div>
            </div>

            {!token && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg">
                <div className="text-xs text-red-800 dark:text-red-300">
                  <strong>🚨 {t('profile.editor.debug.authRequired')}:</strong><br/>
                  {t('profile.editor.debug.authRequiredMessage')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-[#3D3C4A] bg-gray-50 dark:bg-[#353444]">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('profile.editor.requiredFields')}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitDisabled}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                !isSubmitDisabled
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isUploadingAvatar ? (t('profile.editor.uploadingAvatar') || 'Uploading photo...') : t('profile.editor.saving')}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('profile.editor.saveChanges')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}