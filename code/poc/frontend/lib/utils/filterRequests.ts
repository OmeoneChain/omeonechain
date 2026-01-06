// File: code/poc/frontend/lib/utils/filterRequests.ts
// Utility function to filter discovery requests based on search criteria

import type { RequestFilters } from '@/components/discover/RequestSearch';

// Type matching the DiscoveryRequest from RequestCard
interface DiscoveryRequest {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  cuisine_type: string | null;
  occasion: string | null;
  budget_range: string | null;
  dietary_restrictions: string[] | null;
  bounty_amount: number;
  status: 'open' | 'answered' | 'closed';
  response_count: number;
  view_count: number;
  created_at: string;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    reputation_score: number;
  };
  is_bookmarked?: boolean;
}

/**
 * Filter discovery requests based on search query and filter criteria
 * 
 * @param requests - Array of discovery requests to filter
 * @param filters - Filter criteria including query, status, hasBounty, and budget
 * @returns Filtered array of requests
 */
export function filterRequests(
  requests: DiscoveryRequest[],
  filters: RequestFilters
): DiscoveryRequest[] {
  const { query, status, hasBounty, budget } = filters;
  const searchQuery = query.toLowerCase().trim();

  return requests.filter((request) => {
    // Text search filter
    if (searchQuery) {
      const searchableFields = [
        request.title,
        request.description,
        request.location,
        request.cuisine_type,
        request.occasion,
        request.creator.display_name,
        request.creator.username,
        // Also search dietary restrictions
        ...(request.dietary_restrictions || []),
      ]
        .filter(Boolean)
        .map((field) => field!.toLowerCase());

      const matchesSearch = searchableFields.some((field) =>
        field.includes(searchQuery)
      );

      if (!matchesSearch) return false;
    }

    // Status filter
    if (status !== 'all' && request.status !== status) {
      return false;
    }

    // Bounty filter
    if (hasBounty !== null) {
      const requestHasBounty = request.bounty_amount > 0;
      if (hasBounty && !requestHasBounty) return false;
      if (!hasBounty && requestHasBounty) return false;
    }

    // Budget filter
    if (budget !== 'all' && request.budget_range) {
      // Normalize budget comparison (handle variations like "$", "$$", "$$$", "$$$$")
      // Also handle text like "Budget", "Moderate", "Expensive", "Luxury"
      const normalizedRequestBudget = normalizeBudget(request.budget_range);
      if (normalizedRequestBudget !== budget) return false;
    } else if (budget !== 'all' && !request.budget_range) {
      // If filtering by budget but request has no budget set, exclude it
      return false;
    }

    return true;
  });
}

/**
 * Normalize budget strings to standard format ($, $$, $$$, $$$$)
 */
function normalizeBudget(budgetStr: string): string {
  const lower = budgetStr.toLowerCase().trim();
  
  // Direct matches
  if (['$', '$$', '$$$', '$$$$'].includes(budgetStr)) {
    return budgetStr;
  }
  
  // Text-based budget mapping
  const budgetMap: Record<string, string> = {
    'budget': '$',
    'cheap': '$',
    'inexpensive': '$',
    'affordable': '$',
    'moderate': '$$',
    'mid-range': '$$',
    'midrange': '$$',
    'expensive': '$$$',
    'upscale': '$$$',
    'high-end': '$$$',
    'luxury': '$$$$',
    'fine dining': '$$$$',
    'premium': '$$$$',
  };
  
  return budgetMap[lower] || budgetStr;
}

/**
 * Get count of requests matching each status
 */
export function getStatusCounts(requests: DiscoveryRequest[]): {
  all: number;
  open: number;
  answered: number;
  closed: number;
} {
  return {
    all: requests.length,
    open: requests.filter((r) => r.status === 'open').length,
    answered: requests.filter((r) => r.status === 'answered').length,
    closed: requests.filter((r) => r.status === 'closed').length,
  };
}

/**
 * Get count of requests with bounties
 */
export function getBountyCounts(requests: DiscoveryRequest[]): {
  all: number;
  withBounty: number;
  noBounty: number;
} {
  const withBounty = requests.filter((r) => r.bounty_amount > 0).length;
  return {
    all: requests.length,
    withBounty,
    noBounty: requests.length - withBounty,
  };
}

export type { DiscoveryRequest };