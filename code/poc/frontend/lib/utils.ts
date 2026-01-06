// Core utility functions for BocaBoca
import { type ClassValue } from "clsx";

// Safe imports
let clsx: any;
let twMerge: any;

try {
  clsx = require("clsx").clsx;
  twMerge = require("tailwind-merge").twMerge;
} catch (error) {
  console.warn("clsx or tailwind-merge not available, using fallback");
  clsx = (...classes: any[]) => classes.filter(Boolean).join(" ");
  twMerge = (classes: string) => classes;
}

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

export const getTrustScoreColor = (score: number): string => {
  if (score >= 9) return "text-green-600";
  if (score >= 7) return "text-blue-600";
  if (score >= 5) return "text-yellow-600";
  return "text-gray-600";
};

export const getTrustScoreBadgeColor = (score: number): string => {
  if (score >= 9) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 7) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
};

// Date and Time Utilities

/**
 * Returns structured time data for i18n translation
 * Use this in components with useTranslations() for proper localization
 */
export interface TimeAgoData {
  key: string;
  count?: number;
}

export const getTimeAgoData = (date: Date | string): TimeAgoData => {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return { key: 'time.justNow' };
  if (diffInSeconds < 3600) return { key: 'time.minutesAgo', count: Math.floor(diffInSeconds / 60) };
  if (diffInSeconds < 86400) return { key: 'time.hoursAgo', count: Math.floor(diffInSeconds / 3600) };
  if (diffInSeconds < 604800) return { key: 'time.daysAgo', count: Math.floor(diffInSeconds / 86400) };
  if (diffInSeconds < 2592000) return { key: 'time.weeksAgo', count: Math.floor(diffInSeconds / 604800) };
  if (diffInSeconds < 31536000) return { key: 'time.monthsAgo', count: Math.floor(diffInSeconds / 2592000) };
  return { key: 'time.yearsAgo', count: Math.floor(diffInSeconds / 31536000) };
};

/**
 * Returns abbreviated time string (language-neutral abbreviations)
 * For backwards compatibility - prefer getTimeAgoData() + translations in new code
 */
export const timeAgo = (date: Date | string): string => {
  const data = getTimeAgoData(date);
  
  if (data.key === 'time.justNow') return 'now';
  
  const abbrev: Record<string, string> = {
    'time.minutesAgo': 'm',
    'time.hoursAgo': 'h', 
    'time.daysAgo': 'd',
    'time.weeksAgo': 'w',
    'time.monthsAgo': 'mo',
    'time.yearsAgo': 'y'
  };
  
  return `${data.count}${abbrev[data.key] || ''}`;
};

/**
 * Helper function to format time ago with translations
 * Usage in components:
 *   const t = useTranslations();
 *   const displayTime = formatTimeAgoWithTranslation(createdAt, t);
 */
export const formatTimeAgoWithTranslation = (
  date: Date | string,
  t: (key: string, values?: Record<string, any>) => string
): string => {
  const data = getTimeAgoData(date);
  return data.count !== undefined 
    ? t(data.key, { count: data.count })
    : t(data.key);
};

export const formatDate = (date: Date | string, locale: string = 'en-US'): string => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date: Date | string, locale: string = 'en-US'): string => {
  return new Date(date).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Token and Currency Utilities
export const formatTokenAmount = (amount: number, decimals: number = 2): string => {
  if (amount < 1000) return amount.toFixed(decimals);
  if (amount < 1000000) return `${(amount / 1000).toFixed(1)}K`;
  return `${(amount / 1000000).toFixed(1)}M`;
};

export const formatCurrency = (
  amount: number, 
  currency: string = 'USD', 
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
};

// URL and Navigation Utilities
export const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateRestaurantUrl = (id: string | number, name: string): string => {
  const slug = createSlug(name);
  return `/restaurant/${id}/${slug}`;
};

// Social and Engagement Utilities
export const formatEngagementCount = (count: number): string => {
  if (count === 0) return '0';
  if (count === 1) return '1';
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}m`;
};

export const calculateSocialDistance = (
  userConnections: string[],
  targetUser: string,
  maxHops: number = 2
): number => {
  // Simple implementation - in real app would use graph traversal
  if (userConnections.includes(targetUser)) return 1;
  // For now, return 2 for any indirect connection
  return 2;
};

// Validation Utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidWalletAddress = (address: string): boolean => {
  // Basic validation - adjust based on IOTA address format
  return address.length >= 32 && /^[a-zA-Z0-9]+$/.test(address);
};

// Recommendation Utilities - These return CSS classes, not user-facing text
export const getRecommendationTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'romantic': 'bg-pink-100 text-pink-800',
    'family': 'bg-blue-100 text-blue-800',
    'business': 'bg-green-100 text-green-800',
    'casual': 'bg-gray-100 text-gray-800',
    'special': 'bg-purple-100 text-purple-800'
  };
  return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

export const getCuisineTypeColor = (cuisine: string): string => {
  const colors: Record<string, string> = {
    'brazilian': 'bg-green-100 text-green-800',
    'italian': 'bg-red-100 text-red-800',
    'japanese': 'bg-blue-100 text-blue-800',
    'french': 'bg-purple-100 text-purple-800',
    'mediterranean': 'bg-yellow-100 text-yellow-800'
  };
  return colors[cuisine.toLowerCase()] || 'bg-gray-100 text-gray-800';
};