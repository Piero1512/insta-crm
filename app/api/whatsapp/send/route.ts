// app/api/whatsapp/send/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { leadId, phone, countryCode, messageText, coordinatorName } = await req.json();

    if (!phone || !messageText) {
      return NextResponse.json({ error: 'Teléfono y mensaje son obligatorios' }, { status: 400 });
    }

    // 1. Limpieza estricta de caracteres
    const rawDigits = phone.replace(/\D/g, '');
    const prefix = (countryCode || '57').replace(/\D/g, '');

    let cleanPhone = rawDigits;

    // Si el usuario no incluyó el código de país en el número, se lo anteponemos
    if (!rawDigits.startsWith(prefix)) {
      cleanPhone = `${prefix}${rawDigits}`;
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Credenciales de WhatsApp no configuradas en el servidor' },
        { status: 500 }
      );
    }

    // 2. Intentar envío de texto regular
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

    // 3. Fallback a plantilla oficial si la ventana de 24 horas está cerrada o requiere template
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
      console.error('Error Meta API detallado:', metaData);
      const detail = metaData.error?.message || 'Error al procesar con Meta';
      const code = metaData.error?.code ? `(#${metaData.error.code}) ` : '';
      return NextResponse.json(
        { error: `${code}${detail}. Verifica que el número +${cleanPhone} esté registrado en el panel de pruebas de Meta.` },
        { status: metaResponse.status }
      );
    }

    const messageId = metaData.messages?.[0]?.id || null;

    // 4. Registrar en base de datos
    if (leadId) {
      await supabase.from('lead_notes').insert([
        {
          lead_id: leadId,
          content: `[WhatsApp Oficial Enviado a +${cleanPhone}]: "${messageText}" (Enviado por: ${coordinatorName || 'Coordinador'}) [ID: ${messageId}]`,
        },
      ]);

      const { data: lead } = await supabase
        .from('leads')
        .select('whatsapp_count')
        .eq('id', leadId)
        .single();

      const currentCount = lead?.whatsapp_count ?? 0;
      const newCount = currentCount + 1;

      await supabase
        .from('leads')
        .update({
          whatsapp_count: newCount,
          last_contact: new Date().toISOString(),
        })
        .eq('id', leadId);
    }

    return NextResponse.json({ success: true, metaData, targetPhone: cleanPhone });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}