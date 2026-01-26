// File: code/poc/frontend/components/auth/OnboardingChecklist.tsx
// Gamified onboarding checklist with BOCA token rewards (50 BOCA total)
// Aligned with White Paper v1.2
// Updated: Tasks are now clickable and navigate to relevant pages

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Users, 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  Circle,
  ChevronRight,
  Coins,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  reward: number;
  icon: React.ReactNode;
  completed: boolean;
  progress?: {
    current: number;
    target: number;
  };
}

interface OnboardingChecklistProps {
  userName: string;
  onStart: () => void;
  onSkip: () => void;
  onTaskClick?: (taskId: string) => void; // NEW: Handle task clicks
  initialProgress?: {
    followedCount: number;
    recommendationsCount: number;
    interactionsCount: number;
    uniqueAuthorsInteracted: number;
  };
}

export default function OnboardingChecklist({
  userName,
  onStart,
  onSkip,
  onTaskClick,
  initialProgress = {
    followedCount: 0,
    recommendationsCount: 0,
    interactionsCount: 0,
    uniqueAuthorsInteracted: 0
  }
}: OnboardingChecklistProps) {
  const t = useTranslations('auth');
  const [showBocaInfo, setShowBocaInfo] = useState(false);
  
  // Use useMemo instead of useState + useEffect to avoid infinite loop
  // (the `t` function from useTranslations gets a new reference each render)
  const tasks = React.useMemo<OnboardingTask[]>(() => [
    {
      id: 'follow',
      title: t('onboardingChecklist.followTitle') || 'Follow 3+ people',
      description: t('onboardingChecklist.followDescription') || 'Personalize your feed',
      reward: 5.0,
      icon: <Users className="w-5 h-5" />,
      completed: initialProgress.followedCount >= 3,
      progress: {
        current: Math.min(initialProgress.followedCount, 3),
        target: 3
      }
    },
    {
      id: 'recommend',
      title: t('onboardingChecklist.recommendTitle') || 'Create 5 recommendations',
      description: t('onboardingChecklist.recommendDescription') || 'Share your favorite places',
      reward: 25.0,
      icon: <Star className="w-5 h-5" />,
      completed: initialProgress.recommendationsCount >= 5,
      progress: {
        current: Math.min(initialProgress.recommendationsCount, 5),
        target: 5
      }
    },
    {
      id: 'engage',
      title: t('onboardingChecklist.engageTitle') || 'Interact with 10 posts',
      description: t('onboardingChecklist.engageDescription') || 'Like posts from at least 3 people',
      reward: 20.0,
      icon: <MessageSquare className="w-5 h-5" />,
      completed: initialProgress.interactionsCount >= 10 && initialProgress.uniqueAuthorsInteracted >= 3,
      progress: {
        current: Math.min(initialProgress.interactionsCount, 10),
        target: 10
      }
    }
  ], [
    initialProgress.followedCount,
    initialProgress.recommendationsCount,
    initialProgress.interactionsCount,
    initialProgress.uniqueAuthorsInteracted,
    t
  ]);

  // Derived calculations
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalReward = tasks.reduce((sum, task) => sum + task.reward, 0);
  const earnedReward = tasks
    .filter(task => task.completed)
    .reduce((sum, task) => sum + task.reward, 0);
  const progressPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  // Handle task card click
  const handleTaskClick = (taskId: string) => {
    if (onTaskClick) {
      onTaskClick(taskId);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 bg-gradient-to-br from-coral-400 to-coral-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-navy-900 mb-2"
        >
          {t('onboardingChecklist.welcome') || 'Welcome,'} {userName}!
        </motion.h1>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600"
        >
          {t('onboardingChecklist.subtitle') || 'Complete these tasks to earn BOCA'}
        </motion.p>
        
        {/* What's BOCA? Info Toggle */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-3"
        >
          <button
            onClick={() => setShowBocaInfo(!showBocaInfo)}
            className="inline-flex items-center gap-1 text-sm text-coral-600 hover:text-coral-700 transition-colors"
          >
            <Info className="w-4 h-4" />
            <span>{t('onboardingChecklist.whatIsBoca') || "What's BOCA?"}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showBocaInfo ? 'rotate-180' : ''}`} />
          </button>
          
          {showBocaInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 p-3 bg-coral-50 rounded-lg text-sm text-gray-700 border border-coral-100"
            >
              {t('onboardingChecklist.bocaExplanation') || "Your currency in BocaBoca. Earn them by sharing great recommendations, spend them to discover your next meal. More features coming soon!"}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            {t('onboardingChecklist.progress') || 'Progress:'} {completedTasks}/{tasks.length} {t('onboardingChecklist.tasks') || 'tasks'}
          </span>
          <span className="font-medium text-coral-600">
            {earnedReward.toFixed(1)} / {totalReward.toFixed(1)} BOCA
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-coral-400 to-coral-600 rounded-full"
          />
        </div>
      </motion.div>

      {/* Task List - NOW CLICKABLE */}
      <div className="space-y-3 mb-6">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            onClick={() => handleTaskClick(task.id)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              task.completed 
                ? 'bg-green-50 border-green-200 hover:border-green-300' 
                : 'bg-white border-gray-200 hover:border-coral-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox/Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                task.completed 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  task.icon
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium ${
                    task.completed ? 'text-green-800' : 'text-gray-900'
                  }`}>
                    {task.completed ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 inline" />
                        {task.title}
                      </span>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 inline mr-1 text-gray-300" />
                        {task.title}
                      </>
                    )}
                  </h3>
                </div>
                
                <p className={`text-sm mt-0.5 ${
                  task.completed ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {task.description}
                </p>
                
                {/* Progress indicator for incomplete tasks */}
                {!task.completed && task.progress && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{task.progress.current} / {task.progress.target}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-coral-400 rounded-full transition-all"
                        style={{ width: `${(task.progress.current / task.progress.target) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Reward Badge + Arrow */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                  task.completed 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-coral-50 text-coral-600'
                }`}>
                  <Coins className="w-3.5 h-3.5" />
                  {task.id === 'recommend' ? (
                    <span>+{(task.reward / 5).toFixed(1)} {t('onboardingChecklist.each') || 'each'}</span>
                  ) : (
                    <span>+{task.reward.toFixed(1)}</span>
                  )}
                </div>
                {/* Arrow indicator showing it's clickable */}
                <ChevronRight className={`w-5 h-5 ${
                  task.completed ? 'text-green-400' : 'text-gray-400'
                }`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Total Reward Banner */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="p-4 bg-gradient-to-r from-coral-50 to-orange-50 rounded-xl border border-coral-200 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-coral-500 rounded-full flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {t('onboardingChecklist.totalPossible') || 'Total possible:'}
              </p>
              <p className="font-bold text-coral-700 text-lg">
                {totalReward.toFixed(1)} BOCA
              </p>
            </div>
          </div>
          <Sparkles className="w-6 h-6 text-coral-400" />
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="space-y-3"
      >
        <button
          onClick={onStart}
          className="w-full py-4 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-coral-500/25"
        >
          {t('onboardingChecklist.start') || 'Get started'}
          <ArrowRight className="w-5 h-5" />
        </button>
        
        <button
          onClick={onSkip}
          className="w-full py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center justify-center gap-1"
        >
          {t('onboardingChecklist.skipForNow') || 'Skip for now'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-xs text-gray-500 mt-6"
      >
        {t('onboardingChecklist.note') || 'You can complete these tasks at any time'}
      </motion.p>
    </div>
  );
}