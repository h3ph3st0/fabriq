'use client'
import { Box } from 'lucide-react'

export default function Terminos() {
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
        <header style={{ borderBottom: '1px solid #1e1e1e', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(8px)' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: '#f0ece3' }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #e85d04, #f48c06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' }}>FabriQ</span>
          </a>
        </header>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' }}>

          <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.5px', marginBottom: 8 }}>
            Términos y condiciones
          </h1>
          <p style={{ color: '#555', fontSize: 13, marginBottom: 48, fontFamily: "'DM Mono', monospace" }}>
            Última actualización: junio 2026
          </p>

          {/* Sección 1 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e85d04', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              1. Sobre FabriQ
            </h2>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8 }}>
              FabriQ es una plataforma digital de manufactura on-demand que conecta clientes con talleres de producción especializados en impresión 3D, impresión DTF y sublimación. FabriQ actúa como intermediario tecnológico entre el cliente y el taller productor. Al usar esta plataforma, el cliente acepta los presentes términos en su totalidad.
            </p>
          </section>

          {/* Sección 2 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e85d04', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              2. Propiedad de archivos digitales
            </h2>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              Los archivos digitales generados por FabriQ durante el proceso de producción — incluyendo modelos 3D (.STL, .GLB, .OBJ), archivos de diseño optimizados y cualquier archivo de manufactura derivado — son propiedad exclusiva de FabriQ y/o el taller productor.
            </p>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              El cliente abona exclusivamente por el <strong style={{ color: '#f0ece3' }}>objeto físico terminado</strong>, no por los archivos digitales utilizados para producirlo. FabriQ no transfiere, cede ni licencia dichos archivos al cliente bajo ninguna circunstancia.
            </p>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8 }}>
              El cliente no tiene derecho a solicitar, recibir o reproducir los archivos digitales de producción. Esta restricción aplica independientemente del medio de pago utilizado o del monto abonado.
            </p>
          </section>

          {/* Sección 3 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e85d04', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              3. Propiedad intelectual y derechos de imagen
            </h2>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              Al subir una imagen, diseño o archivo a la plataforma, el cliente declara y garantiza que:
            </p>
            <ul style={{ color: '#999', fontSize: 14, lineHeight: 1.8, paddingLeft: 20, marginBottom: 12 }}>
              <li style={{ marginBottom: 8 }}>Es titular de los derechos sobre el material subido, o cuenta con autorización expresa del titular para reproducirlo.</li>
              <li style={{ marginBottom: 8 }}>El material no infringe derechos de autor, marcas registradas, patentes ni ningún otro derecho de terceros.</li>
              <li style={{ marginBottom: 8 }}>Asume plena responsabilidad legal por cualquier reclamo derivado del uso del material proporcionado.</li>
            </ul>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8 }}>
              FabriQ utiliza inteligencia artificial para detectar posibles infracciones de copyright en los materiales recibidos. Ante una alerta positiva, el sistema notifica al cliente y el taller puede rechazar la producción. Sin embargo, dicha detección automática no exime al cliente de su responsabilidad legal. FabriQ no se hace responsable por el uso de material protegido subido por el cliente.
            </p>
          </section>

          {/* Sección 4 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e85d04', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              4. Cotización y precios
            </h2>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              Los precios mostrados en la plataforma son estimaciones generadas por inteligencia artificial en base a los parámetros proporcionados por el cliente (medidas, cantidad, complejidad del diseño) y los costos configurados por cada taller. Estas estimaciones tienen carácter orientativo.
            </p>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8 }}>
              El taller productor puede ajustar el precio final ante situaciones no previstas por el análisis automático, como complejidad técnica no visible en la imagen, requerimientos especiales de material o cambios en los costos de insumos. En tal caso, el taller contactará al cliente antes de proceder con la producción.
            </p>
          </section>

          {/* Sección 5 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e85d04', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              5. Pagos y reembolsos
            </h2>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              Los pagos se procesan a través de MercadoPago. Al confirmar el pago, el cliente autoriza el cobro del monto indicado. FabriQ no almacena datos de tarjetas ni información financiera sensible.
            </p>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              Los reembolsos se evaluarán caso a caso según el estado de la producción:
            </p>
            <ul style={{ color: '#999', fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>Si la producción no ha comenzado: reembolso completo.</li>
              <li style={{ marginBottom: 8 }}>Si la producción está en curso: reembolso parcial a criterio del taller.</li>
              <li style={{ marginBottom: 8 }}>Si el producto ya fue entregado: no corresponde reembolso salvo defecto de fabricación comprobable.</li>
            </ul>
          </section>

          {/* Sección 6 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e85d04', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              6. Limitación de responsabilidad
            </h2>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8 }}>
              FabriQ provee la plataforma tecnológica como intermediario. La responsabilidad por la calidad del producto físico final recae en el taller productor. FabriQ no garantiza resultados específicos derivados del análisis de IA, y no se responsabiliza por demoras, defectos o incumplimientos atribuibles al taller. Ante cualquier inconveniente con un pedido, el cliente debe contactar al taller directamente a través de los medios provistos en la plataforma.
            </p>
          </section>

          {/* Sección 7 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e85d04', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              7. Jurisdicción
            </h2>
            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8 }}>
              Estos términos se rigen por las leyes de la República Argentina. Ante cualquier disputa, las partes se someten a la jurisdicción de los tribunales ordinarios de la ciudad de Concordia, provincia de Entre Ríos.
            </p>
          </section>

          {/* Sección 8 — NUEVA: Modelos 3D generados por IA */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e85d04', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              8. Modelos 3D generados por inteligencia artificial
            </h2>

            {/* Aviso destacado para clientes */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <p style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}>
                ⚠ Aviso importante para clientes — Impresión 3D
              </p>
              <p style={{ color: '#a07020', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                Los modelos 3D generados por la inteligencia artificial de FabriQ a partir de imágenes son <strong style={{ color: '#f59e0b' }}>aproximaciones visuales</strong>, no modelos de precisión técnica. El resultado es una reconstrucción tridimensional basada en la imagen proporcionada, que puede presentar imperfecciones en la malla, detalles faltantes o geometría simplificada respecto al objeto original.
              </p>
            </div>

            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              Antes de proceder con la impresión, el taller productor revisará el modelo generado, corregirá la malla si fuera necesario y realizará los ajustes técnicos que considere pertinentes para garantizar la calidad del objeto físico final. Este proceso de revisión y mejora es responsabilidad exclusiva del taller y forma parte del servicio contratado.
            </p>

            {/* Aviso destacado para talleres */}
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <p style={{ color: '#3b82f6', fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}>
                📋 Aviso para talleres — Responsabilidad sobre el modelo
              </p>
              <p style={{ color: '#4a6fa5', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                El modelo 3D generado por IA es un <strong style={{ color: '#3b82f6' }}>punto de partida, no un archivo listo para imprimir</strong>. El taller es responsable de revisar la malla, verificar la geometría, corregir imperfecciones, agregar o refinar detalles según su criterio profesional, y validar que el archivo sea apto para producción antes de iniciar la impresión. FabriQ no se responsabiliza por resultados derivados de la impresión de modelos sin revisión previa por parte del taller.
              </p>
            </div>

            <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8 }}>
              La tecnología de generación 3D desde imágenes es una herramienta de asistencia que reduce significativamente los tiempos de modelado, pero no reemplaza el criterio técnico del operador especializado. FabriQ continuará mejorando esta funcionalidad a medida que la tecnología evolucione.
            </p>
          </section>

          <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 32, marginTop: 16 }}>
            <a href="/" style={{
              display: 'inline-block', padding: '12px 24px', borderRadius: 10,
              border: '1px solid #2a2a2a', background: 'transparent',
              color: '#888', textDecoration: 'none', fontSize: 14,
            }}>
              ← Volver a la cotizadora
            </a>
          </div>
        </div>

        <footer style={{ borderTop: '1px solid #1a1a1a', padding: '20px 40px', textAlign: 'center', background: 'rgba(10,10,10,0.8)' }}>
          <p style={{ color: '#333', fontSize: 11, margin: 0 }}>
            FabriQ · Plataforma de manufactura on-demand ·{' '}
            <a href="/admin" style={{ color: '#444', textDecoration: 'none' }}>Acceso talleres</a>
          </p>
        </footer>
      </main>
    </>
  )
}