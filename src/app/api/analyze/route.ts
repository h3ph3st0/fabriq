// src/app/api/analyze/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType, serviceType, fileName } = await req.json()

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' })

    const servicePrompts: Record<string, string> = {
      dtf: `Eres un experto técnico en impresión DTF (Direct to Film) sobre telas y prendas de vestir.
Analizá esta imagen que un cliente quiere imprimir en DTF.

Evaluá:
1. ¿La imagen tiene fondo transparente o sólido? Si tiene fondo blanco o de color sólido, recomendá removerlo.
2. ¿La resolución es suficiente para impresión (mínimo 150dpi recomendado 300dpi)?
3. ¿Hay elementos muy finos o pequeños que podrían perderse en la impresión?
4. ¿El diseño tiene gradientes complejos que podrían verse mal en DTF?
5. ¿Detectás logos, marcas registradas o personajes con copyright evidentes (ej: logos de Nike, Marvel, Disney, etc.)?

Calculá el precio estimado en pesos argentinos:
- Diseño pequeño (hasta A5): base 2500 ARS
- Diseño mediano (hasta A4): base 4000 ARS  
- Diseño grande (hasta A3): base 6500 ARS
- Aplicá factor de complejidad entre 1.0 y 2.0 según detalles del diseño`,

      '3d': `Eres un experto técnico en impresión 3D FDM (Fused Deposition Modeling).
Analizá esta imagen o captura de pantalla de un modelo 3D que un cliente quiere imprimir.

Evaluá:
1. ¿Ves voladizos mayores a 45 grados sin soporte? (problema crítico)
2. ¿Hay paredes muy delgadas (menos de 1.2mm)? (pueden romperse)
3. ¿El modelo parece tener la geometría cerrada (watertight)?
4. ¿Qué orientación de impresión recomendarías?
5. ¿Estimás el peso aproximado del modelo en gramos?

Calculá el precio estimado en pesos argentinos:
- Modelo pequeño (hasta 50g estimado): base 3000 ARS
- Modelo mediano (50-150g): base 6500 ARS
- Modelo grande (+150g): base 13000 ARS
- Aplicá factor según complejidad geométrica`,

      sublimacion: `Eres un experto técnico en sublimación para telas de poliéster y productos rígidos.
Analizá esta imagen que un cliente quiere sublimar.

Evaluá:
1. ¿La imagen tiene suficiente resolución para sublimación (mínimo 150dpi)?
2. ¿Los colores son vibrantes y saturados? La sublimación reproduce mejor colores brillantes.
3. ¿Hay texto pequeño que podría verse borroso?
4. ¿El diseño incluye áreas muy oscuras o negras? (el negro puro puede verse azulado en sublimación)
5. ¿Detectás logos, marcas registradas o personajes con copyright evidentes?

Calculá el precio estimado en pesos argentinos:
- Diseño pequeño: base 2000 ARS
- Diseño mediano: base 3500 ARS
- Diseño grande o producto completo: base 5500 ARS`
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
    "total_ars": número total en ARS,
    "description": "descripción breve de 1 línea del cálculo"
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

    const result = await model.generateContent([prompt, imagePart])
    const text = result.response.text()

    // Limpiar respuesta y parsear JSON
    const cleaned = text.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(cleaned)

    return NextResponse.json(analysis)
  } catch (error: unknown) {
    console.error('Error en análisis Gemini:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { message },
      { status: 500 }
    )
  }
}
