'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, CreditCard, User, Mail } from 'lucide-react';
import { programsAPI, ordersAPI, Program } from '@/lib/api';
import { formatCLP } from '@/lib/utils';
import { Button, Card, Input, Spinner, Alert } from '@/components/ui';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!customerName.trim()) newErrors.name = 'El nombre es requerido';
    else if (customerName.trim().length < 2) newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    if (!customerEmail.trim()) newErrors.email = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) newErrors.email = 'Email inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate() || !program) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await ordersAPI.create({
        program_id: program.id,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
      });
      router.push(`/payment/${response.order.id}`);
    } catch (err: any) {
      setError(err.message || 'Error al crear la orden');
    } finally {
      setIsSubmitting(false);
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

  const imageUrl = program.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-1" /> Volver
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card className="p-6 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen de tu reserva</h2>

            <div className="flex gap-4 mb-4">
              <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                <Image src={imageUrl} alt={program.name} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{program.name}</h3>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <MapPin className="w-4 h-4 mr-1" /> {program.destination}
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Clock className="w-4 h-4 mr-1" /> {program.duration}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatCLP(program.price_clp)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Tasas e impuestos</span>
                <span className="text-gray-900">Incluidos</span>
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-green-600">{formatCLP(program.price_clp)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center text-sm text-green-800">
                <CreditCard className="w-4 h-4 mr-2" />
                Pago seguro con AFEX Go
              </div>
            </div>
          </Card>

          {/* Checkout Form */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del comprador</h2>

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" /> Nombre completo
                </label>
                <Input
                  type="text"
                  placeholder="Juan Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  error={errors.name}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" /> Correo electrónico
                </label>
                <Input
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  error={errors.email}
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-sm text-gray-500">Recibirás la confirmación en este correo</p>
              </div>

              <div className="pt-4">
                <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
                  Continuar al pago
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Al continuar, aceptas los términos y condiciones del servicio
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
