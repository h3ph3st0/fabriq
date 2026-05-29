'use client'
// src/app/admin/precios/page.tsx

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, ArrowLeft, Save, Loader2, CheckCircle } from 'lucide-react'

type ShopConfig = {
  nombre_taller: string
  costo_filamento_por_gramo: number
  costo_hora_maquina: number
  margen_3d: number
  costo_dtf_por_cm2: number
  costo_transfer_dtf: number
  mano_obra_dtf: number
  margen_dtf: number
  costo_sublimacion_por_cm2: number
  mano_obra_sublimacion: number
  margen_sublimacion: number
  moneda: string
}

const defaultConfig: ShopConfig = {
  nombre_taller: '',
  costo_filamento_por_gramo: 15,
  costo_hora_maquina: 500,
  margen_3d: 40,
  costo_dtf_por_cm2: 2.5,
  costo_transfer_dtf: 200,
  mano_obra_dtf: 300,
  margen_dtf: 40,
  costo_sublimacion_por_cm2: 1.8,
  mano_obra_sublimacion: 250,
  margen_sublimacion: 40,
  moneda: 'ARS',
}

export default function Precios() {
  const router = useRouter()
  const [config, setConfig] = useState<ShopConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/admin'); return }
    setUserId(session.user.id)

    const { data } = await supabase
      .from('shop_config')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (data) setConfig(data)
    setLoading(false)
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)

    const { error } = await supabase
      .from('shop_config')
      .upsert({ ...config, user_id: userId, updated_at: new Date().toISOString() })

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  function update(key: keyof ShopConfig, value: string | number) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#0a0a0a',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    color: '#f0ece3',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: 12, color: '#666',
    display: 'block', marginBottom: 6,
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color="#e85d04" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0ece3', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <header style={{ borderBottom: '1px solid #1e1e1e', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #e85d04, #f48c06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 600 }}>FabriQ</span>
          <span style={{ color: '#444', fontSize: 13 }}>/ Configuración de precios</span>
        </div>
        <button onClick={() => router.push('/admin/dashboard')} style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <ArrowLeft size={14} /> Volver
        </button>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 40, lineHeight: 1.6 }}>
          Configurá los costos reales de tu taller. La IA usará estos valores para calcular los presupuestos automáticamente. Actualizalos cada vez que cambien tus costos.
        </p>

        {/* Info del taller */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
            Info del taller
          </h2>
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nombre del taller</label>
                <input type="text" value={config.nombre_taller} onChange={e => update('nombre_taller', e.target.value)} placeholder="Ej: Calavera Gaucha" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Moneda</label>
                <select value={config.moneda} onChange={e => update('moneda', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="ARS">ARS — Peso argentino</option>
                  <option value="USD">USD — Dólar</option>
                  <option value="MXN">MXN — Peso mexicano</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Impresión 3D */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
            Impresión 3D
          </h2>
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Costo filamento por gramo ({config.moneda})</label>
                <input type="number" value={config.costo_filamento_por_gramo} onChange={e => update('costo_filamento_por_gramo', parseFloat(e.target.value))} min="0" step="0.5" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Costo hora máquina ({config.moneda})</label>
                <input type="number" value={config.costo_hora_maquina} onChange={e => update('costo_hora_maquina', parseFloat(e.target.value))} min="0" step="10" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Margen de ganancia (%)</label>
                <input type="number" value={config.margen_3d} onChange={e => update('margen_3d', parseFloat(e.target.value))} min="0" max="300" step="5" style={inputStyle} />
              </div>
            </div>
          </div>
        </section>

        {/* DTF */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
            DTF — Remeras y telas
          </h2>
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Costo por cm² ({config.moneda})</label>
                <input type="number" value={config.costo_dtf_por_cm2} onChange={e => update('costo_dtf_por_cm2', parseFloat(e.target.value))} min="0" step="0.1" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Costo transfer ({config.moneda})</label>
                <input type="number" value={config.costo_transfer_dtf} onChange={e => update('costo_transfer_dtf', parseFloat(e.target.value))} min="0" step="10" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mano de obra ({config.moneda})</label>
                <input type="number" value={config.mano_obra_dtf} onChange={e => update('mano_obra_dtf', parseFloat(e.target.value))} min="0" step="10" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Margen (%)</label>
                <input type="number" value={config.margen_dtf} onChange={e => update('margen_dtf', parseFloat(e.target.value))} min="0" max="300" step="5" style={inputStyle} />
              </div>
            </div>
          </div>
        </section>

        {/* Sublimación */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
            Sublimación
          </h2>
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Costo por cm² ({config.moneda})</label>
                <input type="number" value={config.costo_sublimacion_por_cm2} onChange={e => update('costo_sublimacion_por_cm2', parseFloat(e.target.value))} min="0" step="0.1" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mano de obra ({config.moneda})</label>
                <input type="number" value={config.mano_obra_sublimacion} onChange={e => update('mano_obra_sublimacion', parseFloat(e.target.value))} min="0" step="10" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Margen (%)</label>
                <input type="number" value={config.margen_sublimacion} onChange={e => update('margen_sublimacion', parseFloat(e.target.value))} min="0" max="300" step="5" style={inputStyle} />
              </div>
            </div>
          </div>
        </section>

        {/* Guardar */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '16px',
            borderRadius: 10, border: 'none',
            background: saved ? 'rgba(74,222,128,0.15)' : saving ? '#1a1a1a' : '#e85d04',
            color: saved ? '#4ade80' : saving ? '#444' : '#fff',
            fontSize: 15, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            outline: saved ? '1px solid rgba(74,222,128,0.3)' : 'none',
          }}
        >
          {saving
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
            : saved
            ? <><CheckCircle size={16} /> Guardado correctamente</>
            : <><Save size={16} /> Guardar configuración</>
          }
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </main>
  )
}