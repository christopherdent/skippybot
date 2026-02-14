import { requireUser } from '../utils/requireUser'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)

  const { data, error } = await supabase
    .from('memories')
    .select('id, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('Error fetching memories:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch memories' })
  }

  return { memories: data || [] }
})
