'use client'
import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import { analyzeFileWithGemini, GeminiAnalysis } from '@/lib/gemini'
import { Upload, CheckCircle, XCircle, AlertTriangle, Loader2, ChevronRight, Box } from 'lucide-react'

type ServiceType = 'dtf' | '3d' | 'sublimacion'
type Step = 'upload' | 'analyzing' | 'result' | 'form' | 'fotos3d' | 'redirecting' | 'done'

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
  const [fotos3d, setFotos3d] = useState<string[]>([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [tallerCodigo, setTallerCodigo] = useState<string | null>(null)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)

  // ── NUEVO: guardar el user_id del taller al cargar ──
  const [tallerUserId, setTallerUserId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codigo = params.get('taller')
    if (codigo) {
      setTallerCodigo(codigo)
      // Buscar el user_id del taller para vincularlo a las órdenes
      supabase
        .from('shop_config')
        .select('user_id')
        .eq('codigo_taller', codigo)
        .single()
        .then(({ data }) => {
          if (data) setTallerUserId(data.user_id)
        })
    }
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0]
    if (!f) return
    setFile(f); setError(null)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
    maxFiles: 1, maxSize: 10 * 1024 * 1024,
  })

  async function handleAnalyze() {
    if (!file) return
    setStep('analyzing'); setError(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await analyzeFileWithGemini(
        base64, file.type, serviceType, file.name,
        altura ? parseFloat(altura) : undefined,
        ancho ? parseFloat(ancho) : undefined,
        cantidad ? parseInt(cantidad) : 1,
        tallerCodigo || undefined
      )
      setAnalysis(result); setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar el archivo')
      setStep('upload')
    }
  }

  async function handleSubmitOrder() {
    if (!analysis || !file || !email || !aceptaTerminos) return
    setSubmitting(true); setError(null)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName)

      // ── NUEVO: incluir user_id del taller en la orden ──
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        customer_email: email,
        file_name: file.name,
        file_url: urlData.publicUrl,
        service_type: serviceType,
        ai_analysis: analysis,
        price_ars: analysis.price_breakdown.total_ars,
        status: 'quoted',
        notes: `Alto: ${altura || 'no especificado'}cm | Ancho: ${ancho || 'no especificado'}cm | Cantidad: ${cantidad} | ${notes}`,
        user_id: tallerUserId || null, // vincula la orden al taller
      }).select().single()
      // ──────────────────────────────────────────────────

      if (orderError) throw orderError
      setOrderId(order.id)
      if (serviceType === '3d') {
        setStep('fotos3d')
        return
      }
      await redirectToPayment(order.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el pedido')
    } finally { setSubmitting(false) }
  }

  async function redirectToPayment(oid: string) {
    if (!analysis) return
    setStep('redirecting')
    try {
      const serviceLabel = SERVICE_LABELS[serviceType]
      const description = `FabriQ - ${serviceLabel}${parseInt(cantidad) > 1 ? ` x${cantidad}` : ''}`
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: oid,
          amount: analysis.price_breakdown.total_ars,
          description,
          email,
        }),
      })
      if (!response.ok) throw new Error('Error al crear el pago')
      const { initPoint } = await response.json()
      window.location.href = initPoint
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago')
      setStep('form')
    }
  }

  async function handleUploadFoto3d(file: File) {
    if (!orderId) return
    setUploadingFoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `ref-${orderId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName)
      await supabase.from('order_reference_images').insert({
        order_id: orderId,
        image_url: urlData.publicUrl,
        uploaded_by: 'cliente'
      })
      setFotos3d(prev => [...prev, urlData.publicUrl])
    } catch (err) {
      console.error(err)
    } finally { setUploadingFoto(false) }
  }

  function reset() {
    setStep('upload'); setFile(null); setPreview(null); setAnalysis(null)
    setError(null); setEmail(''); setNotes(''); setAltura(''); setAncho('')
    setCantidad('1'); setOrderId(null); setFotos3d([]); setAceptaTerminos(false)
  }

  const puedeConfirmar = email && aceptaTerminos && !submitting

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <main style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        backgroundImage: 'url(/fondo.png)',
        backgroundSize: '350px',
        backgroundRepeat: 'repeat',
        color: '#f0ece3',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <header style={{ borderBottom: '1px solid #1e1e1e', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #e85d04, #f48c06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' }}>FabriQ</span>
            <span style={{ marginLeft: 4, fontSize: 11, background: '#1e1e1e', color: '#888', padding: '2px 8px', borderRadius: 20, fontFamily: "'DM Mono', monospace" }}>beta</span>
          </div>
          <a href="/admin" style={{ fontSize: 12, color: '#e85d04', textDecoration: 'none', border: '1px solid rgba(232,93,4,0.3)', borderRadius: 8, padding: '7px 14px', background: 'rgba(232,93,4,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Panel de talleres
          </a>
        </header>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 24px' }}>

          {step === 'upload' && (
            <div>
              <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: 8 }}>
                Cotizá tu pedido<br />
                <span style={{ color: '#e85d04' }}>en 30 segundos.</span>
              </h1>
              <p style={{ color: '#888', marginBottom: 48, fontSize: 16, lineHeight: 1.6 }}>
                Subí tu diseño, la IA analiza viabilidad técnica y genera el precio al instante.
              </p>

              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Tipo de servicio</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(Object.keys(SERVICE_LABELS) as ServiceType[]).map(s => (
                    <button key={s} onClick={() => setServiceType(s)} style={{
                      padding: '10px 20px', borderRadius: 8,
                      border: serviceType === s ? '1px solid #e85d04' : '1px solid #2a2a2a',
                      background: serviceType === s ? 'rgba(232,93,4,0.1)' : '#111',
                      color: serviceType === s ? '#e85d04' : '#888',
                      cursor: 'pointer', fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                    }}>
                      {SERVICE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Medidas del producto final</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 2 }}>
                    <input type="number" value={altura} onChange={e => setAltura(e.target.value)} placeholder="Alto (cm) — ej: 30" min="1" style={inputStyle} />
                  </div>
                  <div style={{ flex: 2 }}>
                    <input type="number" value={ancho} onChange={e => setAncho(e.target.value)} placeholder="Ancho (cm) — opcional" min="1" style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="Cant." min="1" style={inputStyle} />
                  </div>
                </div>
                <p style={{ color: '#444', fontSize: 11, marginTop: 6 }}>Las medidas permiten calcular el precio con mayor precisión</p>
              </div>

              <div {...getRootProps()} style={{
                border: `2px dashed ${isDragActive ? '#e85d04' : file ? '#2a6b2a' : '#2a2a2a'}`,
                borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                background: isDragActive ? 'rgba(232,93,4,0.05)' : file ? 'rgba(42,107,42,0.05)' : 'rgba(17,17,17,0.8)',
                transition: 'all 0.2s',
              }}>
                <input {...getInputProps()} />
                {file && preview ? (
                  <div>
                    <img src={preview} alt="preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, marginBottom: 16, objectFit: 'contain' }} />
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

              {error && <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>}

              <button onClick={handleAnalyze} disabled={!file} style={{
                marginTop: 24, width: '100%', padding: '16px', borderRadius: 10, border: 'none',
                background: file ? '#e85d04' : '#1a1a1a', color: file ? '#fff' : '#444',
                fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                cursor: file ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                Analizar con IA <ChevronRight size={18} />
              </button>
            </div>
          )}

          {step === 'analyzing' && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Loader2 size={48} color="#e85d04" style={{ animation: 'spin 1s linear infinite', marginBottom: 24 }} />
              <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Analizando tu diseño...</h2>
              <p style={{ color: '#666', fontSize: 14 }}>Gemini está evaluando viabilidad técnica y calculando el precio</p>
            </div>
          )}

          {step === 'result' && analysis && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                {analysis.viable ? <CheckCircle size={28} color="#4ade80" /> : <XCircle size={28} color="#ef4444" />}
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

              <div style={{ background: 'rgba(17,17,17,0.9)', border: '1px solid #2a2a2a', borderRadius: 12, padding: '24px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Precio estimado</p>
                    <p style={{ fontSize: 40, fontWeight: 600, margin: 0, fontFamily: "'DM Mono', monospace", color: '#e85d04' }}>
                      ${analysis.price_breakdown.total_ars.toLocaleString('es-AR')}
                    </p>
                    <p style={{ color: '#555', fontSize: 12, margin: '4px 0 0' }}>{analysis.price_breakdown.description}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>Tiempo estimado</p>
                    <p style={{ color: '#888', fontSize: 14, margin: 0 }}>{analysis.estimated_time}</p>
                  </div>
                </div>
              </div>

              {analysis.copyright_alert && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '16px', marginBottom: 16, display: 'flex', gap: 12 }}>
                  <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ color: '#f59e0b', fontSize: 13, fontWeight: 500, margin: '0 0 4px' }}>Alerta de propiedad intelectual</p>
                    <p style={{ color: '#a07020', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{analysis.copyright_notes}</p>
                  </div>
                </div>
              )}

              {analysis.issues.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Problemas detectados</p>
                  {analysis.issues.map((issue, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: 'rgba(17,17,17,0.9)', borderRadius: 6, marginBottom: 4, fontSize: 13, color: '#ef4444' }}>
                      <span>•</span> {issue}
                    </div>
                  ))}
                </div>
              )}

              {analysis.recommendations.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Recomendaciones</p>
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: 'rgba(17,17,17,0.9)', borderRadius: 6, marginBottom: 4, fontSize: 13, color: '#4ade80' }}>
                      <span>✓</span> {rec}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={reset} style={{ flex: 1, padding: '14px', borderRadius: 10, border: '1px solid #2a2a2a', background: 'transparent', color: '#888', fontSize: 14, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}>
                  Subir otro diseño
                </button>
                <button onClick={() => setStep('form')} style={{ flex: 2, padding: '14px', borderRadius: 10, border: 'none', background: '#e85d04', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  Confirmar pedido <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 'form' && (
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 400, marginBottom: 8 }}>Confirmar pedido</h2>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>
                Precio final: <strong style={{ color: '#e85d04', fontFamily: "'DM Mono', monospace" }}>${analysis?.price_breakdown.total_ars.toLocaleString('es-AR')} ARS</strong>
                {parseInt(cantidad) > 1 && <span style={{ color: '#666' }}> · {cantidad} unidades</span>}
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={{ ...inputStyle, padding: '14px 16px' }} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Notas adicionales (opcional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Color de filamento, material, referencias de color..." rows={3} style={{ ...inputStyle, padding: '14px 16px', resize: 'vertical' as const }} />
              </div>

              <div style={{
                marginBottom: 24,
                padding: '16px',
                background: aceptaTerminos ? 'rgba(232,93,4,0.05)' : '#0f0f0f',
                border: `1px solid ${aceptaTerminos ? 'rgba(232,93,4,0.3)' : '#2a2a2a'}`,
                borderRadius: 10,
                transition: 'all 0.2s',
              }}>
                <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={e => setAceptaTerminos(e.target.checked)}
                    style={{ marginTop: 3, accentColor: '#e85d04', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
                    Declaro tener los derechos sobre las imágenes que subí, entiendo que los archivos 3D generados son propiedad de FabriQ y el taller, y que el pago corresponde al objeto físico terminado. He leído y acepto los{' '}
                    <a href="/terminos" target="_blank" style={{ color: '#e85d04', textDecoration: 'none' }}>
                      términos y condiciones
                    </a>.
                  </span>
                </label>
              </div>

              {error && <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep('result')} style={{ flex: 1, padding: '14px', borderRadius: 10, border: '1px solid #2a2a2a', background: 'transparent', color: '#888', fontSize: 14, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}>Volver</button>
                <button onClick={handleSubmitOrder} disabled={!puedeConfirmar} style={{
                  flex: 2, padding: '14px', borderRadius: 10, border: 'none',
                  background: puedeConfirmar ? '#e85d04' : '#1a1a1a',
                  color: puedeConfirmar ? '#fff' : '#444',
                  fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                  cursor: puedeConfirmar ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                  {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : <>Ir a pagar <ChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {step === 'fotos3d' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(59,130,246,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Box size={28} color="#3b82f6" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 8 }}>¡Pedido recibido!</h2>
              <p style={{ color: '#888', fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
                Para mejorar la calidad del modelo 3D podés agregar hasta 5 fotos adicionales del objeto desde distintos ángulos.
              </p>
              <p style={{ color: '#555', fontSize: 12, marginBottom: 32 }}>Esto es opcional pero mejora mucho el resultado final.</p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
                {fotos3d.map((url, i) => (
                  <img key={i} src={url} alt={`ref-${i}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #2a2a2a' }} />
                ))}
                {fotos3d.length < 5 && (
                  <label style={{ width: 80, height: 80, borderRadius: 8, border: '2px dashed #2a2a2a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#111', gap: 4 }}>
                    {uploadingFoto
                      ? <Loader2 size={20} color="#666" style={{ animation: 'spin 1s linear infinite' }} />
                      : <><Upload size={20} color="#666" /><span style={{ color: '#666', fontSize: 10 }}>Agregar</span></>
                    }
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) handleUploadFoto3d(e.target.files[0]) }}
                    />
                  </label>
                )}
              </div>

              <p style={{ color: '#555', fontSize: 12, marginBottom: 24 }}>
                {fotos3d.length > 0 ? `✓ ${fotos3d.length} foto/s agregada/s` : 'Sin fotos adicionales por ahora'}
              </p>

              <button onClick={() => orderId && redirectToPayment(orderId)} style={{
                padding: '14px 32px', borderRadius: 10, border: 'none',
                background: '#e85d04', color: '#fff', fontSize: 14, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              }}>
                {fotos3d.length > 0 ? 'Listo, ir a pagar →' : 'Continuar y pagar →'}
              </button>
            </div>
          )}

          {step === 'redirecting' && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Loader2 size={48} color="#e85d04" style={{ animation: 'spin 1s linear infinite', marginBottom: 24 }} />
              <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Preparando tu pago...</h2>
              <p style={{ color: '#666', fontSize: 14 }}>Te estamos redirigiendo a MercadoPago de forma segura</p>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 72, height: 72, background: 'rgba(74,222,128,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <CheckCircle size={36} color="#4ade80" />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 400, marginBottom: 8 }}>¡Todo listo!</h2>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
                Te contactaremos a <strong style={{ color: '#888' }}>{email}</strong> para coordinar el pago.
              </p>
              {orderId && <p style={{ color: '#444', fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 32 }}>Orden #{orderId.slice(0, 8).toUpperCase()}</p>}
              <button onClick={reset} style={{ padding: '14px 32px', borderRadius: 10, border: '1px solid #2a2a2a', background: 'transparent', color: '#888', fontSize: 14, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}>
                Hacer otro pedido
              </button>
            </div>
          )}
        </div>

        <footer style={{ borderTop: '1px solid #1a1a1a', padding: '20px 40px', textAlign: 'center', background: 'rgba(10,10,10,0.8)' }}>
          <p style={{ color: '#333', fontSize: 11, margin: 0 }}>
            FabriQ · Plataforma de manufactura on-demand ·{' '}
            <a href="/admin" style={{ color: '#444', textDecoration: 'none' }}>Acceso talleres</a>
            {' · '}
            <a href="/terminos" style={{ color: '#444', textDecoration: 'none' }}>Términos y condiciones</a>
          </p>
        </footer>
      </main>
    </>
  )
}