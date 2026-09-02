// app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Building2, Save, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function SettingsPage() {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data } = await supabase.from('company_settings').select('*').limit(1).single();

      if (data) {
        setSettingsId(data.id);
        setCompanyName(data.company_name || '');
        setLicenseNumber(data.license_number || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setAddress(data.address || '');
        setTerms(data.terms_conditions || '');
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    const payload = {
      company_name: companyName,
      license_number: licenseNumber,
      phone,
      email,
      address,
      terms_conditions: terms,
      updated_at: new Date().toISOString(),
    };

    let error = null;

    if (settingsId) {
      const res = await supabase.from('company_settings').update(payload).eq('id', settingsId);
      error = res.error;
    } else {
      const res = await supabase.from('company_settings').insert([payload]);
      error = res.error;
    }

    setSaving(false);

    if (error) {
      alert('Error al guardar configuración: ' + error.message);
    } else {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl">
            {/* Cabecera */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Configuración Corporativa</h2>
              <p className="text-sm text-slate-500">
                Información comercial que aparecerá en membretes, contratos y presupuestos emitidos en PDF
              </p>
            </div>

            {loading ? (
              <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                Cargando datos corporativos...
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                {savedSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Datos actualizados correctamente. Se reflejarán en las cotizaciones.</span>
                  </div>
                )}

                {/* Bloque 1: Identidad Legal */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Identidad Comercial & Licencia
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Nombre de la Empresa / Marca *
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ej. InstaPro Contractors LLC"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Licencia de Contratista (Florida State / DBPR)
                      </label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="Ej. CGC-1520123 / Licencia General"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque 2: Contacto & Sede */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Canales de Contacto & Dirección</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Teléfono Oficial
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="305-000-0000"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Correo de Facturación / Ventas
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ventas@tuempresa.com"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Dirección Comercial Principal
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Miami-Dade County, FL"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>
                </div>

                {/* Bloque 3: Condiciones comerciales PDF */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Términos Legales & Garantías en Presupuesto</h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Cláusula estándar para PDF
                    </label>
                    <textarea
                      rows={3}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="Términos de validez, condiciones de pago, garantías..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}