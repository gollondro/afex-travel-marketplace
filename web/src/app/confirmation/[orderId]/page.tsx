'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, MapPin, Clock, Calendar, Mail, Download, Home } from 'lucide-react';
import { ordersAPI, Order } from '@/lib/api';
import { formatCLP, formatDateTime } from '@/lib/utils';
import { Button, Card, Spinner } from '@/components/ui';

export default function ConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.orderId) {
      loadOrder(params.orderId as string);
    }
  }, [params.orderId]);

  async function loadOrder(orderId: string) {
    try {
      setIsLoading(true);
      const response = await ordersAPI.getById(orderId);
      setOrder(response.order);
    } catch (err: any) {
      setError(err.message || 'Orden no encontrada');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Orden no encontrada'}
          </h2>
          <Link href="/">
            <Button>Volver al inicio</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isPaid = order.status === 'paid';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        {isPaid && (
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Reserva Confirmada!
            </h1>
            <p className="text-gray-600">
              Te hemos enviado los detalles a {order.customer_email}
            </p>
          </div>
        )}

        {/* Order Details Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Detalles de la reserva
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isPaid 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {isPaid ? 'Pagado' : 'Pendiente'}
            </span>
          </div>

          <div className="space-y-4">
            {/* Order ID */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Número de reserva</p>
              <p className="font-mono text-lg font-medium text-gray-900">
                {order.id}
              </p>
            </div>

            {/* Program Info */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-900 mb-3">
                {order.program_name}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                  {order.program_destination}
                </div>
                {order.paid_at && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                    {formatDateTime(order.paid_at)}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Datos del pasajero
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nombre:</span>
                  <span className="text-gray-900">{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{order.customer_email}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">
                  Total pagado
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCLP(order.total_clp)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="p-6 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">
            Próximos pasos
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-900">Revisa tu email</p>
                <p className="text-sm text-gray-500">
                  Te enviamos la confirmación y detalles completos
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-900">Coordina con la agencia</p>
                <p className="text-sm text-gray-500">
                  La agencia se contactará para coordinar fechas
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                <Download className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-900">Guarda este comprobante</p>
                <p className="text-sm text-gray-500">
                  Número de reserva: {order.id}
                </p>
              </div>
            </li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/" className="flex-1">
            <Button variant="outline" size="lg" className="w-full">
              <Home className="w-5 h-5 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <Button 
            size="lg" 
            className="flex-1"
            onClick={() => window.print()}
          >
            <Download className="w-5 h-5 mr-2" />
            Imprimir comprobante
          </Button>
        </div>
      </div>
    </div>
  );
}
