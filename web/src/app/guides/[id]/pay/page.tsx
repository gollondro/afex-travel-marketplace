'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Copy, CheckCircle, Loader2, ArrowLeft, QrCode } from 'lucide-react';
import { Button, Card, Spinner, Alert } from '@/components/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://afexgo-travel-api.onrender.com';

const PAYMENT_METHOD_INFO: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  pix: { label: 'PIX', icon: '🇧🇷', color: 'text-teal-600', bgColor: 'bg-teal-50' },
  qr_argentina: { label: 'QR Argentina', icon: '🇦🇷', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  yape: { label: 'Yape', icon: '🇵🇪', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  plin: { label: 'Plin', icon: '🇵🇪', color: 'text-green-600', bgColor: 'bg-green-50' },
  zelle: { label: 'Zelle', icon: '🇺🇸', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  venmo: { label: 'Venmo', icon: '🇺🇸', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  bizum: { label: 'Bizum', icon: '🇪🇸', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
};

export default function TipPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const tipId = searchParams.get('tip');
  const method = searchParams.get('method') || '';
  const amount = searchParams.get('amount') || '0';

  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const methodInfo = PAYMENT_METHOD_INFO[method] || { label: method, icon: '💳', color: 'text-gray-600', bgColor: 'bg-gray-50' };

  // Simulated payment details based on method
  useEffect(() => {
    // In a real app, this would come from the API
    setPaymentDetails(getSimulatedPaymentDetails(method));
  }, [method]);

  function getSimulatedPaymentDetails(method: string) {
    const details: Record<string, any> = {
      pix: {
        key: 'guia@afexgo.com',
        qr_available: true,
        instructions: 'Escanea el QR o copia la clave PIX',
      },
      qr_argentina: {
        alias: 'guia.afexgo',
        cbu: '0000003100000000000000',
        instructions: 'Usa el alias o CBU para transferir',
      },
      yape: {
        phone: '+51 999 888 777',
        instructions: 'Envía al número de Yape',
      },
      plin: {
        phone: '+51 999 888 777',
        instructions: 'Envía al número de Plin',
      },
      zelle: {
        email: 'guia@afexgo.com',
        instructions: 'Envía a través de tu banco con Zelle',
      },
      venmo: {
        username: '@guia-afexgo',
        instructions: 'Busca el usuario en Venmo',
      },
      bizum: {
        phone: '+34 600 123 456',
        instructions: 'Envía por Bizum al número',
      },
    };
    return details[method] || { instructions: 'Sigue las instrucciones de pago' };
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConfirmPayment() {
    if (!tipId) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch(`${API_URL}/api/guides/tips/${tipId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar');
      }

      // Redirect to success page
      router.push(`/guides/${params.id}/success?amount=${amount}&method=${method}`);
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </button>

        {/* Payment Card */}
        <Card className="overflow-hidden">
          {/* Header */}
          <div className={`${methodInfo.bgColor} p-6 text-center`}>
            <div className="text-4xl mb-2">{methodInfo.icon}</div>
            <h1 className={`text-xl font-bold ${methodInfo.color}`}>
              Pagar con {methodInfo.label}
            </h1>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              ${amount} USD
            </p>
          </div>

          {/* Payment Details */}
          <div className="p-6">
            {error && (
              <Alert variant="error" className="mb-4">{error}</Alert>
            )}

            {paymentDetails && (
              <div className="space-y-4">
                {/* QR Code (simulated) */}
                {paymentDetails.qr_available && (
                  <div className="flex justify-center mb-6">
                    <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">QR Code</p>
                        <p className="text-xs text-gray-400">(Simulado)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {paymentDetails.key && (
                    <div>
                      <p className="text-sm text-gray-500">Clave PIX</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-medium text-gray-900">{paymentDetails.key}</p>
                        <button
                          onClick={() => copyToClipboard(paymentDetails.key)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copied ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentDetails.alias && (
                    <div>
                      <p className="text-sm text-gray-500">Alias</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-medium text-gray-900">{paymentDetails.alias}</p>
                        <button
                          onClick={() => copyToClipboard(paymentDetails.alias)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copied ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentDetails.phone && (
                    <div>
                      <p className="text-sm text-gray-500">Número</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-medium text-gray-900">{paymentDetails.phone}</p>
                        <button
                          onClick={() => copyToClipboard(paymentDetails.phone)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copied ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentDetails.email && (
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-medium text-gray-900">{paymentDetails.email}</p>
                        <button
                          onClick={() => copyToClipboard(paymentDetails.email)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copied ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentDetails.username && (
                    <div>
                      <p className="text-sm text-gray-500">Usuario</p>
                      <div className="flex items-center justify-between">
                        <p className="font-mono font-medium text-gray-900">{paymentDetails.username}</p>
                        <button
                          onClick={() => copyToClipboard(paymentDetails.username)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {copied ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="text-center py-2">
                  <p className="text-sm text-gray-600">{paymentDetails.instructions}</p>
                </div>

                {/* Confirm Button */}
                <div className="pt-4">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleConfirmPayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Ya realicé el pago
                      </>
                    )}
                  </Button>
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-gray-400 text-center mt-4">
                  Este es un sistema de pago simulado para demostración.
                  En producción, se integraría con pasarelas de pago reales.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Pago seguro procesado por <strong>AFEX Go</strong>
        </p>
      </div>
    </div>
  );
}
