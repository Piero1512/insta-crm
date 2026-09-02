// Dentro de components/Sidebar.tsx, añade Megaphone a los imports:
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  FileSpreadsheet, 
  UserCheck, 
  Settings,
  HardHat,
  Megaphone, // <- Importar
  X
} from 'lucide-react';

// Actualizar la lista menuItems:
const menuItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Marketing & Scoring', href: '/marketing', icon: Megaphone }, // <- Nueva opción
  { name: 'Leads & Prospectos', href: '/leads', icon: Users },
  { name: 'Visitas en Sitio', href: '/visits', icon: MapPin },
  { name: 'Presupuestos', href: '/quotes', icon: FileSpreadsheet },
  { name: 'Equipo & Coordinadores', href: '/coordinators', icon: UserCheck },
  { name: 'Configuración', href: '/settings', icon: Settings },
];