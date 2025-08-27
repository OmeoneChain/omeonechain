// =============================================================================
// FILE: components/profile/ProfileEditor.tsx
// FIXED VERSION: Uses authApi.updateProfile method cleanly
// =============================================================================

import React, { useState, useEffect } from 'react';
import { User, Check, X, Save, Loader2, MapPin } from 'lucide-react';
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
      setApiDebug(['✅ ProfileEditor initialized with authApi.updateProfile']);
    }
  }, [isOpen, user]);

  // Check for changes
  useEffect(() => {
    const changed = Object.keys(formData).some(key => 
      formData[key as keyof ProfileData] !== originalData[key as keyof ProfileData]
    );
    setHasChanges(changed);
  }, [formData, originalData]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addDebugLog = (message: string) => {
    setApiDebug(prev => [message, ...prev.slice(0, 9)]); // Keep last 10 logs
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username?.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.display_name?.trim()) {
      newErrors.display_name = 'Display name is required';
    } else if (formData.display_name.length < 2) {
      newErrors.display_name = 'Display name must be at least 2 characters';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    // Check for authentication token
    if (!token) {
      toast.error('You are not logged in. Please log in first to update your profile.');
      addDebugLog('❌ NO TOKEN - User needs to log in');
      return;
    }

    addDebugLog(`🔑 Token found: ${token.substring(0, 20)}...`);

    setIsLoading(true);
    setApiDebug([]);

    try {
      console.log('💾 Saving profile data:', formData);
      
      // Clean data to match backend expectations
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

      // FIXED: Use the API client method instead of manual fetch
      const result = await authApi.updateProfile(cleanProfileData);

      if (!result.success) {
        throw new Error(result.error || 'Profile update failed');
      }

      addDebugLog(`✅ Success: Profile updated via authApi`);
      
      console.log('✅ Profile saved successfully:', result);
      
      // Call onSave callback if provided
      onSave?.(formData);
      
      // Show success message
      toast.success('Profile updated successfully! 🎉');
      
      // Close the editor
      onClose();
      
      // Trigger a page refresh to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Profile save failed:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        toast.error('Cannot connect to server. Please check if the backend is running.');
        addDebugLog('❌ CONNECTION_REFUSED - Backend not running or wrong URL');
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        toast.error('Authentication failed. Please log in again.');
        addDebugLog('❌ UNAUTHORIZED - Invalid token or session expired');
      } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
        toast.error('Invalid data. Please check your input and try again.');
        addDebugLog('❌ BAD_REQUEST - Server rejected the data');
      } else {
        toast.error(error.message || 'Something went wrong. Please try again.');
        addDebugLog(`❌ ERROR: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Generate avatar URL
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${formData.username || formData.display_name || 'user'}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">Edit Profile</h2>
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
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.display_name || 'User')}&background=3b82f6&color=fff`;
                  }}
                />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Profile Photo</h3>
                <p className="text-sm text-gray-500">Auto-generated avatar</p>
              </div>
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username *
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
                placeholder="Enter your username"
                maxLength={30}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
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
                placeholder="Your display name"
                maxLength={50}
              />
              {errors.display_name && (
                <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Tell others about yourself..."
              />
              <p className="mt-1 text-sm text-gray-500">
                {(formData.bio || '').length}/500 characters
              </p>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  City
                </label>
                <input
                  type="text"
                  value={formData.location_city || ''}
                  onChange={(e) => handleInputChange('location_city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your city"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={formData.location_country || 'Brazil'}
                  onChange={(e) => handleInputChange('location_country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Brazil">Brazil</option>
                  <option value="United States">United States</option>
                  <option value="Portugal">Portugal</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Spain">Spain</option>
                  <option value="Italy">Italy</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
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
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Debug Panel - Right Side */}
          <div className="w-96 border-l bg-gray-50 p-4">
            <h3 className="font-bold text-sm mb-3">🔍 Debug Information</h3>
            
            <div className="space-y-2 text-xs">
              <div>
                <strong>User ID:</strong> {user?.address || user?.id || 'Not found'}
              </div>
              <div className={`${token ? 'text-green-600' : 'text-red-600'}`}>
                <strong>Has Token:</strong> {token ? `Yes (${token.substring(0, 10)}...)` : 'No - Need to log in!'}
              </div>
              <div>
                <strong>Method:</strong> authApi.updateProfile()
              </div>
              <div>
                <strong>Backend:</strong> Using environment variables
              </div>
              <div>
                <strong>Has Changes:</strong> {hasChanges ? 'Yes' : 'No'}
              </div>
            </div>

            <div className="mt-4">
              <strong className="text-sm">API Call Log:</strong>
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
                <strong>✅ Fixed Issues:</strong><br/>
                • Using authApi.updateProfile method<br/>
                • Proper environment variable handling<br/>
                • Clean API client with auth headers<br/>
                • Better error handling
              </div>
            </div>

            {!token && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-xs text-red-800">
                  <strong>🚨 Authentication Required:</strong><br/>
                  You need to log in with your wallet first.<br/>
                  Close this dialog and click "Connect Wallet" to authenticate.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            * Required fields for profile completion
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}