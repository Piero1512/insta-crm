// components/AuthGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Si ya está en /login, permitir acceso inmediato sin verificar
    if (pathname === '/login') {
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsAuthenticated(false);
        router.push('/login');
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();

    // Escuchar cambios de estado en tiempo real (ej. logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== '/login') {
        setIsAuthenticated(false);
        router.push('/login');
      } else if (session && pathname === '/login') {
        router.push('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Si está en /login se renderiza de inmediato
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Estado de carga mientras verifica sesión
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-slate-400 font-medium">Verificando credenciales de acceso...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}