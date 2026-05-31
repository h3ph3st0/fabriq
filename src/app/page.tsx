'use client'
// src/app/admin/page.tsx — Login del taller

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, Loader2, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [success, setSuccess] = useState('')

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: '#111',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    color: '#f0ece3',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  async function handleSubmit() {
    if (!email || !password) {
      setError('Completá todos los campos.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'login') {
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
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
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
          background: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: 16,
          padding: '32px',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: 28, background: '#0a0a0a', borderRadius: 8, padding: 4 }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1, padding: '8px',
                  borderRadius: 6, border: 'none',
                  background: mode === m ? '#1e1e1e' : 'transparent',
                  color: mode === m ? '#f0ece3' : '#666',
                  fontSize: 13, fontWeight: mode === m ? 500 : 400,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
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
              : mode === 'login' ? 'Entrar al panel' : 'Crear cuenta'
            }
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        <a href="/" style={{
  display: 'block',
  textAlign: 'center',
  marginTop: 24,
  padding: '14px',
  borderRadius: 10,
  border: '1px solid #2a2a2a',
  color: '#e85d04',
  textDecoration: 'none',
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
}}>
  ¿Sos cliente? → Cotizá tu pedido acá
</a>
      </div>
    </main>
  )
}