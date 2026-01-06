// Followers List Page - Dedicated page for viewing user's followers
// File: code/frontend/src/app/users/[id]/followers/page.tsx

import { Metadata } from 'next';
import FollowersPageClient from './FollowersPageClient'; // ✅ Default import (no curly braces)

interface FollowersPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: FollowersPageProps): Promise<Metadata> {
  return {
    title: 'Followers | OmeoneChain',
    description: 'View followers list on OmeoneChain',
    openGraph: {
      title: 'Followers | OmeoneChain',
      description: 'View followers list on OmeoneChain',
    }
  };
}

export default function FollowersPage({ params }: FollowersPageProps) {
  return <FollowersPageClient userId={params.id} />;
}