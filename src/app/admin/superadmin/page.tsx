'use client'
// src/app/admin/superadmin/page.tsx

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, Loader2, CheckCircle, XCircle, Clock, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'

type Taller = {
  id: string
  user_id: string
  nombre_taller: string
  codigo_taller: string
  estado: string
  moneda: string
  trial_expires_at?: string
  plan?: string
  exento?: boolean
}

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente',  color: '#f59e0b' },
  activo:    { label: 'Activo',     color: '#4ade80' },
  bloqueado: { label: 'Bloqueado',  color: '#ef4444' },
}

const PLAN_LABELS: Record<string, { label: string; color: string; precio: string }> = {
  trial:         { label: 'Trial',         color: '#888',    precio: 'Gratis 14 días' },
  early_adopter: { label: 'Early Adopter', color: '#a855f7', precio: '$5 USD/mes' },
  base:          { label: 'Base',          color: '#3b82f6', precio: '$10 USD/mes + 2%' },
  pro:           { label: 'Pro',           color: '#e85d04', precio: '$25 USD/mes + 1%' },
  agency:        { label: 'Agency',        color: '#f59e0b', precio: '$60 USD/mes + 0.5%' },
}

function diasRestantes(trialExpiresAt?: string): number | null {
  if (!trialExpiresAt) return null
  const diff = new Date(trialExpiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function Superadmin() {
  const router = useRouter()
  const [talleres, setTalleres] = useState<Taller[]>([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [autorizado, setAutorizado] = useState(false)
  const [cambiandoPlan, setCambiandoPlan] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/admin'); return }

    // ── Verificar en el servidor, no solo en el cliente ──
    try {
      const response = await fetch('/api/verify-superadmin', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const { authorized } = await response.json()
      if (!authorized) {
        router.push('/admin/dashboard')
        return
      }
    } catch {
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
    const updates: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === 'activo') {
      const trialExpires = new Date()
      trialExpires.setDate(trialExpires.getDate() + 14)
      updates.trial_expires_at = trialExpires.toISOString()
      updates.plan = 'trial'
    }
    const { error } = await supabase.from('shop_config').update(updates).eq('user_id', userId)
    if (!error) setTalleres(prev => prev.map(t => t.user_id === userId ? { ...t, ...updates } : t))
    setActualizando(null)
  }

  async function cambiarPlan(userId: string, nuevoPlan: string) {
    setCambiandoPlan(userId)
    const { error } = await supabase.from('shop_config').update({ plan: nuevoPlan }).eq('user_id', userId)
    if (!error) setTalleres(prev => prev.map(t => t.user_id === userId ? { ...t, plan: nuevoPlan } : t))
    setCambiandoPlan(null)
  }

  async function toggleExento(userId: string, valorActual: boolean) {
    const { error } = await supabase.from('shop_config').update({ exento: !valorActual }).eq('user_id', userId)
    if (!error) setTalleres(prev => prev.map(t => t.user_id === userId ? { ...t, exento: !valorActual } : t))
  }

  async function eliminarTaller(userId: string, nombre: string) {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    setEliminando(userId)
    const { error } = await supabase.from('shop_config').delete().eq('user_id', userId)
    if (!error) {
      setTalleres(prev => prev.filter(t => t.user_id !== userId))
    } else {
      alert('Error al eliminar el taller')
    }
    setEliminando(null)
  }

  if (!autorizado) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color="#e85d04" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

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

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Pendientes', value: talleres.filter(t => t.estado === 'pendiente').length, color: '#f59e0b' },
            { label: 'Activos', value: talleres.filter(t => t.estado === 'activo').length, color: '#4ade80' },
            { label: 'Early Adopter', value: talleres.filter(t => t.plan === 'early_adopter').length, color: '#a855f7' },
            { label: 'Pro', value: talleres.filter(t => t.plan === 'pro').length, color: '#e85d04' },
            { label: 'Total', value: talleres.length, color: '#f0ece3' },
          ].map((m, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px' }}>
              <p style={{ color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>{m.label}</p>
              <p style={{ fontSize: 26, fontWeight: 600, margin: 0, fontFamily: "'DM Mono', monospace", color: m.color }}>{m.value}</p>
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
            {talleres.map(taller => {
              const dias = diasRestantes(taller.trial_expires_at)
              const trialVencido = dias !== null && dias <= 0
              const enPrueba = dias !== null && dias > 0
              const planInfo = PLAN_LABELS[taller.plan || 'trial']

              return (
                <div key={taller.user_id} style={{ background: '#111', border: `1px solid ${taller.exento ? 'rgba(74,222,128,0.2)' : '#1e1e1e'}`, borderRadius: 12, padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{taller.nombre_taller}</p>
                        {taller.exento && (
                          <span style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(74,222,128,0.2)' }}>
                            ⭐ Exento
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <p style={{ fontSize: 12, color: '#555', margin: 0, fontFamily: "'DM Mono', monospace" }}>
                          {taller.codigo_taller} · {taller.moneda}
                        </p>
                        <span style={{ fontSize: 11, color: ESTADO_LABELS[taller.estado]?.color || '#888', background: `${ESTADO_LABELS[taller.estado]?.color}15`, padding: '2px 8px', borderRadius: 20, border: `1px solid ${ESTADO_LABELS[taller.estado]?.color}30` }}>
                          {ESTADO_LABELS[taller.estado]?.label || taller.estado}
                        </span>
                        <span style={{ fontSize: 11, color: planInfo.color, background: `${planInfo.color}15`, padding: '2px 8px', borderRadius: 20, border: `1px solid ${planInfo.color}30` }}>
                          {planInfo.label} — {planInfo.precio}
                        </span>
                        {enPrueba && (
                          <span style={{ fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(59,130,246,0.2)' }}>
                            Trial: {dias} días restantes
                          </span>
                        )}
                        {trialVencido && !taller.exento && (
                          <span style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(239,68,68,0.2)' }}>
                            Trial vencido
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                      {actualizando === taller.user_id ? (
                        <Loader2 size={16} color="#666" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {taller.estado !== 'activo' && (
                            <button onClick={() => cambiarEstado(taller.user_id, 'activo')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.05)', color: '#4ade80', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={12} /> Aprobar
                            </button>
                          )}
                          {taller.estado !== 'pendiente' && (
                            <button onClick={() => cambiarEstado(taller.user_id, 'pendiente')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', color: '#f59e0b', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} /> Pendiente
                            </button>
                          )}
                          {taller.estado !== 'bloqueado' && (
                            <button onClick={() => { if (confirm(`¿Bloquear a ${taller.nombre_taller}?`)) cambiarEstado(taller.user_id, 'bloqueado') }} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                              <XCircle size={12} /> Bloquear
                            </button>
                          )}
                          {!taller.exento && (
                            <button onClick={() => eliminarTaller(taller.user_id, taller.nombre_taller)} disabled={eliminando === taller.user_id} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                              {eliminando === taller.user_id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <><Trash2 size={12} /> Eliminar</>}
                            </button>
                          )}
                        </div>
                      )}

                      {taller.estado === 'activo' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => toggleExento(taller.user_id, taller.exento || false)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${taller.exento ? 'rgba(74,222,128,0.3)' : '#2a2a2a'}`, background: taller.exento ? 'rgba(74,222,128,0.05)' : 'transparent', color: taller.exento ? '#4ade80' : '#555', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                            {taller.exento ? '⭐ Exento' : 'Marcar exento'}
                          </button>
                          <span style={{ fontSize: 11, color: '#555' }}>Plan:</span>
                          {cambiandoPlan === taller.user_id ? (
                            <Loader2 size={14} color="#666" style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <select value={taller.plan || 'trial'} onChange={e => cambiarPlan(taller.user_id, e.target.value)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#0a0a0a', color: '#f0ece3', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}>
                              {Object.entries(PLAN_LABELS).map(([key, val]) => (
                                <option key={key} value={key}>{val.label} — {val.precio}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}