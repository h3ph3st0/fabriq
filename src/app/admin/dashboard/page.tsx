'use client'
// src/app/admin/dashboard/page.tsx

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, LogOut, Settings, RefreshCw, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

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
  ai_analysis: {
    viable: boolean
    copyright_alert: boolean
    issues: string[]
    recommendations: string[]
    estimated_time: string
    price_breakdown: { description: string }
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Pendiente',    color: '#888' },
  quoted:       { label: 'Cotizado',     color: '#f59e0b' },
  in_production:{ label: 'En producción',color: '#3b82f6' },
  done:         { label: 'Entregado',    color: '#4ade80' },
}

const SERVICE_LABELS: Record<string, string> = {
  dtf: 'DTF', '3d': '3D', sublimacion: 'Sublimación'
}

export default function Dashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    checkAuth()
    loadOrders()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin')
      return
    }
    setUserEmail(session.user.email || '')
  }

  async function loadOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setOrders(data)
    setLoading(false)
  }

  async function updateStatus(orderId: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status } : null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  const totalRevenue = orders
    .filter(o => o.status === 'done')
    .reduce((sum, o) => sum + (o.price_ars || 0), 0)

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a',
      backgroundImage: 'url(/fondo.png)',
      backgroundSize: '350px',
      backgroundRepeat: 'repeat',
      backgroundBlendMode: 'overlay',
      opacity: 1, color: '#f0ece3', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: '1px solid #1e1e1e', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #e85d04, #f48c06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 600 }}>FabriQ</span>
          <span style={{ color: '#444', fontSize: 13 }}>/ Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#666', fontSize: 13 }}>{userEmail}</span>
          <button onClick={() => router.push('/admin/precios')} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <Settings size={14} /> Precios
          </button>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Métricas */}
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

        {/* Lista de órdenes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Órdenes recibidas</h2>
          <button onClick={loadOrders} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={32} color="#e85d04" style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444' }}>
            <Clock size={40} style={{ marginBottom: 16 }} />
            <p>Todavía no hay órdenes. Compartí el link de cotización con tus clientes.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => setSelected(selected?.id === order.id ? null : order)}
                style={{
                  background: selected?.id === order.id ? '#161616' : '#111',
                  border: `1px solid ${selected?.id === order.id ? '#2a2a2a' : '#1e1e1e'}`,
                  borderRadius: 10, padding: '16px 20px',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#444' }}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 14 }}>{order.customer_email}</span>
                    <span style={{ fontSize: 12, color: '#666', background: '#1a1a1a', padding: '2px 8px', borderRadius: 20 }}>
                      {SERVICE_LABELS[order.service_type] || order.service_type}
                    </span>
                    {order.ai_analysis?.copyright_alert && (
                      <AlertTriangle size={14} color="#f59e0b" />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: '#e85d04' }}>
                      ${order.price_ars?.toLocaleString('es-AR')}
                    </span>
                    <span style={{ fontSize: 12, color: STATUS_LABELS[order.status]?.color || '#888' }}>
                      {STATUS_LABELS[order.status]?.label || order.status}
                    </span>
                    <span style={{ fontSize: 12, color: '#444' }}>
                      {new Date(order.created_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* Detalle expandido */}
                {selected?.id === order.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e1e1e' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>Archivo</p>
                        <p style={{ fontSize: 13, margin: 0 }}>{order.file_name}</p>
                      </div>
                      <div>
                        <p style={{ color: '#666', fontSize: 12, margin: '0 0 4px' }}>Notas del cliente</p>
                        <p style={{ fontSize: 13, margin: 0, color: order.notes ? '#f0ece3' : '#444' }}>
                          {order.notes || 'Sin notas'}
                        </p>
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

                    {order.file_url && (
                      <a href={order.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#e85d04', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
                        Ver archivo del cliente →
                      </a>
                    )}

                    {/* Cambiar estado */}
                    <div>
                      <p style={{ color: '#666', fontSize: 12, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Cambiar estado
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {Object.entries(STATUS_LABELS).map(([key, val]) => (
                          <button
                            key={key}
                            onClick={e => { e.stopPropagation(); updateStatus(order.id, key) }}
                            style={{
                              padding: '6px 14px', borderRadius: 6, border: 'none',
                              background: order.status === key ? '#1e1e1e' : 'transparent',
                              color: order.status === key ? val.color : '#555',
                              fontSize: 12, cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                              outline: order.status === key ? `1px solid ${val.color}` : '1px solid #2a2a2a',
                            }}
                          >
                            {order.status === key && <CheckCircle size={10} style={{ marginRight: 4, display: 'inline' }} />}
                            {val.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}