'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, ShoppingCart, DollarSign, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usersAPI, programsAPI, ordersAPI, Program, Order } from '@/lib/api';
import { formatCLP, getStatusLabel } from '@/lib/utils';
import { Card, Button, Spinner, Badge } from '@/components/ui';

interface Stats {
  programs_count: number;
  orders_count: number;
  pending_orders: number;
  paid_orders: number;
  total_revenue: number;
}

export default function AgencyDashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPrograms, setRecentPrograms] = useState<Program[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) loadDashboardData();
  }, [token]);

  async function loadDashboardData() {
    if (!token) return;
    try {
      setIsLoading(true);
      const [profileRes, programsRes, ordersRes] = await Promise.all([
        usersAPI.getProfile(token),
        programsAPI.getMyPrograms(token),
        ordersAPI.getMyOrders(token, { limit: 5 }),
      ]);
      setStats(profileRes.stats as unknown as Stats);
      setRecentPrograms(programsRes.programs.slice(0, 3));
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">¡Hola, {user?.name}!</h1>
        <p className="text-gray-600 mt-1">Aquí tienes un resumen de tu actividad</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Programas</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.programs_count || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Ventas totales</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.paid_orders || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pending_orders || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Ingresos totales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCLP(stats?.total_revenue || 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mis Programas</h2>
            <Link href="/agency/programs">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {recentPrograms.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No tienes programas creados</p>
              <Link href="/agency/programs">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Crear programa
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPrograms.map((program) => (
                <div key={program.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{program.name}</p>
                    <p className="text-sm text-gray-500">{program.destination}</p>
                  </div>
                  <p className="font-medium text-green-600 ml-4">{formatCLP(program.price_clp)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Últimas Ventas</h2>
            <Link href="/agency/orders">
              <Button variant="ghost" size="sm">
                Ver todas <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aún no tienes ventas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{order.customer_name}</p>
                    <p className="text-sm text-gray-500 truncate">{order.program_name}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge variant={order.status === 'paid' ? 'success' : 'warning'}>
                      {getStatusLabel(order.status)}
                    </Badge>
                    <p className="font-medium text-gray-900">{formatCLP(order.total_clp)}</p>
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
