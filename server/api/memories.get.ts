import { requireUser } from '../utils/requireUser'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)

  const { data, error } = await supabase
    .from('chats')
    .select('id, role, content, created_at')
    .eq('user_id', user.id)
    .eq('role', 'user')
    .not('embedding', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching memories:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch memories' })
  }

  return { memories: data || [] }
})
