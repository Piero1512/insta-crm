// app/coordinators/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Lead, SiteVisit } from '@/types/crm';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Briefcase, 
  TrendingUp, 
  CheckCheck, 
  Edit2, 
  Trash2, 
  Award, 
  BarChart3,
  X
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  phone?: string;
  created_at: string;
}

export default function CoordinatorsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Formulario Crear / Editar
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Coordinador Técnico');
  const [phone, setPhone] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: pData }, { data: lData }, { data: vData }] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      supabase.from('leads').select('*'),
      supabase.from('site_visits').select('*'),
    ]);

    if (pData) setProfiles(pData);
    if (lData) setLeads(lData);
    if (vData) setVisits(vData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cálculos de rendimiento por cada miembro del equipo
  const teamMetrics = useMemo(() => {
    return profiles.map((member) => {
      const assignedLeads = leads.filter((l) => l.assigned_to === member.id);
      const wonLeads = assignedLeads.filter((l) => l.status === 'cerrado_ganado');
      const protocolFull = assignedLeads.filter((l) => l.calls_count >= 4 && l.messages_count >= 4);
      
      const conversionRate = assignedLeads.length > 0 
        ? Math.round((wonLeads.length / assignedLeads.length) * 100) 
        : 0;

      // Evaluar nivel de carga de trabajo
      let workloadStatus: { label: string; color: string } = { label: 'Disponible', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      if (assignedLeads.length > 10) {
        workloadStatus = { label: 'Sobrecargado', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      } else if (assignedLeads.length >= 5) {
        workloadStatus = { label: 'Óptimo', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      }

      return {
        ...member,
        assignedCount: assignedLeads.length,
        wonCount: wonLeads.length,
        protocolCount: protocolFull.length,
        conversionRate,
        workloadStatus,
      };
    });
  }, [profiles, leads]);

  // KPIs Generales del Hub
  const hubKpis = useMemo(() => {
    const totalMembers = profiles.length;
    const totalAssigned = leads.filter((l) => Boolean(l.assigned_to)).length;
    const unassignedCount = leads.filter((l) => !l.assigned_to).length;
    const totalWon = leads.filter((l) => l.status === 'cerrado_ganado').length;
    return { totalMembers, totalAssigned, unassignedCount, totalWon };
  }, [profiles, leads]);

  // Crear miembro
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').insert([
      {
        full_name: fullName,
        role,
        phone: phone || null,
      }
    ]);

    if (error) {
      alert('Error al registrar miembro: ' + error.message);
      return;
    }

    setIsCreateModalOpen(false);
    setFullName('');
    setPhone('');
    fetchData();
  };

  // Editar miembro
  const handleOpenEdit = (member: Profile) => {
    setEditingProfile(member);
    setFullName(member.full_name);
    setRole(member.role || 'Coordinador Técnico');
    setPhone(member.phone || '');
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        role,
        phone: phone || null,
      })
      .eq('id', editingProfile.id);

    if (error) {
      alert('Error al actualizar miembro: ' + error.message);
      return;
    }

    setEditingProfile(null);
    fetchData();
  };

  // Eliminar miembro
  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;
    setIsDeleting(true);

    const { error } = await supabase.from('profiles').delete().eq('id', profileToDelete.id);
    setIsDeleting(false);

    if (error) {
      alert('Error al eliminar miembro: ' + error.message);
    } else {
      setProfiles((prev) => prev.filter((p) => p.id !== profileToDelete.id));
      setProfileToDelete(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabecera Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Equipo & Coordinadores</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Auditoría de rendimiento comercial, control de carga y cumplimiento del protocolo 4+4
            </p>
          </div>

          <button
            onClick={() => {
              setFullName('');
              setPhone('');
              setRole('Coordinador Técnico');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Agregar Miembro
          </button>
        </div>

        {/* 4 KPIs Generales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Fuerza Activa</p>
              <h4 className="text-xl sm:text-2xl font-bold text-slate-800">{hubKpis.totalMembers}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Leads Asignados</p>
              <h4 className="text-xl sm:text-2xl font-bold text-slate-800">{hubKpis.totalAssigned}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Por Distribuir</p>
              <h4 className="text-xl sm:text-2xl font-bold text-amber-600">{hubKpis.unassignedCount}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Cierres Totales</p>
              <h4 className="text-xl sm:text-2xl font-bold text-emerald-600">{hubKpis.totalWon}</h4>
            </div>
          </div>
        </div>

        {/* Tabla de Rendimiento por Coordinador */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Métricas Individuales de Desempeño</h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {teamMetrics.length} Integrantes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Coordinador / Cargo</th>
                  <th className="py-3 px-4 text-center">Carga Actual</th>
                  <th className="py-3 px-4 text-center">Cartera Leads</th>
                  <th className="py-3 px-4 text-center">4+4 Cumplidos</th>
                  <th className="py-3 px-4 text-center">Obras Ganadas</th>
                  <th className="py-3 px-4 text-center">Conversión (%)</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Calculando métricas del equipo...
                    </td>
                  </tr>
                ) : teamMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No hay miembros registrados aún. Haz clic en "Agregar Miembro".
                    </td>
                  </tr>
                ) : (
                  teamMetrics.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{member.full_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{member.role || 'Coordinador'}</span>
                          {member.phone && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-slate-700">{member.phone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${member.workloadStatus.color}`}>
                          {member.workloadStatus.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {member.assignedCount}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-xs">
                          {member.protocolCount}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-xs">
                          {member.wonCount}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
                          <TrendingUp className={`w-3.5 h-3.5 ${member.conversionRate > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                          <span className={member.conversionRate > 0 ? 'text-slate-800' : 'text-slate-400'}>
                            {member.conversionRate}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(member)}
                            title="Editar miembro"
                            className="p-1.5 text-slate-500 hover:text-amber-600 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setProfileToDelete(member)}
                            title="Eliminar miembro"
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded transition-colors"
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

      {/* MODAL CREAR MIEMBRO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                Registrar Nuevo Miembro
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Díaz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cargo / Rol *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800 font-medium"
                >
                  <option value="Coordinador Técnico">Coordinador Técnico</option>
                  <option value="Asesor Comercial">Asesor Comercial</option>
                  <option value="Supervisor de Obra">Supervisor de Obra</option>
                  <option value="Gerente Operativo">Gerente Operativo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Teléfono Directo</label>
                <input
                  type="tel"
                  placeholder="305-000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-semibold"
                >
                  Guardar Miembro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR MIEMBRO */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                Editar Miembro
              </h3>
              <button onClick={() => setEditingProfile(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cargo / Rol *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800 font-medium"
                >
                  <option value="Coordinador Técnico">Coordinador Técnico</option>
                  <option value="Asesor Comercial">Asesor Comercial</option>
                  <option value="Supervisor de Obra">Supervisor de Obra</option>
                  <option value="Gerente Operativo">Gerente Operativo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Teléfono Directo</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm font-semibold"
                >
                  Actualizar Miembro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      <ConfirmModal
        isOpen={Boolean(profileToDelete)}
        title="¿Eliminar miembro del equipo?"
        message={`Estás a punto de remover a "${profileToDelete?.full_name}". Los leads que tenía asignados pasarán a estar disponibles para reasignación.`}
        confirmText="Sí, remover"
        cancelText="No, conservar"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProfileToDelete(null)}
      />
    </AppLayout>
  );
}