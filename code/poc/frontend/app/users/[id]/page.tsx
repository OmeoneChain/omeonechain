// User Profile Page - Main user profile page using UserProfile component
// File: code/frontend/src/app/users/[id]/page.tsx

'use client';

import React from 'react';
import { UserProfile } from '@/components/social';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface UserProfilePageProps {
  params: {
    id: string;
  };
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = params.id;

  // Handle navigation back
  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">User Profile</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto">
        <UserProfile 
          userId={userId} 
          currentUserId={session?.user?.id} 
        />
      </div>
    </div>
  );
}

// Alternative version with metadata for SEO
export async function generateMetadata({ params }: UserProfilePageProps) {
  // In a real app, you'd fetch user data here for SEO
  // For now, return basic metadata
  return {
    title: 'User Profile | OmeoneChain',
    description: 'View user profile, followers, following, and recommendations on OmeoneChain',
  };
}