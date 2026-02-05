'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Package, ShoppingCart, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usersAPI, ordersAPI, Agency, Order } from '@/lib/api';
import { formatCLP, formatRelativeTime, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Card, Button, Spinner, Badge } from '@/components/ui';

interface AdminStats {
  total_agencies: number;
  total_programs: number;
  total_orders: number;
  total_revenue: number;
}

export default function AdminDashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentAgencies, setRecentAgencies] = useState<Agency[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  async function loadDashboardData() {
    if (!token) return;
    
    try {
      setIsLoading(true);
      
      const [profileRes, agenciesRes, ordersRes] = await Promise.all([
        usersAPI.getProfile(token),
        usersAPI.getAgencies(token),
        ordersAPI.getAllOrders(token, { limit: 5 }),
      ]);
      
      setStats(profileRes.stats as AdminStats);
      setRecentAgencies(agenciesRes.agencies.slice(0, 5));
      setRecentOrders(ordersRes.orders);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de Administración
        </h1>
        <p className="text-gray-600 mt-1">
          Vista general del marketplace AFEX Travel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Agencias</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_agencies || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Programas</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_programs || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Órdenes totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_orders || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Ingresos totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCLP(stats?.total_revenue || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Agencies */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Agencias Registradas
            </h2>
            <Link href="/admin/agencies">
              <Button variant="ghost" size="sm">
                Ver todas
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {recentAgencies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay agencias registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAgencies.map((agency) => (
                <div
                  key={agency.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-medium">
                        {agency.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{agency.name}</p>
                      <p className="text-sm text-gray-500">{agency.email}</p>
                    </div>
                  </div>
                  <Badge variant={agency.status === 'active' ? 'success' : 'default'}>
                    {agency.status === 'active' ? 'Activo' : agency.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Orders */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Últimas Ventas
            </h2>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">
                Ver todas
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay ventas registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {order.customer_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {order.program_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge variant={
                      order.status === 'paid' ? 'success' :
                      order.status === 'pending' ? 'warning' :
                      'danger'
                    }>
                      {getStatusLabel(order.status)}
                    </Badge>
                    <p className="font-medium text-gray-900 whitespace-nowrap">
                      {formatCLP(order.total_clp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
