'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plane, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore, useAuth } from '@/lib/auth';
import { Button, Input, Card, Alert } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { login, clearError } = useAuthStore();
  const { isAuthenticated, isAdmin, isAgency, error, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        router.replace('/admin');
      } else if (isAgency) {
        router.replace('/agency');
      } else {
        router.replace('/');
      }
    }
  }, [isAuthenticated, isAdmin, isAgency, router]);

  // Clear error on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'El email es requerido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    const success = await login(email, password);
    
    if (success) {
      // The useEffect will handle redirect
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center space-x-2">
            <Plane className="w-10 h-10 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">AFEX Travel</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Iniciar Sesión
        </h2>
        <p className="mt-2 text-center text-gray-600">
          Accede a tu cuenta de agencia o administrador
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 sm:px-10">
          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`
                    w-full pl-10 pr-4 py-2 border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.email ? 'border-red-500' : 'border-gray-300'}
                  `}
                  placeholder="tu@email.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`
                    w-full pl-10 pr-12 py-2 border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.password ? 'border-red-500' : 'border-gray-300'}
                  `}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  ¿No tienes cuenta?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/register">
                <Button variant="outline" size="lg" className="w-full">
                  Registrar mi agencia
                </Button>
              </Link>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Credenciales de prueba:
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Admin:</strong> admin@afex.com / admin123</p>
              <p><strong>Agencia 1:</strong> agencia1@test.com / 123456</p>
              <p><strong>Agencia 2:</strong> agencia2@test.com / 123456</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
