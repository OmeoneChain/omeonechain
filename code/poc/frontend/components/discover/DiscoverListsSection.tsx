import React, { useState } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ListCard from '@/components/ListCard';

// Mock data for lists - keeping existing structure
// NOTE: In production, this data will come from the database with proper translation handling
const mockLists = [
  {
    id: 1,
    title: "Melhores Brunches da Asa Sul",
    description: "Lugares perfeitos para um brunch de fim de semana com amigos",
    author: {
      id: "user-1",
      name: "Ana Gastronômica",
      avatar: "👩‍🍳",
      verified: true,
      followers: 2340,
      socialDistance: 1 as 1 | 2
    },
    restaurantCount: 8,
    saves: 156,
    likes: 89,
    category: "Brunch",
    neighborhood: "Asa Sul",
    isNew: true,
    timeAgo: "2 horas",
    tags: ["brunch", "weekend", "friends"],
    preview: [
      { 
        id: 1,
        name: "Café Daniel Briand", 
        image: "/api/placeholder/48/48",
        cuisine: "Francês",
        rating: 9.2,
        location: "Asa Sul"
      },
      { 
        id: 2,
        name: "Bendito Benedito", 
        image: "/api/placeholder/48/48",
        cuisine: "Brunch",
        rating: 8.8,
        location: "Asa Sul"
      },
      { 
        id: 3,
        name: "Café com Letra", 
        image: "/api/placeholder/48/48",
        cuisine: "Café",
        rating: 8.5,
        location: "Asa Sul"
      }
    ],
    isBookmarked: false,
    hasLiked: false
  },
  {
    id: 2,
    title: "Rodízio de Pizza Autêntico",
    description: "Os verdadeiros rodízios que todo brasiliense precisa conhecer",
    author: {
      id: "user-2",
      name: "Pedro Foodie",
      avatar: "👨‍🍳",
      verified: false,
      followers: 890,
      socialDistance: 2 as 1 | 2
    },
    restaurantCount: 5,
    saves: 89,
    likes: 45,
    category: "Pizza",
    neighborhood: "Asa Norte",
    isNew: false,
    timeAgo: "1 dia",
    tags: ["pizza", "rodizio", "italian"],
    preview: [
      { 
        id: 4,
        name: "Mama Mia", 
        image: "/api/placeholder/48/48",
        cuisine: "Italiano",
        rating: 9.0,
        location: "Asa Norte"
      },
      { 
        id: 5,
        name: "Villa Borghese", 
        image: "/api/placeholder/48/48",
        cuisine: "Italiano",
        rating: 8.7,
        location: "Asa Norte"
      }
    ],
    isBookmarked: false,
    hasLiked: false
  },
  {
    id: 3,
    title: "Comida Nordestina Raiz",
    description: "Sabores autênticos do nordeste no coração de Brasília",
    author: {
      id: "user-3",
      name: "Maria do Sertão",
      avatar: "👩",
      verified: true,
      followers: 1520
    },
    restaurantCount: 6,
    saves: 203,
    likes: 112,
    category: "Nordestina",
    neighborhood: "Taguatinga",
    isNew: false,
    timeAgo: "3 dias",
    tags: ["nordestina", "traditional", "authentic"],
    preview: [
      { 
        id: 6,
        name: "Casa do Sertão", 
        image: "/api/placeholder/48/48",
        cuisine: "Nordestina",
        rating: 9.3,
        location: "Taguatinga"
      },
      { 
        id: 7,
        name: "Mangai", 
        image: "/api/placeholder/48/48",
        cuisine: "Nordestina",
        rating: 8.9,
        location: "Taguatinga"
      }
    ],
    isBookmarked: true,
    hasLiked: false
  },
  {
    id: 4,
    title: "Date Night Perfeito",
    description: "Restaurantes românticos para impressionar no encontro",
    author: {
      id: "user-4",
      name: "Casal Gourmet",
      avatar: "💑",
      verified: true,
      followers: 3100,
      socialDistance: 1 as 1 | 2
    },
    restaurantCount: 10,
    saves: 342,
    likes: 198,
    category: "Romântico",
    neighborhood: "Lago Sul",
    isNew: false,
    timeAgo: "5 dias",
    tags: ["romantic", "datenight", "upscale"],
    preview: [
      { 
        id: 8,
        name: "Antiquarius", 
        image: "/api/placeholder/48/48",
        cuisine: "Fine Dining",
        rating: 9.5,
        location: "Lago Sul"
      },
      { 
        id: 9,
        name: "DOM", 
        image: "/api/placeholder/48/48",
        cuisine: "Contemporâneo",
        rating: 9.2,
        location: "Lago Sul"
      }
    ],
    isBookmarked: false,
    hasLiked: true
  }
];

const DiscoverListsSection = () => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState('trending');
  const [lists, setLists] = useState(mockLists);

  const filteredLists = lists.filter(list => {
    if (activeTab === 'new') return list.isNew;
    if (activeTab === 'trending') return list.saves > 100;
    return true;
  });

  // Handler functions for list interactions
  const handleSave = (id: string | number) => {
    setLists(prevLists => 
      prevLists.map(list => 
        list.id === id 
          ? { ...list, isBookmarked: !list.isBookmarked, saves: list.isBookmarked ? list.saves - 1 : list.saves + 1 }
          : list
      )
    );
  };

  const handleLike = (id: string | number) => {
    setLists(prevLists => 
      prevLists.map(list => 
        list.id === id 
          ? { ...list, hasLiked: !list.hasLiked, likes: (list.likes || 0) + (list.hasLiked ? -1 : 1) }
          : list
      )
    );
  };

  const handleShare = (id: string | number) => {
    console.log('Sharing list:', id);
    // Implement share functionality
  };

  const handleAuthorClick = (authorId: string) => {
    console.log('Viewing author:', authorId);
    // Navigate to author profile
  };

  const handleReport = (id: string | number) => {
    console.log('Reporting list:', id);
    // Implement report functionality
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('discovery.lists.title')}</h2>
            <p className="text-sm text-gray-600">{t('discovery.lists.subtitle')}</p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'trending'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />
            {t('discovery.lists.tabs.trending')}
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'new'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            {t('discovery.lists.tabs.new')}
          </button>
        </div>
      </div>

      {/* Lists Grid - Using new ListCard component */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLists.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            variant="default"
            showAuthor={true}
            showActions={true}
            onSave={handleSave}
            onLike={handleLike}
            onShare={handleShare}
            onAuthorClick={handleAuthorClick}
            onReport={handleReport}
          />
        ))}
      </div>

      {/* Call to Action */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">{t('discovery.lists.cta.title')}</h3>
            <p className="text-sm text-gray-600">
              {t('discovery.lists.cta.description')}
            </p>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-colors">
            {t('discovery.lists.cta.button')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscoverListsSection;