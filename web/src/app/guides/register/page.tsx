'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, Phone, Building2, Check, Eye, EyeOff, Plane } from 'lucide-react';
import { Button, Input, Textarea, Card, Alert } from '@/components/ui';
import { guidesAPI, GuideRegisterData } from '@/lib/api';

const LANGUAGES = ['Español', 'Inglés', 'Portugués', 'Francés', 'Alemán', 'Italiano', 'Chino', 'Japonés'];

export default function GuideRegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    photo_url: '',
    bio: '',
    languages: [] as string[],
    bank_name: '',
    account_type: 'checking' as 'checking' | 'savings',
    account_number: '',
    account_holder: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Nombre requerido';
    if (!formData.email.trim()) newErrors.email = 'Email requerido';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.password) newErrors.password = 'Contraseña requerida';
    else if (formData.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
    if (!formData.phone.trim()) newErrors.phone = 'Teléfono requerido';
    if (!formData.bank_name.trim()) newErrors.bank_name = 'Banco requerido';
    if (!formData.account_number.trim()) newErrors.account_number = 'Número de cuenta requerido';
    if (!formData.account_holder.trim()) newErrors.account_holder = 'Titular requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const registerData: GuideRegisterData = {
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
        },
      };

      const response = await guidesAPI.register(registerData);
      setSuccess(true);
      setQrUrl(response.qr_url);
    } catch (err: any) {
      setError(err.message || 'Error al registrar. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success && qrUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Registro Exitoso!</h1>
          <p className="text-gray-600 mb-6">Tu perfil de guía ha sido creado. Comparte tu página con tus clientes para recibir propinas.</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Tu enlace personal:</p>
            <p className="text-blue-600 font-medium break-all text-sm">{qrUrl}</p>
          </div>

          <div className="space-y-3">
            <Button className="w-full" onClick={() => window.open(qrUrl, '_blank')}>Ver mi Página</Button>
            <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(qrUrl); alert('¡Enlace copiado!'); }}>Copiar Enlace</Button>
            <Link href="/"><Button variant="ghost" className="w-full">Volver al Inicio</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4">
            <Plane className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">AFEX Travel</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Registro de Guía</h1>
          <p className="text-gray-600">Crea tu perfil y comienza a recibir propinas</p>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Datos Personales */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Datos Personales
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nombre Completo *" name="name" value={formData.name} onChange={handleChange} error={errors.name} placeholder="Juan Pérez" />
                  <Input label="Teléfono *" name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} placeholder="+56 9 1234 5678" />
                </div>

                <Input label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="juan@ejemplo.com" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`} placeholder="Mínimo 6 caracteres" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`} placeholder="Repite contraseña" />
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <Input label="URL Foto de Perfil (opcional)" name="photo_url" value={formData.photo_url} onChange={handleChange} placeholder="https://ejemplo.com/foto.jpg" />
                
                <Textarea label="Biografía (opcional)" name="bio" value={formData.bio} onChange={handleChange} placeholder="Cuéntanos sobre ti..." rows={2} />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Idiomas</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <button key={lang} type="button" onClick={() => toggleLanguage(lang)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${formData.languages.includes(lang) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <hr />

            {/* Datos Bancarios */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                Datos Bancarios para Recibir Pagos
              </h2>
              <p className="text-sm text-gray-500 mb-4">Aquí te depositaremos tus propinas en pesos locales.</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Banco *" name="bank_name" value={formData.bank_name} onChange={handleChange} error={errors.bank_name} placeholder="Banco de Chile" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cuenta *</label>
                    <select name="account_type" value={formData.account_type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="checking">Cuenta Corriente</option>
                      <option value="savings">Cuenta de Ahorro</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Número de Cuenta *" name="account_number" value={formData.account_number} onChange={handleChange} error={errors.account_number} placeholder="1234567890" />
                  <Input label="Titular *" name="account_holder" value={formData.account_holder} onChange={handleChange} error={errors.account_holder} placeholder="Juan Pérez" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Crear mi Perfil de Guía
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta? <Link href="/login" className="text-blue-600 hover:underline font-medium">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}