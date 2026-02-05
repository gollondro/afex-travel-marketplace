'use client';

import { useState, useEffect } from 'react';
import { Building2, Search, Mail, Calendar, Package, ShoppingCart, DollarSign } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usersAPI, Agency } from '@/lib/api';
import { formatCLP, formatDate } from '@/lib/utils';
import { Card, Button, Spinner, Badge, EmptyState } from '@/components/ui';

interface AgencyWithStats extends Agency {
  stats?: {
    programs_count: number;
    orders_count: number;
    total_sales: number;
  };
}

export default function AdminAgenciesPage() {
  const { token } = useAuth();
  const [agencies, setAgencies] = useState<AgencyWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadAgencies();
    }
  }, [token]);

  async function loadAgencies() {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const response = await usersAPI.getAgencies(token);
      setAgencies(response.agencies);
    } catch (err: any) {
      setError(err.message || 'Error al cargar agencias');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAgencyStats(agencyId: string) {
    if (!token) return;

    try {
      setLoadingStats(agencyId);
      const response = await usersAPI.getAgency(token, agencyId);
      
      setAgencies(prev => prev.map(agency => 
        agency.id === agencyId 
          ? { ...agency, stats: response.stats }
          : agency
      ));
    } catch (err) {
      console.error('Error loading agency stats:', err);
    } finally {
      setLoadingStats(null);
    }
  }

  function toggleExpand(agencyId: string) {
    if (expandedAgency === agencyId) {
      setExpandedAgency(null);
    } else {
      setExpandedAgency(agencyId);
      const agency = agencies.find(a => a.id === agencyId);
      if (!agency?.stats) {
        loadAgencyStats(agencyId);
      }
    }
  }

  const filteredAgencies = agencies.filter(agency => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      agency.name.toLowerCase().includes(search) ||
      agency.email.toLowerCase().includes(search)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agencias Registradas</h1>
        <p className="text-gray-600 mt-1">
          Lista de todas las agencias en el marketplace ({agencies.length} total)
        </p>
      </div>

      {/* Search */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </Card>

      {/* Agencies List */}
      {filteredAgencies.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<Building2 className="w-12 h-12" />}
            title="No se encontraron agencias"
            description={searchTerm ? 'Intenta con otro término de búsqueda' : 'No hay agencias registradas'}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAgencies.map((agency) => (
            <Card key={agency.id} className="overflow-hidden">
              <button
                onClick={() => toggleExpand(agency.id)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-bold text-lg">
                        {agency.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold text-gray-900">{agency.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {agency.email}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(agency.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge variant={agency.status === 'active' ? 'success' : 'default'}>
                      {agency.status === 'active' ? 'Activo' : agency.status}
                    </Badge>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedAgency === agency.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Stats */}
              {expandedAgency === agency.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  {loadingStats === agency.id ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : agency.stats ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-white rounded-lg">
                        <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">
                          {agency.stats.programs_count}
                        </p>
                        <p className="text-sm text-gray-500">Programas</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg">
                        <ShoppingCart className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">
                          {agency.stats.orders_count}
                        </p>
                        <p className="text-sm text-gray-500">Órdenes</p>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg">
                        <DollarSign className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCLP(agency.stats.total_sales)}
                        </p>
                        <p className="text-sm text-gray-500">Ventas totales</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      Error al cargar estadísticas
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
