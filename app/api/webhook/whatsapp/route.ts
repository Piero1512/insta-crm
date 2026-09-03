// app/api/webhook/whatsapp/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.type === 'text') {
      const fromPhone = message.from; // Número completo (ej: 573043456661)
      const textBody = message.text.body;

      // Buscar el lead por los últimos 8 dígitos
      const shortPhone = fromPhone.slice(-8);

      const { data: matchedLead } = await supabase
        .from('leads')
        .select('id, client_name, assigned_to')
        .ilike('phone', `%${shortPhone}%`)
        .maybeSingle();

      if (matchedLead) {
        // Insertar en lead_notes con columnas 'note' y 'author_name'
        await supabase.from('lead_notes').insert([
          {
            lead_id: matchedLead.id,
            author_name: matchedLead.client_name || 'Cliente WhatsApp',
            note: `📥 [WhatsApp Entrante de ${matchedLead.client_name}]: "${textBody}"`,
          },
        ]);

        // Si tiene coordinador asignado, notificar a internal_messages
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