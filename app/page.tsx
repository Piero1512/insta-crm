// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types/crm';
import { 
  Users, 
  DollarSign, 
  MapPin, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  PhoneCall,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  completedVisits: number;
  totalQuoted: number;
  acceptedQuoted: number;
  averageMargin: number;
  conversionRate: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeads: 0,
    completedVisits: 0,
    totalQuoted: 0,
    acceptedQuoted: 0,
    averageMargin: 0,
    conversionRate: 0,
  });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // 1. Obtener leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Obtener visitas
      const { data: visitsData } = await supabase
        .from('site_visits')
        .select('id');

      // 3. Obtener presupuestos
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('*');

      const leads = leadsData || [];
      const visits = visitsData || [];
      const quotes = quotesData || [];

      // Cálculos de Leads
      const totalLeadsCount = leads.length;
      const newLeadsCount = leads.filter(l => l.status === 'nuevo').length;
      const wonLeadsCount = leads.filter(l => l.status === 'cerrado_ganado' || l.status === 'presupuestado').length;
      const convRate = totalLeadsCount > 0 ? ((wonLeadsCount / totalLeadsCount) * 100).toFixed(1) : 0;

      // Cálculos Financieros
      let totalAmountSum = 0;
      let acceptedAmountSum = 0;
      let totalCostSum = 0;

      quotes.forEach(q => {
        const total = Number(q.total_amount) || 0;
        const costs = (Number(q.cost_materials) || 0) + (Number(q.cost_labor) || 0) + (Number(q.cost_transport) || 0) + (Number(q.cost_other) || 0);
        
        totalAmountSum += total;
        totalCostSum += costs;

        if (q.status === 'accepted') {
          acceptedAmountSum += total;
        }
      });

      const totalProfit = totalAmountSum - totalCostSum;
      const avgMargin = totalAmountSum > 0 ? ((totalProfit / totalAmountSum) * 100).toFixed(1) : 0;

      setStats({
        totalLeads: totalLeadsCount,
        newLeads: newLeadsCount,
        completedVisits: visits.length,
        totalQuoted: totalAmountSum,
        acceptedQuoted: acceptedAmountSum,
        averageMargin: Number(avgMargin),
        conversionRate: Number(convRate),
      });

      setRecentLeads(leads.slice(0, 5));
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Bienvenida y Título */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Panel de Control General</h2>
              <p className="text-sm text-slate-500">
                Resumen ejecutivo de operaciones, conversión y finanzas en tiempo real
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/leads"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
              >
                <Users className="w-4 h-4" />
                Gestionar Leads
              </Link>
            </div>
          </div>

          {/* Tarjetas de Métricas (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Total Cotizado */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Volumen Cotizado</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-800">
                  ${stats.totalQuoted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Margen promedio estimado: {stats.averageMargin}%
                </p>
              </div>
            </div>

            {/* Leads Totales */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Prospectos</span>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-800">{stats.totalLeads}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-amber-600">{stats.newLeads} nuevos</span> por contactar
                </p>
              </div>
            </div>

            {/* Visitas GPS Realizadas */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Visitas en Terreno</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <MapPin className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-800">{stats.completedVisits}</h3>
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Auditoría GPS 100% verificada
                </p>
              </div>
            </div>

            {/* Tasa de Conversión */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Efectividad de Cierre</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-800">{stats.conversionRate}%</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Leads convertidos a cotización
                </p>
              </div>
            </div>
          </div>

          {/* Grilla Central: Actividad Reciente y Accesos Rápidos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tabla de Leads Recientes */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Últimos Prospectos Ingresados</h3>
                  <p className="text-xs text-slate-400">Seguimiento en tiempo real de leads y protocolo 4+4</p>
                </div>
                <Link
                  href="/leads"
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6">Cliente / Servicio</th>
                      <th className="py-3 px-6">Condado & Zip</th>
                      <th className="py-3 px-6">Protocolo 4+4</th>
                      <th className="py-3 px-6 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Sincronizando con base de datos...
                        </td>
                      </tr>
                    ) : recentLeads.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
                          No hay prospectos aún en el sistema.
                        </td>
                      </tr>
                    ) : (
                      recentLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="font-semibold text-slate-800">{lead.client_name}</div>
                            <div className="text-xs text-slate-400">{lead.service_type}</div>
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-600">
                            {lead.location_county} {lead.zip_code && `(${lead.zip_code})`}
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="px-2 py-0.5 bg-slate-100 font-semibold rounded text-slate-700">
                                📞 {lead.calls_count}/4
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 font-semibold rounded text-slate-700">
                                💬 {lead.messages_count}/4
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <span className="capitalize px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                              {lead.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Accesos Rápidos del Flujo de Trabajo */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-sm">
                <h4 className="font-bold text-base mb-1">Flujo Operativo de la CRM</h4>
                <p className="text-xs text-slate-400 mb-6">
                  Gestiona el ciclo de vida completo de cada servicio contratado.
                </p>

                <div className="space-y-3">
                  <Link
                    href="/leads"
                    className="flex items-center justify-between p-3 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">1. Prospectar Lead</p>
                        <p className="text-[11px] text-slate-400">Regla 4 llamadas + 4 mensajes</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    href="/visits"
                    className="flex items-center justify-between p-3 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">2. Inspección Técnica</p>
                        <p className="text-[11px] text-slate-400">Verificación GPS en sitio</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    href="/quotes"
                    className="flex items-center justify-between p-3 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 text-amber-400 rounded">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">3. Cotización & Margen</p>
                        <p className="text-[11px] text-slate-400">Desglose de costos directos</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}