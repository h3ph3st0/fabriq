// src/app/api/analyze/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

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

    const { base64Image, mimeType, serviceType, fileName, alturaCm, anchoCm, cantidad } =
      await req.json()

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

Precios base por área de impresión en ARS:
- Hasta A5 (15×21cm): 2500 ARS
- Hasta A4 (21×29cm): 4000 ARS
- Hasta A3 (29×42cm): 6500 ARS
- Mayor a A3: 9000 ARS
- Factor de complejidad entre 1.0 y 2.0 según detalles
- Multiplicar por cantidad`,

      '3d': `Eres un experto técnico en impresión 3D FDM (Fused Deposition Modeling).
Analizá esta imagen o captura de pantalla de un modelo 3D que un cliente quiere imprimir.

${medidaInfo}

Evaluá:
1. ¿Ves voladizos mayores a 45 grados sin soporte? (problema crítico)
2. ¿Hay paredes muy delgadas (menos de 1.2mm)? (pueden romperse)
3. ¿El modelo parece tener geometría cerrada (watertight)?
4. ¿Qué orientación de impresión recomendarías?
5. Estimá el peso aproximado según las medidas dadas

Precios base por peso estimado en ARS:
- Hasta 50g: 3000 ARS
- 50 a 150g: 6500 ARS
- 150 a 300g: 12000 ARS
- Más de 300g: 18000 ARS
- Factor de complejidad geométrica entre 1.0 y 2.0
- Multiplicar por cantidad`,

      sublimacion: `Eres un experto técnico en sublimación para telas de poliéster y productos rígidos.
Analizá esta imagen que un cliente quiere sublimar.

${medidaInfo}

Evaluá:
1. ¿La imagen tiene suficiente resolución para sublimación (mínimo 150dpi)?
2. ¿Los colores son vibrantes y saturados? La sublimación reproduce mejor colores brillantes.
3. ¿Hay texto pequeño que podría verse borroso?
4. ¿El diseño incluye áreas muy oscuras o negras? (el negro puro puede verse azulado)
5. ¿Detectás logos, marcas registradas o personajes con copyright evidentes?

Precios base en ARS:
- Diseño pequeño (hasta 20×20cm): 2000 ARS
- Diseño mediano (hasta 30×40cm): 3500 ARS
- Diseño grande o producto completo: 5500 ARS
- Factor de complejidad entre 1.0 y 1.8
- Multiplicar por cantidad`
    }

    const prompt = `${servicePrompts[serviceType]}

Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, sin backticks, con esta estructura exacta:
{
  "viable": true o false,
  "service_recommended": "${serviceType}",
  "issues": ["problema 1 si hay", "problema 2 si hay"],
  "recommendations": ["recomendación 1", "recomendación 2"],
  "estimated_time": "X a Y días hábiles",
  "price_breakdown": {
    "base_cost": número en ARS,
    "complexity_factor": número entre 1.0 y 2.0,
    "total_ars": número total en ARS (ya multiplicado por cantidad si corresponde),
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