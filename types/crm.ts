// types/crm.ts

export type County = 'miami-dade' | 'broward' | 'palm beach';

export type LeadStatus = 
  | 'nuevo'
  | 'en_seguimiento'
  | 'visita_programada'
  | 'visita_realizada'
  | 'presupuestado'
  | 'cerrado_ganado'
  | 'cerrado_perdido';

export type LeadTemperature = 'frio' | 'tibio' | 'caliente';

export type LeadSource = 'google_ads' | 'meta_ads' | 'landing_page' | 'referido' | 'directo' | 'organico';

export interface MarketingActivity {
  id: string;
  lead_id: string;
  event_type: string;
  description: string;
  points_awarded: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Lead {
  id: string;
  client_name: string;
  phone: string;
  email?: string;
  service_type: string;
  location_county: County;
  zip_code?: string;
  address?: string;
  assigned_to?: string | null;
  status: LeadStatus;
  calls_count: number;
  messages_count: number;
  // Campos de Marketing Intelligence
  lead_source?: LeadSource;
  utm_source?: string;
  utm_campaign?: string;
  lead_score: number;
  temperature: LeadTemperature;
  budget_range?: string;
  created_at: string;
}

export interface SiteVisit {
  id: string;
  lead_id: string;
  coordinator_id?: string;
  latitude: number;
  longitude: number;
  evaluation_notes: string;
  photos?: string[];
  visited_at: string;
}

export interface Quote {
  id: string;
  lead_id: string;
  total_amount: number;
  cost_materials: number;
  cost_labor: number;
  cost_transport: number;
  cost_other: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
}