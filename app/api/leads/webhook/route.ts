// app/api/leads/webhook/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateScore } from '@/lib/scoring';
import { County, LeadSource } from '@/types/crm';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      client_name,
      phone,
      email,
      service_type = 'Remodelación General',
      location_county = 'miami-dade',
      zip_code = '',
      address = '',
      lead_source = 'meta_ads',
      budget_range = '5k-15k',
      utm_source,
      utm_campaign,
    } = body;

    // Validación básica
    if (!client_name || !phone) {
      return NextResponse.json(
        { error: 'client_name y phone son obligatorios' },
        { status: 400 }
      );
    }

    // Normalizar condado admitido
    let validCounty: County = 'miami-dade';
    const cLower = String(location_county).toLowerCase();
    if (cLower.includes('broward')) validCounty = 'broward';
    else if (cLower.includes('palm')) validCounty = 'palm beach';

    // 1. Calcular Lead Score y Temperatura de entrada
    const { score, temperature } = calculateScore({
      service_type,
      location_county: validCounty,
      budget_range,
      calls_count: 0,
      messages_count: 0,
    });

    // 2. Insertar Lead en Supabase
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([
        {
          client_name,
          phone,
          email: email || null,
          service_type,
          location_county: validCounty,
          zip_code,
          address,
          status: 'nuevo',
          calls_count: 0,
          messages_count: 0,
          lead_source: (lead_source as LeadSource) || 'meta_ads',
          budget_range,
          lead_score: score,
          temperature,
          utm_source: utm_source || null,
          utm_campaign: utm_campaign || null,
        },
      ])
      .select()
      .single();

    if (leadError) {
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    // 3. Registrar evento en Timeline de Marketing si la tabla existe
    await supabase.from('marketing_activities').insert([
      {
        lead_id: leadData.id,
        event_type: 'formulario_enviado',
        description: `Lead captado automáticamente vía ${lead_source}`,
        points_awarded: score,
        metadata: { utm_source, utm_campaign, budget_range },
      },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: 'Lead captado y calificado exitosamente',
        lead: leadData,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Payload JSON inválido o error de servidor', details: err.message },
      { status: 500 }
    );
  }
}