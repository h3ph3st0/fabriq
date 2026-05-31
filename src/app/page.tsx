'use client'
// src/app/admin/page.tsx

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, Loader2, Eye, EyeOff, Zap } from 'lucide-react'

type Tab = 'login' | 'register' | 'cliente'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('login')
  const [success, setSuccess] = useState('')

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(10,10,10,0.8)',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    color: '#f0ece3',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  async function handleSubmit() {
    if (!email || !password) { setError('Completá todos los campos.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    setLoading(true); setError(''); setSuccess('')

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/admin/dashboard')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('¡Cuenta creada! Revisá tu email para confirmar el registro.')
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      if (e?.message?.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos.')
      } else if (e?.message?.includes('already registered')) {
        setError('Este email ya está registrado. Iniciá sesión.')
      } else {
        setError(e?.message || 'Ocurrió un error. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      backgroundImage: 'url(/fondo.png)',
      backgroundSize: '350px',
      backgroundRepeat: 'repeat',
      backgroundBlendMode: 'overlay',
      color: '#f0ece3',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #e85d04, #f48c06)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Box size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>FabriQ</h1>
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Plataforma de manufactura on-demand</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(17,17,17,0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #1e1e1e',
          borderRadius: 16,
          overflow: 'hidden',
        }}>

          {/* Banner "Soy Cliente" siempre visible arriba */}
          <div
            onClick={() => window.location.href = '/'}
            style={{
              background: tab === 'cliente'
                ? 'linear-gradient(135deg, rgba(232,93,4,0.25), rgba(244,140,6,0.15))'
                : 'rgba(232,93,4,0.08)',
              borderBottom: `1px solid ${tab === 'cliente' ? 'rgba(232,93,4,0.4)' : 'rgba(232,93,4,0.15)'}`,
              padding: '16px 24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(232,93,4,0.2), rgba(244,140,6,0.1))')}
            onMouseLeave={e => (e.currentTarget.style.background = tab === 'cliente' ? 'linear-gradient(135deg, rgba(232,93,4,0.25), rgba(244,140,6,0.15))' : 'rgba(232,93,4,0.08)')}
          >
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #e85d04, #f48c06)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={18} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e85d04' }}>
                ¿Querés cotizar un pedido?
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#a06030', marginTop: 2 }}>
                Subí tu diseño → la IA analiza y cotiza en 30 segundos
              </p>
            </div>
            <span style={{ color: '#e85d04', fontSize: 18, fontWeight: 300 }}>→</span>
          </div>

          {/* Tabs login/register */}
          <div style={{ padding: '24px 32px 0' }}>
            <div style={{
              display: 'flex',
              marginBottom: 24,
              background: 'rgba(10,10,10,0.8)',
              borderRadius: 10,
              padding: 4,
              border: '1px solid #1e1e1e',
              gap: 2,
            }}>
              {(['login', 'register'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); setSuccess('') }}
                  style={{
                    flex: 1,
                    padding: '9px 4px',
                    borderRadius: 7,
                    border: 'none',
                    background: tab === t ? '#1e1e1e' : 'transparent',
                    color: tab === t ? '#f0ece3' : '#555',
                    fontSize: 13,
                    fontWeight: tab === t ? 500 : 400,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </button>
              ))}
            </div>

            {/* Campos */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="taller@email.com"
                style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={{ ...inputStyle, paddingRight: 48 }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: '#666', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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

            {success && (
              <div style={{
                marginBottom: 16, padding: '12px 16px',
                background: 'rgba(74,222,128,0.1)',
                border: '1px solid rgba(74,222,128,0.2)',
                borderRadius: 8, color: '#4ade80', fontSize: 13,
              }}>
                {success}
              </div>
            )}
          </div>

          {/* Botón submit */}
          <div style={{ padding: '0 32px 32px' }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 10, border: 'none',
                background: loading ? '#1a1a1a' : '#e85d04',
                color: loading ? '#444' : '#fff',
                fontSize: 15, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Procesando...</>
                : tab === 'login' ? 'Entrar al panel' : 'Crear cuenta'
              }
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    </main>
  )
}