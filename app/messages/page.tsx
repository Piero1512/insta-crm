// app/messages/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { 
  Send, 
  Users, 
  MessageSquare, 
  Volume2,
  VolumeX,
  Check,
  CheckCheck
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  phone?: string;
}

interface InternalMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  lead_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

// Generador de sonido nativo infalible (Web Audio API - no requiere archivos .mp3)
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Tono D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // Tono A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Si el navegador bloquea el contexto de audio antes de la interacción
  }
}

export default function MessagesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('team'); // 'team' = Canal general
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Mute guardado en LocalStorage
  const [isMuted, setIsMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Solicitar permiso de notificaciones
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    const savedMute = localStorage.getItem('insta_crm_messages_muted');
    if (savedMute !== null) {
      setIsMuted(savedMute === 'true');
    }
    requestNotificationPermission();
  }, []);

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    localStorage.setItem('insta_crm_messages_muted', String(nextState));
  };

  // Cargar perfiles y mensajes iniciales
  const loadInitialData = async () => {
    setLoading(true);
    const { data: teamProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, phone')
      .order('full_name', { ascending: true });

    if (teamProfiles && teamProfiles.length > 0) {
      setProfiles(teamProfiles);
      if (!currentUserId) {
        // Cargar usuario guardado o el primero
        const savedUser = localStorage.getItem('insta_crm_active_profile');
        const match = teamProfiles.find(p => p.id === savedUser);
        setCurrentUserId(match ? match.id : teamProfiles[0].id);
      }
    }

    const { data: msgList } = await supabase
      .from('internal_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (msgList) {
      setMessages(msgList);
    }
    setLoading(false);
  };

  const handleSwitchUser = (newId: string) => {
    setCurrentUserId(newId);
    localStorage.setItem('insta_crm_active_profile', newId);
  };

  // Marcar como leídos los mensajes dirigidos al usuario actual
  useEffect(() => {
    if (!currentUserId) return;

    const markAsRead = async () => {
      // Si estamos en un chat directo con alguien, marcar los mensajes de ese remitente como leídos
      if (selectedRecipientId !== 'team') {
        const unread = messages.filter(
          m => m.sender_id === selectedRecipientId && m.receiver_id === currentUserId && !m.is_read
        );

        if (unread.length > 0) {
          const ids = unread.map(u => u.id);
          await supabase.from('internal_messages').update({ is_read: true }).in('id', ids);
          setMessages(prev =>
            prev.map(m => (ids.includes(m.id) ? { ...m, is_read: true } : m))
          );
        }
      }
    };

    markAsRead();
  }, [selectedRecipientId, currentUserId, messages]);

  // Suscripción en Tiempo Real
  useEffect(() => {
    loadInitialData();

    const channel = supabase
      .channel('public:internal_messages_v2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_messages' },
        (payload) => {
          const newMsg = payload.new as InternalMessage;

          setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Reproducir sonido y notificación si el mensaje NO lo envié yo
          const isFromMe = newMsg.sender_id === currentUserId;
          const isMutedNow = localStorage.getItem('insta_crm_messages_muted') === 'true';

          if (!isFromMe && !isMutedNow) {
            playBeep();

            // Notificación nativa de escritorio
            if ('Notification' in window && Notification.permission === 'granted') {
              const sender = profiles.find(p => p.id === newMsg.sender_id);
              const senderName = sender?.full_name || 'Compañero';
              const n = new Notification(`Mensaje de ${senderName}`, {
                body: newMsg.content.slice(0, 100),
                icon: '/favicon.ico',
              });
              n.onclick = () => window.focus();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'internal_messages' },
        (payload) => {
          const updated = payload.new as InternalMessage;
          setMessages((prev) => prev.map(m => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, profiles]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedRecipientId]);

  // Conversación filtrada
  const activeConversation = useMemo(() => {
    if (selectedRecipientId === 'team') {
      return messages.filter((m) => m.receiver_id === null);
    }
    return messages.filter(
      (m) =>
        (m.sender_id === currentUserId && m.receiver_id === selectedRecipientId) ||
        (m.sender_id === selectedRecipientId && m.receiver_id === currentUserId)
    );
  }, [messages, selectedRecipientId, currentUserId]);

  // Enviar mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentUserId) return;

    setSending(true);
    const receiver = selectedRecipientId === 'team' ? null : selectedRecipientId;

    const { error } = await supabase.from('internal_messages').insert([
      {
        sender_id: currentUserId,
        receiver_id: receiver,
        content: inputMessage.trim(),
        is_read: false,
      }
    ]);

    if (!error) {
      setInputMessage('');
    } else {
      alert('Error al enviar mensaje: ' + error.message);
    }
    setSending(false);
  };

  // Helper para obtener datos del remitente
  const getSenderProfile = (senderId: string) => {
    return profiles.find((p) => p.id === senderId);
  };

  const currentRecipient = profiles.find((p) => p.id === selectedRecipientId);

  return (
    <AppLayout>
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Barra superior */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Mensajería Interna del Equipo
            </h2>
            <p className="text-xs text-slate-500">
              Coordinación en tiempo real con confirmación de lectura (doble chulo)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de identidad: Define quién envía los mensajes */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 font-semibold">Tú eres:</span>
              <select
                value={currentUserId}
                onChange={(e) => handleSwitchUser(e.target.value)}
                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Silenciar/Activar Notificaciones */}
            <button
              onClick={toggleMute}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold border transition-all ${
                isMuted
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? 'Silenciado' : 'Sonido Activo'}</span>
            </button>
          </div>
        </div>

        {/* Panel del Chat */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 min-h-[550px] overflow-hidden">
          {/* Columna Izquierda: Contactos */}
          <div className="border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="p-3.5 border-b border-slate-200 bg-white">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Bandejas de Charla
              </span>
            </div>

            <div className="p-2 space-y-1 overflow-y-auto flex-1">
              {/* Canal General */}
              <button
                onClick={() => setSelectedRecipientId('team')}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
                  selectedRecipientId === 'team'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedRecipientId === 'team' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs truncate">Canal General de Operaciones</div>
                  <div className={`text-[10px] truncate ${selectedRecipientId === 'team' ? 'text-blue-100' : 'text-slate-400'}`}>
                    Anuncios para todo el equipo
                  </div>
                </div>
              </button>

              <div className="pt-3 pb-1 px-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Miembros ({profiles.filter((p) => p.id !== currentUserId).length})
                </span>
              </div>

              {profiles
                .filter((p) => p.id !== currentUserId)
                .map((member) => {
                  const isSelected = selectedRecipientId === member.id;
                  
                  // Mensajes no leídos de este miembro
                  const unreadCount = messages.filter(
                    m => m.sender_id === member.id && m.receiver_id === currentUserId && !m.is_read
                  ).length;

                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedRecipientId(member.id)}
                      className={`w-full text-left p-2.5 rounded-xl flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate">{member.full_name}</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {member.role}
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Columna Derecha: Conversación */}
          <div className="md:col-span-2 flex flex-col h-[550px] bg-white">
            {/* Cabecera Chat */}
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {selectedRecipientId === 'team' ? <Users className="w-4 h-4" /> : currentRecipient?.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800">
                    {selectedRecipientId === 'team' ? 'Canal General de Operaciones' : currentRecipient?.full_name}
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {selectedRecipientId === 'team' ? 'Visible para todo el personal' : currentRecipient?.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Muro de Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
              {loading ? (
                <div className="text-center py-10 text-xs text-slate-400">Cargando mensajes...</div>
              ) : activeConversation.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400">
                  No hay mensajes aquí. ¡Comienza la conversación!
                </div>
              ) : (
                activeConversation.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  const sender = getSenderProfile(msg.sender_id);
                  const senderName = isMine ? 'Tú' : (sender?.full_name || 'Compañero');

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-600">
                          {senderName}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl max-w-sm sm:max-w-md text-xs leading-relaxed shadow-2xs flex flex-col gap-1 ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        <p>{msg.content}</p>

                        {/* Indicador de chulos (ticks) solo en mensajes propios */}
                        {isMine && (
                          <div className="self-end flex items-center text-[10px] mt-0.5">
                            {msg.receiver_id === null ? (
                              // Canal general
                              <Check className="w-3.5 h-3.5 text-blue-200" title="Enviado al canal" />
                            ) : msg.is_read ? (
                              // Dos chulos azules (Leído)
                              <CheckCheck className="w-3.5 h-3.5 text-sky-300" title="Leído por el destinatario" />
                            ) : (
                              // Un chulo gris/blanco (Enviado)
                              <Check className="w-3.5 h-3.5 text-blue-200" title="Enviado (sin leer)" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input para redactar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white">
              <input
                type="text"
                placeholder={
                  selectedRecipientId === 'team'
                    ? 'Escribe un mensaje para todo el equipo...'
                    : `Mensaje directo para ${currentRecipient?.full_name || 'compañero'}...`
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl shadow-xs transition-colors"
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}