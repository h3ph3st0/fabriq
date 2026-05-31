'use client'
// src/app/admin/page.tsx — Login del taller

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, Loader2, Eye, EyeOff } from 'lucide-react'

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'login', label: 'Iniciar sesión' },
    { key: 'register', label: 'Registrarse' },
    { key: 'cliente', label: 'Soy Cliente' },
  ]

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
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Panel del taller</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(17,17,17,0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #1e1e1e',
          borderRadius: 16,
          padding: '32px',
        }}>
          {/* 3 Tabs */}
          <div style={{
            display: 'flex',
            marginBottom: 28,
            background: 'rgba(10,10,10,0.8)',
            borderRadius: 10,
            padding: 4,
            border: '1px solid #1e1e1e',
            gap: 2,
          }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setError(''); setSuccess('') }}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  borderRadius: 7,
                  border: 'none',
                  background: tab === t.key
                    ? t.key === 'cliente' ? 'rgba(232,93,4,0.15)' : '#1e1e1e'
                    : 'transparent',
                  color: tab === t.key
                    ? t.key === 'cliente' ? '#e85d04' : '#f0ece3'
                    : '#555',
                  fontSize: 12,
                  fontWeight: tab === t.key ? 500 : 400,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  outline: tab === t.key && t.key === 'cliente'
                    ? '1px solid rgba(232,93,4,0.2)'
                    : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenido según tab */}
          {tab === 'cliente' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 56, height: 56,
                background: 'rgba(232,93,4,0.1)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid rgba(232,93,4,0.2)',
              }}>
                <Box size={24} color="#e85d04" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px' }}>
                ¿Querés cotizar un pedido?
              </h3>
              <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' }}>
                Subí tu diseño, la IA analiza viabilidad técnica y genera el precio en 30 segundos. Sin registro.
              </p>
              <button
                onClick={() => router.push('/')}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 10, border: 'none',
                  background: '#e85d04',
                  color: '#fff',
                  fontSize: 15, fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                }}
              >
                Cotizar mi pedido →
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </main>
  )
}