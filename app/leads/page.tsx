// app/leads/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Lead, County } from '@/types/crm';
import { 
  Phone, 
  MessageSquare, 
  Plus, 
  MapPin, 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  Edit2, 
  Trash2 
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
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCounty, setFilterCounty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCoordinator, setFilterCoordinator] = useState<string>('all');

  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState('Remodelación de Baño');
  const [locationCounty, setLocationCounty] = useState<County>('miami-dade');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const [editClientName, setEditClientName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editServiceType, setEditServiceType] = useState('');
  const [editLocationCounty, setEditLocationCounty] = useState<County>('miami-dade');
  const [editZipCode, setEditZipCode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');

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

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
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
      },
    ]);
    if (error) {
      alert('Error al crear lead: ' + error.message);
      return;
    }
    setIsCreateModalOpen(false);
    setClientName('');
    setPhone('');
    setEmail('');
    setZipCode('');
    setAddress('');
    setAssignedTo('');
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
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
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

  const handleAssignCoordinator = async (leadId: string, newCoordinatorId: string) => {
    const updatePayload = {
      assigned_to: newCoordinatorId === '' ? null : newCoordinatorId,
    };
    const { error } = await supabase.from('leads').update(updatePayload).eq('id', leadId);
    if (error) {
      alert('Error al actualizar asignación: ' + error.message);
    } else {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, assigned_to: updatePayload.assigned_to as any } : l))
      );
    }
  };

  const handleIncrementInteraction = async (leadId: string, type: 'call' | 'message', currentCount: number) => {
    if (currentCount >= 4) return;
    const column = type === 'call' ? 'calls_count' : 'messages_count';
    const nextCount = currentCount + 1;
    const { error } = await supabase.from('leads').update({ [column]: nextCount, status: 'en_seguimiento' }).eq('id', leadId);
    if (!error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, [column]: nextCount, status: 'en_seguimiento' } : l))
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

      return matchesSearch && matchesCounty && matchesStatus && matchesCoordinator;
    });
  }, [leads, searchQuery, filterCounty, filterStatus, filterCoordinator]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCounty('all');
    setFilterStatus('all');
    setFilterCoordinator('all');
  };

  const hasActiveFilters = searchQuery !== '' || filterCounty !== 'all' || filterStatus !== 'all' || filterCoordinator !== 'all';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Leads & Prospectos</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Control de prospección, filtros multicriterio y protocolo 4+4
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

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Filtros & Búsqueda
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="all">Condado: Todos</option>
                <option value="miami-dade">Miami-Dade</option>
                <option value="broward">Broward</option>
                <option value="palm beach">Palm Beach</option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="all">Asignación: Todos</option>
                <option value="unassigned">Sin Asignar</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Bandeja de Prospectos</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {filteredLeads.length} Leads
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente / Servicio</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4">Asignado a</th>
                  <th className="py-3 px-4">Llamadas</th>
                  <th className="py-3 px-4">Mensajes</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Cargando leads...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No se encontraron leads con los filtros seleccionados.
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
                        <div className="text-xs font-medium text-slate-700 flex items-center gap-1 capitalize">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {lead.location_county} {lead.zip_code && `(${lead.zip_code})`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={lead.assigned_to || ''}
                          onChange={(e) => handleAssignCoordinator(lead.id, e.target.value)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
                        >
                          <option value="">Sin Asignar</option>
                          {coordinators.map((c) => (
                            <option key={c.id} value={c.id}>{c.full_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${lead.calls_count >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                          {lead.calls_count} / 4
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${lead.messages_count >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                          {lead.messages_count} / 4
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                          {lead.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleIncrementInteraction(lead.id, 'call', lead.calls_count)}
                            disabled={lead.calls_count >= 4}
                            title="Llamada realizada"
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded disabled:opacity-30"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleIncrementInteraction(lead.id, 'message', lead.messages_count)}
                            disabled={lead.messages_count >= 4}
                            title="Mensaje enviado"
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

      {/* Modal Crear */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Registrar Nuevo Lead</h3>
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
                  placeholder="Ej. Juan Pérez"
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Correo</label>
                  <input
                    type="email"
                    placeholder="cliente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Servicio *</label>
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Coordinador</label>
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
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Dirección</label>
                <input
                  type="text"
                  placeholder="Calle, número, apto..."
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
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Guardar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                Editar Lead: {editingLead.client_name}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Servicio *</label>
                  <select
                    value={editServiceType}
                    onChange={(e) => setEditServiceType(e.target.value)}
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
                    value={editLocationCounty}
                    onChange={(e) => setEditLocationCounty(e.target.value as County)}
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
                    value={editZipCode}
                    onChange={(e) => setEditZipCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Coordinador</label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Dirección</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                />
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
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar Borrado */}
      <ConfirmModal
        isOpen={Boolean(leadToDelete)}
        title="¿Eliminar este lead?"
        message={`Estás a punto de eliminar el lead de "${leadToDelete?.client_name}". Esta acción borrará el registro y no se puede deshacer.`}
        confirmText="Sí, eliminar lead"
        cancelText="No, cancelar"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteLead}
        onCancel={() => setLeadToDelete(null)}
      />
    </AppLayout>
  );
}