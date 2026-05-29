// src/lib/gemini.ts

export type ServiceType = 'dtf' | '3d' | 'sublimacion'

export type GeminiAnalysis = {
  viable: boolean
  service_recommended: ServiceType
  issues: string[]
  recommendations: string[]
  estimated_time: string
  price_breakdown: {
    base_cost: number
    complexity_factor: number
    total_ars: number
    description: string
  }
  copyright_alert: boolean
  copyright_notes: string
}

export async function analyzeFileWithGemini(
  base64Image: string,
  mimeType: string,
  serviceType: ServiceType,
  fileName: string
): Promise<GeminiAnalysis> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType, serviceType, fileName }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Error al analizar el archivo')
  }

  return response.json()
}

// Precios base en ARS (actualizá según tu taller)
export const PRICE_REFERENCE = {
  dtf: {
    small: 2500,    // hasta A4
    medium: 4500,   // hasta A3
    large: 7000,    // más grande
    description: 'Impresión DTF sobre tela'
  },
  '3d': {
    small: 3000,    // menos de 50g
    medium: 6000,   // 50-150g
    large: 12000,   // más de 150g
    description: 'Impresión 3D FDM'
  },
  sublimacion: {
    small: 2000,
    medium: 3500,
    large: 5500,
    description: 'Sublimación sobre poliéster'
  }
}
