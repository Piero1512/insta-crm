// app/visits/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types/crm';
import { 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Plus, 
  X,
  AlertCircle,
  Camera,
  Edit2,
  Trash2
} from 'lucide-react';

interface VisitRecord {
  id: string;
  lead_id: string;
  latitude: number;
  longitude: number;
  evaluation_notes: string;
  visited_at: string;
  photos?: string[];
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

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VisitRecord | null>(null);
  const [visitToDelete, setVisitToDelete] = useState<VisitRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Formulario creación
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Formulario edición
  const [editNotes, setEditNotes] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [newEditFiles, setNewEditFiles] = useState<File[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Visor de foto
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    const { data: visitsData, error: visitsError } = await supabase
      .from('site_visits')
      .select(`
        id,
        lead_id,
        latitude,
        longitude,
        evaluation_notes,
        visited_at,
        photos,
        leads (
          client_name,
          service_type,
          location_county,
          address
        )
      `)
      .order('visited_at', { ascending: false });

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

  const handleGetLocation = () => {
    setGettingLocation(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('La geolocalización no es soportada por este dispositivo.');
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

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `visits/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('visit-photos')
        .upload(filePath, file);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('visit-photos')
          .getPublicUrl(filePath);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!latitude || !longitude) {
      alert('Es obligatorio capturar la ubicación GPS para validar la presencia en sitio.');
      return;
    }

    setUploading(true);
    const uploadedUrls = await uploadImages(selectedFiles);

    const { error: visitError } = await supabase.from('site_visits').insert([
      {
        lead_id: selectedLeadId,
        latitude,
        longitude,
        evaluation_notes: notes,
        visited_at: new Date().toISOString(),
        photos: uploadedUrls,
      },
    ]);

    setUploading(false);

    if (visitError) {
      alert('Error al registrar la visita: ' + visitError.message);
      return;
    }

    await supabase
      .from('leads')
      .update({ status: 'visita_realizada' })
      .eq('id', selectedLeadId);

    setIsModalOpen(false);
    setNotes('');
    setLatitude(null);
    setLongitude(null);
    setSelectedFiles([]);
    fetchData();
  };

  const handleOpenEdit = (visit: VisitRecord) => {
    setEditingVisit(visit);
    setEditNotes(visit.evaluation_notes || '');
    setEditPhotos(visit.photos || []);
    setNewEditFiles([]);
  };

  const handleRemoveExistingPhoto = (indexToRemove: number) => {
    setEditPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisit) return;

    setSavingEdit(true);

    let finalPhotos = [...editPhotos];
    if (newEditFiles.length > 0) {
      const newlyUploaded = await uploadImages(newEditFiles);
      finalPhotos = [...finalPhotos, ...newlyUploaded];
    }

    const { error } = await supabase
      .from('site_visits')
      .update({
        evaluation_notes: editNotes,
        photos: finalPhotos,
      })
      .eq('id', editingVisit.id);

    setSavingEdit(false);

    if (error) {
      alert('Error al actualizar la visita: ' + error.message);
      return;
    }

    setEditingVisit(null);
    fetchData();
  };

  const handleConfirmDeleteVisit = async () => {
    if (!visitToDelete) return;
    setIsDeleting(true);

    const { error } = await supabase.from('site_visits').delete().eq('id', visitToDelete.id);

    setIsDeleting(false);

    if (error) {
      alert('Error al eliminar visita: ' + error.message);
    } else {
      setVisits((prev) => prev.filter((v) => v.id !== visitToDelete.id));
      setVisitToDelete(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Visitas a Terreno</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Auditoría geolocalizada (GPS), registro fotográfico y notas de inspección técnica
            </p>
          </div>
          <button
            onClick={() => {
              setIsModalOpen(true);
              handleGetLocation();
            }}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Reportar Visita
          </button>
        </div>

        {/* Historial de Visitas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Historial de Reportes en Sitio</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {visits.length} Visitas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente / Proyecto</th>
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Geolocalización GPS</th>
                  <th className="py-3 px-4">Fotos</th>
                  <th className="py-3 px-4">Notas de Inspección</th>
                  <th className="py-3 px-4">Validación</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Cargando reportes de visita...
                    </td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No hay visitas reportadas aún.
                    </td>
                  </tr>
                ) : (
                  visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {visit.leads?.client_name || 'Lead no especificado'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {visit.leads?.service_type} • {visit.leads?.location_county}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(visit.visited_at).toLocaleDateString()}
                        </div>
                        <div className="text-slate-400 mt-0.5">
                          {new Date(visit.visited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4">
                        {visit.photos && visit.photos.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {visit.photos.slice(0, 3).map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt="Evidencia"
                                onClick={() => setViewingPhoto(url)}
                                className="w-9 h-9 rounded-lg object-cover cursor-pointer border border-slate-200 hover:scale-110 transition-transform shadow-xs"
                              />
                            ))}
                            {visit.photos.length > 3 && (
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 rounded-lg px-2 py-1">
                                +{visit.photos.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin fotos</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs max-w-xs">
                        <p className="line-clamp-2">{visit.evaluation_notes}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> En Sitio
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(visit)}
                            title="Editar visita"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setVisitToDelete(visit)}
                            title="Eliminar visita"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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

      {/* Modal Reportar Visita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Reportar Visita Técnica</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
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
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  required
                >
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.client_name} — {lead.service_type} ({lead.location_county})
                    </option>
                  ))}
                </select>
              </div>

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
                  Fotos de Evidencia (Opcional)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && setSelectedFiles(Array.from(e.target.files))}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center gap-1">
                    <Camera className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-semibold text-blue-600 hover:underline">
                      Tomar o seleccionar fotos
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedFiles.length > 0 ? `${selectedFiles.length} foto(s) seleccionada(s)` : 'Desde cámara o galería'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notas de Inspección & Evaluación *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalles técnicos, medidas, daños observados..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!latitude || !longitude || uploading}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg"
                >
                  {uploading ? 'Subiendo fotos...' : 'Guardar y Validar Visita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Visita */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                Editar Visita — {editingVisit.leads?.client_name}
              </h3>
              <button onClick={() => setEditingVisit(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVisit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
                <span>
                  <strong>Auditoría GPS:</strong> {Number(editingVisit.latitude).toFixed(4)}, {Number(editingVisit.longitude).toFixed(4)}
                </span>
                <span className="text-slate-400">
                  {new Date(editingVisit.visited_at).toLocaleDateString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notas de Inspección Técnica *
                </label>
                <textarea
                  required
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                ></textarea>
              </div>

              {editPhotos.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                    Fotos Existentes ({editPhotos.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {editPhotos.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt="Evidencia"
                          className="w-16 h-16 rounded-lg object-cover border border-slate-200 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingPhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-sm hover:bg-rose-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Agregar Nuevas Fotos
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && setNewEditFiles(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingVisit(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                >
                  {savingEdit ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor de foto */}
      {viewingPhoto && (
        <div 
          onClick={() => setViewingPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <img src={viewingPhoto} alt="Evidencia en grande" className="w-full h-full object-contain" />
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmar Borrado */}
      <ConfirmModal
        isOpen={Boolean(visitToDelete)}
        title="¿Eliminar este reporte de visita?"
        message={`Estás a punto de eliminar el reporte de inspección de "${visitToDelete?.leads?.client_name || 'el cliente'}". Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar visita"
        cancelText="No, conservar"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteVisit}
        onCancel={() => setVisitToDelete(null)}
      />
    </AppLayout>
  );
}