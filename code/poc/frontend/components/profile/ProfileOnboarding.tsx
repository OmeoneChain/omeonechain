// File: components/profile/ProfileOnboarding.tsx
// Shows profile completion for new users or incomplete profiles

'use client';

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ProfileCompletion } from './ProfileCompletion';
import { ProfileEditor } from './ProfileEditor';

interface ProfileOnboardingProps {
  className?: string;
}

export function ProfileOnboarding({ className = '' }: ProfileOnboardingProps) {
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);

  // Don't show if user doesn't exist or profile is complete
  if (!user || (user.profileCompletion || 0) >= 80) {
    return null;
  }

  const completionScore = user.profileCompletion || 0;

  return (
    <>
      <div className={`mb-6 ${className}`}>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to OmeoneChain! 👋
            </h2>
            <p className="text-gray-600">
              Complete your profile to start earning tokens and building trust in the community.
            </p>
          </div>

          <ProfileCompletion
            user={user}
            completionScore={completionScore}
            onEditProfile={() => setShowEditor(true)}
            showDetails={true}
          />
        </div>
      </div>

      {showEditor && (
        <ProfileEditor
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          onSave={() => {
            setShowEditor(false);
            // The ProfileEditor will handle updating the user context
          }}
        />
      )}
    </>
  );
}