'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Heart, Share2, ArrowRight, Plane } from 'lucide-react';
import { Button, Card } from '@/components/ui';

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
  const searchParams = useSearchParams();
  
  const amount = searchParams.get('amount') || '0';
  const method = searchParams.get('method') || '';
  const methodInfo = PAYMENT_METHOD_INFO[method] || { label: method, icon: '💳' };

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
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle className="w-14 h-14 text-green-600" />
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
            <Heart className="w-8 h-8 text-red-500 animate-pulse" fill="currentColor" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Propina Enviada!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Tu propina ha sido procesada exitosamente
        </p>

        <div className="bg-blue-50 rounded-xl p-6 mb-6">
          <p className="text-sm text-blue-600 mb-1">Monto enviado</p>
          <p className="text-4xl font-bold text-blue-700">${amount} USD</p>
          <div className="flex items-center justify-center mt-2 text-gray-600">
            <span className="text-lg mr-2">{methodInfo.icon}</span>
            <span>via {methodInfo.label}</span>
          </div>
        </div>

        <div className="text-3xl mb-6">
          🎉 ✨ 🙏 ✨ 🎉
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={handleShare}>
            <Share2 className="w-5 h-5 mr-2" />
            Compartir con amigos
          </Button>
          
          <Link href="/">
            <Button className="w-full">
              Explorar más tours
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <Link href="/" className="inline-flex items-center text-xs text-gray-400 hover:text-gray-600">
            <Plane className="w-3 h-3 mr-1" />
            Transacción procesada por AFEX Travel
          </Link>
        </div>
      </Card>
    </div>
  );
}