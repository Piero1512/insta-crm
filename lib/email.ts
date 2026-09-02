// lib/email.ts
import { Resend } from 'resend';

// Si no tienes RESEND_API_KEY en variables de entorno, no rompe la app, solo omite el envío en consola
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface SendLeadNotificationParams {
  clientName: string;
  clientEmail?: string;
  phone: string;
  serviceType: string;
  locationCounty: string;
  budgetRange?: string;
}

export async function sendLeadConfirmationEmails(params: SendLeadNotificationParams) {
  if (!resend) {
    console.log('⚠️ RESEND_API_KEY no configurada. Simulación de correo exitosa para:', params.clientEmail || params.phone);
    return;
  }

  try {
    // 1. Email de Confirmación al Cliente (si dejó correo)
    if (params.clientEmail) {
      await resend.emails.send({
        from: 'Insta CRM <onboarding@resend.dev>',
        to: params.clientEmail,
        subject: `Recibimos tu solicitud para ${params.serviceType} - Insta CRM Contractors`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
            <h2 style="color: #1e3a8a;">¡Hola ${params.clientName}!</h2>
            <p>Hemos recibido correctamente tu solicitud para <strong>${params.serviceType}</strong> en el condado de <strong>${params.locationCounty}</strong>.</p>
            <p>Un coordinador técnico revisará los detalles de tu proyecto para contactarte a la brevedad y agendar la inspección técnica.</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Presupuesto estimado:</strong> ${params.budgetRange || 'A convenir'}</p>
              <p style="margin: 5px 0 0; font-size: 14px; color: #475569;"><strong>Teléfono de contacto registrado:</strong> ${params.phone}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Insta CRM Florida Contractors • Servicios Profesionales de Remodelación</p>
          </div>
        `,
      });
    }

    // 2. Notificación interna para el equipo/administrador
    const adminEmail = process.env.ADMIN_ALERT_EMAIL;
    if (adminEmail) {
      await resend.emails.send({
        from: 'Insta CRM Alerts <onboarding@resend.dev>',
        to: adminEmail,
        subject: `🚨 NUEVO LEAD: ${params.clientName} - ${params.serviceType}`,
        html: `
          <h3>Nuevo Lead Captado en Web</h3>
          <p><strong>Cliente:</strong> ${params.clientName}</p>
          <p><strong>Teléfono:</strong> ${params.phone}</p>
          <p><strong>Servicio:</strong> ${params.serviceType}</p>
          <p><strong>Condado:</strong> ${params.locationCounty}</p>
          <p><strong>Presupuesto:</strong> ${params.budgetRange}</p>
        `,
      });
    }
  } catch (error) {
    console.error('Error enviando emails automáticos:', error);
  }
}