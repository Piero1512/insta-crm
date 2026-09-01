# CRM 360° - Guía de Arquitectura y Reglas del Proyecto

## 1. Visión General
Sistema CRM y ERP operativo para empresas de remodelaciones, reparaciones y servicios de contratistas. Controla el ciclo completo: Adquisición de Leads -> Asignación a Coordinador -> Seguimiento Estricto -> Visita Geolocalizada -> Cotización -> Orden de Trabajo -> Finanzas (Gastos y Utilidad) -> Dashboards y Métricas.

## 2. Stack Tecnológico
- **Frontend & Backend API:** Next.js 16+ (App Router), TypeScript, Tailwind CSS.
- **Base de Datos & Auth:** Supabase (PostgreSQL), Row Level Security (RLS).
- **Control de Versiones & CLI:** Git, GitHub, Claude Code CLI.

## 3. Reglas de Negocio Clave

### A. Gestión de Leads y Asignación
- Solo un `admin` o supervisor puede asignar leads a un `coordinator`.
- **Protocolo de Contacto Estricto:** Para cerrar o cambiar el estado de un lead sin contacto efectivo, el sistema exige un mínimo de **4 llamadas registradas + 4 mensajes (WhatsApp/SMS)**.

### B. Visitas a Terreno (Site Visits)
- Registro de visita obligatorio con geolocalización (GPS), marcas de tiempo (timestamp), reporte de evidencias fotográficas y notas de estado.

### C. Presupuestos y Órdenes
- Flujo de presupuesto: `Borrador -> Enviado -> Aceptado / No Aceptado -> Nueva Oferta`.
- Al ser aceptado, se genera automáticamente una **Orden de Trabajo**.

### D. Finanzas y Rentabilidad
- Cada orden desglosa costos directos: Materiales, Mano de Obra, Transporte, Otros.
- Cálculo automático en tiempo real: `Utilidad = Total Facturado/Pagado - Total Gastos`.

### E. Roles del Sistema
- `admin`: Control total, asignación, finanzas globales, dashboards.
- `coordinator`: Gestión de sus leads asignados, registro de llamadas/mensajes, visitas y presupuestos.
- `supervisor`: Control de ejecución y revisión de cotizaciones/órdenes.
- `billing`: Facturación y conciliación de pagos.

## 4. Convenciones de Desarrollo
- Rutas del proyecto bajo el estándar de Next.js App Router (`/app`).
- Componentes modulares y reutilizables en `/components`.
- Lógica de negocio y queries centralizadas en `/lib` o `/services`.
- Tipos de TypeScript explícitos en `/types`.@AGENTS.md
