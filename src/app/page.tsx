'use client'
// src/app/page.tsx

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import { analyzeFileWithGemini, GeminiAnalysis } from '@/lib/gemini'
import {
  Upload, CheckCircle, XCircle, AlertTriangle,
  Loader2, ChevronRight, Box
} from 'lucide-react'

type ServiceType = 'dtf' | '3d' | 'sublimacion'
type Step = 'upload' | 'analyzing' | 'result' | 'form' | 'done'

const SERVICE_LABELS: Record<ServiceType, string> = {
  dtf: 'DTF — Remeras y telas',
  '3d': 'Impresión 3D',
  sublimacion: 'Sublimación'
}

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  background: '#111',
  border: '1px solid #2a2a2a',
  borderRadius: 10,
  color: '#f0ece3',
  fontSize: 15,
  fontFamily: "'DM Sans', sans-serif",
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  fontSize: 12,
  color: '#666',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
  display: 'block',
  marginBottom: 8,
}

export default function Home() {
  const [step, setStep] = useState<Step>('upload')
  const [serviceType, setServiceType] = useState<ServiceType>('dtf')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [altura, setAltura] = useState('')
  const [ancho, setAncho] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0]
    if (!f) return
    setFile(f)
    setError(null)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  async function handleAnalyze() {
    if (!file) return
    setStep('analyzing')
    setError(null)

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result = await analyzeFileWithGemini(
        base64,
        file.type,
        serviceType,
        file.name,
        altura ? parseFloat(altura) : undefined,
        ancho ? parseFloat(ancho) : undefined,
        cantidad ? parseInt(cantidad) : 1
      )

      setAnalysis(result)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar el archivo')
      setStep('upload')
    }
  }

  async function handleSubmitOrder() {
    if (!analysis || !file || !email) return
    setSubmitting(true)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName)

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_email: email,
          file_name: file.name,
          file_url: urlData.publicUrl,
          service_type: serviceType,
          ai_analysis: analysis,
          price_ars: analysis.price_breakdown.total_ars,
          status: 'quoted',
          notes: `Alto: ${altura || 'no especificado'}cm | Ancho: ${ancho || 'no especificado'}cm | Cantidad: ${cantidad} | ${notes}`,
        })
        .select()
        .single()

      if (orderError) throw orderError

      setOrderId(order.id)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el pedido')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setAnalysis(null)
    setError(null)
    setEmail('')
    setNotes('')
    setAltura('')
    setAncho('')
    setCantidad('1')
    setOrderId(null)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#f0ece3',
      fontFamily: "'DM Sans', sans-serif",
      padding: '0',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <header style={{
        borderBottom: '1px solid #1e1e1e',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #e85d04, #f48c06)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box size={18} color="#fff" />
        </div>
        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' }}>
          FabriQ
        </span>
        <span style={{
          marginLeft: 4, fontSize: 11,
          background: '#1e1e1e', color: '#888',
          padding: '2px 8px', borderRadius: 20,
          fontFamily: "'DM Mono', monospace",
        }}>
          beta
        </span>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 24px' }}>

        {/* PASO: UPLOAD */}
        {step === 'upload' && (
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: 8 }}>
              Cotizá tu pedido<br />
              <span style={{ color: '#e85d04' }}>en 30 segundos.</span>
            </h1>
            <p style={{ color: '#888', marginBottom: 48, fontSize: 16, lineHeight: 1.6 }}>
              Subí tu diseño, la IA analiza viabilidad técnica y genera el precio al instante.
            </p>

            {/* Selector de servicio */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Tipo de servicio</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Object.keys(SERVICE_LABELS) as ServiceType[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setServiceType(s)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: serviceType === s ? '1px solid #e85d04' : '1px solid #2a2a2a',
                      background: serviceType === s ? 'rgba(232,93,4,0.1)' : '#111',
                      color: serviceType === s ? '#e85d04' : '#888',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'all 0.15s',
                    }}
                  >
                    {SERVICE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Medidas */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Medidas del producto final</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <input
                    type="number"
                    value={altura}
                    onChange={e => setAltura(e.target.value)}
                    placeholder="Alto (cm) — ej: 30"
                    min="1"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <input
                    type="number"
                    value={ancho}
                    onChange={e => setAncho(e.target.value)}
                    placeholder="Ancho (cm) — opcional"
                    min="1"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    placeholder="Cant."
                    min="1"
                    style={inputStyle}
                  />
                </div>
              </div>
              <p style={{ color: '#444', fontSize: 11, marginTop: 6 }}>
                Las medidas permiten calcular el precio con mayor precisión
              </p>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              style={{
                border: `2px dashed ${isDragActive ? '#e85d04' : file ? '#2a6b2a' : '#2a2a2a'}`,
                borderRadius: 16,
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragActive ? 'rgba(232,93,4,0.05)' : file ? 'rgba(42,107,42,0.05)' : '#111',
                transition: 'all 0.2s',
              }}
            >
              <input {...getInputProps()} />
              {file && preview ? (
                <div>
                  <img
                    src={preview}
                    alt="preview"
                    style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, marginBottom: 16, objectFit: 'contain' }}
                  />
                  <p style={{ color: '#4ade80', fontSize: 14 }}>✓ {file.name}</p>
                  <p style={{ color: '#666', fontSize: 12, marginTop: 4 }}>Hacé clic para cambiar el archivo</p>
                </div>
              ) : (
                <div>
                  <Upload size={40} color="#444" style={{ marginBottom: 16 }} />
                  <p style={{ color: '#888', fontSize: 15, marginBottom: 4 }}>
                    {isDragActive ? 'Soltá el archivo acá' : 'Arrastrá tu diseño o hacé clic para subir'}
                  </p>
                  <p style={{ color: '#555', fontSize: 12 }}>PNG, JPG, WEBP — máximo 10MB</p>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, color: '#ef4444', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!file}
              style={{
                marginTop: 24, width: '100%', padding: '16px',
                borderRadius: 10, border: 'none',
                background: file ? '#e85d04' : '#1a1a1a',
                color: file ? '#fff' : '#444',
                fontSize: 15, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: file ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              Analizar con IA
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* PASO: ANALIZANDO */}
        {step === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Loader2 size={48} color="#e85d04" style={{ animation: 'spin 1s linear infinite', marginBottom: 24 }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Analizando tu diseño...</h2>
            <p style={{ color: '#666', fontSize: 14 }}>Gemini está evaluando viabilidad técnica y calculando el precio</p>
            {(altura || ancho) && (
              <p style={{ color: '#444', fontSize: 13, marginTop: 8 }}>
                Medidas: {altura ? `${altura}cm alto` : ''}{altura && ancho ? ' × ' : ''}{ancho ? `${ancho}cm ancho` : ''} · {cantidad} unidad/es
              </p>
            )}
          </div>
        )}

        {/* PASO: RESULTADO */}
        {step === 'result' && analysis && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              {analysis.viable
                ? <CheckCircle size={28} color="#4ade80" />
                : <XCircle size={28} color="#ef4444" />
              }
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>
                  {analysis.viable ? 'Diseño viable para producción' : 'Se requieren ajustes'}
                </h2>
                <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>
                  Análisis para {SERVICE_LABELS[serviceType]}
                  {altura && ` · ${altura}cm alto`}{ancho && ` × ${ancho}cm`}
                  {parseInt(cantidad) > 1 && ` · ${cantidad} unidades`}
                </p>
              </div>
            </div>

            {/* Precio */}
            <div style={{
              background: '#111', border: '1px solid #2a2a2a',
              borderRadius: 12, padding: '24px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Precio estimado
                  </p>
                  <p style={{ fontSize: 40, fontWeight: 600, margin: 0, fontFamily: "'DM Mono', monospace", color: '#e85d04' }}>
                    ${analysis.price_breakdown.total_ars.toLocaleString('es-AR')}
                  </p>
                  <p style={{ color: '#555', fontSize: 12, margin: '4px 0 0' }}>
                    {analysis.price_breakdown.description}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>Tiempo estimado</p>
                  <p style={{ color: '#888', fontSize: 14, margin: 0 }}>{analysis.estimated_time}</p>
                </div>
              </div>
            </div>

            {/* Copyright */}
            {analysis.copyright_alert && (
              <div style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 10, padding: '16px', marginBottom: 16,
                display: 'flex', gap: 12,
              }}>
                <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ color: '#f59e0b', fontSize: 13, fontWeight: 500, margin: '0 0 4px' }}>
                    Alerta de propiedad intelectual
                  </p>
                  <p style={{ color: '#a07020', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    {analysis.copyright_notes}
                  </p>
                </div>
              </div>
            )}

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Problemas detectados
                </p>
                {analysis.issues.map((issue, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, padding: '8px 12px',
                    background: '#111', borderRadius: 6, marginBottom: 4,
                    fontSize: 13, color: '#ef4444',
                  }}>
                    <span>•</span> {issue}
                  </div>
                ))}
              </div>
            )}

            {/* Recomendaciones */}
            {analysis.recommendations.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Recomendaciones
                </p>
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, padding: '8px 12px',
                    background: '#111', borderRadius: 6, marginBottom: 4,
                    fontSize: 13, color: '#4ade80',
                  }}>
                    <span>✓</span> {rec}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={reset} style={{
                flex: 1, padding: '14px', borderRadius: 10,
                border: '1px solid #2a2a2a', background: 'transparent',
                color: '#888', fontSize: 14, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              }}>
                Subir otro diseño
              </button>
              <button onClick={() => setStep('form')} style={{
                flex: 2, padding: '14px', borderRadius: 10, border: 'none',
                background: '#e85d04', color: '#fff', fontSize: 14, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                Confirmar pedido <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* PASO: FORMULARIO */}
        {step === 'form' && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 400, marginBottom: 8 }}>Confirmar pedido</h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>
              Precio final: <strong style={{ color: '#e85d04', fontFamily: "'DM Mono', monospace" }}>
                ${analysis?.price_breakdown.total_ars.toLocaleString('es-AR')} ARS
              </strong>
              {parseInt(cantidad) > 1 && <span style={{ color: '#666' }}> · {cantidad} unidades</span>}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={{ ...inputStyle, padding: '14px 16px' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Notas adicionales (opcional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Color de filamento, material, referencias de color..."
                rows={3}
                style={{
                  ...inputStyle, padding: '14px 16px',
                  resize: 'vertical' as const,
                }}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 16, padding: '12px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, color: '#ef4444', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('result')} style={{
                flex: 1, padding: '14px', borderRadius: 10,
                border: '1px solid #2a2a2a', background: 'transparent',
                color: '#888', fontSize: 14, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              }}>
                Volver
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={!email || submitting}
                style={{
                  flex: 2, padding: '14px', borderRadius: 10, border: 'none',
                  background: email && !submitting ? '#e85d04' : '#1a1a1a',
                  color: email && !submitting ? '#fff' : '#444',
                  fontSize: 14, fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: email && !submitting ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                  : <>Enviar pedido <ChevronRight size={16} /></>
                }
              </button>
            </div>
          </div>
        )}

        {/* PASO: CONFIRMACIÓN */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{
              width: 72, height: 72,
              background: 'rgba(74,222,128,0.1)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <CheckCircle size={36} color="#4ade80" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 400, marginBottom: 8 }}>¡Pedido recibido!</h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
              Te contactaremos a <strong style={{ color: '#888' }}>{email}</strong> para coordinar el pago.
            </p>
            {orderId && (
              <p style={{ color: '#444', fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 32 }}>
                Orden #{orderId.slice(0, 8).toUpperCase()}
              </p>
            )}
            <button onClick={reset} style={{
              padding: '14px 32px', borderRadius: 10,
              border: '1px solid #2a2a2a', background: 'transparent',
              color: '#888', fontSize: 14, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
            }}>
              Hacer otro pedido
            </button>
          </div>
        )}
      </div>
    </main>
  )
}