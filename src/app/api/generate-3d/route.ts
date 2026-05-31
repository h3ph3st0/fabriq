// src/app/api/generate-3d/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MESHY_API_KEY = process.env.MESHY_API_KEY!

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function pollTaskStatus(taskId: string, maxAttempts = 20): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000) // esperar 5 segundos entre cada consulta

    const response = await fetch(`https://api.meshy.ai/v1/image-to-3d/${taskId}`, {
      headers: { 'Authorization': `Bearer ${MESHY_API_KEY}` }
    })

    const data = await response.json()
    console.log(`Polling intento ${i + 1}: status = ${data.status}`)

    if (data.status === 'SUCCEEDED') {
      // Meshy devuelve model_urls con obj, glb, fbx, usdz
      return data.model_urls?.glb || data.model_urls?.obj || null
    }

    if (data.status === 'FAILED') {
      throw new Error(`Tarea de IA fallida: ${data.task_error?.message || 'Error desconocido'}`)
    }
    // Si está en PENDING o IN_PROGRESS seguimos esperando
  }
  throw new Error('Timeout: la IA tardó demasiado en responder')
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, orderId } = await req.json()

    if (!imageUrl || !orderId) {
      return NextResponse.json({ error: 'Faltan datos: imageUrl y orderId son requeridos' }, { status: 400 })
    }

    if (!MESHY_API_KEY) {
      return NextResponse.json({ error: 'API key de Meshy no configurada' }, { status: 500 })
    }

    // 1. Actualizar orden a estado "procesando"
    await supabase
      .from('orders')
      .update({ status: 'processing_3d', status_3d: 'processing' })
      .eq('id', orderId)

    // 2. Enviar imagen a Meshy para generar el modelo 3D
    const meshyResponse = await fetch('https://api.meshy.ai/v1/image-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        enable_pbr: false,        // Solo geometría, sin texturas pesadas
        ai_model: 'meshy-4',      // Modelo más reciente
        topology: 'quad',         // Mejor para impresión 3D
        target_polycount: 30000,  // Balance entre detalle y peso del archivo
      }),
    })

    if (!meshyResponse.ok) {
      const errorData = await meshyResponse.json()
      throw new Error(`Error de Meshy: ${errorData.message || meshyResponse.statusText}`)
    }

    const taskData = await meshyResponse.json()
    const taskId = taskData.result

    // 3. Guardar el taskId en la orden
    await supabase
      .from('orders')
      .update({ ia_task_id: taskId })
      .eq('id', orderId)

    // 4. Polling hasta que el modelo esté listo (máx 100 segundos)
    const modelUrl = await pollTaskStatus(taskId)

    if (!modelUrl) {
      throw new Error('No se pudo obtener la URL del modelo 3D')
    }

    // 5. Guardar URL del modelo en la orden
    await supabase
      .from('orders')
      .update({
        stl_ia_url: modelUrl,
        stl_taller_url: modelUrl, // por defecto el taller ve el original de la IA
        status_3d: 'ready',
        status: 'quoted',
      })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      taskId,
      modelUrl,
      message: 'Modelo 3D generado correctamente'
    })

  } catch (error: unknown) {
    console.error('Error en generate-3d:', error)
    const err = error as { message?: string }

    // Marcar la orden como fallida
    const body = await req.json().catch(() => ({})) as { orderId?: string }
    if (body.orderId) {
      await supabase
        .from('orders')
        .update({ status_3d: 'failed' })
        .eq('id', body.orderId)
    }

    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}