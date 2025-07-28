import React, { useState } from 'react';
import { Heart, Users, MapPin, Clock, TrendingUp, Sparkles } from 'lucide-react';

// Mock data for lists
const mockLists = [
  {
    id: 1,
    title: "Melhores Brunches da Asa Sul",
    description: "Lugares perfeitos para um brunch de fim de semana com amigos",
    author: {
      name: "Ana Gastronômica",
      avatar: "👩‍🍳",
      verified: true,
      followers: 2340
    },
    restaurantCount: 8,
    trustScore: 8.7,
    saves: 156,
    category: "Brunch",
    neighborhood: "Asa Sul",
    isNew: true,
    timeAgo: "2 horas",
    preview: [
      { name: "Café Daniel Briand", image: "🥐" },
      { name: "Bendito Benedito", image: "🧇" },
      { name: "Café com Letra", image: "☕" }
    ]
  },
  {
    id: 2,
    title: "Rodízio de Pizza Autêntico",
    description: "Os verdadeiros rodízios que todo brasiliense precisa conhecer",
    author: {
      name: "Pedro Foodie",
      avatar: "👨‍🍳",
      verified: false,
      followers: 890
    },
    restaurantCount: 5,
    trustScore: 9.2,
    saves: 89,
    category: "Pizza",
    neighborhood: "Asa Norte",
    isNew: false,
    timeAgo: "1 dia",
    preview: [
      { name: "Mama Mia", image: "🍕" },
      { name: "Villa Borghese", image: "🍕" },
      { name: "Fratelli", image: "🍕" }
    ]
  },
  {
    id: 3,
    title: "Comida Nordestina Raiz",
    description: "Sabores autênticos do nordeste no coração de Brasília",
    author: {
      name: "Maria do Sertão",
      avatar: "👩",
      verified: true,
      followers: 1520
    },
    restaurantCount: 6,
    trustScore: 8.9,
    saves: 203,
    category: "Nordestina",
    neighborhood: "Taguatinga",
    isNew: false,
    timeAgo: "3 dias",
    preview: [
      { name: "Casa do Sertão", image: "🌶️" },
      { name: "Mangai", image: "🥘" },
      { name: "Tempero da Dadá", image: "🍛" }
    ]
  },
  {
    id: 4,
    title: "Date Night Perfeito",
    description: "Restaurantes românticos para impressionar no encontro",
    author: {
      name: "Casal Gourmet",
      avatar: "💑",
      verified: true,
      followers: 3100
    },
    restaurantCount: 10,
    saves: 342,
    trustScore: 9.0,
    category: "Romântico",
    neighborhood: "Lago Sul",
    isNew: false,
    timeAgo: "5 dias",
    preview: [
      { name: "Antiquarius", image: "🍷" },
      { name: "DOM", image: "🥂" },
      { name: "Rubaiyat", image: "🥩" }
    ]
  }
];

const DiscoverListsSection = () => {
  const [activeTab, setActiveTab] = useState('trending');

  const getTrustScoreBadge = (score) => {
    if (score >= 9) return { color: 'bg-green-500', label: 'Excelente' };
    if (score >= 7) return { color: 'bg-blue-500', label: 'Muito Bom' };
    return { color: 'bg-yellow-500', label: 'Bom' };
  };

  const filteredLists = mockLists.filter(list => {
    if (activeTab === 'new') return list.isNew;
    if (activeTab === 'trending') return list.saves > 100;
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Listas Curadas</h2>
            <p className="text-sm text-gray-600">Descobertas organizadas por especialistas locais</p>
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
            Em Alta
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
            Novidades
          </button>
        </div>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLists.map((list) => {
          const trustBadge = getTrustScoreBadge(list.trustScore);
          
          return (
            <div
              key={list.id}
              className="group bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
            >
              {/* List Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {list.title}
                    </h3>
                    {list.isNew && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Novo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {list.description}
                  </p>
                </div>
                
                {/* Trust Score */}
                <div className="flex items-center gap-1 ml-3">
                  <div className={`w-2 h-2 rounded-full ${trustBadge.color}`}></div>
                  <span className="text-sm font-medium text-gray-700">{list.trustScore}</span>
                </div>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{list.author.avatar}</span>
                <span className="text-sm font-medium text-gray-700">
                  {list.author.name}
                </span>
                {list.author.verified && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  {list.author.followers.toLocaleString()} seguidores
                </span>
              </div>

              {/* Restaurant Preview */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex -space-x-1">
                  {list.preview.slice(0, 3).map((restaurant, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 bg-white rounded-full border border-gray-200 flex items-center justify-center text-xs"
                      title={restaurant.name}
                    >
                      {restaurant.image}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-gray-600">
                  {list.restaurantCount} restaurantes
                </span>
              </div>

              {/* List Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{list.saves}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{list.neighborhood}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{list.timeAgo}</span>
                  </div>
                </div>
                
                <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">
                  {list.category}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Call to Action */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Crie sua própria lista</h3>
            <p className="text-sm text-gray-600">
              Ganhe tokens compartilhando suas descobertas gastronômicas favoritas
            </p>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-colors">
            Criar Lista
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscoverListsSection;