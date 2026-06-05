// src/app/api/analyze/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con service role para leer shop_config sin RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rate limiting simple en memoria
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minuto
  const maxRequests = 10 // máximo 10 análisis por minuto por IP

  const record = requestCounts.get(ip)

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callGeminiWithRetry(
  prompt: string,
  imagePart: { inlineData: { data: string; mimeType: string } },
  maxRetries = 3
) {
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent([prompt, imagePart])
        return result.response.text()
      } catch (error: unknown) {
        const isLastAttempt = attempt === maxRetries
        const err = error as { status?: number; message?: string }
        const isOverloaded =
          err?.status === 503 ||
          err?.message?.includes('503') ||
          err?.message?.includes('overloaded')
        const isUnavailable =
          err?.status === 429 || err?.message?.includes('429')

        if ((isOverloaded || isUnavailable) && !isLastAttempt) {
          const waitTime = attempt * 2000
          console.log(`Intento ${attempt} fallido con ${modelName}, esperando ${waitTime}ms...`)
          await sleep(waitTime)
          continue
        }

        if (isLastAttempt) throw error
      }
    }
  }
  throw new Error('El servicio de IA no está disponible. Por favor intentá en unos minutos.')
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { message: 'Demasiadas solicitudes. Esperá un minuto antes de intentar de nuevo.' },
        { status: 429 }
      )
    }

    const {
      base64Image,
      mimeType,
      serviceType,
      fileName,
      alturaCm,
      anchoCm,
      cantidad,
      tallerCodigo,   // ── NUEVO
    } = await req.json()

    // Validar que llegó una imagen real
    if (!base64Image || !mimeType) {
      return NextResponse.json({ message: 'Archivo inválido.' }, { status: 400 })
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        { message: 'Tipo de archivo no permitido. Solo PNG, JPG y WEBP.' },
        { status: 400 }
      )
    }

    if (base64Image.length > 14 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'El archivo es demasiado grande. Máximo 10MB.' },
        { status: 400 }
      )
    }

    // ── NUEVO: buscar precios reales del taller ──────────────────────────────
    let shopConfig = null
    if (tallerCodigo) {
      const { data, error } = await supabase
        .from('shop_config')
        .select('*')
        .eq('codigo_taller', tallerCodigo)
        .single()

      if (!error && data) {
        shopConfig = data
        console.log(`Usando precios del taller: ${shopConfig.nombre_taller} (${tallerCodigo})`)
      } else {
        console.log(`Taller ${tallerCodigo} no encontrado, usando precios default`)
      }
    }

    // Precios a usar: los del taller si existen, o valores default
    const moneda = shopConfig?.moneda || 'ARS'

    const precios = {
      dtf: {
        por_cm2: shopConfig?.costo_dtf_por_cm2 ?? 2.5,
        transfer: shopConfig?.costo_transfer_dtf ?? 200,
        mano_obra: shopConfig?.mano_obra_dtf ?? 300,
        margen: shopConfig?.margen_dtf ?? 40,
      },
      '3d': {
        filamento_por_gramo: shopConfig?.costo_filamento_por_gramo ?? 15,
        hora_maquina: shopConfig?.costo_hora_maquina ?? 500,
        margen: shopConfig?.margen_3d ?? 40,
      },
      sublimacion: {
        por_cm2: shopConfig?.costo_sublimacion_por_cm2 ?? 1.8,
        mano_obra: shopConfig?.mano_obra_sublimacion ?? 250,
        margen: shopConfig?.margen_sublimacion ?? 40,
      },
    }
    // ────────────────────────────────────────────────────────────────────────

    // Info de medidas para incluir en el prompt
    const medidaInfo = alturaCm
      ? `MEDIDAS ESPECIFICADAS POR EL CLIENTE:
         - Alto: ${alturaCm}cm
         - Ancho: ${anchoCm ? anchoCm + 'cm' : 'no especificado (estimalo proporcionalmente)'}
         - Cantidad: ${cantidad || 1} unidad/es
         
         Usá estas medidas EXACTAS para calcular el precio. No estimes el tamaño visualmente.
         Para impresión 3D, calculá el peso aproximado basándote en el volumen real a ${alturaCm}cm de alto.
         Para DTF/sublimación, calculá el área de impresión en base a ${alturaCm}cm × ${anchoCm || 'proporción de la imagen'}cm.
         El precio final debe multiplicarse por la cantidad (${cantidad || 1}).`
      : `El cliente NO especificó medidas. Estimá el tamaño más común para este tipo de producto y aclaralo en la descripción del precio.`

    // ── NUEVO: prompts con precios dinámicos del taller ──────────────────────
    const servicePrompts: Record<string, string> = {
      dtf: `Eres un experto técnico en impresión DTF (Direct to Film) sobre telas y prendas de vestir.
Analizá esta imagen que un cliente quiere imprimir en DTF.

${medidaInfo}

Evaluá:
1. ¿La imagen tiene fondo transparente o sólido? Si tiene fondo blanco o de color sólido, recomendá removerlo.
2. ¿La resolución es suficiente para impresión (mínimo 150dpi, recomendado 300dpi)?
3. ¿Hay elementos muy finos o pequeños que podrían perderse en la impresión?
4. ¿El diseño tiene gradientes complejos que podrían verse mal en DTF?
5. ¿Detectás logos, marcas registradas o personajes con copyright evidentes?

ESTRUCTURA DE COSTOS DEL TALLER (usá estos valores exactos para calcular):
- Costo por cm² de film DTF: ${precios.dtf.por_cm2} ${moneda}
- Costo fijo de transfer/termofijado: ${precios.dtf.transfer} ${moneda}
- Mano de obra por unidad: ${precios.dtf.mano_obra} ${moneda}
- Margen de ganancia del taller: ${precios.dtf.margen}%

FÓRMULA DE PRECIO:
precio_unitario = (area_cm2 × ${precios.dtf.por_cm2} + ${precios.dtf.transfer} + ${precios.dtf.mano_obra}) × (1 + ${precios.dtf.margen}/100)
precio_total = precio_unitario × cantidad

Aplicá un factor de complejidad entre 1.0 y 2.0 sobre el área según los detalles del diseño (colores, degradados, finos).`,

      '3d': `Eres un experto técnico en impresión 3D FDM (Fused Deposition Modeling).
Analizá esta imagen o captura de pantalla de un modelo 3D que un cliente quiere imprimir.

${medidaInfo}

Evaluá:
1. ¿Ves voladizos mayores a 45 grados sin soporte? (problema crítico)
2. ¿Hay paredes muy delgadas (menos de 1.2mm)? (pueden romperse)
3. ¿El modelo parece tener geometría cerrada (watertight)?
4. ¿Qué orientación de impresión recomendarías?
5. Estimá el peso aproximado según las medidas dadas

ESTRUCTURA DE COSTOS DEL TALLER (usá estos valores exactos para calcular):
- Costo de filamento por gramo: ${precios['3d'].filamento_por_gramo} ${moneda}
- Costo de hora de máquina: ${precios['3d'].hora_maquina} ${moneda}
- Margen de ganancia del taller: ${precios['3d'].margen}%

FÓRMULA DE PRECIO:
Estimá el peso en gramos y el tiempo de impresión en horas según las medidas.
precio_unitario = (peso_gramos × ${precios['3d'].filamento_por_gramo} + horas_impresion × ${precios['3d'].hora_maquina}) × (1 + ${precios['3d'].margen}/100)
precio_total = precio_unitario × cantidad

Aplicá un factor de complejidad entre 1.0 y 2.0 según la geometría del modelo.`,

      sublimacion: `Eres un experto técnico en sublimación para telas de poliéster y productos rígidos.
Analizá esta imagen que un cliente quiere sublimar.

${medidaInfo}

Evaluá:
1. ¿La imagen tiene suficiente resolución para sublimación (mínimo 150dpi)?
2. ¿Los colores son vibrantes y saturados? La sublimación reproduce mejor colores brillantes.
3. ¿Hay texto pequeño que podría verse borroso?
4. ¿El diseño incluye áreas muy oscuras o negras? (el negro puro puede verse azulado)
5. ¿Detectás logos, marcas registradas o personajes con copyright evidentes?

ESTRUCTURA DE COSTOS DEL TALLER (usá estos valores exactos para calcular):
- Costo por cm² de sublimación: ${precios.sublimacion.por_cm2} ${moneda}
- Mano de obra por unidad: ${precios.sublimacion.mano_obra} ${moneda}
- Margen de ganancia del taller: ${precios.sublimacion.margen}%

FÓRMULA DE PRECIO:
precio_unitario = (area_cm2 × ${precios.sublimacion.por_cm2} + ${precios.sublimacion.mano_obra}) × (1 + ${precios.sublimacion.margen}/100)
precio_total = precio_unitario × cantidad

Aplicá un factor de complejidad entre 1.0 y 1.8 según los detalles del diseño.`,
    }
    // ────────────────────────────────────────────────────────────────────────

    const prompt = `${servicePrompts[serviceType]}

Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, sin backticks, con esta estructura exacta:
{
  "viable": true o false,
  "service_recommended": "${serviceType}",
  "issues": ["problema 1 si hay", "problema 2 si hay"],
  "recommendations": ["recomendación 1", "recomendación 2"],
  "estimated_time": "X a Y días hábiles",
  "price_breakdown": {
    "base_cost": número en ${moneda},
    "complexity_factor": número entre 1.0 y 2.0,
    "total_ars": número total en ${moneda} (ya multiplicado por cantidad si corresponde),
    "description": "descripción de 1 línea explicando el cálculo con las medidas usadas"
  },
  "copyright_alert": true o false,
  "copyright_notes": "descripción si hay alerta de copyright, sino cadena vacía"
}`

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    }

    const text = await callGeminiWithRetry(prompt, imagePart)
    const cleaned = text.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(cleaned)

    return NextResponse.json(analysis)
  } catch (error: unknown) {
    console.error('Error en análisis Gemini:', error)
    const err = error as { message?: string }
    const isOverloaded =
      err?.message?.includes('503') ||
      err?.message?.includes('overloaded') ||
      err?.message?.includes('unavailable')

    const message = isOverloaded
      ? 'La IA está muy ocupada en este momento. Esperá unos segundos y volvé a intentar.'
      : err?.message || 'Error interno del servidor'

    return NextResponse.json({ message }, { status: 500 })
  }
}