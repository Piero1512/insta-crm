// app/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { 
  Phone, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  Flame, 
  MapPin, 
  FileText,
  Clock,
  User,
  Send,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Lead {
  id: string;
  client_name: string;
  phone: string;
  email?: string;
  county: string;
  zip_code?: string;
  service_type: string;
  estimated_value?: number;
  origin_channel: string;
  lead_score: number;
  lead_temperature: string;
  status: string;
  assigned_to?: string;
  calls_count: number;
  whatsapp_count: number;
  last_contact?: string;
  created_at: string;
}

interface LeadNote {
  id: string;
  lead_id: string;
  author_name: string;
  note: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal WhatsApp Oficial
  const [activeWhatsAppLead, setActiveWhatsAppLead] = useState<Lead | null>(null);
  const [targetPhone, setTargetPhone] = useState('');
  const [countryCode, setCountryCode] = useState('57');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [waStatusFeedback, setWaStatusFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Historial / Bitácora
  const [activeNotesLead, setActiveNotesLead] = useState<Lead | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data: profilesList } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (profilesList) {
      setProfiles(profilesList);
      if (user) {
        const found = profilesList.find(
          (p) => p.id === user.id || (p.email && p.email.toLowerCase() === user.email?.toLowerCase())
        );
        setCurrentProfile(found || profilesList[0]);
      }
    }

    // Traer leads reales desde Supabase ordenados por creación
    const { data: leadsList } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (leadsList) {
      setLeads(leadsList);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Cargar bitácora
  const openLeadHistory = async (lead: Lead) => {
    setActiveNotesLead(lead);
    setLoadingNotes(true);

    const { data, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLeadNotes(data as LeadNote[]);
    } else {
      setLeadNotes([]);
    }
    setLoadingNotes(false);
  };

  // Preparar modal WhatsApp
  const openWhatsAppModal = (lead: Lead) => {
    setActiveWhatsAppLead(lead);
    setWaStatusFeedback(null);

    const digitsOnly = lead.phone.replace(/\D/g, '');
    if (digitsOnly.startsWith('57')) {
      setCountryCode('57');
      setTargetPhone(digitsOnly.slice(2));
    } else if (digitsOnly.startsWith('1') && digitsOnly.length > 10) {
      setCountryCode('1');
      setTargetPhone(digitsOnly.slice(1));
    } else if (digitsOnly.startsWith('3')) {
      setCountryCode('57');
      setTargetPhone(digitsOnly);
    } else {
      setCountryCode('1');
      setTargetPhone(digitsOnly);
    }

    setCustomMessage(
      `Hola ${lead.client_name}, te saludamos de Insta Contractors Florida. Nos ponemos en contacto contigo respecto a tu solicitud de ${lead.service_type}. ¿En qué horario te resultaría conveniente coordinar una breve visita técnica?`
    );
  };

  // Enviar mensaje oficial Meta
  const handleSendOfficialWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWhatsAppLead || !customMessage.trim() || !targetPhone.trim()) return;

    setSendingWhatsApp(true);
    setWaStatusFeedback(null);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: activeWhatsAppLead.id,
          phone: targetPhone.trim(),
          countryCode: countryCode,
          messageText: customMessage.trim(),
          coordinatorId: currentProfile?.id,
          coordinatorName: currentProfile?.full_name || 'Jean Epalza',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setWaStatusFeedback({
          type: 'success',
          text: `Mensaje transmitido exitosamente a +${data.targetPhone}. La bitácora y el contador se actualizaron.`,
        });

        // Actualizar el estado local para reflejar el cambio de inmediato
        setLeads((prev) =>
          prev.map((l) =>
            l.id === activeWhatsAppLead.id
              ? { ...l, whatsapp_count: (Number(l.whatsapp_count) || 0) + 1, last_contact: new Date().toISOString() }
              : l
          )
        );

