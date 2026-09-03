// app/leads/page.tsx
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

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState('all');

  // Modal WhatsApp Oficial
  const [activeWhatsAppLead, setActiveWhatsAppLead] = useState<Lead | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [waStatusFeedback, setWaStatusFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cargar información inicial
  const loadInitialData = async () => {
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
    loadInitialData();
  }, []);

  // Abrir modal de WhatsApp con plantilla predeterminada
  const openWhatsAppModal = (lead: Lead) => {
    setActiveWhatsAppLead(lead);
    setWaStatusFeedback(null);
    const coordinatorName = currentProfile?.full_name || 'nuestro equipo';
    setCustomMessage(
      `Hola ${lead.client_name}, te saludamos de Insta Contractors Florida. Nos ponemos en contacto contigo respecto a tu solicitud de ${lead.service_type}. ¿En qué horario te resultaría conveniente coordinar una breve visita técnica?`
    );
  };

  // Envío mediante API oficial de WhatsApp
  const handleSendOfficialWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWhatsAppLead || !customMessage.trim()) return;

    setSendingWhatsApp(true);
    setWaStatusFeedback(null);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: activeWhatsAppLead.id,
          phone: activeWhatsAppLead.phone,
          messageText: customMessage.trim(),
          coordinatorId: currentProfile?.id,
          coordinatorName: currentProfile?.full_name,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setWaStatusFeedback({
          type: 'success',
          text: 'Mensaje oficial enviado con éxito a través de Meta API. Se actualizó la bitácora del lead.',
        });

        // Actualizar el contador en la vista local inmediatamente
        setLeads((prev) =>
          prev.map((l) =>
            l.id === activeWhatsAppLead.id
              ? { ...l, whatsapp_count: (l.whatsapp_count || 0) + 1, last_contact: new Date().toISOString() }
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
        text: 'Error de conexión con el servidor de mensajería',
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Filtrado de leads
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
      const matchAssignment =
        selectedAssignment === 'all' ||
        (selectedAssignment === 'unassigned' && !lead.assigned_to) ||
        lead.assigned_to === selectedAssignment;

      return matchSearch && matchCounty && matchChannel && matchStatus && matchAssignment;
    });
  }, [leads, searchTerm, selectedCounty, selectedChannel, selectedStatus, selectedAssignment]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Leads & Prospectos</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Calificación predictiva, atribución multicanal y protocolo de contacto oficial
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Nuevo Lead
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            Filtros Multicriterio & Segmentación
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
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
              <option value="Google LSA">Google LSA</option>
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
              <option value="Visita Agendada">Visita Agendada</option>
              <option value="Visita Realizada">Visita Realizada</option>
              <option value="Cerrado Ganado">Cerrado Ganado</option>
            </select>

            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Asignación: Todos</option>
              <option value="unassigned">Sin Asignar</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla de Leads */}
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
                    <td colSpan={6} className="text-center py-12 text-slate-400">No se encontraron leads con los filtros seleccionados.</td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{lead.client_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {lead.service_type} • <span className="text-slate-600 font-mono">{lead.phone}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            lead.lead_score >= 80 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : lead.lead_score >= 50
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            <Flame className="w-3 h-3" />
                            {lead.lead_temperature || 'Tibio'} ({lead.lead_score || 50})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {lead.origin_channel || 'Directo'}
                        </span>
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

                      {/* Contador oficial 4+4 */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Phone className="w-3 h-3 text-emerald-600" /> {lead.calls_count || 0}/4
                          </span>
                          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            (lead.whatsapp_count || 0) >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <MessageSquare className="w-3 h-3 text-sky-600" /> {lead.whatsapp_count || 0}/4
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
                          {/* Llamada rápida */}
                          <a
                            href={`tel:${lead.phone}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Llamar teléfono"
                          >
                            <Phone className="w-4 h-4" />
                          </a>

                          {/* BOTÓN OFICIAL WHATSAPP API */}
                          <button
                            onClick={() => openWhatsAppModal(lead)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Enviar WhatsApp Oficial (Meta API)"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE ENVÍO WHATSAPP OFICIAL META */}
      {activeWhatsAppLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    Enviar WhatsApp Oficial
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Para: <span className="font-semibold text-slate-700">{activeWhatsAppLead.client_name}</span> ({activeWhatsAppLead.phone})
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
                  Mensaje Saliente (Línea Oficial Meta)
                </label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 leading-relaxed"
                  placeholder="Escribe el mensaje para el cliente..."
                />
              </div>

              <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100 text-[11px] text-sky-800 space-y-1">
                <p className="font-semibold">Auditoría Automática Activa:</p>
                <p className="text-slate-600">
                  Este mensaje se transmitirá por la cuenta comercial de Meta. Al enviarse, el CRM sumará automáticamente el contador a <strong>{activeWhatsAppLead.whatsapp_count + 1}/4</strong> y registrará la copia exacta en la bitácora del lead.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveWhatsAppLead(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingWhatsApp || !customMessage.trim()}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingWhatsApp ? 'Transmitiendo a Meta...' : 'Enviar Mensaje Oficial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}