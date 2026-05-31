'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, Loader2, Eye, EyeOff, Bot } from 'lucide-react'

type Tab = 'login' | 'register'

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

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
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
        setSuccess('Cuenta creada. Revisá tu email para confirmar.')
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      if (e?.message?.includes('Invalid login credentials')) setError('Email o contraseña incorrectos.')
      else if (e?.message?.includes('already registered')) setError('Email ya registrado. Iniciá sesión.')
      else setError(e?.message || 'Error. Intentá de nuevo.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        body {
          margin: 0;
          background-color: #0a0a0a;
          background-image: url(/fondo.png);
          background-size: 350px;
          background-repeat: repeat;
        }
        @media (max-width: 640px) { body { background-image: none; } }
        .cliente-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          background: linear-gradient(135deg, rgba(232,93,4,0.2), rgba(244,140,6,0.1));
          border: 2px solid rgba(232,93,4,0.5);
          border-radius: 14px;
          padding: 18px 24px;
          margin-bottom: 12px;
          box-sizing: border-box;
          text-decoration: none;
          color: inherit;
        }
        .cliente-banner:hover {
          background: linear-gradient(135deg, rgba(232,93,4,0.3), rgba(244,140,6,0.2));
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <main style={{
        minHeight: '100vh',
        color: '#f0ece3',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        gap: 16,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #e85d04, #f48c06)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Box size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>FabriQ</h1>
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Plataforma de manufactura on-demand</p>
        </div>

        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* BANNER CLIENTES — link HTML puro */}
          <a href="https://fabriq-kappa.vercel.app/" className="cliente-banner">
            <div style={{
              width: 48, height: 48,
              background: 'linear-gradient(135deg, #e85d04, #f48c06)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Bot size={26} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e85d04' }}>
                Clientes
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#a06030', lineHeight: 1.4 }}>
                La IA analiza tu diseño y cotiza en 30 segundos
              </p>
            </div>
            <span style={{ color: '#e85d04', fontSize: 22 }}>→</span>
          </a>

          {/* Card login */}
          <div style={{
            background: 'rgba(17,17,17,0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #1e1e1e',
            borderRadius: 16,
            padding: '28px 32px',
          }}>
            <div style={{
              display: 'flex', marginBottom: 24,
              background: 'rgba(10,10,10,0.8)',
              borderRadius: 10, padding: 4,
              border: '1px solid #1e1e1e', gap: 2,
            }}>
              {(['login', 'register'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => { setTab(t); setError(''); setSuccess('') }}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: 7, border: 'none',
                    background: tab === t ? '#1e1e1e' : 'transparent',
                    color: tab === t ? '#f0ece3' : '#555',
                    fontSize: 13, fontWeight: tab === t ? 500 : 400,
                    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                  }}
                >
                  {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="email" style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Email
                </label>
                <input id="email" name="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="taller@email.com"
                  autoComplete="email" style={inputStyle} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label htmlFor="password" style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    style={{ ...inputStyle, paddingRight: 48 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, color: '#4ade80', fontSize: 13 }}>
                  {success}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                background: loading ? '#1a1a1a' : '#e85d04',
                color: loading ? '#444' : '#fff',
                fontSize: 15, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Procesando...</>
                  : tab === 'login' ? 'Entrar al panel' : 'Crear cuenta'
                }
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}