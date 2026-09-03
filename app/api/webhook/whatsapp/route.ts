// app/api/webhook/whatsapp/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === expectedToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Token inválido', { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.type === 'text') {
      const fromPhone = message.from; // Ej: 573043456661
      const textBody = message.text.body;

      // Extraer los últimos 10 y 7 dígitos para máxima coincidencia
      const last10Digits = fromPhone.slice(-10);
      const last7Digits = fromPhone.slice(-7);

      // Traer todos los leads para hacer matching limpio contra dígitos puros
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('id, client_name, phone, assigned_to');

      const matchedLead = leads?.find((l) => {
        if (!l.phone) return false;
        const cleanLeadPhone = l.phone.replace(/\D/g, '');
        return (
          cleanLeadPhone.endsWith(last10Digits) ||
          cleanLeadPhone.endsWith(last7Digits) ||
          fromPhone.includes(cleanLeadPhone)
        );
      });

      if (matchedLead) {
        // 1. Guardar la respuesta del cliente en la bitácora
        await supabaseAdmin.from('lead_notes').insert([
          {
            lead_id: matchedLead.id,
            author_name: matchedLead.client_name,
            note: `📥 [WhatsApp Entrante de ${matchedLead.client_name}]: "${textBody}"`,
          },
        ]);

        // 2. Notificación interna para el coordinador
        if (matchedLead.assigned_to) {
          await supabaseAdmin.from('internal_messages').insert([
            {
              sender_id: matchedLead.assigned_to,
              receiver_id: matchedLead.assigned_to,
              lead_id: matchedLead.id,
              content: `El cliente ${matchedLead.client_name} respondió a tu WhatsApp: "${textBody}"`,
              is_read: false,
            },
          ]);
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' });
  } catch (error) {
    console.error('Error procesando webhook de WhatsApp:', error);
    return NextResponse.json({ status: 'ERROR' }, { status: 500 });
  }
}