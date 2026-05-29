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
  fileName: string,
  alturaCm?: number,
  anchoCm?: number,
  cantidad?: number
): Promise<GeminiAnalysis> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType, serviceType, fileName, alturaCm, anchoCm, cantidad }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Error al analizar el archivo')
  }

  return response.json()
}