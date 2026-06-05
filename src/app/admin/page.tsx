'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Box, Loader2, Eye, EyeOff, ChevronRight } from 'lucide-react'

type Modo = 'login' | 'registro'

export default function AdminLogin() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('login')

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Registro
  const [regNombre, setRegNombre] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPassword2, setRegPassword2] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [registroExitoso, setRegistroExitoso] = useState(false)

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

  const labelStyle = {
    fontSize: 12, color: '#666',
    display: 'block', marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  }

  // ── LOGIN ──
  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!email || !password) { setError('Completá todos los campos.'); return }
    setLoading(true); setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      // Verificar que el taller esté activo
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: config } = await supabase
          .from('shop_config')
          .select('estado')
          .eq('user_id', session.user.id)
          .single()

        if (config?.estado === 'pendiente') {
          await supabase.auth.signOut()
          setError('Tu cuenta está pendiente de aprobación. Te notificaremos cuando esté activa.')
          return
        }
        if (config?.estado === 'bloqueado') {
          await supabase.auth.signOut()
          setError('Tu cuenta ha sido suspendida. Contactate con soporte en fabriq.com.ar.')
          return
        }
      }

      router.push('/admin/dashboard')
    } catch (err: unknown) {
      const e = err as { message?: string }
      if (e?.message?.includes('Invalid login credentials')) setError('Email o contraseña incorrectos.')
      else setError(e?.message || 'Error. Intentá de nuevo.')
    } finally { setLoading(false) }
  }

  // ── REGISTRO ──
  async function handleRegistro(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError('')

    if (!regNombre || !regEmail || !regPassword || !regPassword2) {
      setError('Completá todos los campos.'); return
    }
    if (regPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.'); return
    }
    if (regPassword !== regPassword2) {
      setError('Las contraseñas no coinciden.'); return
    }

    setLoading(true)
    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear el usuario.')

      // 2. Crear shop_config con estado pendiente
      const { error: configError } = await supabase
        .from('shop_config')
        .insert({
          user_id: authData.user.id,
          nombre_taller: regNombre,
          estado: 'pendiente',
          moneda: 'ARS',
          // Valores default hasta que configure sus precios
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
        })

      if (configError) throw configError

      // 3. Cerrar sesión (no puede entrar hasta que lo aprueben)
      await supabase.auth.signOut()

      setRegistroExitoso(true)

    } catch (err: unknown) {
      const e = err as { message?: string }
      if (e?.message?.includes('already registered')) setError('Ese email ya está registrado.')
      else setError(e?.message || 'Error al registrarse. Intentá de nuevo.')
    } finally { setLoading(false) }
  }

  function cambiarModo(m: Modo) {
    setModo(m)
    setError('')
    setEmail(''); setPassword('')
    setRegNombre(''); setRegEmail(''); setRegPassword(''); setRegPassword2('')
    setRegistroExitoso(false)
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
        {/* Logo */}
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
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Panel de talleres</p>
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Tabs login / registro */}
          <div style={{ display: 'flex', background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 4, marginBottom: 16 }}>
            {(['login', 'registro'] as Modo[]).map(m => (
              <button key={m} onClick={() => cambiarModo(m)} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: modo === m ? '#1e1e1e' : 'transparent',
                color: modo === m ? '#f0ece3' : '#555',
                fontSize: 13, fontWeight: modo === m ? 500 : 400,
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrar taller'}
              </button>
            ))}
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(17,17,17,0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #1e1e1e',
            borderRadius: 16,
            padding: '32px',
          }}>

            {/* ── MODO LOGIN ── */}
            {modo === 'login' && (
              <>
                <p style={{ color: '#666', fontSize: 13, textAlign: 'center', marginBottom: 24, marginTop: 0 }}>
                  Acceso exclusivo para talleres registrados
                </p>
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="taller@email.com" autoComplete="email" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="current-password"
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
                      : 'Entrar al panel'
                    }
                  </button>
                </form>
              </>
            )}

            {/* ── MODO REGISTRO ── */}
            {modo === 'registro' && !registroExitoso && (
              <>
                <p style={{ color: '#666', fontSize: 13, textAlign: 'center', marginBottom: 24, marginTop: 0 }}>
                  Registrá tu taller en FabriQ. Tu cuenta será revisada y activada en menos de 24hs.
                </p>
                <form onSubmit={handleRegistro}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Nombre del taller *</label>
                    <input type="text" value={regNombre} onChange={e => setRegNombre(e.target.value)}
                      placeholder="Ej: Calavera Gaucha" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Email *</label>
                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                      placeholder="taller@email.com" autoComplete="email" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Contraseña *</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showRegPassword ? 'text' : 'password'}
                        value={regPassword} onChange={e => setRegPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        style={{ ...inputStyle, paddingRight: 48 }} />
                      <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0 }}>
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Confirmar contraseña *</label>
                    <input type="password" value={regPassword2} onChange={e => setRegPassword2(e.target.value)}
                      placeholder="Repetí la contraseña" style={inputStyle} />
                  </div>

                  {/* Aviso de aprobación */}
                  <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(232,93,4,0.06)', border: '1px solid rgba(232,93,4,0.2)', borderRadius: 8 }}>
                    <p style={{ color: '#e85d04', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                      Tu registro será revisado por el equipo de FabriQ. Recibirás una confirmación cuando tu cuenta esté activa.
                    </p>
                  </div>

                  {error && (
                    <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
                      {error}
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
                      ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Registrando...</>
                      : <>Solicitar registro <ChevronRight size={16} /></>
                    }
                  </button>
                </form>
              </>
            )}

            {/* ── REGISTRO EXITOSO ── */}
            {modo === 'registro' && registroExitoso && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 56, height: 56, background: 'rgba(74,222,128,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <span style={{ fontSize: 24 }}>✓</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>¡Solicitud enviada!</h3>
                <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                  Recibimos tu solicitud para registrar <strong style={{ color: '#888' }}>{regNombre}</strong>. El equipo de FabriQ la revisará y te notificará al email <strong style={{ color: '#888' }}>{regEmail}</strong> cuando tu cuenta esté activa.
                </p>
                <button onClick={() => cambiarModo('login')} style={{
                  padding: '12px 24px', borderRadius: 10, border: '1px solid #2a2a2a',
                  background: 'transparent', color: '#888', fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                }}>
                  Volver al login
                </button>
              </div>
            )}

          </div>

          {/* Link a cotizadora */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#444' }}>
            ¿Sos cliente?{' '}
            <a href="https://fabriq.com.ar/" style={{ color: '#666', textDecoration: 'underline' }}>
              Cotizá tu pedido acá
            </a>
          </p>
        </div>
      </main>
    </>
  )
}