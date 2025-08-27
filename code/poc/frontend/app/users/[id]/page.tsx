// File: code/poc/frontend/app/users/[id]/page.tsx
// Updated to use the enhanced UserProfile component with profile editing

'use client';

import React from 'react';
import { UserProfile } from '../../../components/profile/UserProfile';
import { useAuth } from '../../../hooks/useAuth';
import CleanHeader from '@/components/CleanHeader';

interface UserProfilePageProps {
  params: {
    id: string;
  };
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const userId = params.id;
  const { user: currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <CleanHeader currentPath={`/users/${userId}`} />
      
      {/* Profile Content - Now using our enhanced UserProfile component */}
      <div className="pt-4">
        <UserProfile 
          userId={userId}
          currentUserId={currentUser?.id || currentUser?.address}
        />
      </div>
    </div>
  );
}