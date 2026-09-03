// app/api/whatsapp/send/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { leadId, phone, messageText, coordinatorName } = await req.json();

    if (!phone || !messageText) {
      return NextResponse.json({ error: 'Teléfono y mensaje son obligatorios' }, { status: 400 });
    }

    // 1. Limpieza y estandarización de formato telefónico E.164
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Si tiene 10 dígitos:
    // Si empieza por 3 (móvil colombiano), anteponer 57
    // De lo contrario (ej. códigos de área de Florida 305, 786, 954, 561), anteponer 1
    if (cleanPhone.length === 10) {
      cleanPhone = cleanPhone.startsWith('3') ? `57${cleanPhone}` : `1${cleanPhone}`;
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Credenciales de WhatsApp no configuradas en el servidor' },
        { status: 500 }
      );
    }

    // 2. Intentar primer envío como texto directo
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

    // 3. Si Meta rechaza por ventana de 24 horas o primer contacto, fallback a plantilla hello_world
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
        { error: `${code}${detail}. Recuerda verificar el número de destino en el panel de desarrolladores de Meta si estás usando el número de prueba.` },
        { status: metaResponse.status }
      );
    }

    const messageId = metaData.messages?.[0]?.id || null;

    // 4. Registrar en base de datos
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

    return NextResponse.json({ success: true, metaData });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}