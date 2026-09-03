// app/api/webhook/whatsapp/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 1. Verificación inicial requerida por Meta (Handshake GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === expectedToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Token de verificación inválido', { status: 403 });
}

// 2. Recepción automática de mensajes entrantes de clientes (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.type === 'text') {
      const fromPhone = message.from; // Número remitente del cliente
      const textBody = message.text.body;

      // Buscar si el cliente existe en el CRM por coincidencia de los últimos 8 dígitos
      const shortPhone = fromPhone.slice(-8);

      const { data: matchedLead } = await supabase
        .from('leads')
        .select('id, client_name, assigned_to')
        .ilike('phone', `%${shortPhone}%`)
        .maybeSingle();

      if (matchedLead) {
        // Registrar respuesta en la bitácora del lead
        await supabase.from('lead_notes').insert([
          {
            lead_id: matchedLead.id,
            content: `[WhatsApp Entrante de ${matchedLead.client_name}]: "${textBody}"`,
          },
        ]);

        // Notificar al coordinador asignado mediante mensaje interno
        if (matchedLead.assigned_to) {
          await supabase.from('internal_messages').insert([
            {
              sender_id: matchedLead.assigned_to,
              receiver_id: matchedLead.assigned_to,
              lead_id: matchedLead.id,
              content: `El cliente ${matchedLead.client_name} acaba de responder por WhatsApp: "${textBody}"`,
              is_read: false,
            },
          ]);
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' });
  } catch (error) {
    console.error('Error en webhook de WhatsApp:', error);
    return NextResponse.json({ status: 'ERROR' }, { status: 500 });
  }
}