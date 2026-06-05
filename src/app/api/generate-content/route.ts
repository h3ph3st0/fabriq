// src/app/api/generate-content/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SERVICE_NAMES: Record<string, string> = {
  dtf: 'impresión DTF en remera/tela',
  '3d': 'impresión 3D',
  sublimacion: 'sublimación',
}

export async function POST(req: NextRequest) {
  try {
    const { serviceType, priceArs, description, nombreTaller, modo, notes } = await req.json()

    const servicio = SERVICE_NAMES[serviceType] || serviceType
    const precio = priceArs ? `$${Number(priceArs).toLocaleString('es-AR')} ARS` : 'precio a consultar'

    const promptEntregado = `Sos el community manager de ${nombreTaller}, un taller de manufactura personalizada en Concordia, Entre Ríos, Argentina.

Acabamos de entregar un trabajo de ${servicio}.
${description ? `Detalle del trabajo: ${description}` : ''}
${notes ? `Notas adicionales: ${notes}` : ''}
Precio del trabajo: ${precio}

Generá contenido para redes sociales mostrando este trabajo terminado. El tono debe ser orgulloso, cercano y argentino (podés usar "vos", "che", etc.). No uses lenguaje corporativo.

Respondé ÚNICAMENTE con JSON válido, sin backticks, con esta estructura:
{
  "instagram": "caption para instagram con emojis y hashtags al final (máximo 2200 caracteres). Incluí hashtags como #impresion3d #dtf #concordia #entrerios #hechoenconcordia #talleresargentinos y otros relevantes al tipo de trabajo",
  "whatsapp": "mensaje corto y directo para mandar por WhatsApp a clientes o grupos (máximo 300 caracteres, sin hashtags)",
  "facebook": "texto para facebook, más descriptivo que instagram, con llamado a la acción, sin tantos hashtags (máximo 500 caracteres)"
}`

    const promptPreventa = `Sos el community manager de ${nombreTaller}, un taller de manufactura personalizada en Concordia, Entre Ríos, Argentina.

Estamos trabajando en un producto de ${servicio} que va a estar disponible pronto / ya está disponible para encargar.
${description ? `Descripción del producto: ${description}` : ''}
${notes ? `Detalles adicionales: ${notes}` : ''}
Precio: ${precio}

Generá contenido de preventa/lanzamiento para redes sociales. El tono debe ser entusiasta, generar anticipación y urgencia, y ser cercano y argentino (podés usar "vos", "che", etc.). Invitá a la gente a consultar o reservar.

Respondé ÚNICAMENTE con JSON válido, sin backticks, con esta estructura:
{
  "instagram": "caption para instagram con emojis y hashtags al final (máximo 2200 caracteres). Incluí hashtags como #impresion3d #dtf #concordia #entrerios #hechoenconcordia #talleresargentinos y otros relevantes",
  "whatsapp": "mensaje corto para mandar por WhatsApp generando urgencia (máximo 300 caracteres, sin hashtags)",
  "facebook": "texto para facebook con llamado a la acción claro, invitando a consultar o reservar (máximo 500 caracteres)"
}`

    const prompt = modo === 'entregado' ? promptEntregado : promptPreventa

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const cleaned = text.replace(/```json|```/g, '').trim()
    const contenido = JSON.parse(cleaned)

    return NextResponse.json(contenido)

  } catch (error) {
    console.error('Error generando contenido:', error)
    return NextResponse.json(
      { error: 'Error al generar el contenido' },
      { status: 500 }
    )
  }
}