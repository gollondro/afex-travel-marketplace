'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, X } from 'lucide-react';
import { programsAPI, Program } from '@/lib/api';
import { ProgramCard, ProgramCardSkeleton } from '@/components/ProgramCard';
import { Input, Button, Select } from '@/components/ui';

export default function HomePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchDestination, setSearchDestination] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadPrograms();
    loadDestinations();
  }, []);

  async function loadPrograms() {
    try {
      setIsLoading(true);
      const response = await programsAPI.getAll({ limit: 50 });
      setPrograms(response.programs);
    } catch (err: any) {
      setError(err.message || 'Error loading programs');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDestinations() {
    try {
      const response = await programsAPI.getDestinations();
      setDestinations(response.destinations);
    } catch (err) {
      console.error('Error loading destinations:', err);
    }
  }

  async function handleFilter() {
    try {
      setIsLoading(true);
      const response = await programsAPI.getAll({
        destination: searchDestination || undefined,
        max_price: maxPrice ? parseInt(maxPrice) : undefined,
        limit: 50,
      });
      setPrograms(response.programs);
    } catch (err: any) {
      setError(err.message || 'Error filtering programs');
    } finally {
      setIsLoading(false);
    }
  }

  function clearFilters() {
    setSearchDestination('');
    setMaxPrice('');
    loadPrograms();
  }

  const hasActiveFilters = searchDestination || maxPrice;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Descubre Chile con AFEX Travel
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl">
            Explora los mejores programas turísticos de agencias verificadas.
            Desde la Patagonia hasta el Desierto de Atacama.
          </p>
          
          {/* Search Bar */}
          <div className="bg-white rounded-xl p-4 shadow-lg max-w-3xl">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Todos los destinos</option>
                  {destinations.map((dest) => (
                    <option key={dest} value={dest}>{dest}</option>
                  ))}
                </select>
              </div>
              
              <Button 
                size="lg" 
                onClick={handleFilter}
                className="md:w-auto w-full"
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Programas Disponibles
            </h2>
            <span className="text-gray-500">({programs.length})</span>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filtros
            </Button>
            
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearFilters}
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destino
                </label>
                <select
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {destinations.map((dest) => (
                    <option key={dest} value={dest}>{dest}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio máximo (CLP)
                </label>
                <Input
                  type="number"
                  placeholder="Ej: 1000000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleFilter} className="w-full md:w-auto">
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Programs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ProgramCardSkeleton key={i} />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No se encontraron programas con los filtros seleccionados.
            </p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Ver todos los programas
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
