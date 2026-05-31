// src/app/api/generate-3d/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Replicate from 'replicate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, orderId } = await req.json()

    if (!imageUrl || !orderId) {
      return NextResponse.json(
        { error: 'Faltan datos: imageUrl y orderId son requeridos' },
        { status: 400 }
      )
    }

    // 1. Marcar orden como procesando
    await supabase
      .from('orders')
      .update({ status: 'processing_3d', status_3d: 'processing' })
      .eq('id', orderId)

    // 2. Ejecutar modelo TripoSR en Replicate (imagen → 3D)
    const output = await replicate.run(
      'stability-ai/triposr:884d4bb11f2dc48a16d98f7a6cf5e72e3ae1c6bbe1a99c5a1abf9ce4e9f6e0e5',
      {
        input: {
          image: imageUrl,
          do_remove_background: true,
          foreground_ratio: 0.85,
        }
      }
    ) as string[]

    if (!output || output.length === 0) {
      throw new Error('No se generó ningún modelo 3D')
    }

    const modelUrl = output[0]

    // 3. Guardar URL del modelo en la orden
    await supabase
      .from('orders')
      .update({
        stl_ia_url: modelUrl,
        stl_taller_url: modelUrl,
        status_3d: 'ready',
        status: 'quoted',
      })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      modelUrl,
      message: 'Modelo 3D generado correctamente'
    })

  } catch (error: unknown) {
    console.error('Error en generate-3d:', error)
    const err = error as { message?: string }

    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}