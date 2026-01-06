'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  Share2,
  Globe,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  Edit3,
  UserPlus,
  Star,
  Users,
  TrendingUp,
} from 'lucide-react';
import CleanHeader from '@/components/CleanHeader';

// ============================================================================
// TYPES
// ============================================================================

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  cuisineType: string;
  cuisineTypes?: string[];
  priceRange: string;
  priceLevel?: number;
  latitude: number;
  longitude: number;
  googlePlaceId?: string;
  googleRating?: number;
  googleReviewCount?: number;
  phone?: string;
  website?: string;
}

interface Dish {
  id: string;
  name: string;
  rating: number;
  photo_url?: string;
  recommendation_count: number;
}

interface Recommendation {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  overall_rating: number;
  context_tags: string[];
  photos: string[];
  created_at: string;
  visit_date?: string;
  verified_visit: boolean;
  taste_alignment?: number;
  is_following?: boolean;      // Current user follows this author
  is_followed_by?: boolean;    // This author follows current user
  is_friend: boolean;          // Legacy: mutual follow
  author_credibility?: {
    total_recommendations: number;
    expertise_area?: string;
  };
  dishes: {
    name: string;
    rating: number;
  }[];
  likes_count: number;
  comments_count: number;
}

interface TieredRecommendations {
  tier1_friends_high_match: Recommendation[];
  tier2_similar_taste: Recommendation[];
  tier3_friends_low_match: Recommendation[];
  all_network: Recommendation[];
}

interface SuggestedUser {
  id: string;
  display_name: string;
  avatar_url?: string;
  taste_alignment: number;
  recommendations_count: number;
  mutual_restaurants: number;
}

interface UserReview {
  id: string;
  overall_rating: number;
  content: string;
  visit_date: string;
  dishes: { name: string; rating: number }[];
  photos: string[];
}

// Photo data type for rich photo information
interface PhotoData {
  url: string;
  tag: string;
  dishName?: string | null;
  caption?: string | null;
  helpfulCount?: number;
}

// ============================================================================
// BRAND COLORS (kept for consistency; may be used elsewhere later)
// ============================================================================

const colors = {
  warmCoral: '#FF644A',
  terracotta: '#E65441',
  midnightNavy: '#1F1E2A',
  softCream: '#FFF4E1',
  mintBreeze: '#BFE2D9',
  plumShadow: '#35273B',
  stoneGray: '#9CA3AF',
};

/**
 * Clean up address string artifacts from API data
 */
function cleanAddress(address: string | undefined | null): string {
  if (!address) return '';
  return address
    .replace(/__+/g, ' ')
    .replace(/--+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiUrl = (path: string) => {
  const base = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
};

// ============================================================================
// IPFS / PHOTO URL HELPERS
// ============================================================================

const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs';

function normalizePhotoUrl(value: string | null | undefined): string {
  // Guard against null/undefined
  if (!value || typeof value !== 'string') {
    return '';
  }

  // already a normal URL
  if (value.startsWith('http://') || value.startsWith('https://')) return value;

  // ipfs://CID or ipfs://ipfs/CID
  if (value.startsWith('ipfs://')) {
    const cleaned = value.replace('ipfs://', '').replace(/^ipfs\//, '');
    return `${IPFS_GATEWAY}/${cleaned}`;
  }

  // Raw IPFS CID (starts with Qm for v0 or bafy for v1)
  if (value.startsWith('Qm') || value.startsWith('bafy')) {
    return `https://gateway.pinata.cloud/ipfs/${value}`;
  }

  // treat as CID or gateway-relative
  return `${IPFS_GATEWAY}/${value}`;
}

// ============================================================================
// NORMALIZERS / HELPERS
// ============================================================================

const emptyTiered = (): TieredRecommendations => ({
  tier1_friends_high_match: [],
  tier2_similar_taste: [],
  tier3_friends_low_match: [],
  all_network: [],
});

/**
 * Your backend payload(s) observed:
 * - { success: true, recommendations: [...] }
 * - sometimes nested under { data: { recommendations: [...] } }
 * - earlier tiered concept: all_network (but your current API sample doesn't include it)
 */
function normalizeRecommendationsPayload(payload: any): Recommendation[] {
  const raw = Array.isArray(payload?.recommendations)
    ? payload.recommendations
    : Array.isArray(payload?.data?.recommendations)
      ? payload.data.recommendations
      : Array.isArray(payload?.all_network)
        ? payload.all_network
        : Array.isArray(payload?.data?.all_network)
          ? payload.data.all_network
          : [];

  return raw
    .map((r: any) => {
      const author = r?.author || {};
      const tags = Array.isArray(r?.context_tags)
        ? r.context_tags
        : Array.isArray(r?.tags)
          ? r.tags
          : [];

      const photosRaw = Array.isArray(r?.photos) ? r.photos : [];
      const photos = photosRaw.map((p: any) => normalizePhotoUrl(String(p)));

      const overallRating =
        typeof r?.overall_rating === 'number'
          ? r.overall_rating
          : typeof r?.rating === 'number'
            ? r.rating
            : typeof r?.overallRating === 'number'
              ? r.overallRating
              : 0;

      const createdAt = String(r?.created_at ?? r?.timestamp ?? new Date().toISOString());

      return {
        id: String(r?.id ?? ''),
        author_id: String(author?.id ?? r?.author_id ?? ''),
        author_name: String(author?.display_name ?? author?.username ?? r?.author_name ?? 'Unknown'),
        author_avatar: author?.avatar_url ?? r?.author_avatar ?? undefined,

        content: String(r?.content ?? ''),

        overall_rating: overallRating,

        context_tags: tags,
        photos,

        created_at: createdAt,
        visit_date: r?.visit_date ?? undefined,
        verified_visit: Boolean(r?.verified_visit ?? false),

        taste_alignment: typeof r?.taste_alignment === 'number' ? r.taste_alignment : undefined,
        is_following: Boolean(r?.is_following ?? false),
        is_followed_by: Boolean(r?.is_followed_by ?? false),
        is_friend: Boolean(r?.is_friend ?? false),

        author_credibility: r?.author_credibility ?? undefined,

        dishes: Array.isArray(r?.dishes)
          ? r.dishes.map((d: any) => ({
              name: String(d?.name ?? ''),
              rating: typeof d?.rating === 'number' ? d.rating : 0,
            }))
          : [],

        likes_count:
          typeof r?.likes_count === 'number'
            ? r.likes_count
            : typeof r?.likes === 'number'
              ? r.likes
              : 0,

        comments_count: typeof r?.comments_count === 'number' ? r.comments_count : 0,
      } as Recommendation;
    })
    .map((r, idx) => (r.id ? r : { ...r, id: `missing-id-${idx}` }));
}

// ============================================================================
// HELPER: Get tag display label
// ============================================================================

function getTagLabel(tag: string): string {
  const labels: Record<string, string> = {
    'food': '🍽️ Food',
    'dish': '🍽️ Dish',
    'vibe': '✨ Vibe',
    'ambiance': '🏠 Ambiance',
    'menu': '📋 Menu',
    'exterior': '🏪 Exterior',
    'interior': '🪑 Interior',
    'drinks': '🍹 Drinks',
    'dessert': '🍰 Dessert',
    'other': '📷 Photo',
    'unknown': '📷 Photo',
  };
  return labels[tag?.toLowerCase()] || '📷 Photo';
}

// ============================================================================
// COMPONENTS
// ============================================================================

function ScoreCard({
  score,
  label,
  sublabel,
  count,
  icon: Icon,
  highlight = false,
  onClick,
}: {
  score: number | null;
  label: string;
  sublabel: string;
  count: number;
  icon: React.ElementType;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const hasScore = score !== null && count > 0;

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center p-4 rounded-xl transition-all ${
        highlight ? 'bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] text-white' : 'bg-white border border-gray-100'
      } ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
    >
      <Icon className={`w-5 h-5 mb-2 ${highlight ? 'text-white' : 'text-gray-400'}`} />
      <div className={`text-3xl font-bold ${highlight ? 'text-white' : 'text-[#1F1E2A]'}`}>
        {hasScore ? score!.toFixed(1) : '—'}
      </div>
      <div className={`text-sm font-medium ${highlight ? 'text-white/90' : 'text-[#1F1E2A]'}`}>{label}</div>
      <div className={`text-xs ${highlight ? 'text-white/70' : 'text-gray-500'}`}>
        {count > 0 ? `${count} ${count === 1 ? 'rec' : 'recs'}` : sublabel}
      </div>
    </div>
  );
}

function ContextTag({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#FFF4E1] text-[#1F1E2A] border border-[#FF644A]/20">
      {tag}
    </span>
  );
}

/**
 * PhotoCarousel - Simplified version without Add Photo functionality
 * Photos are only added through creating a recommendation
 */
function PhotoCarousel({
  photos,
  dishes,
}: {
  photos: PhotoData[];
  dishes: Dish[];
}) {
  // Combine dish photos with restaurant photos
  const allDisplayPhotos: Array<{ url: string; label: string }> = [
    ...dishes
      .filter((d) => d.photo_url)
      .map((d) => ({
        url: normalizePhotoUrl(d.photo_url!),
        label: `🍽️ ${d.name} (${d.rating}/10)`,
      })),
    ...photos.map((p) => ({
      url: p.url,
      label: p.dishName 
        ? `🍽️ ${p.dishName}` 
        : getTagLabel(p.tag),
    })),
  ];

  // Don't show section if no photos
  if (allDisplayPhotos.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#1F1E2A] mb-3">Photos & Dishes</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {allDisplayPhotos.map((photo, idx) => (
          <div key={`${photo.url}-${idx}`} className="flex-shrink-0 relative">
            <img 
              src={photo.url} 
              alt={photo.label || 'Restaurant photo'} 
              className="w-28 h-28 rounded-xl object-cover" 
            />
            {photo.label && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 rounded-b-xl text-center truncate">
                {photo.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserReviewSection({
  review,
  onEdit,
  onWriteReview,
}: {
  review: UserReview | null;
  onEdit: () => void;
  onWriteReview: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!review) {
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-[#FFF4E1] to-white rounded-xl border border-[#FF644A]/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#1F1E2A]">Your Review</h3>
            <p className="text-sm text-gray-600">Share your experience to build your taste profile</p>
          </div>
          <button
            onClick={onWriteReview}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Write Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FF644A] flex items-center justify-center text-white font-bold">
            {review.overall_rating}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-[#1F1E2A]">Your Review</h3>
            <p className="text-sm text-gray-500">
              {new Date(review.visit_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-gray-400 hover:text-[#FF644A]"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <p className="text-[#1F1E2A] mb-3">{review.content}</p>

          {review.dishes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {review.dishes.map((dish, idx) => (
                <span key={idx} className="text-sm px-2 py-1 bg-[#FFF4E1] rounded-lg">
                  {dish.name}: <span className="font-medium">{dish.rating}/10</span>
                </span>
              ))}
            </div>
          )}

          {review.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {review.photos.map((photo, idx) => (
                <img
                  key={`${photo}-${idx}`}
                  src={normalizePhotoUrl(photo)}
                  alt="Review photo"
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NetworkRecommendationCard({ rec }: { rec: Recommendation }) {
  // Determine relationship label
  const getRelationshipLabel = () => {
    if (rec.is_friend) return '👥 Mutual follow';
    if (rec.is_following) return '👤 Following';
    if (rec.is_followed_by) return '👤 Follows you';
    return null;
  };

  const relationshipLabel = getRelationshipLabel();

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            {rec.author_avatar ? (
              <img src={rec.author_avatar} alt={rec.author_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#FF644A] flex items-center justify-center text-white font-medium">
                {rec.author_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="font-medium text-[#1F1E2A]">{rec.author_name}</div>
            <div className="flex items-center gap-2">
              {relationshipLabel && (
                <span className="text-xs text-gray-500">{relationshipLabel}</span>
              )}
              {typeof rec.taste_alignment === 'number' && rec.taste_alignment > 0 && (
                <span className="text-xs text-[#FF644A] font-medium">
                  {Math.round(rec.taste_alignment * 100)}% taste match
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-[#1F1E2A]">{rec.overall_rating}</div>
          <div className="text-sm text-gray-500">/10</div>
        </div>
      </div>

      <p className="text-[#1F1E2A] text-sm mb-3 line-clamp-3">{rec.content}</p>

      {rec.context_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {rec.context_tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-1 bg-[#FFF4E1] text-[#1F1E2A] rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {rec.dishes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {rec.dishes.slice(0, 2).map((dish, idx) => (
            <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">
              {dish.name}: {dish.rating}/10
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" /> {rec.likes_count}
          </span>
          <span className="flex items-center gap-1">💬 {rec.comments_count}</span>
        </div>
        <span>{new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

function SimilarTasteCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#BFE2D9] flex items-center justify-center">
            <Star className="w-5 h-5 text-[#1F1E2A]" />
          </div>
          <div>
            <div className="font-medium text-[#1F1E2A]">{rec.author_name}</div>
            {typeof rec.taste_alignment === 'number' && (
              <div className="text-sm text-[#FF644A] font-medium">{Math.round(rec.taste_alignment * 100)}% taste match</div>
            )}
            {rec.author_credibility && (
              <div className="text-xs text-gray-500">
                {rec.author_credibility.expertise_area && `${rec.author_credibility.expertise_area} · `}
                {rec.author_credibility.total_recommendations} recs
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-[#1F1E2A]">{rec.overall_rating}</div>
          <div className="text-sm text-gray-500">/10</div>
        </div>
      </div>

      <p className="text-[#1F1E2A] text-sm mb-3 line-clamp-3">{rec.content}</p>

      {rec.context_tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rec.context_tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-1 bg-[#FFF4E1] text-[#1F1E2A] rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestedUserCard({ user, onFollow }: { user: SuggestedUser; onFollow: () => void }) {
  return (
    <div className="flex-shrink-0 w-40 bg-white rounded-xl border border-gray-100 p-3 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-2 overflow-hidden">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#FF644A] flex items-center justify-center text-white font-medium text-lg">
            {user.display_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="font-medium text-[#1F1E2A] text-sm truncate">{user.display_name}</div>
      <div className="text-xs text-[#FF644A] mb-1">{Math.round(user.taste_alignment * 100)}% match</div>
      <div className="text-xs text-gray-500 mb-2">{user.mutual_restaurants} shared spots</div>
      <button
        onClick={onFollow}
        className="w-full flex items-center justify-center gap-1 py-1.5 bg-[#FF644A] text-white text-xs rounded-lg hover:bg-[#E65441]"
      >
        <UserPlus className="w-3 h-3" />
        Follow
      </button>
    </div>
  );
}

/**
 * LocationMap - Google Maps embed for restaurant location
 */
function LocationMap({ restaurant }: { restaurant: Restaurant }) {
  const mapQuery = encodeURIComponent(
    `${restaurant.name}, ${restaurant.address}, ${restaurant.city}`
  );

  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold text-[#1F1E2A] mb-3">Location</h3>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="h-40 rounded-t-xl overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
            title={`Map showing ${restaurant.name}`}
          />
        </div>
        <div className="p-4">
          <p className="text-[#1F1E2A]">{restaurant.address}</p>
          <p className="text-gray-500 text-sm">{restaurant.city}</p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params?.id as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [recommendations, setRecommendations] = useState<TieredRecommendations | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [userReview, setUserReview] = useState<UserReview | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantPhotos, setRestaurantPhotos] = useState<any[]>([]);

  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    let isCancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 1) Restaurant basic info
        const restaurantRes = await fetch(apiUrl(`/api/restaurants/${restaurantId}`), { headers });
        if (!restaurantRes.ok) throw new Error('Restaurant not found');
        const restaurantData = await restaurantRes.json();
        const r = restaurantData.restaurant || restaurantData;
        r.address = cleanAddress(r.address);

        // 2) Determine userId (use local var; don't rely on async state)
        let userId: string | null = null;

        // First try localStorage (fastest, most reliable)
        try {
          const storedUser = localStorage.getItem('omeone_user');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed?.id) {
              userId = String(parsed.id);
            }
          }
        } catch {
          // ignore parse errors
        }

        // Fallback to /api/auth/me if localStorage didn't have it
        if (!userId && token) {
          try {
            const meRes = await fetch(apiUrl('/api/auth/me'), { headers });
            if (meRes.ok) {
              const meData = await meRes.json();
              const me = meData.user || meData;
              if (me?.id) {
                userId = String(me.id);
              }
            }
          } catch {
            // ignore
          }
        }

        // apply restaurant + user state
        if (!isCancelled) {
          setRestaurant(r);
          setCurrentUser(userId ? { id: userId } : null);
        }

        // 3) Recommendations — fetch for everyone; add userId only if available
        const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
        const recsRes = await fetch(apiUrl(`/api/restaurants/${restaurantId}/recommendations${qs}`), { headers });

        let tiered: TieredRecommendations = emptyTiered();
        let normalized: Recommendation[] = [];

        if (recsRes.ok) {
          const recsData = await recsRes.json();
          normalized = normalizeRecommendationsPayload(recsData);

          // For now, map everything into all_network (tiers can come later)
          tiered = {
            tier1_friends_high_match: [],
            tier2_similar_taste: [],
            tier3_friends_low_match: [],
            all_network: normalized,
          };
        }

        if (!isCancelled) {
          setRecommendations(tiered);

          // infer "Your Review" from network recs, if possible
          if (userId) {
            const mine = normalized.find((rec) => rec.author_id === userId);
            if (mine) {
              setUserReview({
                id: mine.id,
                overall_rating: mine.overall_rating,
                content: mine.content,
                visit_date: mine.visit_date || mine.created_at,
                dishes: mine.dishes || [],
                photos: mine.photos || [],
              });
            } else {
              setUserReview(null);
            }
          } else {
            setUserReview(null);
          }
        }

        // 4) Dishes aggregation — fetch for everyone; add userId only if available
        const dishesRes = await fetch(apiUrl(`/api/restaurants/${restaurantId}/dishes${qs}`), { headers });
        if (!isCancelled) {
          if (dishesRes.ok) {
            const dishesData = await dishesRes.json();
            setDishes(Array.isArray(dishesData?.dishes) ? dishesData.dishes : []);
          } else {
            setDishes([]);
          }
        }

        // 5) Restaurant photos - fetch from dedicated photos endpoint
        const photosRes = await fetch(apiUrl(`/api/restaurants/${restaurantId}/photos?limit=20`), { headers });
        if (!isCancelled && photosRes.ok) {
          const photosData = await photosRes.json();
          setRestaurantPhotos(photosData.photos || []);
        }

      } catch (err) {
        console.error('Error fetching restaurant page:', err);
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load restaurant');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [restaurantId]);

  // ============================================================================
  // COMPUTED SCORES - Simplified categories
  // ============================================================================
  const scores = useMemo(() => {
    if (!recommendations) {
      return {
        networkScore: null,
        similarTasteScore: null,
        allScore: null,
        networkRecs: [] as Recommendation[],
        similarTasteRecs: [] as Recommendation[],
        allRecs: [] as Recommendation[],
      };
    }

    const allRecs = recommendations.all_network;

    // "Your Network" = people you follow OR who follow you (any connection)
    const networkRecs = allRecs.filter(r => 
      r.is_friend || r.is_following || r.is_followed_by
    );

    // "Similar Taste" = users with >= 70% taste alignment (who are NOT in your network)
    const TASTE_THRESHOLD = 0.7;
    const similarTasteRecs = allRecs.filter(r => 
      !r.is_friend && !r.is_following && !r.is_followed_by &&
      typeof r.taste_alignment === 'number' && r.taste_alignment >= TASTE_THRESHOLD
    );

    const avgScore = (recs: Recommendation[]) => {
      if (recs.length === 0) return null;
      const sum = recs.reduce((acc, r) => acc + (typeof r.overall_rating === 'number' ? r.overall_rating : 0), 0);
      return sum / recs.length;
    };

    return {
      networkScore: avgScore(networkRecs),
      similarTasteScore: avgScore(similarTasteRecs),
      allScore: avgScore(allRecs),
      networkRecs,
      similarTasteRecs,
      allRecs,
    };
  }, [recommendations]);

  const allPhotos = useMemo(() => {
    // Use photos fetched from dedicated photos endpoint
    return restaurantPhotos.map(photo => ({
      url: normalizePhotoUrl(photo.ipfsHash),
      tag: photo.tagType || 'unknown',
      dishName: photo.dishName,
      caption: photo.caption,
      helpfulCount: photo.helpfulCount || 0
    }))
    .filter(photo => photo.url !== '');  // Filter out photos with no URL
  }, [restaurantPhotos]);

  const contextTags = useMemo(() => {
    if (!recommendations) return [];
    const tagCounts = new Map<string, number>();
    recommendations.all_network.forEach((r) => {
      (r.context_tags || []).forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
    });
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }, [recommendations]);

  const handleBack = () => router.back();
  const handleSave = () => setIsSaved((v) => !v);

  const handleShare = () => {
    if (navigator.share && restaurant) {
      navigator.share({
        title: restaurant.name,
        text: `Check out ${restaurant.name} on BocaBoca`,
        url: window.location.href,
      });
    }
  };

  const handleWriteReview = () => router.push(`/create?restaurantId=${restaurantId}`);
  const handleEditReview = () => {
    if (userReview) router.push(`/create?edit=${userReview.id}`);
  };
  const handleFollowUser = (userId: string) => console.log('Follow user:', userId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF4E1]">
        <CleanHeader />
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-[#FF644A]">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#FFF4E1]">
        <CleanHeader />
        <div className="flex flex-col items-center justify-center p-6 py-20">
          <div className="text-[#1F1E2A] text-lg mb-4">{error || 'Restaurant not found'}</div>
          <button onClick={handleBack} className="flex items-center gap-2 text-[#FF644A] hover:text-[#E65441]">
            <ArrowLeft className="w-5 h-5" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF4E1]">
      {/* GLOBAL HEADER - Same as Discover page */}
      <CleanHeader />

      <main className="px-4 py-6 max-w-2xl mx-auto">
        {/* BACK LINK */}
        <button 
          onClick={handleBack} 
          className="flex items-center gap-2 text-gray-500 hover:text-[#FF644A] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>

        {/* RESTAURANT INFO SECTION */}
        <section className="mb-6">
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-2xl font-bold text-[#1F1E2A]">{restaurant.name}</h1>
            {/* SAVE & SHARE BUTTONS */}
            <div className="flex items-center gap-1">
              <button 
                onClick={handleSave} 
                className={`p-2 rounded-full transition-colors ${isSaved ? 'text-[#FF644A]' : 'text-gray-400 hover:text-[#FF644A]'}`}
                title={isSaved ? 'Saved' : 'Save restaurant'}
              >
                <Heart className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={handleShare} 
                className="p-2 rounded-full text-gray-400 hover:text-[#FF644A] transition-colors"
                title="Share restaurant"
              >
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 mb-3">
            {[restaurant.cuisineType, restaurant.priceRange, restaurant.city].filter(Boolean).join(' · ')}
          </p>

          {contextTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {contextTags.map((tag, idx) => (
                <ContextTag key={idx} tag={tag} />
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {restaurant.website && (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#1F1E2A] hover:bg-gray-50"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#1F1E2A] hover:bg-gray-50"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#1F1E2A] hover:bg-gray-50"
            >
              <MapPin className="w-4 h-4" />
              Directions
            </a>
          </div>
        </section>

        {/* SIMPLIFIED SCORE CARDS */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-[#1F1E2A] mb-3">What People Think</h3>
          <div className="grid grid-cols-3 gap-3">
            <ScoreCard
              score={scores.networkScore}
              label="Your Network"
              sublabel="Follow people"
              count={scores.networkRecs.length}
              icon={Users}
              highlight={scores.networkRecs.length > 0}
              onClick={() => {
                document.getElementById('network-reviews')?.scrollIntoView({ 
                  behavior: 'smooth',
                  block: 'start'
                });
              }}
            />
            <ScoreCard 
              score={scores.similarTasteScore} 
              label="Similar Taste" 
              sublabel="70%+ match" 
              count={scores.similarTasteRecs.length} 
              icon={Star} 
            />
            <ScoreCard 
              score={scores.allScore} 
              label="All Reviews" 
              sublabel="BocaBoca" 
              count={scores.allRecs.length} 
              icon={TrendingUp} 
            />
          </div>
        </section>

        {/* PHOTO CAROUSEL - Simplified without Add Photo buttons */}
        <PhotoCarousel photos={allPhotos} dishes={dishes} />

        {/* USER'S OWN REVIEW */}
        <UserReviewSection review={userReview} onEdit={handleEditReview} onWriteReview={handleWriteReview} />

        {/* YOUR NETWORK RECOMMENDATIONS */}
        {scores.networkRecs.length > 0 ? (
          <section id="network-reviews" className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#1F1E2A]">From Your Network</h3>
              <span className="text-sm text-gray-500">{scores.networkRecs.length} {scores.networkRecs.length === 1 ? 'rec' : 'recs'}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">People you follow or who follow you</p>
            {scores.networkRecs.map((rec) => <NetworkRecommendationCard key={rec.id} rec={rec} />)}
          </section>
        ) : (
          <section id="network-reviews" className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#1F1E2A]">From Your Network</h3>
            </div>
            {suggestedUsers.length > 0 ? (
              <>
                <p className="text-sm text-gray-600 mb-3">People with similar taste you might want to follow</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {suggestedUsers.map((user) => (
                    <SuggestedUserCard key={user.id} user={user} onFollow={() => handleFollowUser(user.id)} />
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  No one in your network has reviewed this place yet.
                  <br />
                  Be the first to share your experience!
                </p>
                <button
                  onClick={handleWriteReview}
                  className="mt-3 px-4 py-2 bg-[#FF644A] text-white rounded-lg text-sm hover:bg-[#E65441]"
                >
                  Write a Review
                </button>
              </div>
            )}
          </section>
        )}

        {/* SIMILAR TASTE RECOMMENDATIONS */}
        {scores.similarTasteRecs.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#1F1E2A]">From Similar Taste Users</h3>
              <span className="text-sm text-gray-500">{scores.similarTasteRecs.length} {scores.similarTasteRecs.length === 1 ? 'rec' : 'recs'}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">Users with 70%+ taste alignment with you</p>
            {scores.similarTasteRecs.map((rec) => <SimilarTasteCard key={rec.id} rec={rec} />)}
          </section>
        )}

        {/* LOCATION SECTION with Google Maps */}
        <LocationMap restaurant={restaurant} />
      </main>
    </div>
  );
}