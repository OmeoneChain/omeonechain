// =============================================================================
// FILE: components/profile/ProfileEditor.tsx
// FIXED VERSION: Uses authApi.updateProfile method cleanly
// UPDATED: Internationalized with next-intl
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { User, X, Save, Loader2, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../src/services/api';
import { toast } from 'react-hot-toast';

interface ProfileData {
  username?: string;
  display_name?: string;
  bio?: string;
  location_city?: string;
  location_country?: string;
  email?: string;
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
        email: user.email || ''
      };
      
      console.log('📝 Initial form data:', initial);
      
      setFormData(initial);
      setOriginalData(initial);
      setHasChanges(false);
      setErrors({});
      setApiDebug([t('profile.editor.debug.initialized')]);
    }
  }, [isOpen, user, t]);

  // Check for changes
  useEffect(() => {
    const changed = Object.keys(formData).some(key => 
      formData[key as keyof ProfileData] !== originalData[key as keyof ProfileData]
    );
    setHasChanges(changed);
  }, [formData, originalData]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
      console.log('💾 Saving profile data:', formData);
      
      const cleanProfileData = {
        username: formData.username?.trim() || '',
        display_name: formData.display_name?.trim() || '',
        bio: formData.bio?.trim() || '',
        location_city: formData.location_city?.trim() || '',
        location_country: formData.location_country?.trim() || '',
        email: formData.email?.trim() || ''
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
      
      onSave?.(formData);
      
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

  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${formData.username || formData.display_name || 'user'}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">{t('profile.editor.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex">
          {/* Form - Left Side */}
          <div className="flex-1 p-6 space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={t('profile.editor.avatar.alt')}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.display_name || 'User')}&background=3b82f6&color=fff`;
                  }}
                />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{t('profile.editor.avatar.title')}</h3>
                <p className="text-sm text-gray-500">{t('profile.editor.avatar.description')}</p>
              </div>
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.editor.fields.username')} *
              </label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.username
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder={t('profile.editor.placeholders.username')}
                maxLength={30}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.editor.fields.displayName')} *
              </label>
              <input
                type="text"
                value={formData.display_name || ''}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.display_name
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder={t('profile.editor.placeholders.displayName')}
                maxLength={50}
              />
              {errors.display_name && (
                <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.editor.fields.bio')}
              </label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={t('profile.editor.placeholders.bio')}
              />
              <p className="mt-1 text-sm text-gray-500">
                {(formData.bio || '').length}/500 {t('common.characters')}
              </p>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {t('profile.editor.fields.city')}
                </label>
                <input
                  type="text"
                  value={formData.location_city || ''}
                  onChange={(e) => handleInputChange('location_city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('profile.editor.placeholders.city')}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile.editor.fields.country')}
                </label>
                <select
                  value={formData.location_country || 'Brazil'}
                  onChange={(e) => handleInputChange('location_country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.editor.fields.email')}
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder={t('profile.editor.placeholders.email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Debug Panel - Right Side */}
          <div className="w-96 border-l bg-gray-50 p-4">
            <h3 className="font-bold text-sm mb-3">🔍 {t('profile.editor.debug.title')}</h3>
            
            <div className="space-y-2 text-xs">
              <div>
                <strong>{t('profile.editor.debug.userId')}:</strong> {user?.address || user?.id || t('profile.editor.debug.notFound')}
              </div>
              <div className={`${token ? 'text-green-600' : 'text-red-600'}`}>
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
            </div>

            <div className="mt-4">
              <strong className="text-sm">{t('profile.editor.debug.apiLog')}:</strong>
              <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                {apiDebug.map((log, index) => (
                  <div key={index} className={`text-xs p-2 rounded ${
                    log.includes('❌') ? 'bg-red-100 text-red-800' :
                    log.includes('✅') ? 'bg-green-100 text-green-800' :
                    log.includes('🎯') ? 'bg-blue-100 text-blue-800' :
                    log.includes('Response:') ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100'
                  }`}>
                    {log}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs text-green-800">
                <strong>✅ {t('profile.editor.debug.fixedIssues')}:</strong><br/>
                • {t('profile.editor.debug.fix1')}<br/>
                • {t('profile.editor.debug.fix2')}<br/>
                • {t('profile.editor.debug.fix3')}<br/>
                • {t('profile.editor.debug.fix4')}
              </div>
            </div>

            {!token && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-xs text-red-800">
                  <strong>🚨 {t('profile.editor.debug.authRequired')}:</strong><br/>
                  {t('profile.editor.debug.authRequiredMessage')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            {t('profile.editor.requiredFields')}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isLoading || Object.keys(errors).length > 0}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                hasChanges && !isLoading && Object.keys(errors).length === 0
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('profile.editor.saving')}</span>
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