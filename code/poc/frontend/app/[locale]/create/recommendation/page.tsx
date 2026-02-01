// app/[locale]/create/recommendation/page.tsx
// Simple wrapper to use the existing RecommendationCreationFlow component
"use client"

import React from 'react';
import RecommendationCreationFlow from '@/components/recommendation/RecommendationCreationFlow';

export default function CreateRecommendationPage() {
  return <RecommendationCreationFlow />;
}