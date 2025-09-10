// FILE PATH: app/restaurant/[id]/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Star, Users, Heart, Share2, Phone, Clock, Globe, Info, Camera, ArrowLeft, Check } from 'lucide-react';

// Import your existing components
import RecommendationCard from '@/components/RecommendationCard';
import CleanHeader from '@/components/CleanHeader';

interface Restaurant {
  id: number; // Changed from string to number
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  cuisine: string;
  priceRange: '€' | '€€' | '€€€' | '€€€€';
  photos: string[];
  description?: string;
  phone?: string;
  website?: string;
  hours?: string;
  averageTrustScore: number;
  personalizedTrustScore?: number;
  totalRecommendations: number;
  verified?: boolean;
  socialBreakdown: {
    directFriends: number;
    friendsOfFriends: number;
    totalUsers: number;
  };
  socialProof?: {
    friendsWhoRecommend: Array<{
      id: string;
      name: string;
      recommendationCount: number;
      mostRecentDate: Date;
    }>;
    totalFriendsRecommended: number;
  };
  trustScoreBreakdown?: {
    personalizedScore: number;
    globalAverage: number;
    directFriends: {
      count: number;
      avgScore: number;
      weight: number;
    };
    friendsOfFriends: {
      count: number;
      avgScore: number;
      weight: number;
    };
    explanation: string;
  };
}

// Enhanced mock restaurant data with integer keys
const mockRestaurants: { [key: number]: Restaurant } = {
  1: {
    id: 1, // Changed from '1' to 1
    name: 'Restaurante Mangai',
    address: 'SCLS 109, Bloco A, Loja 2/8 - Asa Sul',
    city: 'Brasília',
    latitude: -15.8052,
    longitude: -47.8890,
    cuisine: 'Nordestina',
    priceRange: '€€',
    photos: ['/api/placeholder/800/400', '/api/placeholder/400/300', '/api/placeholder/400/300'],
    description: 'Autêntica culinária nordestina no coração de Brasília. Especializado em pratos tradicionais com ingredientes frescos e receitas familiares.',
    phone: '(61) 3322-4455',
    website: 'www.mangai.com.br',
    hours: 'Seg-Sáb: 11:00-22:00, Dom: 11:00-16:00',
    averageTrustScore: 8.4,
    personalizedTrustScore: 9.1,
    verified: true,
    totalRecommendations: 23,
    socialBreakdown: {
      directFriends: 8,
      friendsOfFriends: 12,
      totalUsers: 23
    },
    socialProof: {
      friendsWhoRecommend: [
        {
          id: '1',
          name: 'Maria Santos',
          recommendationCount: 1,
          mostRecentDate: new Date('2025-01-15')
        },
        {
          id: '2',
          name: 'Ana Costa',
          recommendationCount: 1,
          mostRecentDate: new Date('2025-01-08')
        }
      ],
      totalFriendsRecommended: 3
    },
    trustScoreBreakdown: {
      personalizedScore: 9.1,
      globalAverage: 8.4,
      directFriends: {
        count: 3,
        avgScore: 9.0,
        weight: 0.75
      },
      friendsOfFriends: {
        count: 2,
        avgScore: 8.4,
        weight: 0.25
      },
      explanation: "Seu Trust Score personalizado de 9.1 é maior que a média global porque 3 amigos diretos recomendaram este local com nota média de 9.0."
    }
  },
  2: {
    id: 2, // Changed from '2' to 2
    name: 'Coco Bambu',
    address: 'CLS 201, Bloco C, Loja 30 - Asa Sul',
    city: 'Brasília',
    latitude: -15.8083,
    longitude: -47.8856,
    cuisine: 'Frutos do Mar',
    priceRange: '€€€',
    photos: ['/api/placeholder/800/400', '/api/placeholder/400/300'],
    description: 'Especialista em frutos do mar com ambiente sofisticado e pratos inovadores.',
    phone: '(61) 3201-5500',
    website: 'www.cocobambu.com',
    hours: 'Seg-Dom: 11:30-23:00',
    averageTrustScore: 7.8,
    personalizedTrustScore: 8.2,
    verified: true,
    totalRecommendations: 18,
    socialBreakdown: {
      directFriends: 5,
      friendsOfFriends: 8,
      totalUsers: 18
    },
    socialProof: {
      friendsWhoRecommend: [
        {
          id: '3',
          name: 'Carlos Silva',
          recommendationCount: 1,
          mostRecentDate: new Date('2025-01-12')
        }
      ],
      totalFriendsRecommended: 2
    },
    trustScoreBreakdown: {
      personalizedScore: 8.2,
      globalAverage: 7.8,
      directFriends: {
        count: 2,
        avgScore: 8.5,
        weight: 0.75
      },
      friendsOfFriends: {
        count: 3,
        avgScore: 7.8,
        weight: 0.25
      },
      explanation: "Seu Trust Score personalizado de 8.2 é baseado nas recomendações de 2 amigos diretos e 3 amigos de amigos."
    }
  }
};

