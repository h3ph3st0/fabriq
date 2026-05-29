import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Order = {
  id?: string
  created_at?: string
  customer_email: string
  file_name: string
  file_url?: string
  service_type: 'dtf' | '3d' | 'sublimacion'
  ai_analysis?: {
    viable: boolean
    issues: string[]
    recommendations: string[]
    estimated_time: string
  }
  price_ars?: number
  status?: 'pending' | 'analyzing' | 'quoted' | 'paid' | 'in_production' | 'done'
  payment_id?: string
  notes?: string
}
