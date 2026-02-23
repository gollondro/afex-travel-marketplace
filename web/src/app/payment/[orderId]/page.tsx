'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreditCard, Shield, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { ordersAPI, paymentsAPI, Order, Payment } from '@/lib/api';
import { formatCLP } from '@/lib/utils';
import { Button, Card, Spinner, Alert } from '@/components/ui';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'ready' | 'processing' | 'success' | 'error'>('ready');

  useEffect(() => {
    if (params.orderId) loadOrder(params.orderId as string);
  }, [params.orderId]);

  async function loadOrder(orderId: string) {
    try {
      setIsLoading(true);
      const response = await ordersAPI.getById(orderId);
      setOrder(response.order);
      setPayment(response.payment);
      if (response.order.status === 'paid') {
        router.replace(`/confirmation/${orderId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Orden no encontrada');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePayment() {
    if (!order) return;
    try {
      setIsProcessing(true);
      setStep('processing');
      setError(null);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const response = await paymentsAPI.process(order.id);
      if (response.order.status === 'paid') {
        setStep('success');
        setTimeout(() => router.push(`/confirmation/${order.id}`), 1500);
      }
    } catch (err: any) {
      setStep('error');
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order || !payment) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Orden no encontrada</h2>
          <Button onClick={() => router.push('/')}>Volver al inicio</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <CreditCard className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">AFEX Go</span>
          </div>
          <p className="text-green-100 text-sm">Pasarela de Pago Simulada</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'ready' && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Detalle de la compra</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Programa:</span>
                    <span className="text-gray-900 font-medium text-right max-w-[200px] truncate">
                      {order.program_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="text-gray-900">{order.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="text-gray-900">{order.customer_email}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                    <span className="text-gray-900 font-medium">Total a pagar:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCLP(order.total_clp)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Simulated Card */}
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 mb-6 text-white">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-8 bg-yellow-400 rounded" />
                  <span className="text-xs opacity-75">SIMULADO</span>
                </div>
                <div className="font-mono text-lg tracking-wider mb-4">•••• •••• •••• 4242</div>
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="text-xs opacity-75">Titular</div>
                    <div>{order.customer_name.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-75">Vence</div>
                    <div>12/28</div>
                  </div>
                </div>
              </div>

              {error && <Alert variant="error" className="mb-4">{error}</Alert>}

              <Button size="lg" className="w-full" onClick={handlePayment} isLoading={isProcessing}>
                <Shield className="w-5 h-5 mr-2" />
                Pagar {formatCLP(order.total_clp)}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                <Shield className="w-3 h-3 inline mr-1" />
                Pago seguro procesado por AFEX Go (Simulado)
              </p>
            </>
          )}

          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Procesando pago...</h3>
              <p className="text-gray-500">Por favor espera, no cierres esta ventana</p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">¡Pago exitoso!</h3>
              <p className="text-gray-500">Redirigiendo a la confirmación...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error en el pago</h3>
              <p className="text-gray-500 mb-6">{error || 'No se pudo procesar el pago'}</p>
              <Button onClick={() => setStep('ready')}>Intentar de nuevo</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
