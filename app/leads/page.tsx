// app/leads/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Lead, LeadStatus } from '@/types/crm';
import { 
  Plus, 
  Phone, 
  MessageSquare, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X 
} from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario nuevo lead
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState('Remodelación de Baño');
  const [locationCounty, setLocationCounty] = useState('Miami-Dade');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Cargar leads desde Supabase
  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener leads:', error.message);
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Crear nuevo lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('leads').insert([
      {
        client_name: clientName,
        phone,
        email: email || null,
        service_type: serviceType,
        location_county: locationCounty,
        address: address || null,
        zip_code: zipCode || null,
        status: 'nuevo',
      },
    ]);

    if (error) {
      alert('Error al crear lead: ' + error.message);
    } else {
      setIsModalOpen(false);
      setClientName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setZipCode('');
      fetchLeads();
    }
  };

  // Registrar interacción rápida (Llamada / WhatsApp)
  const handleQuickInteraction = async (leadId: string, type: 'call' | 'whatsapp') => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const updates = type === 'call' 
      ? { calls_count: lead.calls_count + 1, status: 'en_seguimiento' } 
      : { messages_count: lead.messages_count + 1, status: 'en_seguimiento' };

    const { error } = await supabase.from('leads').update(updates).eq('id', leadId);
    if (error) {
      alert('Error actualizando contador: ' + error.message);
    } else {
      fetchLeads();
    }
  };

  const getStatusBadge = (status: LeadStatus, calls: number, msgs: number) => {
    if (calls >= 4 && msgs >= 4 && status === 'en_seguimiento') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> 4+4 Completado
        </span>
      );
    }

    switch (status) {
      case 'nuevo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" /> Nuevo
          </span>
        );
      case 'en_seguimiento':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" /> En Seguimiento
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Leads & Contactos</h2>
              <p className="text-sm text-slate-500">
                Control de prospección y protocolo estricto 4 llamadas + 4 mensajes
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

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Cliente / Servicio</th>
                    <th className="py-3.5 px-6">Ubicación & Zip</th>
                    <th className="py-3.5 px-6">Llamadas (Meta: 4)</th>
                    <th className="py-3.5 px-6">Mensajes (Meta: 4)</th>
                    <th className="py-3.5 px-6">Estado</th>
                    <th className="py-3.5 px-6 text-right">Acción Rápida</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Cargando leads desde Supabase...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No hay leads registrados aún. Haz clic en <strong>"Nuevo Lead"</strong> para agregar el primero.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-800">{lead.client_name}</div>
                          <div className="text-xs text-slate-500">{lead.service_type} • {lead.phone}</div>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {lead.location_county} {lead.zip_code && `(${lead.zip_code})`}
                          </div>
                          {lead.address && (
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                              {lead.address}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            lead.calls_count >= 4 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {lead.calls_count} / 4
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            lead.messages_count >= 4 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {lead.messages_count} / 4
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(lead.status, lead.calls_count, lead.messages_count)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              title="Registrar Llamada"
                              onClick={() => handleQuickInteraction(lead.id, 'call')}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button
                              title="Registrar Mensaje WhatsApp"
                              onClick={() => handleQuickInteraction(lead.id, 'whatsapp')}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-600 transition-colors"
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

      {/* Modal de Nuevo Lead con Zip Code */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Registrar Nuevo Lead</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
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
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(305) 000-0000"
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
                    <option value="Plomería">Plomería</option>
                    <option value="Electricidad">Electricidad</option>
                    <option value="Drywall & Pintura">Drywall & Pintura</option>
                    <option value="Instalación de Pisos">Instalación de Pisos</option>
                    <option value="Remodelación Completa">Remodelación Completa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Condado *
                  </label>
                  <select
                    value={locationCounty}
                    onChange={(e) => setLocationCounty(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  >
                    <option value="Miami-Dade">Miami-Dade</option>
                    <option value="Broward">Broward</option>
                    <option value="Palm Beach">Palm Beach</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Dirección del Proyecto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 123 NW 36th St"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    placeholder="33101"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
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