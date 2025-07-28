// FILE PATH: components/discover/DiscoverFilters.tsx
// Filtering component for the discover page

"use client"

import React from 'react';
import { X, MapPin, DollarSign, Star, Filter } from 'lucide-react';

interface FilterState {
  cuisine: string;
  priceRange: string;
  trustScore: number;
  location: string;
  sortBy: 'trustScore' | 'distance' | 'recommendations' | 'newest';
}

interface DiscoverFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
}

const cuisineTypes = [
  'Nordestina',
  'Frutos do Mar', 
  'Espanhola',
  'Steakhouse',
  'Contemporânea',
  'Brasileira Contemporânea',
  'Brasileira',
  'Italiana',
  'Japonesa',
  'Árabe',
  'Francesa',
  'Vegetariana',
  'Fast Food',
  'Café',
  'Padaria'
];

const priceRanges = [
  { value: '€', label: '€ - Econômico (até R$ 30)' },
  { value: '€€', label: '€€ - Moderado (R$ 30-60)' },
  { value: '€€€', label: '€€€ - Caro (R$ 60-120)' },
  { value: '€€€€', label: '€€€€ - Muito Caro (R$ 120+)' }
];

const brasiliaLocations = [
  'Asa Sul',
  'Asa Norte', 
  'Lago Sul',
  'Lago Norte',
  'Sudoeste',
  'Noroeste',
  'Águas Claras',
  'Taguatinga',
  'Ceilândia',
  'Samambaia',
  'Planaltina',
  'Sobradinho',
  'Gama'
];

const trustScoreRanges = [
  { value: 0, label: 'Qualquer Score' },
  { value: 5, label: '5+ - Bom ou melhor' },
  { value: 7, label: '7+ - Muito Bom ou melhor' },
  { value: 8, label: '8+ - Ótimo ou melhor' },
  { value: 9, label: '9+ - Excelente' }
];

const DiscoverFilters: React.FC<DiscoverFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters
}) => {
  const hasActiveFilters = 
    filters.cuisine || 
    filters.priceRange || 
    filters.trustScore > 0 || 
    filters.location;

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filtros de Busca
        </h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-trust-600 hover:text-trust-700 flex items-center"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar Filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cuisine Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Culinária
          </label>
          <select
            value={filters.cuisine}
            onChange={(e) => onFilterChange({ cuisine: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-trust-500 focus:border-transparent"
          >
            <option value="">Todas as culinárias</option>
            {cuisineTypes.map(cuisine => (
              <option key={cuisine} value={cuisine}>{cuisine}</option>
            ))}
          </select>
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <DollarSign className="h-4 w-4 mr-1" />
            Faixa de Preço
          </label>
          <select
            value={filters.priceRange}
            onChange={(e) => onFilterChange({ priceRange: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-trust-500 focus:border-transparent"
          >
            <option value="">Qualquer preço</option>
            {priceRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>

        {/* Trust Score Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Star className="h-4 w-4 mr-1" />
            Trust Score Mínimo
          </label>
          <select
            value={filters.trustScore}
            onChange={(e) => onFilterChange({ trustScore: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-trust-500 focus:border-transparent"
          >
            {trustScoreRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            Localização
          </label>
          <select
            value={filters.location}
            onChange={(e) => onFilterChange({ location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-trust-500 focus:border-transparent"
          >
            <option value="">Toda Brasília</option>
            {brasiliaLocations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters Section */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Filtros Avançados</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trust Score Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trust Score: {filters.trustScore > 0 ? `${filters.trustScore}+` : 'Qualquer'}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={filters.trustScore}
                onChange={(e) => onFilterChange({ trustScore: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtros Rápidos
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFilterChange({ trustScore: 8 })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.trustScore >= 8
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Só os Melhores (8+)
              </button>
              <button
                onClick={() => onFilterChange({ priceRange: '€' })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.priceRange === '€'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Econômico
              </button>
              <button
                onClick={() => onFilterChange({ location: 'Asa Sul' })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.location === 'Asa Sul'
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Asa Sul
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtros Ativos
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.cuisine && (
                <span className="px-2 py-1 bg-trust-100 text-trust-800 rounded-full text-xs flex items-center">
                  {filters.cuisine}
                  <button
                    onClick={() => onFilterChange({ cuisine: '' })}
                    className="ml-1 hover:text-trust-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.priceRange && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
                  {filters.priceRange}
                  <button
                    onClick={() => onFilterChange({ priceRange: '' })}
                    className="ml-1 hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.trustScore > 0 && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
                  Score {filters.trustScore}+
                  <button
                    onClick={() => onFilterChange({ trustScore: 0 })}
                    className="ml-1 hover:text-green-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.location && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center">
                  {filters.location}
                  <button
                    onClick={() => onFilterChange({ location: '' })}
                    className="ml-1 hover:text-purple-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {!hasActiveFilters && (
                <span className="text-xs text-gray-500 italic">
                  Nenhum filtro ativo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Results Preview */}
      <div className="bg-trust-50 border border-trust-200 rounded-lg p-4">
        <div className="text-sm text-trust-700">
          <div className="font-medium mb-1">Dica de Filtros:</div>
          <div>
            Use os filtros para encontrar exatamente o que procura. O Trust Score mostra 
            recomendações baseadas na sua rede social - quanto maior, mais pessoas que você 
            confia recomendaram o lugar!
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoverFilters;