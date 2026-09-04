// app/api/whatsapp/send/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { leadId, phone, countryCode, messageText, coordinatorName } = await req.json();

    if (!phone || !messageText) {
      return NextResponse.json({ error: 'Teléfono y mensaje son obligatorios' }, { status: 400 });
    }

    const rawDigits = phone.replace(/\D/g, '');
    const prefix = (countryCode || '57').replace(/\D/g, '');

    let cleanPhone = rawDigits;
    if (!rawDigits.startsWith(prefix)) {
      cleanPhone = `${prefix}${rawDigits}`;
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Credenciales de Meta no configuradas en el servidor' },
        { status: 500 }
      );
    }

    // 1. Envío a Meta API
    let payloadBody: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'text',
      text: { body: messageText },
    };

    let metaResponse = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadBody),
      }
    );

    let metaData = await metaResponse.json();

    // Fallback a plantilla si se requiere
    if (!metaResponse.ok && (metaData.error?.code === 131047 || metaData.error?.code === 131005)) {
      payloadBody = {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: 'hello_world',
          language: { code: 'en_US' },
        },
      };

      metaResponse = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payloadBody),
        }
      );

      metaData = await metaResponse.json();
    }

    if (!metaResponse.ok) {
      const detail = metaData.error?.message || 'Error al procesar con Meta';
      return NextResponse.json({ error: detail }, { status: metaResponse.status });
    }

    // 2. Persistencia infalible en Supabase
    if (leadId) {
      // Registrar la nota en la bitácora
      await supabaseAdmin.from('lead_notes').insert([
        {
          lead_id: leadId,
          author_name: coordinatorName || 'Jean Epalza',
          note: `💬 [WhatsApp Oficial Enviado a +${cleanPhone}]: "${messageText}"`,
        },
      ]);

      // Incrementar el contador directamente en la base de datos
      await supabaseAdmin.rpc('increment_whatsapp_count', { target_lead_id: leadId });
    }

    return NextResponse.json({ success: true, metaData, targetPhone: cleanPhone });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}