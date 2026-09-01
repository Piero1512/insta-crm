// app/quotes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types/crm';
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Send, 
  X,
  Calculator
} from 'lucide-react';

interface QuoteRecord {
  id: string;
  lead_id: string;
  total_amount: number;
  cost_materials: number;
  cost_labor: number;
  cost_transport: number;
  cost_other: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  leads?: {
    client_name: string;
    service_type: string;
    location_county: string;
  };
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario Presupuesto
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [costMaterials, setCostMaterials] = useState<number>(0);
  const [costLabor, setCostLabor] = useState<number>(0);
  const [costTransport, setCostTransport] = useState<number>(0);
  const [costOther, setCostOther] = useState<number>(0);
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'rejected'>('draft');

  // Cálculos dinámicos
  const totalCosts = (Number(costMaterials) || 0) + (Number(costLabor) || 0) + (Number(costTransport) || 0) + (Number(costOther) || 0);
  const netProfit = (Number(totalAmount) || 0) - totalCosts;
  const marginPercentage = Number(totalAmount) > 0 ? ((netProfit / Number(totalAmount)) * 100).toFixed(1) : '0';

  // Cargar presupuestos y leads desde Supabase
  const fetchData = async () => {
    setLoading(true);

    const { data: quotesData } = await supabase
      .from('quotes')
      .select(`
        id,
        lead_id,
        total_amount,
        cost_materials,
        cost_labor,
        cost_transport,
        cost_other,
        status,
        created_at,
        leads (
          client_name,
          service_type,
          location_county
        )
      `)
      .order('created_at', { ascending: false });

    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (quotesData) setQuotes(quotesData as any);
    if (leadsData) {
      setLeads(leadsData);
      if (leadsData.length > 0) setSelectedLeadId(leadsData[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Crear Presupuesto
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Number(totalAmount) <= 0) {
      alert('El monto total del presupuesto debe ser mayor a 0.');
      return;
    }

    const { error } = await supabase.from('quotes').insert([
      {
        lead_id: selectedLeadId,
        total_amount: Number(totalAmount),
        cost_materials: Number(costMaterials) || 0,
        cost_labor: Number(costLabor) || 0,
        cost_transport: Number(costTransport) || 0,
        cost_other: Number(costOther) || 0,
        status: status,
      },
    ]);

    if (error) {
      alert('Error al guardar presupuesto: ' + error.message);
      return;
    }

    // Actualizar estado del lead a 'presupuestado'
    await supabase.from('leads').update({ status: 'presupuestado' }).eq('id', selectedLeadId);

    // Resetear formulario
    setIsModalOpen(false);
    setTotalAmount(0);
    setCostMaterials(0);
    setCostLabor(0);
    setCostTransport(0);
    setCostOther(0);
    fetchData();
  };

  // Actualizar estado de cotización directo en tabla
  const handleUpdateStatus = async (quoteId: string, newStatus: 'draft' | 'sent' | 'accepted' | 'rejected') => {
    const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', quoteId);
    if (!error) fetchData();
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'draft':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold"><Clock className="w-3.5 h-3.5" /> Borrador</span>;
      case 'sent':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold"><Send className="w-3.5 h-3.5" /> Enviado</span>;
      case 'accepted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Aceptado</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-semibold"><XCircle className="w-3.5 h-3.5" /> No Aceptado</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">{st}</span>;
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
              <h2 className="text-2xl font-bold text-slate-800">Presupuestos & Cotizaciones</h2>
              <p className="text-sm text-slate-500">
                Estructura de costos directos, márgenes y utilidad proyectada por servicio
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Presupuesto
            </button>
          </div>

          {/* Tabla de Presupuestos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Historial de Cotizaciones</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                {quotes.length} Registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Cliente / Servicio</th>
                    <th className="py-3.5 px-6">Total Cotizado</th>
                    <th className="py-3.5 px-6">Costos Directos</th>
                    <th className="py-3.5 px-6">Utilidad Estimada</th>
                    <th className="py-3.5 px-6">Estado</th>
                    <th className="py-3.5 px-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Cargando presupuestos...
                      </td>
                    </tr>
                  ) : quotes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No hay presupuestos creados aún. Haz clic en <strong>"Nuevo Presupuesto"</strong> para cotizar un proyecto.
                      </td>
                    </tr>
                  ) : (
                    quotes.map((quote) => {
                      const costs = (Number(quote.cost_materials) || 0) + (Number(quote.cost_labor) || 0) + (Number(quote.cost_transport) || 0) + (Number(quote.cost_other) || 0);
                      const profit = (Number(quote.total_amount) || 0) - costs;
                      const margin = Number(quote.total_amount) > 0 ? ((profit / Number(quote.total_amount)) * 100).toFixed(1) : '0';

                      return (
                        <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-semibold text-slate-800">
                              {quote.leads?.client_name || 'Lead General'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {quote.leads?.service_type} • {quote.leads?.location_county}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-800">
                            ${Number(quote.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-slate-600 text-xs">
                            <div>Total: <span className="font-semibold text-slate-800">${costs.toLocaleString('en-US')}</span></div>
                            <div className="text-[11px] text-slate-400">Mat: ${quote.cost_materials} | MO: ${quote.cost_labor}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className={`font-bold text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              ${profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">Margen: {margin}%</span>
                          </td>
                          <td className="py-4 px-6">
                            {getStatusBadge(quote.status)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <select
                              value={quote.status}
                              onChange={(e) => handleUpdateStatus(quote.id, e.target.value as any)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                            >
                              <option value="draft">Borrador</option>
                              <option value="sent">Enviado</option>
                              <option value="accepted">Aceptado</option>
                              <option value="rejected">No Aceptado</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Nuevo Presupuesto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Crear Cotización & Estructura de Costos
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Cliente / Lead Asociado *
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

              {/* Grid de Costos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Materiales ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costMaterials || ''}
                    onChange={(e) => setCostMaterials(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Mano de Obra ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costLabor || ''}
                    onChange={(e) => setCostLabor(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Transporte ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costTransport || ''}
                    onChange={(e) => setCostTransport(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Otros / Varios ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costOther || ''}
                    onChange={(e) => setCostOther(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Precio de Venta y Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Precio Total Cotizado al Cliente ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={totalAmount || ''}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Ej. 12500"
                    className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Estado Inicial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  >
                    <option value="draft">Borrador</option>
                    <option value="sent">Enviado al Cliente</option>
                    <option value="accepted">Aceptado</option>
                    <option value="rejected">No Aceptado</option>
                  </select>
                </div>
              </div>

              {/* Resumen Financiero en Tiempo Real */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase">Costos Directos</p>
                  <p className="text-base font-bold text-slate-200">${totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <p className="text-[11px] text-slate-400 uppercase">Utilidad Proyectada</p>
                  <p className={`text-base font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <p className="text-[11px] text-slate-400 uppercase">Margen</p>
                  <p className="text-base font-bold text-blue-400">{marginPercentage}%</p>
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
                  Guardar Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}