// app/marketing/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { 
  Megaphone, 
  Flame, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Share2, 
  Compass, 
  BarChart2, 
  Activity 
} from 'lucide-react';

interface ChannelMetrics {
  source: string;
  leadsCount: number;
  hotLeads: number;
  quotedAmount: number;
  wonAmount: number;
}

export default function MarketingPage() {
  const [channels, setChannels] = useState<ChannelMetrics[]>([]);
  const [totalMarketingLeads, setTotalMarketingLeads] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketingData = async () => {
      setLoading(true);

      const [{ data: leads }, { data: quotes }] = await Promise.all([
        supabase.from('leads').select('id, lead_source, lead_score, temperature, status'),
        supabase.from('quotes').select('lead_id, total_amount, status'),
      ]);

      const allLeads = leads || [];
      const allQuotes = quotes || [];

      // Mapear cotizaciones por lead
      const quotesByLead = new Map<string, { total: number; won: number }>();
      allQuotes.forEach((q) => {
        const current = quotesByLead.get(q.lead_id) || { total: 0, won: 0 };
        current.total += Number(q.total_amount) || 0;
        if (q.status === 'accepted') current.won += Number(q.total_amount) || 0;
        quotesByLead.set(q.lead_id, current);
      });

      // Agrupar por canal de adquisición
      const sources = ['google_ads', 'meta_ads', 'landing_page', 'referido', 'directo'];
      const metrics: ChannelMetrics[] = sources.map((sourceKey) => {
        const filtered = allLeads.filter((l) => (l.lead_source || 'directo') === sourceKey);
        const hotCount = filtered.filter((l) => l.temperature === 'caliente' || (l.lead_score || 0) >= 70).length;

        let quoted = 0;
        let won = 0;

        filtered.forEach((l) => {
          const q = quotesByLead.get(l.id);
          if (q) {
            quoted += q.total;
            won += q.won;
          }
        });

        return {
          source: sourceKey,
          leadsCount: filtered.length,
          hotLeads: hotCount,
          quotedAmount: quoted,
          wonAmount: won,
        };
      });

      const totalScore = allLeads.reduce((acc, l) => acc + (l.lead_score || 0), 0);
      setAvgScore(allLeads.length > 0 ? Math.round(totalScore / allLeads.length) : 0);
      setTotalMarketingLeads(allLeads.length);
      setChannels(metrics);
      setLoading(false);
    };

    fetchMarketingData();
  }, []);

  const getSourceLabel = (src: string) => {
    switch (src) {
      case 'google_ads': return 'Google Search Ads';
      case 'meta_ads': return 'Meta Ads (Facebook/IG)';
      case 'landing_page': return 'Web Orgánica / SEO';
      case 'referido': return 'Recomendaciones / Boca a Boca';
      default: return 'Tráfico Directo / WhatsApp';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-blue-600" />
              Marketing & Lead Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Atribución multicanal, calificación predictiva (Lead Scoring) y retorno comercial
            </p>
          </div>
        </div>

        {/* KPIs de Marketing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Leads Atribuidos</p>
              <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : totalMarketingLeads}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Lead Score Promedio</p>
              <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : `${avgScore} / 100`}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Ingresos Cerrados Atribuidos</p>
              <h3 className="text-2xl font-bold text-slate-800">
                ${channels.reduce((acc, c) => acc + c.wonAmount, 0).toLocaleString('en-US')}
              </h3>
            </div>
          </div>
        </div>

        {/* Tabla de Rendimiento por Canal (Atribución) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Rendimiento por Canal de Adquisición</h3>
              <p className="text-xs text-slate-400">Atribución de ingresos directos generados por cada fuente</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              Smarketing Engine
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Canal / Fuente</th>
                  <th className="py-3 px-4">Volumen Leads</th>
                  <th className="py-3 px-4">Leads Calientes (SQL)</th>
                  <th className="py-3 px-4">Pipeline Cotizado</th>
                  <th className="py-3 px-4 text-right">Venta Real Ganada</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {channels.map((chan) => (
                  <tr key={chan.source} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-blue-500" />
                      {getSourceLabel(chan.source)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {chan.leadsCount}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Flame className="w-3.5 h-3.5" />
                        {chan.hotLeads} listos para venta
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      ${chan.quotedAmount.toLocaleString('en-US')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      ${chan.wonAmount.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}