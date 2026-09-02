// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  FileText,
  BarChart3,
  PieChart
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalVisits: 0,
    totalQuoted: 0,
    avgMargin: 0,
    wonQuotes: 0,
    sentQuotes: 0,
    draftQuotes: 0,
    rejectedQuotes: 0,
    miamiLeads: 0,
    browardLeads: 0,
    palmBeachLeads: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      setLoading(true);

      const [{ data: leads }, { data: visits }, { data: quotes }] = await Promise.all([
        supabase.from('leads').select('id, location_county, status'),
        supabase.from('site_visits').select('id'),
        supabase.from('quotes').select('total_amount, cost_materials, cost_labor, cost_transport, cost_other, status'),
      ]);

      const allLeads = leads || [];
      const allVisits = visits || [];
      const allQuotes = quotes || [];

      const miami = allLeads.filter((l) => l.location_county === 'miami-dade').length;
      const broward = allLeads.filter((l) => l.location_county === 'broward').length;
      const palmBeach = allLeads.filter((l) => l.location_county === 'palm beach').length;

      const won = allQuotes.filter((q) => q.status === 'accepted');
      const sent = allQuotes.filter((q) => q.status === 'sent').length;
      const draft = allQuotes.filter((q) => q.status === 'draft').length;
      const rejected = allQuotes.filter((q) => q.status === 'rejected').length;

      const totalQuoted = allQuotes.reduce((acc, q) => acc + (Number(q.total_amount) || 0), 0);
      const totalCosts = allQuotes.reduce((acc, q) => {
        return (
          acc +
          (Number(q.cost_materials) || 0) +
          (Number(q.cost_labor) || 0) +
          (Number(q.cost_transport) || 0) +
          (Number(q.cost_other) || 0)
        );
      }, 0);

      const totalProfit = totalQuoted - totalCosts;
      const avgMargin = totalQuoted > 0 ? (totalProfit / totalQuoted) * 100 : 0;

      setStats({
        totalLeads: allLeads.length,
        totalVisits: allVisits.length,
        totalQuoted,
        avgMargin,
        wonQuotes: won.length,
        sentQuotes: sent,
        draftQuotes: draft,
        rejectedQuotes: rejected,
        miamiLeads: miami,
        browardLeads: broward,
        palmBeachLeads: palmBeach,
      });

      setLoading(false);
    };

    fetchDashboardMetrics();
  }, []);

  const totalLeadsCount = stats.totalLeads || 1;
  const pctMiami = Math.round((stats.miamiLeads / totalLeadsCount) * 100);
  const pctBroward = Math.round((stats.browardLeads / totalLeadsCount) * 100);
  const pctPalmBeach = Math.round((stats.palmBeachLeads / totalLeadsCount) * 100);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Panel de Control Ejecutivo</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Resumen operativo y comercial de obras en Miami-Dade, Broward y Palm Beach
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Prospectos</p>
              <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalLeads}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Inspecciones GPS</p>
              <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalVisits}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Cotizado</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loading ? '...' : `$${stats.totalQuoted.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Margen Proyectado</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loading ? '...' : `${stats.avgMargin.toFixed(1)}%`}
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Distribución por Condado
              </h3>
              <span className="text-[11px] text-slate-400">Sur de la Florida</span>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Miami-Dade</span>
                  <span>{stats.miamiLeads} ({pctMiami}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${pctMiami}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Broward</span>
                  <span>{stats.browardLeads} ({pctBroward}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${pctBroward}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Palm Beach</span>
                  <span>{stats.palmBeachLeads} ({pctPalmBeach}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${pctPalmBeach}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                Embudo Comercial
              </h3>
              <span className="text-[11px] text-slate-400">Conversión</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>Prospectos</span>
                </div>
                <p className="text-lg font-bold text-slate-800">{stats.totalLeads}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Visitas GPS</span>
                </div>
                <p className="text-lg font-bold text-slate-800">{stats.totalVisits}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cotizaciones</span>
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {stats.draftQuotes + stats.sentQuotes + stats.wonQuotes + stats.rejectedQuotes}
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs mb-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ganados</span>
                </div>
                <p className="text-lg font-bold text-emerald-700">{stats.wonQuotes}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}