// components/recommendation/EnhancedRestaurantAddition.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Check, AlertCircle, Star, ExternalLink } from 'lucide-react';
import { restaurantService, Restaurant, CreateRestaurantData } from '@/lib/services/restaurant-service';

interface EnhancedRestaurantAdditionProps {
  onRestaurantSelected: (restaurant: Restaurant) => void;
  userLocation?: { latitude: number; longitude: number };
  userWallet?: string;
  defaultCity?: string;
}

const CUISINE_TYPES = [
  'Brasileira', 'Nordestina', 'Mineira', 'Italiana', 'Japonesa', 'Chinesa',
  'Francesa', 'Mediterranea', 'Frutos do Mar', 'Steakhouse', 'Fast Food',
  'Cafe', 'Vegetariana', 'Vegana', 'Internacional', 'Árabe', 'Indiana', 'Tailandesa', 'Outra'
];

const SUPPORTED_CITIES = [
  { name: 'Brasília', country: 'Brazil', state: 'DF' },
  { name: 'São Paulo', country: 'Brazil', state: 'SP' },
  { name: 'Lisbon', country: 'Portugal', state: '' }
];

export default function RestaurantAddition({ 
  onRestaurantSelected, 
  userLocation,
  userWallet,
  defaultCity = 'Brasília'
}: RestaurantAdditionProps) {
  const [searchMode, setSearchMode] = useState<'search' | 'add'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // New restaurant form
  const [newRestaurant, setNewRestaurant] = useState<Partial<CreateRestaurantData>>({
    city: defaultCity,
    country: 'Brazil',
    priceRange: 2,
  });
  
  // Form validation and UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentRestaurantSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch (error) {
      console.warn('Could not load recent searches:', error);
    }
  }, []);

  // Save search to recent searches
  const saveToRecentSearches = (query: string) => {
    if (!query.trim()) return;
    
    try {
      const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentRestaurantSearches', JSON.stringify(newRecent));
    } catch (error) {
      console.warn('Could not save recent search:', error);
    }
  };

  // Enhanced search with API integration
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const results = await restaurantService.searchRestaurants({
        query: query.trim(),
        city: defaultCity,
        userLocation,
        limit: 10
      });
      
      setSearchResults(results);
      saveToRecentSearches(query.trim());
    } catch (error) {
      console.error('Search error:', error);
      setErrors({ search: 'Erro ao buscar restaurantes. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Get current location for new restaurant
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrors({ location: 'Geolocalização não é suportada pelo seu navegador' });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewRestaurant(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setIsGettingLocation(false);
        setErrors(prev => ({ ...prev, location: '' }));
      },
      (error) => {
        let errorMessage = 'Não foi possível obter sua localização';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de localização negada';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização não disponível';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo limite para obter localização';
            break;
        }
        setErrors({ location: errorMessage });
        setIsGettingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Enhanced form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!newRestaurant.name?.trim()) {
      newErrors.name = 'Nome do restaurante é obrigatório';
    } else if (newRestaurant.name.length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!newRestaurant.address?.trim()) {
      newErrors.address = 'Endereço é obrigatório';
    } else if (newRestaurant.address.length < 10) {
      newErrors.address = 'Por favor, forneça um endereço mais detalhado';
    }
    
    if (!newRestaurant.latitude || !newRestaurant.longitude) {
      newErrors.location = 'Localização é obrigatória - use GPS ou insira manualmente';
    }

    if (newRestaurant.website && newRestaurant.website.trim()) {
      try {
        new URL(newRestaurant.website);
      } catch {
        newErrors.website = 'URL do website inválida';
      }
    }

    if (newRestaurant.phone && newRestaurant.phone.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
      if (!phoneRegex.test(newRestaurant.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Formato de telefone inválido';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit new restaurant with API integration
  const handleSubmitNewRestaurant = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const createdRestaurant = await restaurantService.createRestaurant(
        newRestaurant as CreateRestaurantData,
        userWallet
      );
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      onRestaurantSelected(createdRestaurant);
      
      // Reset form
      setNewRestaurant({
        city: defaultCity,
        country: 'Brazil',
        priceRange: 2,
      });
      setSearchMode('search');
    } catch (error) {
      console.error('Error creating restaurant:', error);
      setErrors({ submit: 'Erro ao adicionar restaurante. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPriceRange = (range: number) => {
    const filled = '💰'.repeat(range);
    const empty = '🔲'.repeat(4 - range);
    return filled + empty;
  };

  const renderTrustScoreBadge = (score: number, count: number) => {
    if (score === 0 || count === 0) return null;
    
    let colorClass = 'bg-gray-100 text-gray-800';
    if (score >= 9) colorClass = 'bg-green-100 text-green-800';
    else if (score >= 7) colorClass = 'bg-blue-100 text-blue-800';
    else if (score >= 5) colorClass = 'bg-yellow-100 text-yellow-800';

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        Trust {score.toFixed(1)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-medium text-green-900">Restaurante adicionado!</h3>
              <p className="text-sm text-green-700 mt-1">
                O restaurante foi adicionado à base de dados e está sendo verificado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search/Add Mode Toggle */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setSearchMode('search')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            searchMode === 'search'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Search className="mr-2 h-4 w-4 inline" />
          Buscar Existente
        </button>
        <button
          onClick={() => setSearchMode('add')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            searchMode === 'add'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="mr-2 h-4 w-4 inline" />
          Adicionar Novo
        </button>
      </div>

      {searchMode === 'search' ? (
        /* Enhanced Search Mode */
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder={`Buscar restaurantes em ${defaultCity}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Search State Messages */}
            {loading && (
              <p className="mt-2 text-sm text-gray-500 flex items-center">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                Buscando restaurantes...
              </p>
            )}
            
            {errors.search && (
              <p className="mt-2 text-sm text-red-600">{errors.search}</p>
            )}
          </div>

          {/* Recent Searches */}
          {!searchQuery && recentSearches.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Buscas recentes:</h4>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(search)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-gray-700 transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Search Results */}
          <div className="space-y-3">
            {searchResults.map((restaurant) => (
              <div
                key={restaurant.id}
                className="border rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-sm"
                onClick={() => onRestaurantSelected(restaurant)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{restaurant.name}</h3>
                      {restaurant.verified && (
                        <Check className="h-4 w-4 text-green-600" title="Verificado" />
                      )}
                      {restaurant.website && (
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{restaurant.address}</p>
                    
                    <div className="flex items-center gap-3 mb-2">
                      {restaurant.cuisineType && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {restaurant.cuisineType}
                        </span>
                      )}
                      {restaurant.priceRange && (
                        <span className="text-xs" title={`Faixa de preço: ${restaurant.priceRange}/4`}>
                          {renderPriceRange(restaurant.priceRange)}
                        </span>
                      )}
                      {restaurant.distance && (
                        <span className="text-xs text-gray-500">
                          {restaurant.distance < 1 
                            ? `${Math.round(restaurant.distance * 1000)}m` 
                            : `${restaurant.distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>

                    {restaurant.topRecommendation && (
                      <div className="bg-gray-50 rounded p-2 mt-2">
                        <p className="text-xs text-gray-700 line-clamp-2">
                          "{restaurant.topRecommendation.excerpt}"
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          — {restaurant.topRecommendation.author}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right ml-4">
                    {renderTrustScoreBadge(restaurant.avgTrustScore || 0, restaurant.totalRecommendations || 0)}
                    <p className="text-xs text-gray-500 mt-1">
                      {restaurant.totalRecommendations || 0} recomendações
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* No Results State */}
            {searchQuery && !loading && searchResults.length === 0 && !errors.search && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhum restaurante encontrado para "{searchQuery}"</p>
                <button
                  onClick={() => setSearchMode('add')}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Adicionar como novo restaurante
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Enhanced Add New Restaurant Mode */
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Plus className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Adicionar Novo Restaurante</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Ajude a construir a base de dados da comunidade adicionando restaurantes que você quer recomendar.
                </p>
              </div>
            </div>
          </div>

          {/* Error message for submission */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Restaurant Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Restaurante *
            </label>
            <input
              type="text"
              value={newRestaurant.name || ''}
              onChange={(e) => setNewRestaurant(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o nome do restaurante"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endereço Completo *
            </label>
            <textarea
              value={newRestaurant.address || ''}
              onChange={(e) => setNewRestaurant(prev => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Rua, número, bairro, cidade"
            />
            {errors.address && (
              <p className="text-sm text-red-600 mt-1">{errors.address}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Localização GPS *
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleGetCurrentLocation}
                disabled={isGettingLocation}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <MapPin className="h-4 w-4" />
                {isGettingLocation ? 'Obtendo...' : 'Usar GPS'}
              </button>
              {newRestaurant.latitude && newRestaurant.longitude && (
                <div className="flex items-center px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                  <Check className="h-4 w-4 mr-2" />
                  Localização Definida ({newRestaurant.latitude.toFixed(4)}, {newRestaurant.longitude.toFixed(4)})
                </div>
              )}
            </div>
            {errors.location && (
              <p className="text-sm text-red-600 mt-1">{errors.location}</p>
            )}
          </div>

          {/* City & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cidade *
              </label>
              <select
                value={newRestaurant.city || ''}
                onChange={(e) => {
                  const selectedCity = SUPPORTED_CITIES.find(c => c.name === e.target.value);
                  setNewRestaurant(prev => ({ 
                    ...prev, 
                    city: e.target.value,
                    country: selectedCity?.country || 'Brazil'
                  }));
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SUPPORTED_CITIES.map((city) => (
                  <option key={`${city.name}-${city.country}`} value={city.name}>
                    {city.name}{city.state && `, ${city.state}`}, {city.country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                País
              </label>
              <input
                type="text"
                value={newRestaurant.country || ''}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-gray-50 text-gray-600"
              />
            </div>
          </div>

          {/* Cuisine & Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Culinária
              </label>
              <select
                value={newRestaurant.cuisineType || ''}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, cuisineType: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione o tipo de culinária</option>
                {CUISINE_TYPES.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>{cuisine}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faixa de Preço
              </label>
              <select
                value={newRestaurant.priceRange || 2}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, priceRange: Number(e.target.value) as 1|2|3|4 }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>💰 - Até R$30 por pessoa</option>
                <option value={2}>💰💰 - R$30-60 por pessoa</option>
                <option value={3}>💰💰💰 - R$60-120 por pessoa</option>
                <option value={4}>💰💰💰💰 - R$120+ por pessoa</option>
              </select>
            </div>
          </div>

          {/* Optional Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone (Opcional)
              </label>
              <input
                type="tel"
                value={newRestaurant.phone || ''}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+55 61 1234-5678"
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website (Opcional)
              </label>
              <input
                type="url"
                value={newRestaurant.website || ''}
                onChange={(e) => setNewRestaurant(prev => ({ ...prev, website: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://site-do-restaurante.com"
              />
              {errors.website && (
                <p className="text-sm text-red-600 mt-1">{errors.website}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmitNewRestaurant}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Adicionando...
                </>
              ) : (
                'Adicionar Restaurante & Continuar'
              )}
            </button>
            <button
              onClick={() => {
                setSearchMode('search');
                setErrors({});
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}