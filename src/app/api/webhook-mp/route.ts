// src/app/api/webhook-mp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Webhook MP recibido:', JSON.stringify(body))

    // MP envía distintos tipos de notificaciones
    const { type, data } = body

    // Solo nos interesan los pagos
    if (type !== 'payment') {
      return NextResponse.json({ received: true })
    }

    const paymentId = data?.id
    if (!paymentId) {
      return NextResponse.json({ received: true })
    }

    // Consultar el pago a la API de MP para obtener el estado real
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    )

    if (!paymentResponse.ok) {
      console.error('Error al consultar pago MP:', paymentId)
      return NextResponse.json({ received: true })
    }

    const payment = await paymentResponse.json()
    console.log('Estado del pago:', payment.status, '| Orden:', payment.external_reference)

    const orderId = payment.external_reference

    if (!orderId) {
      console.error('No hay external_reference en el pago')
      return NextResponse.json({ received: true })
    }

    // Actualizar la orden según el estado del pago
    if (payment.status === 'approved') {
      await supabase
        .from('orders')
        .update({
          status: 'in_production',
          payment_id: String(paymentId),
          notes: `PAGO APROBADO - MP ID: ${paymentId} | ${new Date().toISOString()}`,
        })
        .eq('id', orderId)

      console.log(`✅ Orden ${orderId} marcada como in_production`)
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await supabase
        .from('orders')
        .update({
          status: 'quoted', // Vuelve a quoted para que el cliente pueda reintentar
          payment_id: String(paymentId),
        })
        .eq('id', orderId)

      console.log(`❌ Pago rechazado para orden ${orderId}`)
    } else if (payment.status === 'pending' || payment.status === 'in_process') {
      await supabase
        .from('orders')
        .update({
          payment_id: String(paymentId),
          notes: `Pago pendiente - MP ID: ${paymentId}`,
        })
        .eq('id', orderId)

      console.log(`⏳ Pago pendiente para orden ${orderId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error en webhook MP:', error)
    // Siempre devolver 200 a MP para que no reintente
    return NextResponse.json({ received: true })
  }
}

// MP también hace GET para verificar el endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}