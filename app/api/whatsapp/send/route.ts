// app/api/whatsapp/send/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { leadId, phone, countryCode, messageText, coordinatorName } = await req.json();

    if (!phone || !messageText) {
      return NextResponse.json({ error: 'Teléfono y mensaje requeridos' }, { status: 400 });
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
        { error: 'Credenciales de Meta no configuradas' },
        { status: 500 }
      );
    }

    // 1. Envío a Meta Cloud API
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

    // Fallback template si la ventana está cerrada
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

    // 2. Persistencia en Supabase usando messages_count
    if (leadId) {
      await supabaseAdmin.from('lead_notes').insert([
        {
          lead_id: leadId,
          author_name: coordinatorName || 'Jean Epalza',
          note: `💬 [WhatsApp Oficial Enviado a +${cleanPhone}]: "${messageText}"`,
        },
      ]);

      // Consultar el valor actual de messages_count
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('messages_count')
        .eq('id', leadId)
        .single();

      const currentCount = Number(lead?.messages_count) || 0;

      // Actualizar messages_count en Supabase
      await supabaseAdmin
        .from('leads')
        .update({
          messages_count: currentCount + 1,
        })
        .eq('id', leadId);
    }

    return NextResponse.json({ success: true, metaData, targetPhone: cleanPhone });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}