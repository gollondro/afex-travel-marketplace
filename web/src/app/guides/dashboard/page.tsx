'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  DollarSign, TrendingUp, Clock, Star, LogOut, User, 
  ExternalLink, CreditCard, Calendar, MessageSquare, QrCode
} from 'lucide-react';
import { Button, Card, Spinner, Badge } from '@/components/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://afexgo-travel-api.onrender.com';

interface Guide {
  id: string;
  name: string;
  email: string;
  photo_url?: string;
  tips_count: number;
  total_tips_usd: number;
  rating: number;
}

interface Stats {
  total_tips: number;
  total_usd: number;
  pending_tips: number;
  this_month_tips: number;
  this_month_usd: number;
  rating: number;
  by_payment_method: Record<string, { count: number; total: number }>;
}

interface Tip {
  id: string;
  amount_usd: number;
  payment_method: string;
  sender_name: string;
  message?: string;
  status: 'pending' | 'completed';
  created_at: string;
  completed_at?: string;
}

const PAYMENT_METHODS: Record<string, { label: string; icon: string }> = {
  pix: { label: 'PIX', icon: '🇧🇷' },
  qr_argentina: { label: 'QR Argentina', icon: '🇦🇷' },
  yape: { label: 'Yape', icon: '🇵🇪' },
  plin: { label: 'Plin', icon: '🇵🇪' },
  zelle: { label: 'Zelle', icon: '🇺🇸' },
  venmo: { label: 'Venmo', icon: '🇺🇸' },
  bizum: { label: 'Bizum', icon: '🇪🇸' },
};

export default function GuideDashboardPage() {
  const router = useRouter();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    const token = localStorage.getItem('guide_token');
    if (!token) {
      router.push('/guides/login');
      return;
    }
    loadDashboard(token);
  }, []);

  async function loadDashboard(token: string) {
    try {
      setIsLoading(true);

      // Cargar perfil, stats y propinas en paralelo
      const [profileRes, statsRes, tipsRes] = await Promise.all([
        fetch(`${API_URL}/api/guides/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/guides/me/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/guides/me/tips?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!profileRes.ok) {
        throw new Error('Sesión expirada');
      }

      const profileData = await profileRes.json();
      const statsData = await statsRes.json();
      const tipsData = await tipsRes.json();

      setGuide(profileData.guide);
      setStats(statsData.stats);
      setTips(tipsData.tips);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      localStorage.removeItem('guide_token');
      localStorage.removeItem('guide_data');
      router.push('/guides/login');
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('guide_token');
    localStorage.removeItem('guide_data');
    router.push('/guides/login');
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const filteredTips = tips.filter(tip => {
    if (activeTab === 'all') return true;
    return tip.status === activeTab;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!guide || !stats) {
    return null;
  }

  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/guides/${guide.id}`;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="font-bold text-xl">AFEX Go Travel</Link>
              <span className="ml-2 text-green-200 text-sm">| Portal Guías</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center">
                {guide.photo_url ? (
                  <img src={guide.photo_url} alt={guide.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <span className="ml-2 font-medium">{guide.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-green-700 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Recibido</p>
                <p className="text-2xl font-bold text-gray-900">${stats.total_usd}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">${stats.this_month_usd}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Propinas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_tips}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rating.toFixed(1)}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tips List */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Mis Propinas</h2>
                  <div className="flex gap-2">
                    {(['all', 'completed', 'pending'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          activeTab === tab
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tab === 'all' ? 'Todas' : tab === 'completed' ? 'Completadas' : 'Pendientes'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {filteredTips.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No hay propinas {activeTab !== 'all' ? `${activeTab === 'completed' ? 'completadas' : 'pendientes'}` : ''} aún
                  </div>
                ) : (
                  filteredTips.map(tip => (
                    <div key={tip.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <div className="text-2xl mr-3">
                            {PAYMENT_METHODS[tip.payment_method]?.icon || '💳'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{tip.sender_name}</span>
                              <Badge variant={tip.status === 'completed' ? 'success' : 'warning'}>
                                {tip.status === 'completed' ? 'Completada' : 'Pendiente'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              {PAYMENT_METHODS[tip.payment_method]?.label} • {formatDate(tip.created_at)}
                            </p>
                            {tip.message && (
                              <p className="text-sm text-gray-600 mt-1 flex items-start">
                                <MessageSquare className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                {tip.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-lg font-bold text-green-600">
                          ${tip.amount_usd}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Link */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <QrCode className="w-5 h-5 mr-2" />
                Tu Enlace de Propinas
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-600 break-all font-mono">
                  {profileUrl}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigator.clipboard.writeText(profileUrl)}
                >
                  Copiar
                </Button>
                <Link href={`/guides/${guide.id}`} target="_blank" className="flex-1">
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Payment Methods Breakdown */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Por Método de Pago</h3>
              {Object.keys(stats.by_payment_method).length === 0 ? (
                <p className="text-sm text-gray-500">Sin propinas aún</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.by_payment_method).map(([method, data]) => (
                    <div key={method} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{PAYMENT_METHODS[method]?.icon}</span>
                        <span className="text-sm text-gray-600">{PAYMENT_METHODS[method]?.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${data.total}</p>
                        <p className="text-xs text-gray-500">{data.count} propinas</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Stats */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Resumen del Mes</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Propinas recibidas</span>
                  <span className="font-medium">{stats.this_month_tips}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total USD</span>
                  <span className="font-medium text-green-600">${stats.this_month_usd}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pendientes</span>
                  <span className="font-medium text-yellow-600">{stats.pending_tips}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}