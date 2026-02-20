'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, Globe, DollarSign, Heart, QrCode, Share2 } from 'lucide-react';
import { Button, Card, Input, Spinner, Alert } from '@/components/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://afexgo-travel-api.onrender.com';

// Tipo de cambio aproximado USD -> CLP (actualizar según necesidad)
const USD_TO_CLP = 950;

interface Guide {
  id: string;
  name: string;
  photo_url?: string;
  bio?: string;
  languages: string[];
  payment_methods: string[];
  tips_count: number;
  rating: number;
}

const PAYMENT_METHOD_INFO: Record<string, { label: string; icon: string; color: string }> = {
  pix: { label: 'PIX', icon: '🇧🇷', color: 'bg-teal-500' },
  qr_argentina: { label: 'QR Argentina', icon: '🇦🇷', color: 'bg-blue-400' },
  yape: { label: 'Yape', icon: '🇵🇪', color: 'bg-purple-500' },
  plin: { label: 'Plin', icon: '🇵🇪', color: 'bg-green-500' },
  zelle: { label: 'Zelle', icon: '🇺🇸', color: 'bg-indigo-500' },
  venmo: { label: 'Venmo', icon: '🇺🇸', color: 'bg-blue-500' },
  bizum: { label: 'Bizum', icon: '🇪🇸', color: 'bg-cyan-500' },
};

const SUGGESTED_AMOUNTS = [5, 10, 20, 50];

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function GuidePublicPage() {
  const params = useParams();
  const router = useRouter();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tip form state
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Calcular equivalente en CLP
  const amountCLP = amount * USD_TO_CLP;

  useEffect(() => {
    if (params.id) {
      loadGuide(params.id as string);
    }
  }, [params.id]);

  async function loadGuide(id: string) {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/guides/public/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Guía no encontrado');
      }

      setGuide(data.guide);
      if (data.guide.payment_methods.length > 0) {
        setSelectedMethod(data.guide.payment_methods[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAmountSelect(value: number) {
    setAmount(value);
    setCustomAmount('');
  }

  function handleCustomAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setCustomAmount(value);
    if (value) {
      setAmount(parseInt(value) || 0);
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (amount < 1) errors.amount = 'Monto mínimo $1 USD';
    if (!selectedMethod) errors.method = 'Selecciona un método de pago';
    if (!senderName.trim()) errors.senderName = 'Tu nombre es requerido';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm() || !guide) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/guides/${guide.id}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_usd: amount,
          payment_method: selectedMethod,
          sender_name: senderName,
          sender_email: senderEmail || undefined,
          message: message || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar');
      }

      router.push(`/guides/${guide.id}/pay?tip=${data.tip.id}&method=${selectedMethod}&amount=${amount}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Propina para ${guide?.name}`,
        text: `Envía una propina a ${guide?.name} por su excelente tour`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('¡Enlace copiado!');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">😕</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Guía no encontrado
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/')}>
            Volver al inicio
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-600 to-green-800">
      {/* Header with Guide Info */}
      <div className="relative pt-8 pb-24 px-4">
        <div className="max-w-md mx-auto text-center text-white">
          <button
            onClick={handleShare}
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-6 h-6" />
          </div>

          <div className="relative w-28 h-28 mx-auto mb-4">
            {guide.photo_url ? (
              <img
                src={guide.photo_url}
                alt={guide.name}
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center border-4 border-white">
                <span className="text-4xl">{guide.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-1">{guide.name}</h1>
          
          <div className="flex items-center justify-center gap-4 text-green-100 text-sm mb-4">
            <div className="flex items-center">
              <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
              {guide.rating.toFixed(1)}
            </div>
            <div className="flex items-center">
              <Heart className="w-4 h-4 mr-1" />
              {guide.tips_count} propinas
            </div>
          </div>

          {guide.bio && (
            <p className="text-green-100 text-sm mb-4 max-w-xs mx-auto">
              {guide.bio}
            </p>
          )}

          {guide.languages.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Globe className="w-4 h-4 text-green-200" />
              {guide.languages.map((lang, i) => (
                <span key={lang} className="text-sm text-green-100">
                  {lang}{i < guide.languages.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tip Form Card */}
      <div className="px-4 -mt-16 pb-8">
        <Card className="max-w-md mx-auto p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-500" />
            Enviar Propina
          </h2>

          {error && (
            <Alert variant="error" className="mb-4">{error}</Alert>
          )}

          {/* Amount Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto (USD)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {SUGGESTED_AMOUNTS.map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAmountSelect(value)}
                  className={`py-3 rounded-lg font-medium transition-colors ${
                    amount === value && !customAmount
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ${value}
                </button>
              ))}
            </div>
            <Input
              placeholder="Otro monto"
              type="number"
              min="1"
              value={customAmount}
              onChange={handleCustomAmountChange}
              error={formErrors.amount}
            />
            
            {/* Equivalente en CLP */}
            {amount > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">
                  <span className="font-medium">${amount} USD</span>
                  {' '}≈{' '}
                  <span className="font-bold text-green-800">{formatCLP(amountCLP)}</span>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Tipo de cambio referencial: 1 USD = {formatCLP(USD_TO_CLP)}
                </p>
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago
            </label>
            {formErrors.method && (
              <p className="text-sm text-red-600 mb-2">{formErrors.method}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {guide.payment_methods.map(method => {
                const info = PAYMENT_METHOD_INFO[method];
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedMethod === method
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg mr-2">{info.icon}</span>
                    <span className="font-medium text-gray-900">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sender Info */}
          <div className="space-y-4 mb-6">
            <Input
              label="Tu Nombre *"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="¿Cómo te llamas?"
              error={formErrors.senderName}
            />
            <Input
              label="Tu Email (opcional)"
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="para recibir confirmación"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje (opcional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="¡Gracias por el excelente tour!"
                rows={2}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            <Heart className="w-5 h-5 mr-2" />
            Enviar ${amount} USD ({formatCLP(amountCLP)})
          </Button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Pago seguro procesado por AFEX Go
          </p>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-green-200 text-sm">
        <p>Powered by <strong>AFEX Go Travel</strong></p>
      </div>
    </div>
  );
}