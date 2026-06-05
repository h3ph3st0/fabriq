'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, Box } from 'lucide-react'

export default function PagoExitoso() {
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setOrderId(params.get('order'))
  }, [])

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <main style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        backgroundImage: 'url(/fondo.png)',
        backgroundSize: '350px',
        backgroundRepeat: 'repeat',
        color: '#f0ece3',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <header style={{ borderBottom: '1px solid #1e1e1e', padding: '20px 40px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #e85d04, #f48c06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 600 }}>FabriQ</span>
        </header>

        <div style={{ maxWidth: 480, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, background: 'rgba(74,222,128,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(74,222,128,0.2)' }}>
            <CheckCircle size={40} color="#4ade80" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 12 }}>¡Pago confirmado!</h1>
          <p style={{ color: '#888', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
            Tu pedido fue recibido y el pago aprobado. El taller ya está al tanto y comenzará la producción a la brevedad.
          </p>
          {orderId && (
            <p style={{ color: '#444', fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 40 }}>
              Orden #{orderId.slice(0, 8).toUpperCase()}
            </p>
          )}
          <a href="/" style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: 10,
            background: '#e85d04', color: '#fff', textDecoration: 'none',
            fontSize: 14, fontWeight: 600,
          }}>
            Hacer otro pedido
          </a>
        </div>
      </main>
    </>
  )
}