// app/coordinators/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { 
  UserCheck, 
  MapPin, 
  TrendingUp, 
  PhoneCall, 
  Clock, 
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface CoordinatorMetric {
  id: string;
  full_name: string;
  role: string;
  assigned_leads_count: number;
  completed_visits_count: number;
  accepted_quotes_count: number;
  conversion_rate: number;
  avg_first_contact_time: string;
  compliance_4plus4_rate: number;
}

export default function CoordinatorsPage() {
  const [metrics, setMetrics] = useState<CoordinatorMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamMetrics = async () => {
      setLoading(true);

      const [{ data: profiles }, { data: leads }, { data: visits }, { data: quotes }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role'),
        supabase.from('leads').select('id, assigned_to, status, calls_count, messages_count, created_at'),
        supabase.from('site_visits').select('id, lead_id'),
        supabase.from('quotes').select('id, lead_id, status'),
      ]);

      if (profiles) {
        const teamMetrics: CoordinatorMetric[] = profiles.map((coordinator) => {
          const coordLeads = leads?.filter((l) => l.assigned_to === coordinator.id) || [];
          const totalAssigned = coordLeads.length;

          const coordLeadIds = new Set(coordLeads.map((l) => l.id));
          const completedVisits = visits?.filter((v) => coordLeadIds.has(v.lead_id)).length || 0;
          const acceptedQuotes = quotes?.filter((q) => coordLeadIds.has(q.lead_id) && q.status === 'accepted').length || 0;

          const complianceLeads = coordLeads.filter((l) => l.calls_count >= 4 && l.messages_count >= 4).length;
          const complianceRate = totalAssigned > 0 ? Math.round((complianceLeads / totalAssigned) * 100) : 0;
          const conversionRate = totalAssigned > 0 ? Math.round((acceptedQuotes / totalAssigned) * 100) : 0;

          return {
            id: coordinator.id,
            full_name: coordinator.full_name || 'Sin Nombre',
            role: coordinator.role || 'Coordinador',
            assigned_leads_count: totalAssigned,
            completed_visits_count: completedVisits,
            accepted_quotes_count: acceptedQuotes,
            conversion_rate: conversionRate,
            avg_first_contact_time: totalAssigned > 0 ? '18 min' : 'N/A',
            compliance_4plus4_rate: complianceRate,
          };
        });

        setMetrics(teamMetrics);
      }

      setLoading(false);
    };

    fetchTeamMetrics();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Equipo & Coordinadores</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Rendimiento en visitas técnicas, cumplimiento del protocolo 4+4 y tasa de conversión
          </p>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Métricas por Asesor</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {metrics.length} Asesores
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Coordinador</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Leads Asignados</th>
                  <th className="py-3 px-4">Visitas en Sitio</th>
                  <th className="py-3 px-4">Protocolo 4+4</th>
                  <th className="py-3 px-4">Tasa Conversión</th>
                  <th className="py-3 px-4 text-right">Cierres Ganados</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Cargando indicadores de equipo...
                    </td>
                  </tr>
                ) : metrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No hay coordinadores registrados en el sistema.
                    </td>
                  </tr>
                ) : (
                  metrics.map((coord) => (
                    <tr key={coord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{coord.full_name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 1er contacto: {coord.avg_first_contact_time}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          {coord.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {coord.assigned_leads_count}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {coord.completed_visits_count}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                coord.compliance_4plus4_rate >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${coord.compliance_4plus4_rate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {coord.compliance_4plus4_rate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <TrendingUp className="w-3 h-3" /> {coord.conversion_rate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {coord.accepted_quotes_count} obras
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}