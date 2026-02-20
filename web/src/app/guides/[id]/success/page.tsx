'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Heart, Share2, ArrowRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

const PAYMENT_METHOD_INFO: Record<string, { label: string; icon: string }> = {
  pix: { label: 'PIX', icon: '🇧🇷' },
  qr_argentina: { label: 'QR Argentina', icon: '🇦🇷' },
  yape: { label: 'Yape', icon: '🇵🇪' },
  plin: { label: 'Plin', icon: '🇵🇪' },
  zelle: { label: 'Zelle', icon: '🇺🇸' },
  venmo: { label: 'Venmo', icon: '🇺🇸' },
  bizum: { label: 'Bizum', icon: '🇪🇸' },
};

export default function TipSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const amount = searchParams.get('amount') || '0';
  const method = searchParams.get('method') || '';
  const methodInfo = PAYMENT_METHOD_INFO[method] || { label: method, icon: '💳' };

  // Confetti effect on mount
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Using confetti conditionally
      if (typeof confetti === 'function') {
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#00A651', '#33bf6f', '#FFD700'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#00A651', '#33bf6f', '#FFD700'],
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  function handleShare() {
    const url = `${window.location.origin}/guides/${params.id}`;
    if (navigator.share) {
      navigator.share({
        title: 'Envía una propina',
        text: '¡Envía una propina a este guía turístico!',
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('¡Enlace copiado!');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {/* Success Icon */}
        <div className="relative">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle className="w-14 h-14 text-primary-600" />
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
            <Heart className="w-8 h-8 text-red-500 animate-pulse" fill="currentColor" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Propina Enviada!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Tu propina ha sido procesada exitosamente
        </p>

        {/* Amount Display */}
        <div className="bg-primary-50 rounded-xl p-6 mb-6">
          <p className="text-sm text-primary-600 mb-1">Monto enviado</p>
          <p className="text-4xl font-bold text-primary-700">${amount} USD</p>
          <div className="flex items-center justify-center mt-2 text-gray-600">
            <span className="text-lg mr-2">{methodInfo.icon}</span>
            <span>via {methodInfo.label}</span>
          </div>
        </div>

        {/* Thank you message */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-gray-700">
            <strong>¡Gracias por tu generosidad!</strong>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Tu propina ayuda a reconocer el excelente trabajo de nuestros guías turísticos.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleShare}
          >
            <Share2 className="w-5 h-5 mr-2" />
            Compartir con amigos
          </Button>
          
          <Button
            className="w-full"
            onClick={() => router.push('/')}
          >
            Explorar más tours
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 mt-6">
          Transacción procesada por AFEX Go Travel
        </p>
      </Card>
    </div>
  );
}
