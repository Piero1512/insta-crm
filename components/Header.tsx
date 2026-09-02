// components/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bell, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  onToggleMenu?: () => void;
}

export default function Header({ onToggleMenu }: HeaderProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initialLetter = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Botón de menú sólo visible en móviles */}
        {onToggleMenu && (
          <button
            type="button"
            onClick={onToggleMenu}
            className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline-block">
          Florida Operations Hub
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button 
          title="Notificaciones"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
            {initialLetter}
          </div>
          <span className="text-xs font-medium text-slate-700 hidden lg:inline-block max-w-[150px] truncate">
            {userEmail || 'Usuario'}
          </span>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}