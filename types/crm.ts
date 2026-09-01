// types/crm.ts
export type UserRole = 'admin' | 'coordinator' | 'supervisor' | 'billing';

export type LeadStatus = 'nuevo' | 'en_seguimiento' | 'visita_programada' | 'visita_realizada' | 'presupuestado' | 'cerrado_ganado' | 'cerrado_perdido';

export type InteractionType = 'call' | 'whatsapp' | 'sms';

export interface Lead {
  id: string;
  client_name: string;
  phone: string;
  email?: string;
  service_type: string; // ej. "Remodelación Baño", "Plomería"
  location_county: string; // ej. "Miami-Dade", "Broward", "Palm Beach"
  address?: string;
  assigned_to?: string; // ID del coordinador
  status: LeadStatus;
  calls_count: number;
  messages_count: number;
  created_at: string;
}

export interface Interaction {
  id: string;
  lead_id: string;
  coordinator_id: string;
  interaction_type: InteractionType;
  notes?: string;
  created_at: string;
}

export interface SiteVisit {
  id: string;
  lead_id: string;
  coordinator_id: string;
  latitude: number;
  longitude: number;
  evidence_photos?: string[];
  evaluation_notes: string;
  visited_at: string;
}

export interface Quote {
  id: string;
  lead_id: string;
  total_amount: number;
  estimated_cost_materials: number;
  estimated_cost_labor: number;
  estimated_cost_transport: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
}