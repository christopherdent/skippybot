import { getRouterParam } from 'h3'
import { requireUser } from '../../utils/requireUser'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing memory id' })
  }

  const { data: existing } = await supabase
    .from('chats')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('role', 'user')
    .not('embedding', 'is', null)
    .maybeSingle()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Memory not found' })
  }

  const { error } = await supabase
    .from('chats')
    .update({ embedding: null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting memory:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete memory' })
  }

  return { success: true }
})
