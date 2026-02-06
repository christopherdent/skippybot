// server/api/chat-history.ts
import { serverSupabaseClient } from '../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const { data, error } = await serverSupabaseClient
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('Error fetching chat history:', error)
    return { messages: [] }
  }

  return { messages: data }
})
