// types/crm.ts
export type UserRole = 'admin' | 'coordinator' | 'supervisor' | 'billing';

export type LeadStatus = 'nuevo' | 'en_seguimiento' | 'visita_programada' | 'visita_realizada' | 'presupuestado' | 'cerrado_ganado' | 'cerrado_perdido';

export type InteractionType = 'call' | 'whatsapp' | 'sms';

export interface Lead {
  id: string;
  client_name: string;
  phone: string;
  email?: string;
  service_type: string;
  location_county: string;
  address?: string;
  zip_code?: string;
  assigned_to?: string;
  status: LeadStatus;
  calls_count: number;
  messages_count: number;
  created_at: string;
}