'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, Phone, Camera, Building2, CreditCard, Globe, Check } from 'lucide-react';
import { Button, Input, Card, Alert, Textarea } from '@/components/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://afexgo-travel-api.onrender.com';

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX (Brasil)', field: 'pix_key', placeholder: 'Clave PIX (email, teléfono o aleatoria)' },
  { id: 'qr_argentina', label: 'QR Argentina', field: 'cbu_alias', placeholder: 'Alias CBU/CVU' },
  { id: 'yape', label: 'Yape (Perú)', field: 'yape_phone', placeholder: 'Número de teléfono Yape' },
  { id: 'plin', label: 'Plin (Perú)', field: 'plin_phone', placeholder: 'Número de teléfono Plin' },
  { id: 'zelle', label: 'Zelle (USA)', field: 'zelle_email', placeholder: 'Email registrado en Zelle' },
  { id: 'venmo', label: 'Venmo (USA)', field: 'venmo_username', placeholder: 'Usuario de Venmo (@username)' },
  { id: 'bizum', label: 'Bizum (España)', field: 'bizum_phone', placeholder: 'Número de teléfono Bizum' },
];

export default function GuideRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    photo_url: '',
    bio: '',
    languages: [] as string[],
    // Bank details
    bank_name: '',
    account_type: 'checking',
    account_number: '',
    account_holder: '',
    // Payment methods
    pix_key: '',
    cbu_alias: '',
    yape_phone: '',
    plin_phone: '',
    zelle_email: '',
    venmo_username: '',
    bizum_phone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const languages = ['Español', 'Inglés', 'Portugués', 'Francés', 'Alemán', 'Italiano', 'Chino', 'Japonés'];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }

  function toggleLanguage(lang: string) {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }));
  }

  function validateStep1(): boolean {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Nombre requerido';
    if (!formData.email.trim()) newErrors.email = 'Email requerido';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.password) newErrors.password = 'Contraseña requerida';
    else if (formData.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
    if (!formData.phone.trim()) newErrors.phone = 'Teléfono requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateStep2(): boolean {
    const newErrors: Record<string, string> = {};
    
    if (!formData.bank_name.trim()) newErrors.bank_name = 'Banco requerido';
    if (!formData.account_number.trim()) newErrors.account_number = 'Número de cuenta requerido';
    if (!formData.account_holder.trim()) newErrors.account_holder = 'Titular requerido';

    // At least one payment method required
    const hasPaymentMethod = formData.pix_key || formData.cbu_alias || formData.yape_phone || 
      formData.plin_phone || formData.zelle_email || formData.venmo_username || formData.bizum_phone;
    
    if (!hasPaymentMethod) {
      newErrors.payment = 'Debes configurar al menos un método de pago';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function nextStep() {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!validateStep2()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/guides/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          photo_url: formData.photo_url || undefined,
          bio: formData.bio || undefined,
          languages: formData.languages,
          bank_details: {
            bank_name: formData.bank_name,
            account_type: formData.account_type,
            account_number: formData.account_number,
            account_holder: formData.account_holder,
            pix_key: formData.pix_key || undefined,
            cbu_alias: formData.cbu_alias || undefined,
            yape_phone: formData.yape_phone || undefined,
            plin_phone: formData.plin_phone || undefined,
            zelle_email: formData.zelle_email || undefined,
            venmo_username: formData.venmo_username || undefined,
            bizum_phone: formData.bizum_phone || undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar');
      }

      setSuccess(true);
      setQrUrl(data.qr_url);
    } catch (err: any) {
      setError(err.message || 'Error al registrar. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success && qrUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Registro Exitoso!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Tu perfil de guía ha sido creado. Comparte tu página con tus clientes para recibir propinas.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Tu enlace personal:</p>
            <p className="text-primary-600 font-medium break-all">{qrUrl}</p>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full"
              onClick={() => window.open(qrUrl, '_blank')}
            >
              Ver mi Página
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigator.clipboard.writeText(qrUrl)}
            >
              Copiar Enlace
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                Ir a Iniciar Sesión
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registro de Guía Turístico
          </h1>
          <p className="text-gray-600">
            Crea tu perfil y comienza a recibir propinas de tus tours
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step >= 1 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700">Datos Personales</span>
          </div>
          <div className={`w-16 h-1 mx-4 ${step >= 2 ? 'bg-primary-500' : 'bg-gray-200'}`} />
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step >= 2 ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700">Datos de Pago</span>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal Data */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2 text-primary-500" />
                  Información Personal
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre Completo *"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="Juan Pérez"
                  />
                  <Input
                    label="Teléfono *"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                <Input
                  label="Email *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  placeholder="juan@ejemplo.com"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contraseña *"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Input
                    label="Confirmar Contraseña *"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    placeholder="Repite la contraseña"
                  />
                </div>

                <Input
                  label="URL de Foto de Perfil"
                  name="photo_url"
                  value={formData.photo_url}
                  onChange={handleChange}
                  placeholder="https://ejemplo.com/mi-foto.jpg"
                  helperText="Usa una URL de imagen de Unsplash o Imgur"
                />

                <Textarea
                  label="Biografía"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Cuéntanos sobre ti y tu experiencia como guía..."
                  rows={3}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idiomas que hablas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {languages.map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          formData.languages.includes(lang)
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={nextStep}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Data */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-primary-500" />
                  Datos Bancarios
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Banco *"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    error={errors.bank_name}
                    placeholder="Banco de Chile"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Cuenta *
                    </label>
                    <select
                      name="account_type"
                      value={formData.account_type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="checking">Cuenta Corriente</option>
                      <option value="savings">Cuenta de Ahorro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Número de Cuenta *"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    error={errors.account_number}
                    placeholder="1234567890"
                  />
                  <Input
                    label="Titular de la Cuenta *"
                    name="account_holder"
                    value={formData.account_holder}
                    onChange={handleChange}
                    error={errors.account_holder}
                    placeholder="Juan Pérez"
                  />
                </div>

                <hr className="my-6" />

                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-primary-500" />
                  Métodos de Pago para Recibir Propinas
                </h2>
                <p className="text-sm text-gray-500 -mt-4">
                  Configura al menos un método de pago
                </p>

                {errors.payment && (
                  <Alert variant="error">{errors.payment}</Alert>
                )}

                <div className="space-y-4">
                  {PAYMENT_METHODS.map(method => (
                    <div key={method.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {method.label}
                        </label>
                        <Input
                          name={method.field}
                          value={formData[method.field as keyof typeof formData] as string}
                          onChange={handleChange}
                          placeholder={method.placeholder}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Anterior
                  </Button>
                  <Button type="submit" isLoading={isLoading}>
                    Crear Perfil de Guía
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary-600 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
