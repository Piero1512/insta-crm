// components/Header.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { playNotificationSound, initMobileAudioUnlock } from '@/lib/audio';
import { 
  Bell, 
  Menu, 
  LogOut, 
  MessageSquare, 
  UserPlus, 
  Check, 
  X,
  Volume2,
  VolumeX
} from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

interface NotificationItem {
  id: string;
  type: 'lead' | 'message';
  title: string;
  description: string;
  link: string;
  created_at: string;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initMobileAudioUnlock();

    const savedMute = localStorage.getItem('insta_crm_messages_muted');
    if (savedMute !== null) {
      setIsMuted(savedMute === 'true');
    }

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    checkUser();

    // Suscripción Realtime a nuevos leads y mensajes internos
    const channel = supabase
      .channel('public:global_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const newLead = payload.new as { id: string; client_name: string; service_type: string };
          const item: NotificationItem = {
            id: `lead_${Date.now()}`,
            type: 'lead',
            title: 'Nuevo Lead Recibido',
            description: `${newLead.client_name} • ${newLead.service_type}`,
            link: '/leads',
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setNotifications((prev) => [item, ...prev]);

          if (localStorage.getItem('insta_crm_messages_muted') !== 'true') {
            playNotificationSound();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_messages' },
        (payload) => {
          const newMsg = payload.new as { id: string; content: string };
          const item: NotificationItem = {
            id: `msg_${Date.now()}`,
            type: 'message',
            title: 'Mensaje Interno',
            description: newMsg.content.slice(0, 50),
            link: '/messages',
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setNotifications((prev) => [item, ...prev]);

          if (localStorage.getItem('insta_crm_messages_muted') !== 'true') {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    // Cerrar el dropdown al hacer clic fuera
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    localStorage.setItem('insta_crm_messages_muted', String(nextState));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
          FLORIDA OPERATIONS HUB
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Menú de Notificaciones */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              playNotificationSound(); // Prueba de audio inmediata al pulsar la campana
            }}
            className={`p-2 rounded-xl border transition-colors relative ${
              isOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100'
            }`}
            title="Centro de notificaciones"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
            )}
          </button>

          {/* Menú desplegable */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Notificaciones
                  </span>
                  {notifications.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleMute}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
                  </button>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] text-blue-600 hover:underline font-semibold ml-2"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-600">Bandeja al día</p>
                    <p>No tienes alertas pendientes de leads o mensajes.</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <Link
                      key={item.id}
                      href={item.link}
                      onClick={() => setIsOpen(false)}
                      className="p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors block"
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${
                        item.type === 'lead' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {item.type === 'lead' ? <UserPlus className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                          <span className="text-[10px] text-slate-400">{item.created_at}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.description}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Perfil del Usuario Activo */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200">
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="text-xs font-medium text-slate-700 hidden sm:inline max-w-[150px] truncate">
            {userEmail || 'Conectado'}
          </span>
          <button
            onClick={handleSignOut}
            title="Cerrar sesión"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}