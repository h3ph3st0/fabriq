'use client'
// src/app/admin/dashboard/page.tsx

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, LogOut, Settings, RefreshCw, Clock, CheckCircle, AlertTriangle, Loader2, QrCode, Download, Copy, Cpu, Eye, EyeOff, Trash2, Plus, X, Sparkles, MessageCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'

type Order = {
  id: string
  created_at: string
  customer_email: string
  file_name: string
  file_url: string
  service_type: string
  price_ars: number
  status: string
  notes: string
  stl_ia_url?: string
  stl_taller_url?: string
  status_3d?: string
  ai_analysis: {
    viable: boolean
    copyright_alert: boolean
    issues: string[]
    recommendations: string[]
    estimated_time: string
    price_breakdown: { description: string }
  }
}

type ShopConfig = {
  codigo_taller: string
  nombre_taller: string
  trial_expires_at?: string
  plan?: string
}

type ContenidoRedes = {
  instagram: string
  whatsapp: string
  facebook: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:       { label: 'Pendiente',     color: '#888' },
  quoted:        { label: 'Cotizado',      color: '#f59e0b' },
  in_production: { label: 'En producción', color: '#3b82f6' },
  done:          { label: 'Entregado',     color: '#4ade80' },
}

const SERVICE_LABELS: Record<string, string> = {
  dtf: 'DTF', '3d': '3D', sublimacion: 'Sublimación'
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  trial:         { label: 'Trial',         color: '#888' },
  early_adopter: { label: 'Early Adopter', color: '#a855f7' },
  base:          { label: 'Base',          color: '#3b82f6' },
  pro:           { label: 'Pro',           color: '#e85d04' },
  agency:        { label: 'Agency',        color: '#f59e0b' },
}

function extraerWhatsApp(notes: string): string | null {
  if (!notes) return null
  const match = notes.match(/WhatsApp:\s*(\d+)/)
  return match ? match[1] : null
}

