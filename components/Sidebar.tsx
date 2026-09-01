// components/Sidebar.tsx
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  MapPin, 
  FileSpreadsheet, 
  ClipboardList, 
  DollarSign, 
  Settings 
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads & Clientes', href: '/leads', icon: Users },
  { name: 'Seguimiento 4+4', href: '/tracking', icon: PhoneCall },
  { name: 'Visitas a Terreno', href: '/visits', icon: MapPin },
  { name: 'Presupuestos', href: '/quotes', icon: FileSpreadsheet },
  { name: 'Órdenes de Trabajo', href: '/orders', icon: ClipboardList },
  { name: 'Finanzas & Gastos', href: '/finance', icon: DollarSign },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col min-h-screen border-r border-slate-800 shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-wider text-blue-400">INSTA CRM</h1>
        <p className="text-xs text-slate-400 mt-1">Gestión & Operaciones 360°</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Icon className="w-5 h-5 text-slate-400" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        Rol actual: <span className="text-emerald-400 font-semibold">Admin</span>
      </div>
    </aside>
  );
}
