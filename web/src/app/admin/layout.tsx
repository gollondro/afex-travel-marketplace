'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Building2, ShoppingCart, LogOut, Plane, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/agencies', icon: Building2, label: 'Agencias' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Todas las Ventas' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    } else if (!isLoading && isAuthenticated && !isAdmin) {
      router.replace('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
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
      <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white z-30 hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-800">
            <Link href="/" className="flex items-center space-x-2">
              <Plane className="w-8 h-8 text-green-400" />
              <div>
                <span className="text-lg font-bold">AFEX Travel</span>
                <p className="text-xs text-gray-400 flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Panel Admin
                </p>
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
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 inset-x-0 bg-gray-900 text-white z-30">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Plane className="w-6 h-6 text-green-400" />
            <span className="font-bold">AFEX Admin</span>
          </Link>
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg ${isActive ? 'bg-green-600' : 'text-gray-300'}`}
                >
                  <item.icon className="w-5 h-5" />
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-red-400 hover:bg-gray-800"
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