function diasRestantesTrial(trialExpiresAt?: string): number | null {
  if (!trialExpiresAt) return null
  const diff = new Date(trialExpiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function Model3D({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url)
  scene.traverse((child: any) => {
    if (child.isMesh) child.material.wireframe = wireframe
  })
  return <primitive object={scene} scale={2} />
}

function Visor3D({ modelUrl, wireframe }: { modelUrl: string; wireframe: boolean }) {
  return (
    <div style={{ width: '100%', maxWidth: '100%', height: 300, background: '#0a0a0a', borderRadius: 10, border: '1px solid #2a2a2a', overflow: 'hidden', position: 'relative', contain: 'strict' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} style={{ width: '100%', height: '100%', display: 'block' }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Model3D url={modelUrl} wireframe={wireframe} />
        </Suspense>
        <OrbitControls enablePan={true} enableZoom={true} />
        <Environment preset="studio" />
      </Canvas>
    </div>
  )
}

function PanelContenido({ contenido, onCerrar }: { contenido: ContenidoRedes; onCerrar: () => void }) {
  const [copiadoKey, setCopiadoKey] = useState<string | null>(null)

  function copiar(texto: string, key: string) {
    navigator.clipboard.writeText(texto)
    setCopiadoKey(key)
    setTimeout(() => setCopiadoKey(null), 2000)
  }

  const plataformas = [
    { key: 'instagram', label: 'Instagram', icon: '📸', texto: contenido.instagram, color: '#E1306C' },
    { key: 'whatsapp', label: 'WhatsApp', icon: '💬', texto: contenido.whatsapp, color: '#25D366' },
    { key: 'facebook', label: 'Facebook', icon: '📘', texto: contenido.facebook, color: '#1877F2' },
  ]

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'rgba(232,93,4,0.04)', border: '1px solid rgba(232,93,4,0.2)', borderRadius: 12 }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#e85d04', fontSize: 12, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} /> Contenido generado para redes
        </p>
        <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plataformas.map(({ key, label, icon, texto, color }) => (
          <div key={key} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #1e1e1e', background: '#0f0f0f' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color, display: 'flex', alignItems: 'center', gap: 6 }}>{icon} {label}</span>
              <button onClick={() => copiar(texto, key)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${copiadoKey === key ? color : '#2a2a2a'}`, background: copiadoKey === key ? `${color}20` : 'transparent', color: copiadoKey === key ? color : '#666', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}>
                <Copy size={10} /> {copiadoKey === key ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <p style={{ margin: 0, padding: '12px 14px', fontSize: 13, color: '#999', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generating3d, setGenerating3d] = useState<string | null>(null)
  const [wireframe, setWireframe] = useState(false)
  const [extraImages, setExtraImages] = useState<Record<string, string[]>>({})
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [generandoContenido, setGenerandoContenido] = useState<string | null>(null)
  const [contenidoGenerado, setContenidoGenerado] = useState<Record<string, ContenidoRedes>>({})

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/admin'); return }
    setUserEmail(session.user.email || '')
    await loadShopConfig(session.user.id)
    await loadOrders()
  }

  async function loadShopConfig(userId: string) {
    const { data } = await supabase
      .from('shop_config')
      .select('codigo_taller, nombre_taller, trial_expires_at, plan')
      .eq('user_id', userId)
      .single()

    if (data) {
      setShopConfig(data)
      const tallerUrl = `${window.location.origin}/?taller=${data.codigo_taller}`
      const qrUrl = await QRCode.toDataURL(tallerUrl, { width: 300, margin: 2, color: { dark: '#f0ece3', light: '#111111' } })
      setQrDataUrl(qrUrl)
    }
  }

  async function loadOrders() {
    setLoading(true)
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (!error && data) setOrders(data)
    setLoading(false)
  }

  async function updateStatus(orderId: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status } : null)
  }

  async function handleDeleteOrder(orderId: string) {
    if (!confirm('¿Estás seguro de que querés eliminar este pedido?')) return
    setDeletingOrder(orderId)
    const { error } = await supabase.from('orders').delete().eq('id', orderId)
    if (!error) {
      setOrders(prev => prev.filter(o => o.id !== orderId))
      if (selected?.id === orderId) setSelected(null)
    }
    setDeletingOrder(null)
  }

  async function handleUploadExtraImage(orderId: string, file: File) {
    setUploadingImage(orderId)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `extra-${orderId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName)
      setExtraImages(prev => ({ ...prev, [orderId]: [...(prev[orderId] || []), urlData.publicUrl] }))
    } catch { alert('Error al subir la imagen') }
    finally { setUploadingImage(null) }
  }

  function removeExtraImage(orderId: string, index: number) {
    setExtraImages(prev => ({ ...prev, [orderId]: prev[orderId].filter((_, i) => i !== index) }))
  }

  async function handleGenerate3D(order: Order) {
    if (!order.file_url) return
    setGenerating3d(order.id)
    try {
      const response = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: order.file_url, extraImages: extraImages[order.id] || [], orderId: order.id })
      })
      const data = await response.json()
      if (data.success && data.modelUrl) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, stl_ia_url: data.modelUrl, stl_taller_url: data.modelUrl, status_3d: 'ready' } : o))
        if (selected?.id === order.id) setSelected(prev => prev ? { ...prev, stl_ia_url: data.modelUrl, stl_taller_url: data.modelUrl, status_3d: 'ready' } : null)
      } else { alert(`Error: ${data.error || 'No se pudo generar el modelo 3D'}`) }
    } catch { alert('Error de conexión al generar el modelo 3D') }
    finally { setGenerating3d(null) }
  }

  async function handleGenerarContenido(order: Order, modo: 'entregado' | 'preventa') {
    setGenerandoContenido(order.id + modo)
    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, serviceType: order.service_type, priceArs: order.price_ars, description: order.ai_analysis?.price_breakdown?.description || '', nombreTaller: shopConfig?.nombre_taller || 'el taller', modo, notes: order.notes || '' }),
      })
      if (!response.ok) throw new Error('Error al generar contenido')
      const data = await response.json()
      setContenidoGenerado(prev => ({ ...prev, [order.id + modo]: data }))
    } catch { alert('Error al generar el contenido. Intentá de nuevo.') }
    finally { setGenerandoContenido(null) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/admin'
  }

  function copyLink() {
    if (!shopConfig) return
    navigator.clipboard.writeText(`${window.location.origin}/?taller=${shopConfig.codigo_taller}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadQr() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `fabriq-qr-${shopConfig?.codigo_taller || 'taller'}.png`
    a.click()
  }

  function downloadModel(url: string, orderId: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = `modelo-3d-${orderId.slice(0, 8)}.glb`
    a.click()
  }

  const totalRevenue = orders.filter(o => o.status === 'done').reduce((sum, o) => sum + (o.price_ars || 0), 0)
  const tallerUrl = shopConfig ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?taller=${shopConfig.codigo_taller}` : ''

  const diasTrial = diasRestantesTrial(shopConfig?.trial_expires_at)
  const trialVencido = diasTrial !== null && diasTrial <= 0
  const enPrueba = diasTrial !== null && diasTrial > 0 && shopConfig?.plan === 'trial'
  const colorBanner = diasTrial !== null && diasTrial <= 3 ? '#f59e0b' : '#3b82f6'
  const planActual = PLAN_LABELS[shopConfig?.plan || 'trial']

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0ece3', fontFamily: "'DM Sans', sans-serif", position: 'relative' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Overlay de bloqueo cuando el trial vence */}
      {trialVencido && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 20, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Clock size={28} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 12 }}>Período de prueba vencido</h2>
            <p style={{ color: '#666', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
              Tu período de prueba de 14 días ha finalizado. Para continuar procesando pedidos activá tu plan.
            </p>
            <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16, marginBottom: 28, textAlign: 'left' }}>
              <p style={{ color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>Planes disponibles</p>
              {[
                { nombre: 'Early Adopter', precio: '$5 USD/mes', color: '#a855f7', nota: 'Solo por tiempo limitado' },
                { nombre: 'Base', precio: '$10 USD/mes + 2% por orden', color: '#3b82f6', nota: 'Hasta 50 pedidos/mes' },
                { nombre: 'Pro', precio: '$25 USD/mes + 1% por orden', color: '#e85d04', nota: 'Pedidos ilimitados + 3D' },
              ].map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid #1e1e1e' : 'none' }}>
                  <div>
                    <span style={{ fontSize: 13, color: p.color, fontWeight: 500 }}>{p.nombre}</span>
                    <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>{p.nota}</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#888', fontFamily: "'DM Mono', monospace" }}>{p.precio}</span>
                </div>
              ))}
            </div>
            <a href="mailto:fabriq@fabriq.com.ar?subject=Quiero activar mi plan FabriQ" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 10, background: '#e85d04', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              Activar mi plan →
            </a>
            <p style={{ color: '#444', fontSize: 12, margin: 0 }}>
              Contactanos a{' '}
              <a href="mailto:fabriq@fabriq.com.ar" style={{ color: '#666' }}>fabriq@fabriq.com.ar</a>
            </p>
          </div>
        </div>
      )}

      {/* Banner trial activo */}
      {enPrueba && (
        <div style={{ background: `${colorBanner}12`, borderBottom: `1px solid ${colorBanner}30`, padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Clock size={13} color={colorBanner} />
          <span style={{ fontSize: 13, color: colorBanner }}>
            <strong>Período de prueba activo</strong> — Te quedan <strong>{diasTrial} día{diasTrial !== 1 ? 's' : ''}</strong>.
            {diasTrial !== null && diasTrial <= 3 && ' ¡Escribinos a fabriq@fabriq.com.ar para activar tu plan!'}
          </span>
        </div>
      )}

      <header style={{ borderBottom: '1px solid #1e1e1e', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #e85d04, #f48c06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 600 }}>FabriQ</span>
          <span style={{ color: '#444', fontSize: 13 }}>/ Dashboard</span>
          {shopConfig?.nombre_taller && <span style={{ color: '#666', fontSize: 13 }}>· {shopConfig.nombre_taller}</span>}
          {/* Badge plan */}
          {planActual && (
            <span style={{ fontSize: 11, color: planActual.color, background: `${planActual.color}15`, padding: '2px 8px', borderRadius: 20, border: `1px solid ${planActual.color}30` }}>
              {planActual.label}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#666', fontSize: 13 }}>{userEmail}</span>
          <button onClick={() => setShowQr(!showQr)} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: showQr ? '#e85d04' : '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <QrCode size={14} /> Mi QR
          </button>
          <button onClick={() => router.push('/admin/precios')} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <Settings size={14} /> Precios
          </button>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {showQr && shopConfig && (
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 16, padding: 32, marginBottom: 32, display: 'flex', gap: 32, alignItems: 'center' }}>
            {qrDataUrl && <img src={qrDataUrl} alt="QR del taller" style={{ width: 160, height: 160, borderRadius: 12 }} />}
            <div style={{ flex: 1 }}>
              <p style={{ color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Código de tu taller</p>
              <p style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px', fontFamily: "'DM Mono', monospace", color: '#e85d04', letterSpacing: 4 }}>{shopConfig.codigo_taller}</p>
              <p style={{ color: '#555', fontSize: 12, margin: '0 0 20px', lineHeight: 1.5 }}>Compartí este QR o link con tus clientes.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={copyLink} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #2a2a2a', background: copied ? 'rgba(74,222,128,0.1)' : 'transparent', color: copied ? '#4ade80' : '#888', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Copy size={13} /> {copied ? '¡Copiado!' : 'Copiar link'}
                </button>
                <button onClick={downloadQr} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#e85d04', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={13} /> Descargar QR
                </button>
              </div>
              <p style={{ color: '#333', fontSize: 11, marginTop: 12, fontFamily: "'DM Mono', monospace", wordBreak: 'break-all' }}>{tallerUrl}</p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total órdenes', value: orders.length, color: '#f0ece3' },
            { label: 'En producción', value: orders.filter(o => o.status === 'in_production').length, color: '#3b82f6' },
            { label: 'Entregadas', value: orders.filter(o => o.status === 'done').length, color: '#4ade80' },
            { label: 'Revenue total', value: `$${totalRevenue.toLocaleString('es-AR')}`, color: '#e85d04' },
          ].map((m, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px' }}>
              <p style={{ color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>{m.label}</p>
              <p style={{ fontSize: 28, fontWeight: 600, margin: 0, fontFamily: "'DM Mono', monospace", color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Órdenes recibidas</h2>
          <button onClick={loadOrders} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={32} color="#e85d04" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444' }}>
            <Clock size={40} style={{ marginBottom: 16 }} />
            <p>Todavía no hay órdenes. Compartí tu QR con tus clientes.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {orders.map(order => {
              const whatsapp = extraerWhatsApp(order.notes)
              return (
                <div key={order.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement
                    if (target.closest('canvas') || target.tagName === 'CANVAS' || target.closest('button') || target.closest('input')) return
                    setSelected(selected?.id === order.id ? null : order)
                  }}
                  style={{ background: selected?.id === order.id ? '#161616' : '#111', border: `1px solid ${selected?.id === order.id ? '#2a2a2a' : '#1e1e1e'}`, borderRadius: 10, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#444' }}>#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontSize: 14 }}>{order.customer_email}</span>
                      <span style={{ fontSize: 12, color: '#666', background: '#1a1a1a', padding: '2px 8px', borderRadius: 20 }}>{SERVICE_LABELS[order.service_type] || order.service_type}</span>
                      {order.ai_analysis?.copyright_alert && <AlertTriangle size={14} color="#f59e0b" />}
                      {order.service_type === '3d' && order.status_3d === 'ready' && (
                        <span style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 20 }}>3D listo</span>
                      )}
                      {whatsapp && (
                        <span style={{ fontSize: 11, color: '#25D366', background: 'rgba(37,211,102,0.1)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(37,211,102,0.2)' }}>💬 WA</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: '#e85d04' }}>${order.price_ars?.toLocaleString('es-AR')}</span>
                      <span style={{ fontSize: 12, color: STATUS_LABELS[order.status]?.color || '#888' }}>{STATUS_LABELS[order.status]?.label || order.status}</span>
                      <span style={{ fontSize: 12, color: '#444' }}>{new Date(order.created_at).toLocaleDateString('es-AR')}</span>
                      <button onClick={e => { e.stopPropagation(); handleDeleteOrder(order.id) }} disabled={deletingOrder === order.id} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                        {deletingOrder === order.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>

                  {selected?.id === order.id && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e1e1e' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>Archivo</p>
                          <p style={{ fontSize: 13, margin: 0 }}>{order.file_name}</p>
                        </div>
                        <div>
                          <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>Notas del cliente</p>
                          <p style={{ fontSize: 13, margin: 0, color: order.notes ? '#f0ece3' : '#444' }}>{order.notes || 'Sin notas'}</p>
                        </div>
                        {order.ai_analysis?.estimated_time && (
                          <div>
                            <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>Tiempo estimado</p>
                            <p style={{ fontSize: 13, margin: 0 }}>{order.ai_analysis.estimated_time}</p>
                          </div>
                        )}
                        {order.ai_analysis?.price_breakdown?.description && (
                          <div>
                            <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>Detalle del precio</p>
                            <p style={{ fontSize: 13, margin: 0 }}>{order.ai_analysis.price_breakdown.description}</p>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                        {order.file_url && (
                          <a href={order.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#e85d04', fontSize: 13, textDecoration: 'none' }}>
                            Ver imagen del cliente →
                          </a>
                        )}
                        {whatsapp && (
                          <a href={`https://wa.me/54${whatsapp}?text=Hola! Te contactamos desde ${shopConfig?.nombre_taller || 'FabriQ'} por tu pedido.`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(37,211,102,0.3)', background: 'rgba(37,211,102,0.05)', color: '#25D366', fontSize: 13, textDecoration: 'none' }}>
                            <MessageCircle size={13} /> WhatsApp {whatsapp}
                          </a>
                        )}
                      </div>

                      {order.service_type === '3d' && !order.stl_ia_url && (
                        <div style={{ marginBottom: 16, padding: 16, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10 }} onClick={e => e.stopPropagation()}>
                          <p style={{ color: '#3b82f6', fontSize: 12, fontWeight: 500, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Imágenes de referencia adicionales</p>
                          <p style={{ color: '#555', fontSize: 11, margin: '0 0 12px', lineHeight: 1.5 }}>Agregá hasta 5 fotos para mejorar el modelo 3D.</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                            {(extraImages[order.id] || []).map((url, i) => (
                              <div key={i} style={{ position: 'relative', width: 64, height: 64 }}>
                                <img src={url} alt={`extra-${i}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #2a2a2a' }} />
                                <button onClick={() => removeExtraImage(order.id, i)} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                            {(extraImages[order.id] || []).length < 5 && (
                              <label style={{ width: 64, height: 64, borderRadius: 6, border: '1px dashed #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#111' }}>
                                {uploadingImage === order.id ? <Loader2 size={16} color="#666" style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} color="#666" />}
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleUploadExtraImage(order.id, e.target.files[0]) }} />
                              </label>
                            )}
                          </div>
                          {(extraImages[order.id] || []).length > 0 && <p style={{ color: '#3b82f6', fontSize: 11, margin: 0 }}>✓ {(extraImages[order.id] || []).length} imagen/es adicional/es</p>}
                        </div>
                      )}

                      {order.service_type === '3d' && !order.stl_ia_url && (
                        <div style={{ marginBottom: 16 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleGenerate3D(order)} disabled={generating3d === order.id} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: generating3d === order.id ? '#1a1a1a' : 'linear-gradient(135deg, #e85d04, #f48c06)', color: generating3d === order.id ? '#444' : '#fff', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: generating3d === order.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {generating3d === order.id ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generando modelo 3D...</> : <><Cpu size={14} /> Generar modelo 3D con IA</>}
                          </button>
                        </div>
                      )}

                      {order.stl_taller_url && (
                        <div style={{ marginBottom: 16 }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <p style={{ color: '#666', fontSize: 12, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modelo 3D generado</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setWireframe(!wireframe)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #2a2a2a', background: wireframe ? 'rgba(232,93,4,0.1)' : 'transparent', color: wireframe ? '#e85d04' : '#888', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                                {wireframe ? <EyeOff size={12} /> : <Eye size={12} />} {wireframe ? 'Sólido' : 'Wireframe'}
                              </button>
                              <button onClick={() => downloadModel(order.stl_taller_url!, order.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#e85d04', color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Download size={12} /> Descargar GLB
                              </button>
                            </div>
                          </div>
                          <Visor3D modelUrl={order.stl_taller_url} wireframe={wireframe} />
                        </div>
                      )}

                      <div style={{ marginBottom: 16 }}>
                        <p style={{ color: '#666', fontSize: 12, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cambiar estado</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {Object.entries(STATUS_LABELS).map(([key, val]) => (
                            <button key={key} type="button" onClick={e => { e.stopPropagation(); updateStatus(order.id, key) }} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: order.status === key ? '#1e1e1e' : 'transparent', color: order.status === key ? val.color : '#555', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", outline: order.status === key ? `1px solid ${val.color}` : '1px solid #2a2a2a' }}>
                              {order.status === key && <CheckCircle size={10} style={{ marginRight: 4, display: 'inline' }} />}
                              {val.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 16 }} onClick={e => e.stopPropagation()}>
                        <p style={{ color: '#666', fontSize: 12, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={12} /> Generar contenido para redes
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {order.status === 'done' && (
                            <button onClick={() => handleGenerarContenido(order, 'entregado')} disabled={generandoContenido === order.id + 'entregado'} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.05)', color: '#4ade80', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                              {generandoContenido === order.id + 'entregado' ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</> : <><Sparkles size={12} /> ✓ Trabajo entregado</>}
                            </button>
                          )}
                          <button onClick={() => handleGenerarContenido(order, 'preventa')} disabled={generandoContenido === order.id + 'preventa'} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(232,93,4,0.3)', background: 'rgba(232,93,4,0.05)', color: '#e85d04', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                            {generandoContenido === order.id + 'preventa' ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</> : <><Sparkles size={12} /> 🚀 Nuevo en venta</>}
                          </button>
                        </div>
                        {contenidoGenerado[order.id + 'entregado'] && (
                          <PanelContenido contenido={contenidoGenerado[order.id + 'entregado']} onCerrar={() => setContenidoGenerado(prev => { const n = { ...prev }; delete n[order.id + 'entregado']; return n })} />
                        )}
                        {contenidoGenerado[order.id + 'preventa'] && (
                          <PanelContenido contenido={contenidoGenerado[order.id + 'preventa']} onCerrar={() => setContenidoGenerado(prev => { const n = { ...prev }; delete n[order.id + 'preventa']; return n })} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </main>
  )
}