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

    // 2. Ejecutar modelo firtoz/trellis en Replicate
    const output = await replicate.run(
      'firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c',
      {
        input: {
          images: [imageUrl],
          texture_size: 1024,
          mesh_simplify: 0.95,
          generate_model: true,
          save_gaussian: false,
          save_video: false,
        }
      }
    ) as Record<string, unknown>

   // Extraer URL del modelo GLB del output
const outputObj = output as { model_file?: string }
const modelUrl = outputObj?.model_file || null

if (!modelUrl) {
  console.error('Output de Replicate:', JSON.stringify(output))
  throw new Error('No se pudo obtener la URL del modelo 3D del output')
}

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