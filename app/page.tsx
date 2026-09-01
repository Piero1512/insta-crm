// app/page.tsx
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Users, PhoneForwarded, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Panel de Control General</h2>
            <p className="text-sm text-slate-500">Estado operativo y comercial en tiempo real</p>
          </div>

          {/* Tarjetas de Métricas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Leads Nuevos</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">128</p>
              <p className="text-xs text-emerald-600 mt-1 font-medium">+14% vs semana anterior</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Seguimientos Activos</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <PhoneForwarded className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">42</p>
              <p className="text-xs text-slate-500 mt-1">Regla 4+4 en proceso</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Órdenes Aceptadas</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">18</p>
              <p className="text-xs text-emerald-600 mt-1 font-medium">Tasa de cierre: 38%</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Utilidad Estimada</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">$74,250</p>
              <p className="text-xs text-emerald-600 mt-1 font-medium">Margen promedio: 31%</p>
            </div>
          </div>

          {/* Sección de Alertas Operativas y Leads Críticos */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Leads Pendientes de Contacto
              </h3>
              <span className="text-xs text-blue-600 font-medium hover:underline cursor-pointer">Ver todos</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3 px-4">Cliente / Servicio</th>
                    <th className="py-3 px-4">Coordinador</th>
                    <th className="py-3 px-4">Llamadas (4)</th>
                    <th className="py-3 px-4">Mensajes (4)</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  <tr>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      Remodelación Baño Principal
                      <div className="text-xs text-slate-400 font-normal">Carlos Mendoza • Miami-Dade</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">Andrés V.</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">2 / 4</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">1 / 4</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                        En Seguimiento
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      Reparación Eléctrica & Drywall
                      <div className="text-xs text-slate-400 font-normal">Elena Ramos • Broward</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">Mateo R.</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">4 / 4</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">4 / 4</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                        Listo para Visita
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
