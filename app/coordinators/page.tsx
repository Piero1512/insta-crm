// app/coordinators/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/crm';
import { 
  UserCheck, 
  Plus, 
  MapPin, 
  Mail, 
  ShieldCheck, 
  X,
  Award
} from 'lucide-react';

interface CoordinatorProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
  assignedLeadsCount?: number;
  completedVisitsCount?: number;
  totalQuotedAmount?: number;
  wonQuotesAmount?: number;
  conversionRate?: number;
}

export default function CoordinatorsPage() {
  const [coordinators, setCoordinators] = useState<CoordinatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario nuevo coordinador
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('coordinator');

  const fetchCoordinators = async () => {
    setLoading(true);

    // 1. Obtener perfiles
    const { data: profilesData, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Obtener leads, visitas y cotizaciones para correlacionar métricas
    const { data: leadsData } = await supabase.from('leads').select('*');
    const { data: visitsData } = await supabase.from('site_visits').select('*');
    const { data: quotesData } = await supabase.from('quotes').select('*');

    const leads = leadsData || [];
    const visits = visitsData || [];
    const quotes = quotesData || [];

    if (!error && profilesData) {
      const enriched = profilesData.map((coord) => {
        const myLeads = leads.filter((l) => l.assigned_to === coord.id);
        const myVisits = visits.filter((v) => v.coordinator_id === coord.id);
        const myLeadIds = new Set(myLeads.map((l) => l.id));
        const myQuotes = quotes.filter((q) => myLeadIds.has(q.lead_id));
        
        const totalQuoted = myQuotes.reduce((acc, q) => acc + (Number(q.total_amount) || 0), 0);
        const wonQuotes = myQuotes
          .filter((q) => q.status === 'accepted')
          .reduce((acc, q) => acc + (Number(q.total_amount) || 0), 0);

        const convRate = myLeads.length > 0 
          ? ((myQuotes.filter(q => q.status === 'accepted').length / myLeads.length) * 100).toFixed(1) 
          : '0';

        return {
          ...coord,
          assignedLeadsCount: myLeads.length,
          completedVisitsCount: myVisits.length,
          totalQuotedAmount: totalQuoted,
          wonQuotesAmount: wonQuotes,
          conversionRate: Number(convRate),
        };
      });

      setCoordinators(enriched);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCoordinators();
  }, []);

  const handleCreateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('profiles').insert([
      {
        full_name: fullName,
        email,
        role,
      },
    ]);

    if (error) {
      alert('Error al registrar coordinador: ' + error.message);
    } else {
      setIsModalOpen(false);
      setFullName('');
      setEmail('');
      setRole('coordinator');
      fetchCoordinators();
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-semibold">Administrador</span>;
      case 'supervisor':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">Supervisor</span>;
      case 'billing':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">Facturación</span>;
      default:
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">Coordinador de Terreno</span>;
    }
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
              <h2 className="text-2xl font-bold text-slate-800">Equipo & Coordinadores</h2>
              <p className="text-sm text-slate-500">
                Monitoreo de desempeño comercial, cumplimiento de visitas GPS y efectividad de cierre
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Miembro
            </button>
          </div>

          {/* Tarjetas de Resumen General */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Personal Activo</p>
                <h3 className="text-2xl font-bold text-slate-800">{coordinators.length}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Inspecciones Totales</p>
                <h3 className="text-2xl font-bold text-slate-800">
                  {coordinators.reduce((acc, c) => acc + (c.completedVisitsCount || 0), 0)}
                </h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Cierres Facturados</p>
                <h3 className="text-2xl font-bold text-slate-800">
                  ${coordinators.reduce((acc, c) => acc + (c.wonQuotesAmount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </div>

          {/* Tabla de Rendimiento por Asesor */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Tabla de Rendimiento Individual</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                {coordinators.length} Asesores
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Coordinador</th>
                    <th className="py-3.5 px-6">Rol</th>
                    <th className="py-3.5 px-6">Leads Asignados</th>
                    <th className="py-3.5 px-6">Visitas GPS</th>
                    <th className="py-3.5 px-6">Cierre Ganado ($)</th>
                    <th className="py-3.5 px-6 text-right">Efectividad</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Cargando equipo...
                      </td>
                    </tr>
                  ) : coordinators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No hay miembros registrados. Haz clic en <strong>"Nuevo Miembro"</strong> para agregar tu primer coordinador o supervisor.
                      </td>
                    </tr>
                  ) : (
                    coordinators.map((coord) => (
                      <tr key={coord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-800">{coord.full_name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {coord.email}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {getRoleBadge(coord.role)}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700">
                          {coord.assignedLeadsCount} Leads
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <MapPin className="w-3.5 h-3.5" />
                            {coord.completedVisitsCount} en Sitio
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800">
                          ${(coord.wonQuotesAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-bold text-blue-600">
                            {coord.conversionRate}%
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

      {/* Modal Nuevo Miembro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Registrar Nuevo Miembro
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoordinator} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Mendoza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="carlos@tuempresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Rol en el Sistema *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                >
                  <option value="coordinator">Coordinador de Terreno</option>
                  <option value="supervisor">Supervisor de Ventas</option>
                  <option value="billing">Facturación / Cobranzas</option>
                  <option value="admin">Administrador General</option>
                </select>
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
                  Guardar Miembro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}