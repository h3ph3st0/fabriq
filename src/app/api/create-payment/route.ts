// src/app/api/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { orderId, amount, description, email } = await req.json()

    if (!orderId || !amount || !description || !email) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fabriq-kappa.vercel.app'

    // Crear preferencia de pago en MercadoPago
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: orderId,
            title: description,
            quantity: 1,
            unit_price: Math.round(amount), // MP requiere entero en ARS
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: email,
        },
        back_urls: {
          success: `${baseUrl}/pago-exitoso?order=${orderId}`,
          failure: `${baseUrl}/pago-fallido?order=${orderId}`,
          pending: `${baseUrl}/pago-pendiente?order=${orderId}`,
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/webhook-mp`,
        external_reference: orderId, // Para identificar la orden en el webhook
        statement_descriptor: 'FABRIQ',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error MP:', error)
      return NextResponse.json(
        { error: 'Error al crear el pago en MercadoPago' },
        { status: 500 }
      )
    }

    const preference = await response.json()

    // Guardar el preference_id en la orden
    await supabase
      .from('orders')
      .update({ payment_id: preference.id })
      .eq('id', orderId)

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point, // URL de pago para redirigir al cliente
    })
  } catch (error) {
    console.error('Error en create-payment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}