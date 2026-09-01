// app/leads/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Lead, County } from '@/types/crm';
import { 
  Phone, 
  MessageSquare, 
  Plus, 
  MapPin, 
  Calendar, 
  UserCheck, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario nuevo lead
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState('Remodelación de Baño');
  const [locationCounty, setLocationCounty] = useState<County>('miami-dade');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Cargar leads y lista de coordinadores
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

  // Crear nuevo Lead con asignación opcional
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

    setIsModalOpen(false);
    setClientName('');
    setPhone('');
    setEmail('');
    setZipCode('');
    setAddress('');
    setAssignedTo('');
    fetchData();
  };

  // Reasignar coordinador al vuelo desde la tabla
  const handleAssignCoordinator = async (leadId: string, newCoordinatorId: string) => {
    const updatePayload = {
      assigned_to: newCoordinatorId === '' ? null : newCoordinatorId,
    };

    const { error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId);

    if (error) {
      alert('Error al actualizar asignación: ' + error.message);
    } else {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, assigned_to: updatePayload.assigned_to as any } : l))
      );
    }
  };

  // Incrementar protocolo 4+4
  const handleIncrementInteraction = async (leadId: string, type: 'call' | 'message', currentCount: number) => {
    if (currentCount >= 4) return;

    const column = type === 'call' ? 'calls_count' : 'messages_count';
    const nextCount = currentCount + 1;

    const { error } = await supabase
      .from('leads')
      .update({ [column]: nextCount, status: 'en_seguimiento' })
      .eq('id', leadId);

    if (!error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, [column]: nextCount, status: 'en_seguimiento' } : l))
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Cabecera */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Leads & Prospectos</h2>
              <p className="text-sm text-slate-500">
                Control de prospección, protocolo 4+4 y asignación a coordinadores
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Lead
            </button>
          </div>

          {/* Tabla de Leads */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Bandeja de Entrada de Prospectos</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                {leads.length} Registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Cliente / Servicio</th>
                    <th className="py-3.5 px-6">Ubicación & Zip</th>
                    <th className="py-3.5 px-6">Asignado a</th>
                    <th className="py-3.5 px-6">Llamadas (Meta: 4)</th>
                    <th className="py-3.5 px-6">Mensajes (Meta: 4)</th>
                    <th className="py-3.5 px-6">Estado</th>
                    <th className="py-3.5 px-6 text-right">Acción Rápida</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Cargando leads...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No hay leads registrados aún. Haz clic en <strong>"Nuevo Lead"</strong> para comenzar.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Cliente y Servicio */}
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-800">{lead.client_name}</div>
                          <div className="text-xs text-slate-400">
                            {lead.service_type} • {lead.phone}
                          </div>
                        </td>

                        {/* Ubicación */}
                        <td className="py-4 px-6">
                          <div className="text-xs font-medium text-slate-700 flex items-center gap-1 capitalize">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {lead.location_county} {lead.zip_code && `(${lead.zip_code})`}
                          </div>
                          {lead.address && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{lead.address}</div>
                          )}
                        </td>

                        {/* Asignación de Coordinador Dinámica */}
                        <td className="py-4 px-6">
                          <select
                            value={lead.assigned_to || ''}
                            onChange={(e) => handleAssignCoordinator(lead.id, e.target.value)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:border-blue-500 max-w-[160px] truncate"
                          >
                            <option value="">Sin Asignar</option>
                            {coordinators.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.full_name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Conteo Llamadas */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              lead.calls_count >= 4
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {lead.calls_count} / 4
                          </span>
                        </td>

                        {/* Conteo Mensajes */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              lead.messages_count >= 4
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {lead.messages_count} / 4
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="py-4 px-6">
                          <span className="capitalize px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                            {lead.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Acciones Rápidas */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleIncrementInteraction(lead.id, 'call', lead.calls_count)}
                              disabled={lead.calls_count >= 4}
                              title="Registrar llamada realizada"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleIncrementInteraction(lead.id, 'message', lead.messages_count)}
                              disabled={lead.messages_count >= 4}
                              title="Registrar mensaje enviado"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-30"
                            >
                              <MessageSquare className="w-4 h-4" />
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
        </main>
      </div>

      {/* Modal Nuevo Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Registrar Nuevo Lead</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nombre del Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Teléfono de Contacto *
                  </label>
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Tipo de Servicio *
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Condado *
                  </label>
                  <select
                    value={locationCounty}
                    onChange={(e) => setLocationCounty(e.target.value as County)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  >
                    <option value="miami-dade">Miami-Dade</option>
                    <option value="broward">Broward</option>
                    <option value="palm beach">Palm Beach</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Código Postal (Zip Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 33101"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Asignar Coordinador
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  >
                    <option value="">Sin Asignar (Pendiente)</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Dirección del Proyecto
                </label>
                <input
                  type="text"
                  placeholder="Calle, número, apto / suite..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
                >
                  Guardar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}