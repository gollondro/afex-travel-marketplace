'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Package, ShoppingCart, LogOut, Plane } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

interface AgencyLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/agency', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/agency/programs', icon: Package, label: 'Mis Programas' },
  { href: '/agency/orders', icon: ShoppingCart, label: 'Mis Ventas' },
];

export default function AgencyLayout({ children }: AgencyLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isAgency, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (!isLoading && isAuthenticated && !isAgency) {
      router.replace('/');
    }
  }, [isAuthenticated, isAgency, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAgency) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-30 hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-2">
              <Plane className="w-8 h-8 text-green-600" />
              <div>
                <span className="text-lg font-bold text-gray-900">AFEX Travel</span>
                <p className="text-xs text-gray-500">Panel de Agencia</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 inset-x-0 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Plane className="w-6 h-6 text-green-600" />
            <span className="font-bold text-gray-900">AFEX Travel</span>
          </Link>
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg ${isActive ? 'bg-green-100 text-green-600' : 'text-gray-600'}`}
                >
                  <item.icon className="w-5 h-5" />
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
