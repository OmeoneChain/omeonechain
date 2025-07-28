import React, { useState, useEffect } from 'react';
import { Search, Plus, Home, User, MapPin, Star, ArrowLeft, Check, Users, Clock, Globe, Phone, Filter, SlidersHorizontal } from 'lucide-react';

// Mock restaurant data
const mockRestaurants = [
  {
    id: 1,
    name: "Café da Esquina",
    address: "SQN 204, Bloco C, Loja 15, Asa Norte",
    city: "Brasília",
    country: "Brazil",
    cuisineType: "Brazilian",
    priceRange: 2,
    phone: "+55 61 3326-1234",
    website: "https://cafedaesquina.com.br",
    verified: true,
    totalRecommendations: 12,
    avgTrustScore: 8.5,
    trustScoreForUser: 9.2,
    friendRecommendations: 3,
    distanceKm: 2.1,
  },
  {
    id: 2,
    name: "Sushi Koi",
    address: "CLN 103, Bloco A, Loja 45, Asa Norte",
    city: "Brasília",
    country: "Brazil",
    cuisineType: "Japanese",
    priceRange: 4,
    website: "https://sushikoi.com.br",
    verified: false,
    totalRecommendations: 15,
    avgTrustScore: 9.1,
    trustScoreForUser: 8.7,
    friendRecommendations: 5,
    distanceKm: 1.8,
  },
  {
    id: 3,
    name: "Pizzaria Bella Vista",
    address: "Rua Augusta, 1234, Vila Madalena",
    city: "São Paulo",
    country: "Brazil",
    cuisineType: "Italian",
    priceRange: 2,
    phone: "+55 11 3456-7890",
    verified: true,
    totalRecommendations: 6,
    avgTrustScore: 6.9,
    trustScoreForUser: 7.5,
    friendRecommendations: 2,
    distanceKm: 850.2,
  },
];

// Navigation Component
function Navigation({ currentPage, onNavigate }: { currentPage: string; onNavigate: (page: string) => void }) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'discover', label: 'Discover', icon: Search },
    { id: 'create', label: 'Create', icon: Plus },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="text-xl font-bold text-gray-900">OmeoneChain</span>
          </div>

          <div className="flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id || 
                              (currentPage.startsWith('restaurant-') && item.id === 'discover');
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm">
              <div className="font-medium text-gray-900">Live Trust Score: 4.2/10</div>
              <div className="text-xs text-gray-500">Connected to IOTA Testnet</div>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Dashboard Page
function DashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to OmeoneChain</h1>
        <p className="text-gray-600">Your personalized restaurant discovery platform powered by Trust Scores</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Discover Restaurants Card */}
        <div 
          onClick={() => onNavigate('discover')}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Discover Restaurants</h3>
          </div>
          <p className="text-gray-600 mb-4">Find great places recommended by people you trust</p>
          <div className="flex items-center text-sm text-blue-600">
            <span>Browse {mockRestaurants.length} restaurants</span>
            <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
          </div>
        </div>

        {/* Create Recommendation Card */}
        <div 
          onClick={() => onNavigate('create')}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Plus className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Share a Recommendation</h3>
          </div>
          <p className="text-gray-600 mb-4">Add restaurants and earn tokens for quality recommendations</p>
          <div className="flex items-center text-sm text-green-600">
            <span>Start creating</span>
            <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
          </div>
        </div>

        {/* Trust Score Explanation Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Star className="h-8 w-8" fill="currentColor" />
            <h3 className="text-lg font-semibold">Trust Score: 4.2/10</h3>
          </div>
          <p className="text-blue-100 mb-4">Your personalized score based on your social network</p>
          <div className="text-sm text-blue-200">
            <div>• Base Reputation: 70%</div>
            <div>• Social Weights: 42%</div>
            <div>• Live from blockchain</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Activity</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
            <p className="text-gray-600 mb-4">Start by discovering restaurants or creating your first recommendation</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => onNavigate('discover')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Discover Restaurants
              </button>
              <button
                onClick={() => onNavigate('create')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Create Recommendation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Discovery Page
function DiscoveryPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    city: 'All Cities',
    cuisine: 'All Cuisines',
    priceRange: [1, 2, 3, 4],
    minTrustScore: 0,
    sortBy: 'trustScore'
  });

  const filteredRestaurants = mockRestaurants.filter(restaurant => {
    if (searchQuery && !restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !restaurant.address.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.city !== 'All Cities' && restaurant.city !== filters.city) {
      return false;
    }
    if (filters.cuisine !== 'All Cuisines' && restaurant.cuisineType !== filters.cuisine) {
      return false;
    }
    if (!filters.priceRange.includes(restaurant.priceRange || 2)) {
      return false;
    }
    return (restaurant.trustScoreForUser || restaurant.avgTrustScore) >= filters.minTrustScore;
  }).sort((a, b) => {
    const scoreA = a.trustScoreForUser || a.avgTrustScore;
    const scoreB = b.trustScoreForUser || b.avgTrustScore;
    return scoreB - scoreA;
  });

  const renderPriceRange = (range: number) => {
    return '💰'.repeat(range) + '⚪'.repeat(4 - range);
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Discover Restaurants</h1>
              <p className="text-gray-600 mt-1">Find great places recommended by people you trust</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search restaurants by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quick Filters */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="All Cities">All Cities</option>
                    <option value="Brasília">Brasília</option>
                    <option value="São Paulo">São Paulo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine</label>
                  <select
                    value={filters.cuisine}
                    onChange={(e) => setFilters(prev => ({ ...prev, cuisine: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="All Cuisines">All Cuisines</option>
                    <option value="Brazilian">Brazilian</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Italian">Italian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Trust Score: {filters.minTrustScore}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={filters.minTrustScore}
                    onChange={(e) => setFilters(prev => ({ ...prev, minTrustScore: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="trustScore">Trust Score</option>
                    <option value="distance">Distance</option>
                    <option value="recent">Recently Recommended</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="space-y-4">
          {filteredRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onNavigate(`restaurant-${restaurant.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{restaurant.name}</h3>
                    {restaurant.verified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">{restaurant.address}</span>
                    {restaurant.distanceKm && (
                      <span className="text-sm ml-2 text-gray-500">
                        • {restaurant.distanceKm < 1 ? 
                          `${Math.round(restaurant.distanceKm * 1000)}m` : 
                          `${restaurant.distanceKm.toFixed(1)}km`} away
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    {restaurant.cuisineType && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {restaurant.cuisineType}
                      </span>
                    )}
                    {restaurant.priceRange && (
                      <span className="text-sm text-gray-600">
                        {renderPriceRange(restaurant.priceRange)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{restaurant.totalRecommendations} recommendations</span>
                    {restaurant.friendRecommendations && restaurant.friendRecommendations > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {restaurant.friendRecommendations} friends recommend
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-6 text-right">
                  <div className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg ${getTrustScoreColor(restaurant.trustScoreForUser || restaurant.avgTrustScore)}`}>
                    <Star className="h-4 w-4" fill="currentColor" />
                    <span className="font-bold text-sm">
                      {(restaurant.trustScoreForUser || restaurant.avgTrustScore).toFixed(1)}
                    </span>
                  </div>
                  {restaurant.trustScoreForUser && (
                    <p className="text-xs text-blue-600 mt-1">Personalized</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredRestaurants.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
              <button
                onClick={() => onNavigate('create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add a restaurant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Restaurant Profile Page
function RestaurantProfilePage({ restaurantId, onNavigate }: { restaurantId: string; onNavigate: (page: string) => void }) {
  const restaurant = mockRestaurants.find(r => r.id === parseInt(restaurantId));

  if (!restaurant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Restaurant not found</h2>
        <button
          onClick={() => onNavigate('discover')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to discovery
        </button>
      </div>
    );
  }

  const renderPriceRange = (range: number) => {
    return '💰'.repeat(range) + '⚪'.repeat(4 - range);
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div>
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <button
            onClick={() => onNavigate('discover')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to search
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                {restaurant.verified && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Check className="h-4 w-4 mr-1" />
                    Verified
                  </span>
                )}
              </div>

              <div className="flex items-center text-gray-600 mb-4">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{restaurant.address}</span>
                {restaurant.distanceKm && (
                  <span className="ml-2 text-gray-500">
                    • {restaurant.distanceKm < 1 ? 
                      `${Math.round(restaurant.distanceKm * 1000)}m` : 
                      `${restaurant.distanceKm.toFixed(1)}km`} away
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mb-4">
                {restaurant.cuisineType && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {restaurant.cuisineType}
                  </span>
                )}
                {restaurant.priceRange && (
                  <span className="text-lg">{renderPriceRange(restaurant.priceRange)}</span>
                )}
              </div>

              <div className="flex items-center gap-4">
                {restaurant.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}
                {restaurant.website && (
                  <a
                    href={restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
            </div>

            {/* Trust Score Section */}
            <div className="lg:w-80">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Trust Score</h3>
                
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 ${getTrustScoreColor(restaurant.trustScoreForUser || restaurant.avgTrustScore)}`}>
                    <Star className="h-6 w-6" fill="currentColor" />
                    <span className="text-2xl font-bold">
                      {(restaurant.trustScoreForUser || restaurant.avgTrustScore).toFixed(1)}
                    </span>
                  </div>
                  {restaurant.trustScoreForUser && (
                    <p className="text-sm text-blue-600 font-medium mt-2">
                      Personalized for you
                    </p>
                  )}
                </div>

                {restaurant.friendRecommendations && restaurant.friendRecommendations > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {restaurant.friendRecommendations} of your friends recommend this
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Your personalized score is higher because friends in your network have recommended this place.
                    </p>
                  </div>
                )}

                <div className="text-center text-sm text-gray-500">
                  {restaurant.totalRecommendations} total recommendations
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h3>
            <div className="bg-gray-50 rounded-lg p-8">
              <div className="text-gray-500 mb-4">
                <Star className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium mb-2">No recommendations yet</p>
                <p className="text-sm">Be the first to recommend this restaurant!</p>
              </div>
              <button
                onClick={() => onNavigate('create')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Write a Recommendation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Page Placeholder
function CreatePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center py-12">
        <Plus className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Recommendation</h2>
        <p className="text-gray-600 mb-8">This would integrate with your existing enhanced restaurant addition and recommendation creation components.</p>
        <div className="bg-blue-50 rounded-lg p-6 text-left">
          <h3 className="font-medium text-blue-900 mb-2">Integration Points:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use RestaurantAddition component for restaurant selection/creation</li>
            <li>• Connect to your existing recommendation creation flow</li>
            <li>• Submit to your live smart contracts for Trust Score calculation</li>
            <li>• Redirect to restaurant profile page after successful submission</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Profile Page Placeholder
function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center py-12">
        <User className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">User Profile</h2>
        <p className="text-gray-600 mb-8">This would show user's recommendations, reputation, and Trust Score history.</p>
        <div className="bg-gray-50 rounded-lg p-6 text-left">
          <h3 className="font-medium text-gray-900 mb-2">Would Include:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• User's recommendation history</li>
            <li>• Reputation score and breakdown</li>
            <li>• Token balance and earnings</li>
            <li>• Social connections (followers/following)</li>
            <li>• Activity feed and achievements</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Main Demo Component
export default function CompleteIntegrationDemo() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    if (currentPage.startsWith('restaurant-')) {
      const restaurantId = currentPage.replace('restaurant-', '');
      return <RestaurantProfilePage restaurantId={restaurantId} onNavigate={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'discover':
        return <DiscoveryPage onNavigate={setCurrentPage} />;
      case 'create':
        return <CreatePage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
      
      {/* Status indicator */}
      <div className="fixed bottom-4 left-4 bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm">
        ✅ Connected to IOTA Testnet - Trust Score: Live
      </div>
    </div>
  );
}