// Mock recommendations data with integer keys
const mockRecommendationsData: { [key: number]: any[] } = {
  1: [
    {
      id: '1',
      title: 'Melhor baião de dois de Brasília',
      description: 'Simplesmente excepcional! O baião de dois aqui é exatamente como minha avó fazia no Ceará. Ingredientes frescos, tempero na medida certa, e aquele gostinho de casa que você não encontra em qualquer lugar. O atendimento é caloroso e o ambiente te transporta para o interior nordestino.',
      photos: [{ 
        url: '/api/placeholder/400/300', 
        hasLocation: true, 
        isCompressed: true,
        caption: 'Baião de dois tradicional'
      }],
      category: 'Almoço',
      location: {
        name: 'Restaurante Mangai',
        address: 'SCLS 109, Bloco A, Loja 2/8 - Asa Sul',
        city: 'Brasília',
        latitude: -15.8052,
        longitude: -47.8890
      },
      author: {
        id: '1',
        name: 'Maria Santos',
        avatar: '/api/placeholder/40/40',
        reputation: 850,
        isFollowing: true,
        socialDistance: 1,
        verificationLevel: 'verified'
      },
      trustScore: 9.2,
      trustBreakdown: {
        directFriends: 3,
        friendsOfFriends: 2,
        totalEndorsements: 5,
        socialHops: '±1 hop',
        algorithm: 'LIVE CALCULATION'
      },
      engagement: { saves: 12, upvotes: 18, comments: 5 },
      tokenRewards: { 
        amount: 2.5, 
        usdValue: 0.30, 
        earnedFrom: 'social_bonus',
        multiplier: 1.8,
        breakdown: {
          baseReward: 1.0,
          socialBonus: 1.2,
          qualityBonus: 0.3
        }
      },
      createdAt: '2025-07-20T14:30:00Z',
      tags: ['família', 'autêntico', 'nordestino'],
      isBookmarked: true,
      hasUpvoted: false,
      verificationStatus: 'verified',
      canEdit: false,
      visitDate: '2025-07-18T12:00:00Z'
    },
    {
      id: '2', 
      title: 'Carne de sol imperdível',
      description: 'A carne de sol com macaxeira é sensacional! Carne bem temperada, macia, e a macaxeira cremosa. O preço é justo pela qualidade. Recomendo ir no almoço quando o movimento é menor.',
      photos: [{ 
        url: '/api/placeholder/400/300', 
        hasLocation: true, 
        isCompressed: true,
        caption: 'Carne de sol com macaxeira'
      }],
      category: 'Almoço',
      location: {
        name: 'Restaurante Mangai',
        address: 'SCLS 109, Bloco A, Loja 2/8 - Asa Sul', 
        city: 'Brasília',
        latitude: -15.8052,
        longitude: -47.8890
      },
      author: {
        id: '2',
        name: 'João Silva',
        avatar: '/api/placeholder/40/40',
        reputation: 650,
        isFollowing: false,
        socialDistance: 2,
        verificationLevel: 'basic'
      },
      trustScore: 8.7,
      trustBreakdown: {
        directFriends: 1,
        friendsOfFriends: 3,
        totalEndorsements: 4,
        socialHops: '±2 hops',
        algorithm: 'LIVE CALCULATION'
      },
      engagement: { saves: 8, upvotes: 14, comments: 3 },
      tokenRewards: { 
        amount: 1.8, 
        usdValue: 0.22, 
        earnedFrom: 'creation',
        breakdown: {
          baseReward: 1.0,
          socialBonus: 0.5,
          qualityBonus: 0.3
        }
      },
      createdAt: '2025-07-18T12:15:00Z',
      tags: ['carne de sol', 'almoço', 'preço justo'],
      isBookmarked: false,
      hasUpvoted: true,
      verificationStatus: 'verified',
      canEdit: false,
      visitDate: '2025-07-16T13:30:00Z'
    }
  ],
  2: [
    {
      id: '3',
      title: 'Camarão na moranga excepcional',
      description: 'O camarão na moranga é o prato estrela! Muito bem temperado, camarões frescos e a moranga perfeitamente cozida. O ambiente é elegante e o atendimento impecável.',
      photos: [{ 
        url: '/api/placeholder/400/300', 
        hasLocation: true, 
        isCompressed: true,
        caption: 'Camarão na moranga'
      }],
      category: 'Jantar',
      location: {
        name: 'Coco Bambu',
        address: 'CLS 201, Bloco C, Loja 30 - Asa Sul',
        city: 'Brasília',
        latitude: -15.8083,
        longitude: -47.8856
      },
      author: {
        id: '3',
        name: 'Carlos Silva',
        avatar: '/api/placeholder/40/40',
        reputation: 720,
        isFollowing: true,
        socialDistance: 1,
        verificationLevel: 'verified'
      },
      trustScore: 8.9,
      trustBreakdown: {
        directFriends: 2,
        friendsOfFriends: 1,
        totalEndorsements: 3,
        socialHops: '±1 hop',
        algorithm: 'LIVE CALCULATION'
      },
      engagement: { saves: 15, upvotes: 22, comments: 7 },
      tokenRewards: { 
        amount: 3.2, 
        usdValue: 0.38, 
        earnedFrom: 'social_bonus',
        breakdown: {
          baseReward: 1.0,
          socialBonus: 1.5,
          qualityBonus: 0.7
        }
      },
      createdAt: '2025-07-22T19:45:00Z',
      tags: ['camarão', 'sofisticado', 'jantar'],
      isBookmarked: false,
      hasUpvoted: true,
      verificationStatus: 'verified',
      canEdit: false,
      visitDate: '2025-07-20T20:00:00Z'
    }
  ]
};

const RestaurantDetailPage: React.FC = () => {
  const params = useParams();
  const pathname = usePathname();
  
  // Parse restaurant ID as integer with proper validation
  const restaurantIdParam = params?.id as string;
  const restaurantId = restaurantIdParam ? parseInt(restaurantIdParam, 10) : null;
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [sortBy, setSortBy] = useState<'trustScore' | 'newest' | 'popular'>('trustScore');
  const [filterBy, setFilterBy] = useState<'all' | 'friends' | 'verified'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state and Trust Score help
  const [activeTab, setActiveTab] = useState<'recommendations' | 'about' | 'photos'>('recommendations');
  const [showTrustScoreHelp, setShowTrustScoreHelp] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Restaurant Detail Page Debug:');
    console.log('Current pathname:', pathname);
    console.log('Params:', params);
    console.log('Restaurant ID param:', restaurantIdParam);
    console.log('Parsed Restaurant ID:', restaurantId);
    console.log('Is valid ID:', !isNaN(restaurantId!) && restaurantId! > 0);
  }, [pathname, params, restaurantIdParam, restaurantId]);

  useEffect(() => {
    if (restaurantId && !isNaN(restaurantId) && restaurantId > 0) {
      loadRestaurantData();
    } else if (restaurantIdParam) {
      // Invalid restaurant ID format
      setError('ID de restaurante inválido');
      setIsLoading(false);
    }
  }, [restaurantId, restaurantIdParam]);

  const loadRestaurantData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load from API first, fall back to mock data
      let restaurantData: Restaurant | null = null;
      let recommendationsData: any[] = [];

      try {
        // Updated API call with integer ID
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        console.log('🌐 Attempting to fetch from API:', `${apiUrl}/api/restaurants/${restaurantId}`);
        
        if (apiUrl) {
          const response = await fetch(`${apiUrl}/api/restaurants/${restaurantId}`);
          if (response.ok) {
            restaurantData = await response.json();
            console.log('✅ Loaded restaurant from API:', restaurantData);
            
            // Also try to fetch recommendations from API
            try {
              const recResponse = await fetch(`${apiUrl}/api/recommendations?restaurant_id=${restaurantId}`);
              if (recResponse.ok) {
                recommendationsData = await recResponse.json();
                console.log('✅ Loaded recommendations from API:', recommendationsData.length);
              }
            } catch (recError) {
              console.log('⚠️ Failed to fetch recommendations from API:', recError);
            }
          } else {
            console.log('⚠️ API response not OK:', response.status);
          }
        }
      } catch (apiError) {
        console.log('⚠️ API fetch failed, using mock data:', apiError);
      }

      // Fallback to mock data
      if (!restaurantData) {
        restaurantData = mockRestaurants[restaurantId!];
        recommendationsData = mockRecommendationsData[restaurantId!] || [];
        console.log('📝 Using mock data for restaurant:', restaurantId);
      }

      if (!restaurantData) {
        setError('Restaurante não encontrado');
        return;
      }

      setRestaurant(restaurantData);
      setRecommendations(recommendationsData);
      
      // Check bookmark status - use string for localStorage compatibility
      try {
        const saved = localStorage.getItem('bookmarkedRestaurants');
        if (saved) {
          const bookmarks = new Set(JSON.parse(saved));
          setIsBookmarked(bookmarks.has(restaurantId!.toString()));
        }
      } catch (error) {
        console.warn('Could not load bookmarks:', error);
      }

    } catch (err) {
      console.error('Error loading restaurant data:', err);
      setError('Erro ao carregar dados do restaurante');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 7) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const formatTimeAgo = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter recommendations based on current filter
  const filteredRecommendations = recommendations.filter(rec => {
    if (filterBy === 'friends') return rec.author.socialDistance === 1;
    if (filterBy === 'verified') return rec.author.verificationLevel !== 'basic';
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'trustScore':
        return b.trustScore - a.trustScore;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'popular':
        return (b.engagement.upvotes + b.engagement.saves) - (a.engagement.upvotes + a.engagement.saves);
      default:
        return 0;
    }
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant?.name,
        text: `Confira ${restaurant?.name} no OmeoneChain`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleBookmark = () => {
    try {
      const saved = localStorage.getItem('bookmarkedRestaurants');
      const bookmarks = new Set(saved ? JSON.parse(saved) : []);
      
      // Convert to string for localStorage consistency
      const restaurantIdStr = restaurantId!.toString();
      
      if (isBookmarked) {
        bookmarks.delete(restaurantIdStr);
      } else {
        bookmarks.add(restaurantIdStr);
      }
      
      localStorage.setItem('bookmarkedRestaurants', JSON.stringify([...bookmarks]));
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.warn('Could not save bookmark:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader currentPath="/discover" />
        <div className="py-12 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando restaurante...</p>
          <p className="text-sm text-gray-500 mt-2">ID: {restaurantId}</p>
        </div>
      </div>
    );
  }

  // Error state or invalid ID
  if (error || !restaurant || !restaurantId || isNaN(restaurantId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CleanHeader currentPath="/discover" />
        <div className="py-12 text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Restaurante não encontrado'}
          </h1>
          <p className="text-gray-600 mb-4">
            {isNaN(restaurantId!) || !restaurantId ? 
              `ID de restaurante inválido: "${restaurantIdParam}"` :
              `O restaurante com ID "${restaurantId}" não foi encontrado.`
            }
          </p>
          <div className="text-sm text-gray-500 mb-6">
            <p>Debug info:</p>
            <p>Pathname: {pathname}</p>
            <p>Restaurant ID param: {restaurantIdParam}</p>
            <p>Parsed ID: {restaurantId}</p>
            <p>Valid ID: {!isNaN(restaurantId!) && restaurantId! > 0 ? 'Yes' : 'No'}</p>
          </div>
          <Link 
            href="/discover"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Descobrir
          </Link>
        </div>
      </div>
    );
  }

  const displayTrustScore = restaurant.personalizedTrustScore || restaurant.averageTrustScore;
  const isPersonalized = !!restaurant.personalizedTrustScore;

  return (
    <div className="min-h-screen bg-gray-50">
      <CleanHeader currentPath="/discover" />

      <div className="py-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Link 
            href="/discover"
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para descobrir
          </Link>

          {/* Debug info (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs">
              <strong>Debug Info:</strong> Restaurant ID: {restaurantId} | Data Source: {mockRestaurants[restaurantId!] ? 'Mock' : 'API'} | Type: {typeof restaurantId}
            </div>
          )}

          {/* Restaurant Header */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            {/* Photo Gallery */}
            <div className="relative h-64 md:h-80">
              <img
                src={restaurant.photos[0]}
                alt={restaurant.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/api/placeholder/800/400';
                }}
              />
              
              {/* Photo Gallery Button */}
              {restaurant.photos.length > 1 && (
                <button
                  onClick={() => setShowAllPhotos(true)}
                  className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm hover:bg-black/70 transition-colors"
                >
                  Ver {restaurant.photos.length} fotos
                </button>
              )}

              {/* Trust Score Badge with Help */}
              <div className="absolute top-4 right-4">
                <div className={`px-4 py-3 rounded-xl border-2 backdrop-blur-sm ${getTrustScoreColor(displayTrustScore)}`}>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="text-xl font-bold">{displayTrustScore.toFixed(1)}/10</div>
                      <button
                        onClick={() => setShowTrustScoreHelp(!showTrustScoreHelp)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-sm font-medium">Trust Score</div>
                    {isPersonalized && (
                      <div className="text-xs text-blue-600 font-medium mt-1">
                        Personalizado
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="absolute top-4 left-4 flex gap-2">
                <button
                  onClick={handleBookmark}
                  className={`p-3 rounded-lg backdrop-blur-sm transition-colors ${
                    isBookmarked 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'bg-white/80 text-gray-600 hover:bg-white'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={handleShare}
                  className="p-3 bg-white/80 text-gray-600 rounded-lg backdrop-blur-sm hover:bg-white transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Restaurant Info */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                    {restaurant.verified && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Check className="h-4 w-4 mr-1" />
                        Verificado
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 flex items-center mb-2">
                    <MapPin className="h-4 w-4 mr-2" />
                    {restaurant.address}, {restaurant.city}
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {restaurant.cuisine}
                    </span>
                    <span className="text-gray-600 font-medium text-lg">
                      {restaurant.priceRange}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Score Help Panel */}
              {showTrustScoreHelp && restaurant.trustScoreBreakdown && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
                  <h4 className="font-medium text-gray-900 mb-2">Como este score é calculado:</h4>
                  <div className="space-y-2 text-gray-600">
                    <div className="flex justify-between">
                      <span>Amigos diretos ({restaurant.trustScoreBreakdown.directFriends.count})</span>
                      <span>{restaurant.trustScoreBreakdown.directFriends.avgScore.toFixed(1)} × 0.75</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amigos de amigos ({restaurant.trustScoreBreakdown.friendsOfFriends.count})</span>
                      <span>{restaurant.trustScoreBreakdown.friendsOfFriends.avgScore.toFixed(1)} × 0.25</span>
                    </div>
                    <div className="border-t pt-2 font-medium text-gray-900">
                      <div className="flex justify-between">
                        <span>Seu score personalizado</span>
                        <span>{restaurant.trustScoreBreakdown.personalizedScore.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    {restaurant.trustScoreBreakdown.explanation}
                  </p>
                </div>
              )}

              {/* Description */}
              {restaurant.description && (
                <p className="text-gray-700 mb-4">{restaurant.description}</p>
              )}

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
                {restaurant.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <a href={`tel:${restaurant.phone}`} className="hover:text-blue-600">
                      {restaurant.phone}
                    </a>
                  </div>
                )}
                {restaurant.hours && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {restaurant.hours}
                  </div>
                )}
                {restaurant.website && (
                  <div className="flex items-center text-gray-600">
                    <Globe className="h-4 w-4 mr-2" />
                    <a href={`https://${restaurant.website}`} target="_blank" rel="noopener noreferrer" 
                       className="hover:text-blue-600 transition-colors">
                      {restaurant.website}
                    </a>
                  </div>
                )}
              </div>

              {/* Social Trust Breakdown */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-3">Prova Social</h3>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-700">{restaurant.socialBreakdown.directFriends}</div>
                    <div className="text-blue-600">Amigos diretos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-700">{restaurant.socialBreakdown.friendsOfFriends}</div>
                    <div className="text-blue-600">Amigos de amigos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-700">{restaurant.totalRecommendations}</div>
                    <div className="text-blue-600">Total recomendações</div>
                  </div>
                </div>

                {/* Friends who recommend */}
                {restaurant.socialProof && restaurant.socialProof.friendsWhoRecommend.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Amigos que recomendam</h4>
                    <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                      <Users className="h-4 w-4" />
                      <span>{restaurant.socialProof.totalFriendsRecommended} dos seus amigos recomendam este local</span>
                    </div>
                    <div className="space-y-2">
                      {restaurant.socialProof.friendsWhoRecommend.slice(0, 3).map((friend) => (
                        <div key={friend.id} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                            {friend.name.charAt(0)}
                          </div>
                          <span className="text-gray-700">{friend.name}</span>
                          <span className="text-gray-500">• {formatTimeAgo(friend.mostRecentDate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {[
                  { id: 'recommendations', label: 'Recomendações', count: filteredRecommendations.length },
                  { id: 'about', label: 'Sobre' },
                  { id: 'photos', label: 'Fotos', count: restaurant.photos.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'recommendations' && (
                <div>
                  {/* Section Header */}
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Users className="h-6 w-6 mr-2" />
                      Recomendações ({filteredRecommendations.length})
                    </h2>
                    
                    <Link href={`/create?restaurant=${restaurant.id}`}>
                      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        Adicionar Recomendação
                      </button>
                    </Link>
                  </div>

                  {/* Filters and Sort */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="trustScore">Maior Trust Score</option>
                      <option value="newest">Mais Recente</option>
                      <option value="popular">Mais Popular</option>
                    </select>

                    <select
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Todas as Recomendações</option>
                      <option value="friends">Apenas Amigos</option>
                      <option value="verified">Apenas Verificados</option>
                    </select>
                  </div>

                  {/* Recommendations List */}
                  <div className="space-y-6">
                    {filteredRecommendations.map(recommendation => (
                      <RecommendationCard
                        key={recommendation.id}
                        recommendation={recommendation}
                        variant="detailed"
                        showTokenRewards={true}
                        showBlockchainInfo={false}
                        onSave={(id) => console.log('Saved:', id)}
                        onUpvote={(id) => console.log('Upvoted:', id)}
                        onShare={(id) => console.log('Shared:', id)}
                        onAuthorClick={(id) => console.log('Author:', id)}
                        onLocationClick={(location) => console.log('Location:', location)}
                        className="border border-gray-200 rounded-lg"
                      />
                    ))}
                  </div>

                  {filteredRecommendations.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {filterBy === 'friends' ? 'Nenhum amigo recomendou ainda' : 
                         filterBy === 'verified' ? 'Nenhuma recomendação verificada' : 
                         'Nenhuma recomendação ainda'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {filterBy === 'all' ? 'Seja o primeiro a recomendar este restaurante!' : 'Tente um filtro diferente'}
                      </p>
                      {filterBy === 'all' && (
                        <Link href={`/create?restaurant=${restaurant.id}`}>
                          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                            Escrever Recomendação
                          </button>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Load More */}
                  {filteredRecommendations.length > 0 && (
                    <div className="text-center mt-8">
                      <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        Carregar Mais Recomendações
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'about' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sobre {restaurant.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Detalhes</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Culinária</span>
                          <span className="text-gray-900">{restaurant.cuisine}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Faixa de Preço</span>
                          <span className="text-gray-900">{restaurant.priceRange}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Verificado</span>
                          <span className="text-gray-900">{restaurant.verified ? 'Sim' : 'Não'}</span>
                        </div>
                        {restaurant.hours && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Horário</span>
                            <span className="text-gray-900">{restaurant.hours}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Contato</h4>
                      <div className="space-y-2 text-sm">
                        {restaurant.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <a href={`tel:${restaurant.phone}`} className="text-blue-600 hover:text-blue-700">
                              {restaurant.phone}
                            </a>
                          </div>
                        )}
                        {restaurant.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <a
                              href={`https://${restaurant.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {restaurant.website}
                            </a>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span className="text-gray-600">{restaurant.address}, {restaurant.city}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {restaurant.description && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                      <p className="text-gray-700">{restaurant.description}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'photos' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fotos ({restaurant.photos.length})</h3>
                  {restaurant.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {restaurant.photos.map((photo, index) => (
                        <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={photo}
                            alt={`Foto ${index + 1} de ${restaurant.name}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/api/placeholder/400/300';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma foto ainda</h3>
                      <p className="text-gray-600">Fotos das recomendações aparecerão aqui</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetailPage;