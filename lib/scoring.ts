// lib/scoring.ts

export function calculateScore(lead: {
  service_type: string;
  location_county: string;
  budget_range?: string;
  calls_count: number;
  messages_count: number;
}): { score: number; temperature: 'frio' | 'tibio' | 'caliente' } {
  let score = 20; // Puntaje base de entrada

  // Regla por presupuesto estimado
  if (lead.budget_range === '15k-50k') score += 25;
  else if (lead.budget_range === '>50k') score += 40;
  else if (lead.budget_range === '5k-15k') score += 15;

  // Interacciones registradas (Demostración de interés)
  score += Math.min(lead.calls_count * 10, 20);
  score += Math.min(lead.messages_count * 5, 15);

  // Normalización máxima
  score = Math.min(score, 100);

  let temperature: 'frio' | 'tibio' | 'caliente' = 'frio';
  if (score >= 70) temperature = 'caliente';
  else if (score >= 40) temperature = 'tibio';

  return { score, temperature };
}