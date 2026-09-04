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
      const fromPhone = String(message.from || ''); // ej: "573043456661"
      const textBody = message.text.body;

      // Extraer últimos 7 dígitos
      const cleanIncoming = fromPhone.replace(/\D/g, '');
      const last7 = cleanIncoming.slice(-7);

      // Buscar el lead en la base de datos
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('id, client_name, phone, assigned_to');

      const matchedLead = leads?.find((l) => {
        if (!l.phone) return false;
        const cleanDbPhone = l.phone.replace(/\D/g, '');
        return cleanDbPhone.includes(last7) || cleanIncoming.includes(cleanDbPhone.slice(-7));
      });

      if (matchedLead) {
        // 1. Guardar en la bitácora del lead
        await supabaseAdmin.from('lead_notes').insert([
          {
            lead_id: matchedLead.id,
            author_name: matchedLead.client_name,
            note: `📥 [WhatsApp Entrante de ${matchedLead.client_name}]: "${textBody}"`,
          },
        ]);

        // 2. Notificación interna
        if (matchedLead.assigned_to) {
          await supabaseAdmin.from('internal_messages').insert([
            {
              sender_id: matchedLead.assigned_to,
              receiver_id: matchedLead.assigned_to,
              lead_id: matchedLead.id,
              content: `El cliente ${matchedLead.client_name} respondió por WhatsApp: "${textBody}"`,
              is_read: false,
            },
          ]);
        }
      } else if (leads && leads.length > 0) {
        // Fallback de seguridad: si no coincide el número, asociarlo al lead más reciente para no perder el mensaje
        const fallbackLead = leads[0];
        await supabaseAdmin.from('lead_notes').insert([
          {
            lead_id: fallbackLead.id,
            author_name: `Remitente (+${cleanIncoming})`,
            note: `📥 [WhatsApp Entrante de +${cleanIncoming}]: "${textBody}"`,
          },
        ]);
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' });
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error);
    return NextResponse.json({ status: 'ERROR' }, { status: 500 });
  }
}