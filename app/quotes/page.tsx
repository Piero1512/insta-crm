// app/quotes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types/crm';
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Send, 
  X, 
  Calculator, 
  Printer, 
  FileText, 
  Edit2, 
  Trash2 
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
    phone: string;
    email: string;
    service_type: string;
    location_county: string;
    zip_code: string;
    address?: string;
  };
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuoteForPdf, setSelectedQuoteForPdf] = useState<QuoteRecord | null>(null);
  const [editingQuote, setEditingQuote] = useState<QuoteRecord | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Formulario Crear Presupuesto
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [costMaterials, setCostMaterials] = useState<number>(0);
  const [costLabor, setCostLabor] = useState<number>(0);
  const [costTransport, setCostTransport] = useState<number>(0);
  const [costOther, setCostOther] = useState<number>(0);
  const [status, setStatus] = useState<'draft' | 'sent' | 'accepted' | 'rejected'>('draft');

  // Formulario Editar Presupuesto
  const [editTotalAmount, setEditTotalAmount] = useState<number>(0);
  const [editCostMaterials, setEditCostMaterials] = useState<number>(0);
  const [editCostLabor, setEditCostLabor] = useState<number>(0);
  const [editCostTransport, setEditCostTransport] = useState<number>(0);
  const [editCostOther, setEditCostOther] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<'draft' | 'sent' | 'accepted' | 'rejected'>('draft');

  // Cálculos dinámicos (Crear)
  const totalCosts = (Number(costMaterials) || 0) + (Number(costLabor) || 0) + (Number(costTransport) || 0) + (Number(costOther) || 0);
  const netProfit = (Number(totalAmount) || 0) - totalCosts;
  const marginPercentage = Number(totalAmount) > 0 ? ((netProfit / Number(totalAmount)) * 100).toFixed(1) : '0';

  // Cálculos dinámicos (Editar)
  const editTotalCosts = (Number(editCostMaterials) || 0) + (Number(editCostLabor) || 0) + (Number(editCostTransport) || 0) + (Number(editCostOther) || 0);
  const editNetProfit = (Number(editTotalAmount) || 0) - editTotalCosts;
  const editMarginPercentage = Number(editTotalAmount) > 0 ? ((editNetProfit / Number(editTotalAmount)) * 100).toFixed(1) : '0';

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
          phone,
          email,
          service_type,
          location_county,
          zip_code,
          address
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

    await supabase.from('leads').update({ status: 'presupuestado' }).eq('id', selectedLeadId);

    setIsModalOpen(false);
    setTotalAmount(0);
    setCostMaterials(0);
    setCostLabor(0);
    setCostTransport(0);
    setCostOther(0);
    fetchData();
  };

  const handleOpenEdit = (quote: QuoteRecord) => {
    setEditingQuote(quote);
    setEditTotalAmount(Number(quote.total_amount) || 0);
    setEditCostMaterials(Number(quote.cost_materials) || 0);
    setEditCostLabor(Number(quote.cost_labor) || 0);
    setEditCostTransport(Number(quote.cost_transport) || 0);
    setEditCostOther(Number(quote.cost_other) || 0);
    setEditStatus(quote.status);
  };

  const handleUpdateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote) return;

    if (Number(editTotalAmount) <= 0) {
      alert('El monto cotizado debe ser mayor a 0.');
      return;
    }

    const { error } = await supabase
      .from('quotes')
      .update({
        total_amount: Number(editTotalAmount),
        cost_materials: Number(editCostMaterials) || 0,
        cost_labor: Number(editCostLabor) || 0,
        cost_transport: Number(editCostTransport) || 0,
        cost_other: Number(editCostOther) || 0,
        status: editStatus,
      })
      .eq('id', editingQuote.id);

    if (error) {
      alert('Error al actualizar el presupuesto: ' + error.message);
      return;
    }

    setEditingQuote(null);
    fetchData();
  };

  const handleConfirmDeleteQuote = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);

    const { error } = await supabase.from('quotes').delete().eq('id', quoteToDelete.id);

    setIsDeleting(false);

    if (error) {
      alert('Error al eliminar presupuesto: ' + error.message);
    } else {
      setQuotes((prev) => prev.filter((q) => q.id !== quoteToDelete.id));
      setQuoteToDelete(null);
    }
  };

  const handleUpdateStatus = async (quoteId: string, newStatus: 'draft' | 'sent' | 'accepted' | 'rejected') => {
    const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', quoteId);
    if (!error) fetchData();
  };

  const handlePrint = () => {
    window.print();
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
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Presupuestos & Finanzas</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Estructura de costos directos, márgenes y exportación formal en PDF
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Presupuesto
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">Historial de Cotizaciones</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {quotes.length} Registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente / Servicio</th>
                  <th className="py-3 px-4">Total Cotizado</th>
                  <th className="py-3 px-4">Costos Directos</th>
                  <th className="py-3 px-4">Utilidad Estimada</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
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
                      No hay presupuestos creados aún.
                    </td>
                  </tr>
                ) : (
                  quotes.map((quote) => {
                    const costs = (Number(quote.cost_materials) || 0) + (Number(quote.cost_labor) || 0) + (Number(quote.cost_transport) || 0) + (Number(quote.cost_other) || 0);
                    const profit = (Number(quote.total_amount) || 0) - costs;
                    const margin = Number(quote.total_amount) > 0 ? ((profit / Number(quote.total_amount)) * 100).toFixed(1) : '0';

                    return (
                      <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">
                            {quote.leads?.client_name || 'Lead General'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {quote.leads?.service_type} • {quote.leads?.location_county}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          ${Number(quote.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          <div>Total: <span className="font-semibold text-slate-800">${costs.toLocaleString('en-US')}</span></div>
                          <div className="text-[11px] text-slate-400">Mat: ${quote.cost_materials} | MO: ${quote.cost_labor}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className={`font-bold text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ${profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">Margen: {margin}%</span>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(quote.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedQuoteForPdf(quote)}
                              title="Exportar PDF"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" /> PDF
                            </button>

                            <select
                              value={quote.status}
                              onChange={(e) => handleUpdateStatus(quote.id, e.target.value as any)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none"
                            >
                              <option value="draft">Borrador</option>
                              <option value="sent">Enviado</option>
                              <option value="accepted">Aceptado</option>
                              <option value="rejected">No Aceptado</option>
                            </select>

                            <button
                              onClick={() => handleOpenEdit(quote)}
                              title="Editar cotización"
                              className="p-1 text-slate-500 hover:text-amber-600 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setQuoteToDelete(quote)}
                              title="Eliminar cotización"
                              className="p-1 text-slate-500 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nuevo Presupuesto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Crear Cotización
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Cliente / Lead *
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
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-800"
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
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-800"
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
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Otros ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costOther || ''}
                    onChange={(e) => setCostOther(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Precio Cotizado al Cliente ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={totalAmount || ''}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Ej. 12500"
                    className="w-full px-3 py-2 text-sm bg-white border border-blue-300 rounded-lg font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Estado Inicial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  >
                    <option value="draft">Borrador</option>
                    <option value="sent">Enviado al Cliente</option>
                    <option value="accepted">Aceptado</option>
                    <option value="rejected">No Aceptado</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase">Costos</p>
                  <p className="font-bold text-slate-200">${totalCosts.toLocaleString('en-US')}</p>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <p className="text-[11px] text-slate-400 uppercase">Utilidad</p>
                  <p className={`font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${netProfit.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <p className="text-[11px] text-slate-400 uppercase">Margen</p>
                  <p className="font-bold text-blue-400">{marginPercentage}%</p>
                </div>
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
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Guardar Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Presupuesto */}
      {editingQuote && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                Editar Cotización — {editingQuote.leads?.client_name}
              </h3>
              <button onClick={() => setEditingQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateQuote} className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Materiales ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editCostMaterials || ''}
                    onChange={(e) => setEditCostMaterials(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-800"
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
                    value={editCostLabor || ''}
                    onChange={(e) => setEditCostLabor(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-800"
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
                    value={editCostTransport || ''}
                    onChange={(e) => setEditCostTransport(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Otros ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editCostOther || ''}
                    onChange={(e) => setEditCostOther(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Total Cotizado ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={editTotalAmount || ''}
                    onChange={(e) => setEditTotalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Estado
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  >
                    <option value="draft">Borrador</option>
                    <option value="sent">Enviado al Cliente</option>
                    <option value="accepted">Aceptado</option>
                    <option value="rejected">No Aceptado</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase">Costos</p>
                  <p className="font-bold text-slate-200">${editTotalCosts.toLocaleString('en-US')}</p>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <p className="text-[11px] text-slate-400 uppercase">Utilidad</p>
                  <p className={`font-bold ${editNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${editNetProfit.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="border-l border-slate-700 pl-4">
                  <p className="text-[11px] text-slate-400 uppercase">Margen</p>
                  <p className="font-bold text-blue-400">{editMarginPercentage}%</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingQuote(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / PDF */}
      {selectedQuoteForPdf && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:static print:bg-white">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">Vista Previa de Cotización Formal</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / Descargar PDF
                </button>
                <button
                  onClick={() => setSelectedQuoteForPdf(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 sm:p-12 overflow-y-auto space-y-8 print:p-0 print:overflow-visible">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">INSTA CRM CONTRACTORS</h1>
                  <p className="text-xs text-slate-500 mt-1">Servicios de Construcción, Remodelación y Mantenimiento</p>
                  <p className="text-xs text-slate-400">Miami-Dade • Broward • Palm Beach</p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    Presupuesto #{selectedQuoteForPdf.id.slice(0, 8).toUpperCase()}
                  </span>
                  <p className="text-xs text-slate-400 mt-2">
                    Fecha: {new Date(selectedQuoteForPdf.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100 text-xs">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Preparado para:</p>
                  <p className="text-sm font-bold text-slate-800">{selectedQuoteForPdf.leads?.client_name}</p>
                  <p className="text-slate-600 mt-0.5">{selectedQuoteForPdf.leads?.phone}</p>
                  <p className="text-slate-600">{selectedQuoteForPdf.leads?.email || 'Correo no especificado'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Ubicación del Proyecto:</p>
                  <p className="font-semibold text-slate-800 capitalize">{selectedQuoteForPdf.leads?.location_county} (Zip: {selectedQuoteForPdf.leads?.zip_code})</p>
                  <p className="text-slate-600 mt-0.5">{selectedQuoteForPdf.leads?.address || 'Dirección registrada en inspección'}</p>
                  <p className="text-blue-600 font-medium mt-1">Servicio: {selectedQuoteForPdf.leads?.service_type}</p>
                </div>
              </div>

              <div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-xs font-bold text-slate-800 uppercase">
                      <th className="py-3">Descripción del Trabajo</th>
                      <th className="py-3 text-right">Monto Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-200">
                    <tr>
                      <td className="py-4 pr-4">
                        <div className="font-bold text-slate-800 text-sm">{selectedQuoteForPdf.leads?.service_type}</div>
                        <p className="text-slate-500 mt-1">
                          Suministro de materiales de alta calidad, mano de obra calificada, transporte y ejecución técnica según inspección en sitio.
                        </p>
                      </td>
                      <td className="py-4 text-right font-bold text-slate-800 text-sm align-top">
                        ${Number(selectedQuoteForPdf.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Total de la Propuesta</span>
                <span className="text-2xl font-black text-slate-900">
                  ${Number(selectedQuoteForPdf.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>

              <div className="pt-6 border-t border-slate-100 text-[11px] text-slate-400 space-y-2">
                <p><strong>Condiciones Comerciales:</strong> Presupuesto válido por 15 días calendario a partir de su emisión. Incluye garantía de mano de obra según estándares de contratación.</p>
              </div>

              <div className="grid grid-cols-2 gap-12 pt-8">
                <div className="border-t border-slate-300 pt-2 text-center text-xs text-slate-600">
                  <p className="font-semibold">Firma del Contratista / Asesor</p>
                </div>
                <div className="border-t border-slate-300 pt-2 text-center text-xs text-slate-600">
                  <p className="font-semibold">Firma de Aceptación del Cliente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar Borrado */}
      <ConfirmModal
        isOpen={Boolean(quoteToDelete)}
        title="¿Eliminar este presupuesto?"
        message={`Estás a punto de eliminar la cotización por $${Number(quoteToDelete?.total_amount || 0).toLocaleString('en-US')} de "${quoteToDelete?.leads?.client_name || 'el cliente'}". Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar cotización"
        cancelText="No, conservar"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteQuote}
        onCancel={() => setQuoteToDelete(null)}
      />
    </AppLayout>
  );
}