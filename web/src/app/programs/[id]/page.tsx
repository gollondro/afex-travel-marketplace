'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, Building2, Mail, ShoppingCart } from 'lucide-react';
import { programsAPI, Program } from '@/lib/api';
import { formatCLP } from '@/lib/utils';
import { Button, Card, Spinner } from '@/components/ui';

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) loadProgram(params.id as string);
  }, [params.id]);

  async function loadProgram(id: string) {
    try {
      setIsLoading(true);
      const response = await programsAPI.getById(id);
      setProgram(response.program);
    } catch (err: any) {
      setError(err.message || 'Programa no encontrado');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container-page flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="container-page">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Programa no encontrado'}
          </h2>
          <Link href="/"><Button>Volver al inicio</Button></Link>
        </Card>
      </div>
    );
  }

  const imageUrl = program.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5 mr-1" /> Volver
        </button>
      </div>

      {/* Hero Image */}
      <div className="relative h-[300px] md:h-[400px] w-full">
        <Image src={imageUrl} alt={program.name} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{program.name}</h1>
            <div className="flex items-center text-white/90">
              <MapPin className="w-5 h-5 mr-1" />
              <span>{program.destination}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Descripción del Programa</h2>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">{program.description}</p>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Detalles</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Destino</dt>
                    <dd className="text-gray-900">{program.destination}</dd>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Duración</dt>
                    <dd className="text-gray-900">{program.duration}</dd>
                  </div>
                </div>
                <div className="flex items-start">
                  <Building2 className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Agencia</dt>
                    <dd className="text-gray-900">{program.agency_name}</dd>
                  </div>
                </div>
                {(program as any).agency_email && (
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contacto</dt>
                      <dd className="text-gray-900">{(program as any).agency_email}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </Card>
          </div>

          {/* Sidebar - Booking Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-1">Precio por persona</p>
                <p className="text-4xl font-bold text-green-600">{formatCLP(program.price_clp)}</p>
              </div>

              <Link href={`/checkout/${program.id}`}>
                <Button size="lg" className="w-full">
                  <ShoppingCart className="w-5 h-5 mr-2" /> Reservar Ahora
                </Button>
              </Link>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">¿Por qué reservar con nosotros?</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2" />
                    Agencias verificadas
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2" />
                    Pago seguro con AFEX Go
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2" />
                    Soporte 24/7
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2" />
                    Mejor precio garantizado
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
