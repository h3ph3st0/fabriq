// src/app/api/verify-superadmin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUPERADMIN_EMAIL = '87cristhianfam@gmail.com'

export async function GET(req: NextRequest) {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ authorized: false }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ authorized: false }, { status: 401 })
    }

    // Verificar que sea el superadmin
    if (user.email !== SUPERADMIN_EMAIL) {
      return NextResponse.json({ authorized: false }, { status: 403 })
    }

    return NextResponse.json({ authorized: true })
  } catch (error) {
    console.error('Error verificando superadmin:', error)
    return NextResponse.json({ authorized: false }, { status: 500 })
  }
}