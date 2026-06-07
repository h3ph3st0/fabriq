// src/app/api/register-taller/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramNotification } from '@/lib/telegram'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { nombreTaller, email, password } = await req.json()

    if (!nombreTaller || !email || !password) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 })
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirmar email automáticamente
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ error: 'Ese email ya está registrado.' }, { status: 400 })
      }
      throw authError
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'No se pudo crear el usuario.' }, { status: 500 })
    }

    // 2. Crear shop_config con estado pendiente
    const { error: configError } = await supabase
      .from('shop_config')
      .insert({
        user_id: authData.user.id,
        nombre_taller: nombreTaller,
        estado: 'pendiente',
        plan: 'trial',
        moneda: 'ARS',
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

    // 3. Notificar por Telegram
    const fecha = new Date().toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'short',
    })

    await sendTelegramNotification(
      `🏭 <b>Nuevo taller en FabriQ</b>\n\n` +
      `📋 <b>Nombre:</b> ${nombreTaller}\n` +
      `📧 <b>Email:</b> ${email}\n` +
      `🕐 <b>Fecha:</b> ${fecha}\n\n` +
      `⏳ Estado: <b>Pendiente de aprobación</b>\n\n` +
      `👉 Revisá el panel: fabriq.com.ar/admin/superadmin`
    )

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('Error en registro de taller:', error)
    const err = error as { message?: string }
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}