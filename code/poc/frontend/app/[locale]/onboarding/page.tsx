// File: code/poc/frontend/src/app/onboarding/page.tsx
// Main onboarding flow for new BocaBoca users

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  ArrowLeft,
  Sparkles
} from 'lucide-react';

// Import onboarding step components
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import LocationStep from '@/components/onboarding/LocationStep';
import TastePreferencesStep from '@/components/onboarding/TastePreferencesStep';
import FollowSuggestionsStep from '@/components/onboarding/FollowSuggestionsStep';
import FirstRecommendationStep from '@/components/onboarding/FirstRecommendationStep';

interface OnboardingProgress {
  currentStep: number;
  completedSteps: Set<number>;
  bocaEarned: number;
  canSkipToFeed: boolean;
  userData: {
    username?: string;
    location_city?: string;
    location_country?: string;
    rated_restaurants?: number;
    following_count?: number;
    first_recommendation?: boolean;
  };
}

const STEPS = [
  { 
    id: 0, 
    name: 'Welcome', 
    required: true,
    description: 'Choose your username'
  },
  { 
    id: 1, 
    name: 'Location', 
    required: false,
    description: 'Where do you dine?'
  },
  { 
    id: 2, 
    name: 'Taste Profile', 
    required: false,
    description: 'Rate 3 places you love'
  },
  { 
    id: 3, 
    name: 'Connect', 
    required: false,
    description: 'Follow food enthusiasts'
  },
  { 
    id: 4, 
    name: 'Share', 
    required: false,
    description: 'Your first recommendation'
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  
  const [progress, setProgress] = useState<OnboardingProgress>({
    currentStep: 0,
    completedSteps: new Set(),
    bocaEarned: 0,
    canSkipToFeed: false,
    userData: {}
  });

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Redirect if user is not authenticated or already completed onboarding
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        toast.error('Please sign in to continue');
        router.push('/');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Handle step completion
  const completeStep = (stepId: number, data?: any) => {
    setProgress(prev => {
      const newCompleted = new Set(prev.completedSteps);
      newCompleted.add(stepId);
      
      return {
        ...prev,
        completedSteps: newCompleted,
        userData: { ...prev.userData, ...data },
        canSkipToFeed: newCompleted.size >= 1 // Can skip after completing username
      };
    });
  };

  // Navigate to next step
  const goToNextStep = () => {
    if (progress.currentStep < STEPS.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setProgress(prev => ({
          ...prev,
          currentStep: prev.currentStep + 1
        }));
        setIsTransitioning(false);
      }, 300);
    } else {
      // Completed all steps, go to feed
      finishOnboarding();
    }
  };

  // Navigate to previous step
  const goToPreviousStep = () => {
    if (progress.currentStep > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setProgress(prev => ({
          ...prev,
          currentStep: prev.currentStep - 1
        }));
        setIsTransitioning(false);
      }, 300);
    }
  };

  // Skip current step (if not required)
  const skipStep = () => {
    const currentStepInfo = STEPS[progress.currentStep];
    
    if (currentStepInfo.required) {
      toast.error('This step is required to continue');
      return;
    }

    if (!progress.canSkipToFeed) {
      toast('Complete your username first', { icon: '👤' });
      return;
    }

    goToNextStep();
  };

  // Skip to feed (after completing username)
  const skipToFeed = async () => {
    if (!progress.canSkipToFeed) {
      toast.error('Please complete your username first');
      return;
    }

    // Update user's onboarding status
    try {
      await updateUser({
        profileCompletion: 35, // Username completed
        onboarding_completed: true
      });
      
      toast.success('Welcome to BocaBoca! 🎉');
      router.push('/feed');
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  // Finish onboarding and go to feed
  const finishOnboarding = async () => {
    try {
      // Calculate final profile completion
      const completionScore = 35 + (progress.completedSteps.size - 1) * 10; // Start at 35% after username
      
      await updateUser({
        profileCompletion: Math.min(completionScore, 100),
        onboarding_completed: true
      });
      
      toast.success('Welcome to BocaBoca! 🎉', {
        duration: 4000,
        icon: '🍽️'
      });
      
      setTimeout(() => {
        router.push('/feed');
      }, 500);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <div>
                <div className="font-bold text-lg text-gray-900">BocaBoca</div>
                <div className="text-xs text-gray-500">Profile Setup</div>
              </div>
            </div>

            {/* Skip to Feed button */}
            {progress.canSkipToFeed && (
              <button
                onClick={skipToFeed}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Skip to Feed →
              </button>
            )}
          </div>

          {/* Progress Steps */}
          <div className="mt-4 flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    progress.completedSteps.has(step.id)
                      ? 'bg-green-500 text-white'
                      : progress.currentStep === step.id
                      ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {progress.completedSteps.has(step.id) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 text-center ${
                    progress.currentStep === step.id ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
                
                {index < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-colors ${
                    progress.completedSteps.has(step.id)
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={progress.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8"
          >
            {progress.currentStep === 0 && (
              <WelcomeStep
                user={user}
                onComplete={(username) => {
                  completeStep(0, { username });
                  goToNextStep();
                }}
              />
            )}

            {progress.currentStep === 1 && (
              <LocationStep
                onComplete={(location) => {
                  completeStep(1, location);
                  goToNextStep();
                }}
                onSkip={skipStep}
              />
            )}

            {progress.currentStep === 2 && (
              <TastePreferencesStep
                userLocation={progress.userData.location_city}
                onComplete={(count) => {
                  completeStep(2, { rated_restaurants: count });
                  goToNextStep();
                }}
                onSkip={skipStep}
              />
            )}

            {progress.currentStep === 3 && (
              <FollowSuggestionsStep
                onComplete={(count) => {
                  completeStep(3, { following_count: count });
                  goToNextStep();
                }}
                onSkip={skipStep}
              />
            )}

            {progress.currentStep === 4 && (
              <FirstRecommendationStep
                onComplete={() => {
                  completeStep(4, { first_recommendation: true });
                  finishOnboarding();
                }}
                onSkip={() => {
                  finishOnboarding();
                }}
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              {progress.currentStep > 0 && (
                <button
                  onClick={goToPreviousStep}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              <div className="flex-1" />

              {!STEPS[progress.currentStep].required && progress.canSkipToFeed && (
                <button
                  onClick={skipStep}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors mr-4"
                >
                  Skip this step
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Summary */}
        {progress.completedSteps.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>Profile {Math.round((progress.completedSteps.size / STEPS.length) * 100)}% complete</span>
              </div>
              <div className="text-gray-500">
                {progress.completedSteps.size} of {STEPS.length} steps done
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}