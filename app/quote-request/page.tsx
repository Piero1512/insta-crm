// app/quote-request/page.tsx
'use client';

import { useState } from 'react';
import { HardHat, CheckCircle2, Send, ShieldCheck, Clock } from 'lucide-react';

export default function PublicQuoteRequest() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('Remodelación de Baño');
  const [county, setCounty] = useState('miami-dade');
  const [zip, setZip] = useState('');
  const [budget, setBudget] = useState('5k-15k');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/leads/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: name,
          phone,
          email,
          service_type: service,
          location_county: county,
          zip_code: zip,
          address,
          budget_range: budget,
          lead_source: 'landing_page',
          utm_source: 'web_form',
          utm_campaign: 'solicitud_presupuesto',
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('Ocurrió un inconveniente al enviar tu solicitud. Intenta nuevamente.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 bg-blue-600 rounded-2xl text-white mb-3 shadow-lg shadow-blue-500/30">
          <HardHat className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Solicita tu Presupuesto
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Atención especializada en Miami-Dade, Broward y Palm Beach
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">¡Solicitud Recibida!</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                Un coordinador técnico se comunicará contigo en breve para confirmar los detalles de tu proyecto y coordinar la visita de inspección.
              </p>
              <div className="pt-4 flex justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-600" /> Respuesta rápida</span>
                <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Licencia & Seguro</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre y apellido"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Teléfono Celular *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="305-000-0000"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Servicio Requerido *
                  </label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                  >
                    <option value="Remodelación de Baño">Remodelación de Baño</option>
                    <option value="Remodelación de Cocina">Remodelación de Cocina</option>
                    <option value="Instalación de Pisos">Instalación de Pisos</option>
                    <option value="Drywall & Pintura">Drywall & Pintura</option>
                    <option value="Plomería / Electricidad">Plomería / Electricidad</option>
                    <option value="Handyman General">Handyman General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Condado *
                  </label>
                  <select
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                  >
                    <option value="miami-dade">Miami-Dade</option>
                    <option value="broward">Broward</option>
                    <option value="palm beach">Palm Beach</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Código Postal (Zip Code)
                  </label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="33101"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Presupuesto Estimado
                  </label>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none"
                  >
                    <option value="<5k">Menor a $5,000</option>
                    <option value="5k-15k">$5,000 a $15,000</option>
                    <option value="15k-50k">$15,000 a $50,000</option>
                    <option value=">50k">Mayor a $50,000</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Dirección o Barrio
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej. Brickell, Coral Gables, Hollywood..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Enviando solicitud...' : 'Solicitar Presupuesto Gratis'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}