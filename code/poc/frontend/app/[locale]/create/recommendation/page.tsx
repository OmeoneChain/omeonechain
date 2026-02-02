"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import RecommendationCreationFlow from '@/components/recommendation/RecommendationCreationFlow';

export default function CreateRecommendationPage() {
  const router = useRouter();
  
  return (
    <RecommendationCreationFlow 
      onSuccess={() => router.push('/feed')}
    />
  );
}