        setTimeout(() => {
          setActiveWhatsAppLead(null);
        }, 1800);
      } else {
        setWaStatusFeedback({
          type: 'error',
          text: data.error || 'Error al procesar el mensaje con Meta API',
        });
      }
    } catch {
      setWaStatusFeedback({
        type: 'error',
        text: 'Error de conexión con el servidor',
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Filtrado
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchSearch =
        lead.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        (lead.zip_code && lead.zip_code.includes(searchTerm)) ||
        lead.service_type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCounty = selectedCounty === 'all' || lead.county === selectedCounty;
      const matchChannel = selectedChannel === 'all' || lead.origin_channel === selectedChannel;
      const matchStatus = selectedStatus === 'all' || lead.status === selectedStatus;

      return matchSearch && matchCounty && matchChannel && matchStatus;
    });
  }, [leads, searchTerm, selectedCounty, selectedChannel, selectedStatus]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Leads & Prospectos</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Calificación predictiva (Lead Scoring), atribución multicanal y protocolo 4+4
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Nuevo Lead
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            Filtros Multicriterio & Segmentación
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar cliente, tel, zip..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Condado: Todos</option>
              <option value="Miami-Dade">Miami-Dade</option>
              <option value="Broward">Broward</option>
              <option value="Palm Beach">Palm Beach</option>
            </select>

            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Canal: Todos</option>
              <option value="Web / SEO">Web / SEO</option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="Directo">Directo</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Estado: Todos</option>
              <option value="Nuevo">Nuevo</option>
              <option value="En Seguimiento">En Seguimiento</option>
              <option value="Visita Realizada">Visita Realizada</option>
              <option value="Cerrado Ganado">Cerrado Ganado</option>
            </select>
          </div>
        </div>

        {/* Tabla sincronizada con Supabase */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">Bandeja Inteligente de Leads</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {filteredLeads.length} Prospectos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Cliente / Servicio</th>
                  <th className="py-3 px-4">Origen & Temperatura</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4">Seguimiento 4+4</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">Cargando prospectos...</td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">No se encontraron leads.</td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const calls = Number(lead.calls_count) || 0;
                    const wa = Number(lead.whatsapp_count) || 0;

                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{lead.client_name}</div>
                          <div className="text-[11px] text-slate-400">
                            {lead.service_type} • <span className="text-slate-600 font-mono">{lead.phone}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 ${
                            lead.lead_score >= 80 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : lead.lead_score >= 50
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            <Flame className="w-3 h-3" />
                            {lead.lead_temperature || 'Tibio'} ({lead.lead_score || 50})
                          </span>
                          <div>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {lead.origin_channel || 'Directo'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-slate-600 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{lead.county} {lead.zip_code ? `(${lead.zip_code})` : ''}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Presupuesto: {lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '< 5k'}
                          </div>
                        </td>

                        {/* CONTADORES REALES DINÁMICOS SIN HARDCODE */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              calls >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                            }`}>
                              <Phone className="w-3 h-3 text-emerald-600" /> {calls}/4
                            </span>
                            <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              wa >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                            }`}>
                              <MessageSquare className="w-3 h-3 text-sky-600" /> {wa}/4
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            lead.status === 'Cerrado Ganado'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : lead.status === 'Visita Realizada'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {lead.status || 'Nuevo'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Ver Bitácora & Conversaciones */}
                            <button
                              onClick={() => openLeadHistory(lead)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Ver Bitácora & Historial"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {/* Enviar WhatsApp Oficial */}
                            <button
                              onClick={() => openWhatsAppModal(lead)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Enviar WhatsApp Oficial"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>

                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Historial */}
      {activeNotesLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Historial & Respuestas</h3>
                  <p className="text-[11px] text-slate-500">
                    Lead: <span className="font-semibold text-slate-700">{activeNotesLead.client_name}</span> ({activeNotesLead.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveNotesLead(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingNotes ? (
                <div className="text-center py-10 text-xs text-slate-400">Cargando bitácora...</div>
              ) : leadNotes.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                  <p className="font-semibold text-slate-600">Sin notas registradas</p>
                </div>
              ) : (
                leadNotes.map((item) => {
                  const text = item.note || '';
                  const isIncoming = text.includes('[WhatsApp Entrante');
                  const isOutgoing = text.includes('[WhatsApp Oficial Enviado') || text.includes('[WhatsApp: Mensaje');

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                        isIncoming
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 ml-4'
                          : isOutgoing
                          ? 'bg-sky-50/80 border-sky-200 text-sky-950 mr-4'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          isIncoming ? 'text-emerald-700' : isOutgoing ? 'text-sky-700' : 'text-slate-500'
                        }`}>
                          <User className="w-3 h-3" />
                          {item.author_name || (isIncoming ? 'Cliente' : 'Coordinador')}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap font-medium">{text}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                onClick={() => setActiveNotesLead(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Envío WhatsApp */}
      {activeWhatsAppLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Enviar WhatsApp Oficial</h3>
                  <p className="text-[11px] text-slate-500">
                    Destinatario: <span className="font-semibold text-slate-700">{activeWhatsAppLead.client_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveWhatsAppLead(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {waStatusFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  waStatusFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {waStatusFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{waStatusFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSendOfficialWhatsApp} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Número de Destino & Código de País
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-40 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-sky-500"
                  >
                    <option value="57">🇨🇴 Col (+57)</option>
                    <option value="1">🇺🇸 USA (+1)</option>
                  </select>

                  <input
                    type="text"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="Ej. 3017260165"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Se transmitirá a: <strong className="text-slate-600 font-mono">+{countryCode} {targetPhone}</strong>
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Mensaje Saliente
                </label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 leading-relaxed"
                  placeholder="Escribe el mensaje..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveWhatsAppLead(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingWhatsApp || !customMessage.trim() || !targetPhone.trim()}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingWhatsApp ? 'Transmitiendo...' : 'Enviar Mensaje Oficial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}