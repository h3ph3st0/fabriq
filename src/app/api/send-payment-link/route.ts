// src/app/api/send-payment-link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Falta el ID de la orden' }, { status: 400 })
    }

    // Obtener la orden
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fabriq.com.ar'

    // Crear preferencia de pago en MercadoPago
    const serviceLabels: Record<string, string> = {
      dtf: 'DTF — Remeras y telas',
      '3d': 'Impresión 3D',
      sublimacion: 'Sublimación',
    }

    const description = `FabriQ - ${serviceLabels[order.service_type] || order.service_type}`

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [{
          id: orderId,
          title: description,
          quantity: 1,
          unit_price: Math.round(order.price_ars),
          currency_id: 'ARS',
        }],
        payer: { email: order.customer_email },
        back_urls: {
          success: `${baseUrl}/pago-exitoso?order=${orderId}`,
          failure: `${baseUrl}/pago-fallido?order=${orderId}`,
          pending: `${baseUrl}/pago-pendiente?order=${orderId}`,
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/webhook-mp`,
        external_reference: orderId,
        statement_descriptor: 'FABRIQ',
      }),
    })

    if (!mpResponse.ok) {
      return NextResponse.json({ error: 'Error al crear el pago en MercadoPago' }, { status: 500 })
    }

    const preference = await mpResponse.json()
    const paymentLink = preference.init_point

    // Guardar el preference_id y cambiar estado a "payment_pending"
    await supabase
      .from('orders')
      .update({ payment_id: preference.id, status: 'payment_pending' })
      .eq('id', orderId)

    // Enviar email al cliente con Resend
    await resend.emails.send({
      from: 'FabriQ <notificaciones@calaveragaucha.com.ar>',
      to: order.customer_email,
      subject: '¡Tu pedido fue aprobado! Completá el pago para empezar',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
          <div style="max-width:560px;margin:40px auto;padding:0 24px;">
            
            <div style="text-align:center;margin-bottom:32px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#e85d04,#f48c06);border-radius:12px;padding:12px 20px;">
                <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">FabriQ</span>
              </div>
            </div>

            <div style="background:#111;border:1px solid #2a2a2a;border-radius:16px;padding:32px;">
              <h1 style="color:#f0ece3;font-size:22px;font-weight:500;margin:0 0 8px;">¡Tu pedido fue aprobado! 🎉</h1>
              <p style="color:#888;font-size:14px;margin:0 0 24px;line-height:1.6;">
                El taller revisó tu pedido y está listo para producirlo. Solo falta completar el pago para que empiecen.
              </p>

              <div style="background:#0a0a0a;border:1px solid #1e1e1e;border-radius:10px;padding:20px;margin-bottom:24px;">
                <p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Total a pagar</p>
                <p style="color:#e85d04;font-size:36px;font-weight:700;margin:0;font-family:'Courier New',monospace;">
                  $${Math.round(order.price_ars).toLocaleString('es-AR')} ARS
                </p>
                <p style="color:#555;font-size:12px;margin:4px 0 0;">${description}</p>
              </div>

              <a href="${paymentLink}" style="display:block;text-align:center;background:#e85d04;color:#fff;text-decoration:none;padding:16px 24px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:16px;">
                Completar pago →
              </a>

              <p style="color:#555;font-size:12px;text-align:center;margin:0;line-height:1.6;">
                El pago es procesado de forma segura por MercadoPago.<br/>
                Si tenés alguna duda respondé este email.
              </p>
            </div>

            <p style="color:#333;font-size:11px;text-align:center;margin-top:24px;">
              FabriQ · Plataforma de manufactura on-demand
            </p>
          </div>
        </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true, paymentLink })

  } catch (error) {
    console.error('Error en send-payment-link:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}