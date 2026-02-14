// server/api/chat-history.ts
import { requireUser } from '../utils/requireUser'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('Error fetching chat history:', error)
    return { messages: [] }
  }

  return { messages: data }
})
