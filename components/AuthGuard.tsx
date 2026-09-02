// components/AuthGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// 1. RUTAS PÚBLICAS: No exigen inicio de sesión
const PUBLIC_PATHS = ['/login', '/quote-request'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Si la ruta actual es pública (como el formulario de clientes o el login), permitir paso inmediato
    const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    if (isPublic) {
      setAuthorized(true);
      return;
    }

    // Si es una ruta privada del CRM, verificar sesión de Supabase
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setAuthorized(true);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && !PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Si aún no se autoriza o está redirigiendo en ruta privada, no renderizar contenido protegido
  if (!authorized) {
    const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    if (isPublic) return <>{children}</>;
    return null;
  }

  return <>{children}</>;
}