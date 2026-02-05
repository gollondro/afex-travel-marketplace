'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Building2, Mail, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ordersAPI, Order } from '@/lib/api';
import { formatCLP, formatDateTime, getStatusLabel } from '@/lib/utils';
import { Card, Button, Spinner, Badge, EmptyState } from '@/components/ui';

type OrderStatus = 'all' | 'pending' | 'paid' | 'cancelled';

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState({ pending: 0, paid: 0, cancelled: 0, total_revenue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (token) {
      loadOrders();
    }
  }, [token, statusFilter, page]);

  async function loadOrders() {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const response = await ordersAPI.getAllOrders(token, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 15,
      });
      
      setOrders(response.orders);
      setSummary(response.summary);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar órdenes');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.customer_name.toLowerCase().includes(search) ||
      order.customer_email.toLowerCase().includes(search) ||
      order.program_name.toLowerCase().includes(search) ||
      order.agency_name?.toLowerCase().includes(search) ||
      order.id.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Todas las Ventas</h1>
        <p className="text-gray-600 mt-1">
          Vista general de todas las órdenes del marketplace
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Pagadas</p>
          <p className="text-2xl font-bold text-green-600">{summary.paid}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Canceladas</p>
          <p className="text-2xl font-bold text-red-600">{summary.cancelled}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-500">Ingresos totales</p>
          <p className="text-2xl font-bold text-blue-600">{formatCLP(summary.total_revenue)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, email, programa, agencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {(['all', 'pending', 'paid', 'cancelled'] as OrderStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todas' : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<ShoppingCart className="w-12 h-12" />}
            title="No hay órdenes"
            description={statusFilter !== 'all' 
              ? `No hay órdenes ${getStatusLabel(statusFilter).toLowerCase()}`
              : 'Aún no hay ventas en el marketplace'
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Programa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agencia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-900">
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customer_email}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-[200px] truncate">
                          {order.program_name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {order.program_destination}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Building2 className="w-4 h-4 mr-1 text-gray-400" />
                          {order.agency_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge variant={
                          order.status === 'paid' ? 'success' :
                          order.status === 'pending' ? 'warning' :
                          'danger'
                        }>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="font-medium text-gray-900">
                          {formatCLP(order.total_clp)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {formatDateTime(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm text-gray-500">
                    #{order.id.slice(0, 8)}
                  </span>
                  <Badge variant={
                    order.status === 'paid' ? 'success' :
                    order.status === 'pending' ? 'warning' :
                    'danger'
                  }>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
                
                <h3 className="font-medium text-gray-900 mb-2">
                  {order.program_name}
                </h3>
                
                <div className="space-y-1 text-sm text-gray-500 mb-3">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {order.customer_name} ({order.customer_email})
                  </div>
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    {order.agency_name || 'N/A'}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDateTime(order.created_at)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCLP(order.total_clp)}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
