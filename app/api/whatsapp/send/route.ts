// app/api/whatsapp/send/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { leadId, phone, messageText, coordinatorId, coordinatorName } = await req.json();

    if (!phone || !messageText) {
      return NextResponse.json({ error: 'Teléfono y mensaje son obligatorios' }, { status: 400 });
    }

    // Limpiar formato del teléfono (solo dígitos)
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Si tiene 10 dígitos, asignar prefijo internacional correspondiente
    if (cleanPhone.length === 10) {
      cleanPhone = cleanPhone.startsWith('3') ? `57${cleanPhone}` : `1${cleanPhone}`;
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Credenciales de WhatsApp no configuradas en las variables de entorno' },
        { status: 500 }
      );
    }

    // Envío oficial a Meta Graph API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: messageText },
        }),
      }
    );

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error('Error de Meta API:', metaData);
      return NextResponse.json(
        { error: metaData.error?.message || 'Error al enviar mensaje por Meta API' },
        { status: metaResponse.status }
      );
    }

    const messageId = metaData.messages?.[0]?.id || null;

    // Si viene vinculado a un lead, registrar nota y sumar métricas en Supabase
    if (leadId) {
      await supabase.from('lead_notes').insert([
        {
          lead_id: leadId,
          content: `[WhatsApp Oficial Enviado]: "${messageText}" (Enviado por: ${coordinatorName || 'Coordinador'}) [ID: ${messageId}]`,
        },
      ]);

      const { data: lead } = await supabase
        .from('leads')
        .select('whatsapp_count')
        .eq('id', leadId)
        .single();

      const newCount = (lead?.whatsapp_count || 0) + 1;

      await supabase
        .from('leads')
        .update({
          whatsapp_count: newCount,
          last_contact: new Date().toISOString(),
        })
        .eq('id', leadId);
    }

    return NextResponse.json({ success: true, metaData });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}