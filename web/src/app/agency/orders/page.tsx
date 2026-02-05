'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, X, Mail, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ordersAPI, Order } from '@/lib/api';
import { formatCLP, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Card, Button, Input, Spinner, Badge, EmptyState, Alert } from '@/components/ui';

type OrderStatus = 'all' | 'pending' | 'paid' | 'cancelled';

export default function AgencyOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState({ pending: 0, paid: 0, cancelled: 0, total_revenue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Cancel confirmation
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (token) {
      loadOrders();
    }
  }, [token, statusFilter, page]);

  async function loadOrders() {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const response = await ordersAPI.getMyOrders(token, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 10,
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

  async function handleCancelOrder(orderId: string) {
    if (!token) return;

    try {
      setIsCancelling(true);
      await ordersAPI.cancel(token, orderId);
      setCancelConfirm(null);
      setSuccess('Orden cancelada exitosamente');
      loadOrders();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cancelar la orden');
    } finally {
      setIsCancelling(false);
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.customer_name.toLowerCase().includes(search) ||
      order.customer_email.toLowerCase().includes(search) ||
      order.program_name.toLowerCase().includes(search) ||
      order.id.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Ventas</h1>
        <p className="text-gray-600 mt-1">
          Gestiona las órdenes de tus programas turísticos
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
          <p className="text-sm text-gray-500">Ingresos</p>
          <p className="text-2xl font-bold text-blue-600">{formatCLP(summary.total_revenue)}</p>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-6">
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, email, programa..."
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

      {/* Orders List */}
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
              ? `No tienes órdenes ${getStatusLabel(statusFilter).toLowerCase()}`
              : 'Aún no has recibido órdenes'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Order Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={
                      order.status === 'paid' ? 'success' :
                      order.status === 'pending' ? 'warning' :
                      'danger'
                    }>
                      {getStatusLabel(order.status)}
                    </Badge>
                    <span className="text-sm text-gray-500 font-mono">
                      #{order.id.slice(0, 8)}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900">{order.program_name}</h3>
                  
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      {order.customer_name} ({order.customer_email})
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {order.program_destination}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDateTime(order.created_at)}
                    </span>
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCLP(order.total_clp)}
                    </p>
                    {order.paid_at && (
                      <p className="text-xs text-gray-500">
                        Pagado: {formatDateTime(order.paid_at)}
                      </p>
                    )}
                  </div>

                  {order.status === 'pending' && (
                    cancelConfirm === order.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id)}
                          isLoading={isCancelling}
                        >
                          Confirmar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelConfirm(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelConfirm(order.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    )
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
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
        </div>
      )}
    </div>
  );
}
