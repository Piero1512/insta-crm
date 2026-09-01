// app/visits/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types/crm';
import { 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Clock, 
  Plus, 
  X,
  AlertCircle
} from 'lucide-react';

interface VisitRecord {
  id: string;
  lead_id: string;
  latitude: number;
  longitude: number;
  evaluation_notes: string;
  visited_at: string;
  leads?: {
    client_name: string;
    service_type: string;
    location_county: string;
    address?: string;
  };
}

export default function VisitsPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados del Formulario
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Cargar visitas y leads desde Supabase
  const fetchData = async () => {
    setLoading(true);

    // Cargar historial de visitas con datos del lead asociado
    const { data: visitsData, error: visitsError } = await supabase
      .from('site_visits')
      .select(`
        id,
        lead_id,
        latitude,
        longitude,
        evaluation_notes,
        visited_at,
        leads (
          client_name,
          service_type,
          location_county,
          address
        )
      `)
      .order('visited_at', { ascending: false });

    // Cargar leads disponibles para registrar visita
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!visitsError && visitsData) {
      setVisits(visitsData as any);
    }
    if (leadsData) {
      setLeads(leadsData);
      if (leadsData.length > 0) setSelectedLeadId(leadsData[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Obtener geolocalización GPS real
  const handleGetLocation = () => {
    setGettingLocation(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('La geolocalización no es soportada por este navegador.');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGettingLocation(false);
      },
      (error) => {
        setGpsError('No se pudo obtener la ubicación: ' + error.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Guardar reporte de visita
  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!latitude || !longitude) {
      alert('Es obligatorio capturar la ubicación GPS para validar la presencia en sitio.');
      return;
    }

    // 1. Insertar el reporte de visita
    const { error: visitError } = await supabase.from('site_visits').insert([
      {
        lead_id: selectedLeadId,
        latitude,
        longitude,
        evaluation_notes: notes,
        visited_at: new Date().toISOString(),
      },
    ]);

    if (visitError) {
      alert('Error al registrar la visita: ' + visitError.message);
      return;
    }

    // 2. Actualizar estado del lead a 'visita_realizada'
    await supabase
      .from('leads')
      .update({ status: 'visita_realizada' })
      .eq('id', selectedLeadId);

    // Resetear formulario y recargar
    setIsModalOpen(false);
    setNotes('');
    setLatitude(null);
    setLongitude(null);
    fetchData();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Visitas a Terreno</h2>
              <p className="text-sm text-slate-500">
                Auditoría geolocalizada (GPS), validación en sitio y notas de inspección técnica
              </p>
            </div>
            <button
              onClick={() => {
                setIsModalOpen(true);
                handleGetLocation(); // Auto-capturar ubicación al abrir
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Reportar Visita
            </button>
          </div>

          {/* Historial de Visitas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Historial de Reportes en Sitio</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                {visits.length} Visitas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Cliente / Proyecto</th>
                    <th className="py-3.5 px-6">Fecha & Hora</th>
                    <th className="py-3.5 px-6">Geolocalización GPS</th>
                    <th className="py-3.5 px-6">Notas de Inspección</th>
                    <th className="py-3.5 px-6 text-right">Validación</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Cargando reportes de visita...
                      </td>
                    </tr>
                  ) : visits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No hay visitas reportadas aún. Presiona <strong>"Reportar Visita"</strong> para registrar la primera inspección técnica.
                      </td>
                    </tr>
                  ) : (
                    visits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-800">
                            {visit.leads?.client_name || 'Lead no especificado'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {visit.leads?.service_type} • {visit.leads?.location_county}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(visit.visited_at).toLocaleDateString()}
                          </div>
                          <div className="text-slate-400 mt-0.5">
                            {new Date(visit.visited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <a
                            href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            {Number(visit.latitude).toFixed(4)}, {Number(visit.longitude).toFixed(4)}
                          </a>
                        </td>
                        <td className="py-4 px-6 text-slate-700 text-xs max-w-xs">
                          <p className="line-clamp-2">{visit.evaluation_notes}</p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> En Sitio
                          </span>
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

      {/* Modal Reportar Visita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Reportar Visita Técnica</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Seleccionar Lead / Cliente *
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  required
                >
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.client_name} — {lead.service_type} ({lead.location_county})
                    </option>
                  ))}
                </select>
              </div>

              {/* Panel de Geolocalización GPS */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    Validación GPS
                  </span>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                    className="text-xs text-blue-600 hover:underline font-semibold disabled:text-slate-400"
                  >
                    {gettingLocation ? 'Obteniendo señal...' : 'Recalcular GPS'}
                  </button>
                </div>

                {latitude && longitude ? (
                  <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Ubicación verificada: <strong>{latitude.toFixed(6)}, {longitude.toFixed(6)}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{gpsError || 'Capturando coordenadas satelitales...'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notas de Inspección & Evaluación *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detalles técnicos de la inspección: medidas, estado del área, materiales requeridos..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                ></textarea>
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
                  disabled={!latitude || !longitude}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg shadow-sm transition-colors"
                >
                  Guardar y Validar Visita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}