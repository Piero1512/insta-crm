// components/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bell, Search, User, LogOut } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      {/* Barra de Búsqueda */}
      <div className="relative w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar leads, presupuestos, coordinadores..."
          className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
        />
      </div>

      {/* Perfil y Acciones */}
      <div className="flex items-center gap-4">
        <button 
          title="Notificaciones"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          <span className="w-2 h-2 bg-blue-600 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white"></span>
        </button>

        <div className="h-6 w-[1px] bg-slate-200"></div>

        {userEmail ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                {userEmail}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              title="Cerrar Sesión"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors"
          >
            <User className="w-4 h-4" />
            Ingresar
          </button>
        )}
      </div>
    </header>
  );
}