// app/messages/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { playNotificationSound } from '@/lib/audio';
import { 
  Send, 
  Users, 
  MessageSquare, 
  Volume2,
  VolumeX
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
  sender?: Profile;
}

export default function MessagesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('team'); // 'team' = Canal general
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Control de silencio / notificaciones (guardado en LocalStorage)
  const [isMuted, setIsMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Solicitar permiso de Notificaciones de escritorio
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

  // Cargar usuarios y mensajes iniciales
  const loadInitialData = async () => {
    setLoading(true);
    const { data: teamProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, phone')
      .order('full_name', { ascending: true });

    if (teamProfiles && teamProfiles.length > 0) {
      setProfiles(teamProfiles);
      if (!currentUserId) {
        setCurrentUserId(teamProfiles[0].id);
      }
    }

    const { data: msgList } = await supabase
      .from('internal_messages')
      .select('*, sender:profiles!internal_messages_sender_id_fkey(id, full_name, role)')
      .order('created_at', { ascending: true });

    if (msgList) {
      setMessages(msgList);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();

    // Suscripción Realtime a mensajes nuevos
    const channel = supabase
      .channel('public:internal_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_messages' },
        async (payload) => {
          const newMsg = payload.new as InternalMessage;

          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', newMsg.sender_id)
            .single();

          const messageWithSender: InternalMessage = {
            ...newMsg,
            sender: senderProfile || undefined,
          };

          setMessages((prev) => [...prev, messageWithSender]);

          // Verificar si el mensaje es de otro usuario y si no está silenciado
          const isFromOtherUser = newMsg.sender_id !== currentUserId;
          const isMutedNow = localStorage.getItem('insta_crm_messages_muted') === 'true';

          if (isFromOtherUser && !isMutedNow) {
            playNotificationSound();

            // Notificación nativa de escritorio (funciona si estás en otra pestaña o fuera de la app)
            if ('Notification' in window && Notification.permission === 'granted') {
              const senderName = senderProfile?.full_name || 'Compañero';
              const n = new Notification(`Mensaje de ${senderName}`, {
                body: newMsg.content.slice(0, 100),
                icon: '/favicon.ico',
              });
              n.onclick = () => {
                window.focus();
              };
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedRecipientId]);

  // Conversación activa según pestaña seleccionada
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
      }
    ]);

    if (!error) {
      setInputMessage('');
    } else {
      alert('Error al enviar mensaje: ' + error.message);
    }
    setSending(false);
  };

  const currentRecipient = profiles.find((p) => p.id === selectedRecipientId);

  return (
    <AppLayout>
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Barra superior de Mensajería */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Mensajería Interna del Equipo
            </h2>
            <p className="text-xs text-slate-500">
              Coordinación operativa en tiempo real entre oficina y terreno
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de remitente activo */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-400">Tú eres:</span>
              <select
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Silenciar / Desilenciar */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'Notificaciones silenciadas (clic para activar)' : 'Notificaciones activas (clic para silenciar)'}
              className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold border transition-all ${
                isMuted
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isMuted ? 'Silenciado' : 'Sonido Activo'}</span>
            </button>
          </div>
        </div>

        {/* Panel del Chat */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 min-h-[550px] overflow-hidden">
          {/* Columna Izquierda: Lista de Contactos / Canales */}
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
                    Anuncios públicos para todo el equipo
                  </div>
                </div>
              </button>

              <div className="pt-3 pb-1 px-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Miembros Directos ({profiles.filter((p) => p.id !== currentUserId).length})
                </span>
              </div>

              {/* Mensajes Directos por Usuario */}
              {profiles
                .filter((p) => p.id !== currentUserId)
                .map((member) => {
                  const isSelected = selectedRecipientId === member.id;
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
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
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Columna Derecha: Conversación Activa */}
          <div className="md:col-span-2 flex flex-col h-[550px] bg-white">
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
                    {selectedRecipientId === 'team' ? 'Mensajes visibles para todo el personal' : currentRecipient?.role}
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
                  No hay mensajes en esta conversación. ¡Envía el primero!
                </div>
              ) : (
                activeConversation.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-600">
                          {isMine ? 'Tú' : msg.sender?.full_name || 'Compañero'}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl max-w-sm sm:max-w-md text-xs leading-relaxed shadow-2xs ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input y botón enviar */}
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