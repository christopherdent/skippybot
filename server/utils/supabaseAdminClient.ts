import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('supabaseUrl is required.')
}

if (!serviceRoleKey) {
  throw new Error('supabaseServiceRoleKey is required.')
}

export const serverSupabaseAdminClient = createClient(supabaseUrl, serviceRoleKey)
