// src/app/api/webhook-mp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Validar firma de MercadoPago ──────────────────────────────────────────────
function validarFirmaMP(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    // Si no hay secret configurado, dejamos pasar pero logueamos warning
    console.warn('⚠️ MP_WEBHOOK_SECRET no configurado — validación de firma desactivada')
    return true
  }

  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')

  if (!xSignature || !xRequestId) {
    console.error('❌ Webhook sin firma o request ID')
    return false
  }

  // Extraer ts y v1 del header x-signature
  const parts = xSignature.split(',')
  let ts = ''
  let v1 = ''
  for (const part of parts) {
    const [key, value] = part.trim().split('=')
    if (key === 'ts') ts = value
    if (key === 'v1') v1 = value
  }

  if (!ts || !v1) {
    console.error('❌ Formato de firma inválido')
    return false
  }

  // Construir el string a firmar según la doc de MP
  const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${ts};`
  const hmac = createHmac('sha256', secret)
  hmac.update(manifest)
  const expectedSignature = hmac.digest('hex')

  if (expectedSignature !== v1) {
    console.error('❌ Firma inválida en webhook MP')
    return false
  }

  return true
}
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // ── Validar firma ──
    if (!validarFirmaMP(req, rawBody)) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    console.log('Webhook MP recibido:', JSON.stringify(body))

    const { type, data } = body

    if (type !== 'payment') {
      return NextResponse.json({ received: true })
    }

    const paymentId = data?.id
    if (!paymentId) {
      return NextResponse.json({ received: true })
    }

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
        .update({ status: 'quoted', payment_id: String(paymentId) })
        .eq('id', orderId)
      console.log(`❌ Pago rechazado para orden ${orderId}`)
    } else if (payment.status === 'pending' || payment.status === 'in_process') {
      await supabase
        .from('orders')
        .update({ payment_id: String(paymentId), notes: `Pago pendiente - MP ID: ${paymentId}` })
        .eq('id', orderId)
      console.log(`⏳ Pago pendiente para orden ${orderId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error en webhook MP:', error)
    return NextResponse.json({ received: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}