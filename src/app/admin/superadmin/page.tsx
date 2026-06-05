'use client'
// src/app/admin/superadmin/page.tsx

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, Loader2, CheckCircle, XCircle, Clock, ArrowLeft, RefreshCw } from 'lucide-react'

type Taller = {
  id: string
  user_id: string
  nombre_taller: string
  codigo_taller: string
  estado: string
  moneda: string
  created_at?: string
  email?: string
}

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#f59e0b' },
  activo:    { label: 'Activo',    color: '#4ade80' },
  bloqueado: { label: 'Bloqueado', color: '#ef4444' },
}

// Tu user_id de superadmin — reemplazalo con el tuyo de Supabase
const SUPERADMIN_EMAIL = '87cristhianfam@gmail.com' // ← cambiá esto por tu email real

export default function Superadmin() {
  const router = useRouter()
  const [talleres, setTalleres] = useState<Taller[]>([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/admin'); return }

    // Solo el superadmin puede acceder
    if (session.user.email !== SUPERADMIN_EMAIL) {
      router.push('/admin/dashboard')
      return
    }

    setAutorizado(true)
    await loadTalleres()
  }

  async function loadTalleres() {
    setLoading(true)
    const { data, error } = await supabase
      .from('shop_config')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setTalleres(data)
    setLoading(false)
  }

  async function cambiarEstado(userId: string, nuevoEstado: string) {
    setActualizando(userId)
    const { error } = await supabase
      .from('shop_config')
      .update({ estado: nuevoEstado })
      .eq('user_id', userId)

    if (!error) {
      setTalleres(prev => prev.map(t =>
        t.user_id === userId ? { ...t, estado: nuevoEstado } : t
      ))
    }
    setActualizando(null)
  }

  if (!autorizado) return null

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0ece3', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <header style={{ borderBottom: '1px solid #1e1e1e', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #e85d04, #f48c06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 600 }}>FabriQ</span>
          <span style={{ color: '#444', fontSize: 13 }}>/ Superadmin</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadTalleres} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => router.push('/admin/dashboard')} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <ArrowLeft size={14} /> Dashboard
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Métricas rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Pendientes', value: talleres.filter(t => t.estado === 'pendiente').length, color: '#f59e0b' },
            { label: 'Activos', value: talleres.filter(t => t.estado === 'activo').length, color: '#4ade80' },
            { label: 'Total talleres', value: talleres.length, color: '#f0ece3' },
          ].map((m, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20 }}>
              <p style={{ color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>{m.label}</p>
              <p style={{ fontSize: 32, fontWeight: 600, margin: 0, fontFamily: "'DM Mono', monospace", color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Talleres registrados</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={32} color="#e85d04" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : talleres.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444' }}>
            <Clock size={40} style={{ marginBottom: 16 }} />
            <p>No hay talleres registrados todavía.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {talleres.map(taller => (
              <div key={taller.user_id} style={{
                background: '#111', border: '1px solid #1e1e1e',
                borderRadius: 10, padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px' }}>{taller.nombre_taller}</p>
                      <p style={{ fontSize: 12, color: '#555', margin: 0, fontFamily: "'DM Mono', monospace" }}>
                        {taller.codigo_taller} · {taller.moneda}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Estado actual */}
                    <span style={{
                      fontSize: 12, color: ESTADO_LABELS[taller.estado]?.color || '#888',
                      background: `${ESTADO_LABELS[taller.estado]?.color}15` || '#1a1a1a',
                      padding: '4px 10px', borderRadius: 20,
                      border: `1px solid ${ESTADO_LABELS[taller.estado]?.color}30`,
                    }}>
                      {ESTADO_LABELS[taller.estado]?.label || taller.estado}
                    </span>

                    {/* Botones de acción */}
                    {actualizando === taller.user_id ? (
                      <Loader2 size={16} color="#666" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {taller.estado !== 'activo' && (
                          <button
                            onClick={() => cambiarEstado(taller.user_id, 'activo')}
                            style={{
                              padding: '6px 12px', borderRadius: 6,
                              border: '1px solid rgba(74,222,128,0.3)',
                              background: 'rgba(74,222,128,0.05)', color: '#4ade80',
                              fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <CheckCircle size={12} /> Aprobar
                          </button>
                        )}
                        {taller.estado !== 'pendiente' && (
                          <button
                            onClick={() => cambiarEstado(taller.user_id, 'pendiente')}
                            style={{
                              padding: '6px 12px', borderRadius: 6,
                              border: '1px solid rgba(245,158,11,0.3)',
                              background: 'rgba(245,158,11,0.05)', color: '#f59e0b',
                              fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <Clock size={12} /> Pendiente
                          </button>
                        )}
                        {taller.estado !== 'bloqueado' && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Bloqueár a ${taller.nombre_taller}?`)) {
                                cambiarEstado(taller.user_id, 'bloqueado')
                              }
                            }}
                            style={{
                              padding: '6px 12px', borderRadius: 6,
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.05)', color: '#ef4444',
                              fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <XCircle size={12} /> Bloquear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}