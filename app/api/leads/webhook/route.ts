// app/api/leads/webhook/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateScore } from '@/lib/scoring';
import { sendLeadConfirmationEmails } from '@/lib/email';
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

    if (!client_name || !phone) {
      return NextResponse.json(
        { error: 'client_name y phone son obligatorios' },
        { status: 400 }
      );
    }

    let validCounty: County = 'miami-dade';
    const cLower = String(location_county).toLowerCase();
    if (cLower.includes('broward')) validCounty = 'broward';
    else if (cLower.includes('palm')) validCounty = 'palm beach';

    const { score, temperature } = calculateScore({
      service_type,
      location_county: validCounty,
      budget_range,
      calls_count: 0,
      messages_count: 0,
    });

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

    // Registrar actividad inicial
    await supabase.from('marketing_activities').insert([
      {
        lead_id: leadData.id,
        event_type: 'formulario_enviado',
        description: `Lead captado vía ${lead_source}`,
        points_awarded: score,
        metadata: { utm_source, utm_campaign, budget_range },
      },
    ]);

    // Disparar emails en segundo plano
    sendLeadConfirmationEmails({
      clientName: client_name,
      clientEmail: email,
      phone,
      serviceType: service_type,
      locationCounty: validCounty,
      budgetRange: budget_range,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Lead procesado correctamente',
        lead: leadData,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error procesando solicitud', details: err.message },
      { status: 500 }
    );
  }
}