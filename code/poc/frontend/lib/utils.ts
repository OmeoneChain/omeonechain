// Core utility functions for OmeoneChain
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
export const timeAgo = (date: Date | string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'agora';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}m`;
  return `${Math.floor(diffInSeconds / 31536000)}a`;
};

export const formatDate = (date: Date | string, locale: string = 'pt-BR'): string => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Token and Currency Utilities
export const formatTokenAmount = (amount: number, decimals: number = 2): string => {
  if (amount < 1000) return amount.toFixed(decimals);
  if (amount < 1000000) return `${(amount / 1000).toFixed(1)}K`;
  return `${(amount / 1000000).toFixed(1)}M`;
};

export const formatCurrency = (amount: number, currency: string = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
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

export const generateRestaurantUrl = (id: string, name: string): string => {
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

// Recommendation Utilities
export const getRecommendationTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'romântico': 'bg-pink-100 text-pink-800',
    'família': 'bg-blue-100 text-blue-800',
    'trabalho': 'bg-green-100 text-green-800',
    'casual': 'bg-gray-100 text-gray-800',
    'especial': 'bg-purple-100 text-purple-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

export const getCuisineTypeColor = (cuisine: string): string => {
  const colors: Record<string, string> = {
    'brasileira': 'bg-green-100 text-green-800',
    'italiana': 'bg-red-100 text-red-800',
    'japonesa': 'bg-blue-100 text-blue-800',
    'francesa': 'bg-purple-100 text-purple-800',
    'mediterranea': 'bg-yellow-100 text-yellow-800'
  };
  return colors[cuisine.toLowerCase()] || 'bg-gray-100 text-gray-800';
};