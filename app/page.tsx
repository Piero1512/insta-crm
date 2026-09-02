// app/leads/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Lead, County, LeadSource, LeadTemperature } from '@/types/crm';
import { calculateScore } from '@/lib/scoring';
import { 
  Phone, 
  MessageSquare, 
  Plus, 
  MapPin, 
  Search, 
  Filter, 
  RotateCcw, 
  Edit2, 
  Trash2,
  Flame,
  Share2,
  X
} from 'lucide-react';

interface CoordinatorOption {
  id: string;
  full_name: string;
  role: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtros de Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCounty, setFilterCounty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCoordinator, setFilterCoordinator] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Formulario Crear Lead (Campos generales + Campos de Marketing)
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState('Remodelación de Baño');
  const [locationCounty, setLocationCounty] = useState<County>('miami-dade');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  // Nuevos campos estilo HubSpot:
  const [leadSource, setLeadSource] = useState<LeadSource>('meta_ads');
  const [budgetRange, setBudgetRange] = useState<string>('5k-15k');

  // Formulario Editar Lead
  const [editClientName, setEditClientName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editServiceType, setEditServiceType] = useState('');
  const [editLocationCounty, setEditLocationCounty] = useState<County>('miami-dade');
  const [editZipCode, setEditZipCode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editLeadSource, setEditLeadSource] = useState<LeadSource>('directo');
  const [editBudgetRange, setEditBudgetRange] = useState<string>('no_especificado');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: leadsData }, { data: profilesData }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role').order('full_name', { ascending: true })
    ]);
    if (leadsData) setLeads(leadsData);
    if (profilesData) setCoordinators(profilesData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Función para Crear Lead calculando automáticamente Scoring y Temperatura
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Calculamos el puntaje inicial usando el motor de scoring
    const { score, temperature } = calculateScore({
      service_type: serviceType,
      location_county: locationCounty,
      budget_range: budgetRange,
      calls_count: 0,
      messages_count: 0,
    });

    // 2. Guardamos en Supabase con los campos de marketing
    const { error } = await supabase.from('leads').insert([
      {
        client_name: clientName,
        phone,
        email,
        service_type: serviceType,
        location_county: locationCounty,
        zip_code: zipCode,
        address,
        assigned_to: assignedTo || null,
        status: 'nuevo',
        calls_count: 0,
        messages_count: 0,
        lead_source: leadSource,
        budget_range: budgetRange,
        lead_score: score,
        temperature: temperature,
      },
    ]);

    if (error) {
      alert('Error al crear lead: ' + error.message);
      return;
    }

    setIsCreateModalOpen(false);
    // Limpiar campos
    setClientName('');
    setPhone('');
    setEmail('');
    setZipCode('');
    setAddress('');
    setAssignedTo('');
    setLeadSource('meta_ads');
    setBudgetRange('5k-15k');
    fetchData();
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditClientName(lead.client_name);
    setEditPhone(lead.phone);
    setEditEmail(lead.email || '');
    setEditServiceType(lead.service_type);
    setEditLocationCounty(lead.location_county);
    setEditZipCode(lead.zip_code || '');
    setEditAddress(lead.address || '');
    setEditAssignedTo(lead.assigned_to || '');
    setEditLeadSource(lead.lead_source || 'directo');
    setEditBudgetRange(lead.budget_range || 'no_especificado');
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    // Recalcular scoring al actualizar presupuesto o datos
    const { score, temperature } = calculateScore({
      service_type: editServiceType,
      location_county: editLocationCounty,
      budget_range: editBudgetRange,
      calls_count: editingLead.calls_count,
      messages_count: editingLead.messages_count,
    });

    const { error } = await supabase
      .from('leads')
      .update({
        client_name: editClientName,
        phone: editPhone,
        email: editEmail,
        service_type: editServiceType,
        location_county: editLocationCounty,
        zip_code: editZipCode,
        address: editAddress,
        assigned_to: editAssignedTo || null,
        lead_source: editLeadSource,
        budget_range: editBudgetRange,
        lead_score: score,
        temperature: temperature,
      })
      .eq('id', editingLead.id);

    if (error) {
      alert('Error al actualizar lead: ' + error.message);
      return;
    }
    setEditingLead(null);
    fetchData();
  };

  const handleConfirmDeleteLead = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('leads').delete().eq('id', leadToDelete.id);
    setIsDeleting(false);
    if (error) {
      alert('Error al eliminar lead: ' + error.message);
    } else {
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
      setLeadToDelete(null);
    }
  };

  // Al registrar llamadas o mensajes se actualiza también el scoring en tiempo real
  const handleIncrementInteraction = async (lead: Lead, type: 'call' | 'message') => {
    const currentCalls = lead.calls_count;
    const currentMessages = lead.messages_count;

    const newCalls = type === 'call' ? currentCalls + 1 : currentCalls;
    const newMessages = type === 'message' ? currentMessages + 1 : currentMessages;

    if (type === 'call' && currentCalls >= 4) return;
    if (type === 'message' && currentMessages >= 4) return;

    const { score, temperature } = calculateScore({
      service_type: lead.service_type,
      location_county: lead.location_county,
      budget_range: lead.budget_range,
      calls_count: newCalls,
      messages_count: newMessages,
    });

    const updateData = {
      calls_count: newCalls,
      messages_count: newMessages,
      status: 'en_seguimiento',
      lead_score: score,
      temperature: temperature,
    };

    const { error } = await supabase.from('leads').update(updateData).eq('id', lead.id);
    if (!error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, ...updateData, status: 'en_seguimiento' } : l))
      );
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        lead.client_name?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query) ||
        lead.service_type?.toLowerCase().includes(query) ||
        lead.zip_code?.toLowerCase().includes(query) ||
        lead.address?.toLowerCase().includes(query);

      const matchesCounty = filterCounty === 'all' || lead.location_county === filterCounty;
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
      const matchesCoordinator =
        filterCoordinator === 'all' ||
        (filterCoordinator === 'unassigned' ? !lead.assigned_to : lead.assigned_to === filterCoordinator);
      const matchesSource = filterSource === 'all' || lead.lead_source === filterSource;

      return matchesSearch && matchesCounty && matchesStatus && matchesCoordinator && matchesSource;
    });
  }, [leads, searchQuery, filterCounty, filterStatus, filterCoordinator, filterSource]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCounty('all');
    setFilterStatus('all');
    setFilterCoordinator('all');
    setFilterSource('all');
  };

  const hasActiveFilters = searchQuery !== '' || filterCounty !== 'all' || filterStatus !== 'all' || filterCoordinator !== 'all' || filterSource !== 'all';

  const getTemperatureBadge = (temp?: LeadTemperature, score?: number) => {
    const finalScore = score || 10;
    if (temp === 'caliente' || finalScore >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
          Caliente ({finalScore})
        </span>
      );
    }
    if (temp === 'tibio' || finalScore >= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Flame className="w-3 h-3 text-amber-500" />
          Tibio ({finalScore})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
        Frío ({finalScore})
      </span>
    );
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'google_ads':
        return <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Google Ads</span>;
      case 'meta_ads':
        return <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Meta Ads</span>;
      case 'landing_page':
        return <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Web / SEO</span>;
      case 'referido':
        return <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Referido</span>;
      default:
        return <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Directo</span>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Leads & Prospectos</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Calificación predictiva (Lead Scoring), atribución multicanal y protocolo 4+4
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Lead
          </button>
        </div>

        {/* Barra de Filtros Inteligentes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Filtros Multicriterio & Segmentación
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente, tel, zip..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
              />
            </div>

            <div>
              <select
                value={filterCounty}
                onChange={(e) => setFilterCounty(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
              >
                <option value="all">Condado: Todos</option>
                <option value="miami-dade">Miami-Dade</option>
                <option value="broward">Broward</option>
                <option value="palm beach">Palm Beach</option>
              </select>
            </div>

            <div>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
              >
                <option value="all">Canal: Todos</option>
                <option value="meta_ads">Meta Ads (FB/IG)</option>
                <option value="google_ads">Google Ads</option>
                <option value="landing_page">Web / Form</option>
                <option value="referido">Referido</option>
                <option value="directo">Directo</option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
              >
                <option value="all">Estado: Todos</option>
                <option value="nuevo">Nuevo</option>
                <option value="en_seguimiento">En Seguimiento</option>
                <option value="visita_realizada">Visita Realizada</option>
                <option value="presupuestado">Presupuestado</option>
                <option value="cerrado_ganado">Cerrado Ganado</option>
                <option value="cerrado_perdido">Cerrado Perdido</option>
              </select>
            </div>

            <div>
              <select
                value={filterCoordinator}
                onChange={(e) => setFilterCoordinator(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
              >
                <option value="all">Asignación: Todos</option>
                <option value="unassigned">Sin Asignar</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Prospectos Enriquecida */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Bandeja Inteligente de Leads</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {filteredLeads.length} Prospectos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente / Servicio</th>
                  <th className="py-3 px-4">Origen & Temperatura</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4">Seguimiento 4+4</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Cargando leads...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No se encontraron prospectos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{lead.client_name}</div>
                        <div className="text-xs text-slate-400">{lead.service_type} • {lead.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getTemperatureBadge(lead.temperature, lead.lead_score)}
                          {getSourceBadge(lead.lead_source)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-slate-700 flex items-center gap-1 capitalize">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {lead.location_county} {lead.zip_code && `(${lead.zip_code})`}
                        </div>
                        {lead.budget_range && lead.budget_range !== 'no_especificado' && (
                          <span className="text-[11px] text-slate-400">Presupuesto: {lead.budget_range}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded font-semibold ${lead.calls_count >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                            📞 {lead.calls_count}/4
                          </span>
                          <span className={`px-2 py-0.5 rounded font-semibold ${lead.messages_count >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                            💬 {lead.messages_count}/4
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                          {lead.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleIncrementInteraction(lead, 'call')}
                            disabled={lead.calls_count >= 4}
                            title="Llamada realizada (+puntos)"
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded disabled:opacity-30"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleIncrementInteraction(lead, 'message')}
                            disabled={lead.messages_count >= 4}
                            title="Mensaje enviado (+puntos)"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 rounded disabled:opacity-30"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(lead)}
                            title="Editar lead"
                            className="p-1.5 text-slate-500 hover:text-amber-600 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setLeadToDelete(lead)}
                            title="Eliminar lead"
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded"
                          >
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

      {/* Modal Crear Lead con Parámetros de Marketing */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Registrar Nuevo Lead (Marketing & Ventas)</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Mendoza"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    placeholder="305-000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="cliente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              {/* SECCIÓN DE MARKETING INTELLIGENCE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div>
                  <label className="block text-xs font-semibold text-blue-900 uppercase mb-1 flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    Canal de Captación
                  </label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg focus:outline-none text-slate-800 font-medium"
                  >
                    <option value="meta_ads">Meta Ads (Facebook / IG)</option>
                    <option value="google_ads">Google Ads (Search / Local)</option>
                    <option value="landing_page">Web / Formulario Directo</option>
                    <option value="referido">Referido de Cliente</option>
                    <option value="directo">WhatsApp Directo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 uppercase mb-1 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Presupuesto Estimado
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg focus:outline-none text-slate-800 font-medium"
                  >
                    <option value="<5k">Menor a $5,000 (Pequeño)</option>
                    <option value="5k-15k">$5,000 a $15,000 (Medio)</option>
                    <option value="15k-50k">$15,000 a $50,000 (Grande)</option>
                    <option value=">50k">Mayor a $50,000 (Premium)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tipo de Servicio *</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  >
                    <option value="Remodelación de Baño">Remodelación de Baño</option>
                    <option value="Remodelación de Cocina">Remodelación de Cocina</option>
                    <option value="Instalación de Pisos">Instalación de Pisos</option>
                    <option value="Drywall & Pintura">Drywall & Pintura</option>
                    <option value="Plomería / Electricidad">Plomería / Electricidad</option>
                    <option value="Handyman General">Handyman General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Condado *</label>
                  <select
                    value={locationCounty}
                    onChange={(e) => setLocationCounty(e.target.value as County)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  >
                    <option value="miami-dade">Miami-Dade</option>
                    <option value="broward">Broward</option>
                    <option value="palm beach">Palm Beach</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Zip Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="33101"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Coordinador Asignado</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  >
                    <option value="">Sin Asignar</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Dirección del Proyecto</label>
                <input
                  type="text"
                  placeholder="Calle, número de casa, apto..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Guardar & Calificar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Lead */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                Editar Prospecto: {editingLead.client_name}
              </h3>
              <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Correo</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Canal de Origen</label>
                  <select
                    value={editLeadSource}
                    onChange={(e) => setEditLeadSource(e.target.value as LeadSource)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="meta_ads">Meta Ads</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="landing_page">Web / SEO</option>
                    <option value="referido">Referido</option>
                    <option value="directo">Directo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Presupuesto</label>
                  <select
                    value={editBudgetRange}
                    onChange={(e) => setEditBudgetRange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="<5k">&lt; $5k</option>
                    <option value="5k-15k">$5k - $15k</option>
                    <option value="15k-50k">$15k - $50k</option>
                    <option value=">50k">&gt; $50k</option>
                    <option value="no_especificado">No especificado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Servicio</label>
                  <input
                    type="text"
                    value={editServiceType}
                    onChange={(e) => setEditServiceType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Condado</label>
                  <select
                    value={editLocationCounty}
                    onChange={(e) => setEditLocationCounty(e.target.value as County)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="miami-dade">Miami-Dade</option>
                    <option value="broward">Broward</option>
                    <option value="palm beach">Palm Beach</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Actualizar Datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      <ConfirmModal
        isOpen={Boolean(leadToDelete)}
        title="¿Eliminar este prospecto?"
        message={`Estás a punto de eliminar el registro de "${leadToDelete?.client_name}". Esta acción borrará permanentemente sus datos y métricas de marketing asociadas.`}
        confirmText="Sí, eliminar lead"
        cancelText="No, conservar"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteLead}
        onCancel={() => setLeadToDelete(null)}
      />
    </AppLayout>
  );
}