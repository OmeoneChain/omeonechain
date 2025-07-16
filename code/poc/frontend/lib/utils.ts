import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Trust Score Utilities
export const calculateTrustScore = (
  directFriendEndorsements: number,
  friendOfFriendEndorsements: number,
  userReputation: number = 1
): number => {
  const directWeight = 0.75;
  const indirectWeight = 0.25;
  
  const weightedScore = (
    (directFriendEndorsements * directWeight) + 
    (friendOfFriendEndorsements * indirectWeight)
  ) * userReputation;
  
  // Scale to 0-10 range with reasonable maximums
  return Math.min(10, Math.max(0, weightedScore));
};

export const formatTrustScore = (score: number): string => {
  return score.toFixed(1);
};

export const getTrustLevel = (score: number): 'high' | 'medium' | 'low' | 'insufficient' => {
  if (score >= 7.5) return 'high';
  if (score >= 5.0) return 'medium';
  if (score >= 2.5) return 'low';
  return 'insufficient';
};

// Social Distance Utilities
export const getSocialDistanceWeight = (hops: number): number => {
  if (hops === 1) return 0.75; // Direct friends
  if (hops === 2) return 0.25; // Friends-of-friends
  return 0; // Beyond 2 hops = no weight
};

export const formatSocialDistance = (hops: number): string => {
  if (hops === 1) return '±1 hop';
  if (hops === 2) return '±2 hops';
  return 'Mixed';
};

// Token Utilities  
export const formatTokenAmount = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M TOK`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K TOK`;
  }
  return `${amount.toFixed(1)} TOK`;
};

export const formatTokenValue = (tokAmount: number, tokPrice: number = 0.12): string => {
  const usdValue = tokAmount * tokPrice;
  if (usdValue >= 1) {
    return `$${usdValue.toFixed(2)}`;
  }
  return `$${usdValue.toFixed(3)}`;
};

// Date Utilities
export const timeAgo = (date: Date | string): string => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return past.toLocaleDateString();
};

// Validation Utilities
export const isValidTrustScore = (score: number): boolean => {
  return score >= 0 && score <= 10 && !isNaN(score);
};

export const isValidTokenAmount = (amount: number): boolean => {
  return amount >= 0 && !isNaN(amount) && isFinite(amount);
};

// URL Utilities
export const createShareUrl = (recommendationId: string): string => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://omeonechain.com';
  return `${baseUrl}/recommendation/${recommendationId}`;
};

// Animation Utilities
export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

// Local Storage Utilities (for user preferences)
export const getStoredPreference = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setStoredPreference = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

// Trust Mode Utilities (Progressive Disclosure)
export const shouldShowAdvancedFeatures = (userLevel: 'beginner' | 'intermediate' | 'advanced'): boolean => {
  return userLevel !== 'beginner';
};

export const shouldShowTokenDetails = (userLevel: 'beginner' | 'intermediate' | 'advanced'): boolean => {
  return userLevel === 'advanced';
};

// Color Utilities
export const getRandomGradient = (): string => {
  const gradients = [
    'from-trust-500 to-trust-600',
    'from-social-500 to-social-600', 
    'from-success-500 to-success-600',
    'from-trust-400 to-social-500',
    'from-social-400 to-success-500'
  ];
  
  return gradients[Math.floor(Math.random() * gradients.length)];
};