import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('supabaseUrl is required.')
}

if (!supabaseKey) {
  throw new Error('supabaseAnonKey is required.')
}

export const serverSupabaseClient = createClient(supabaseUrl, supabaseKey)