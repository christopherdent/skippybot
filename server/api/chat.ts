import OpenAI from 'openai'
import { serverSupabaseClient } from '../utils/supabaseClient'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { message, conversationId } = body

  if (!message || !conversationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing conversationId or message',
    })
  }

  // 1. Save user message
  await serverSupabaseClient
    .from('chats')
    .insert({
      session_id: conversationId,
      role: 'user',
      content: message,
    })

  // 2. Call OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // fast + cheap for now
    messages: [
      { role: 'system', content: 'You are Skippy, a helpful assistant.' },
      { role: 'user', content: message },
    ],
  })

  const reply =
    completion.choices &&
    completion.choices[0] &&
    completion.choices[0].message &&
    typeof completion.choices[0].message.content === 'string'
      ? completion.choices[0].message.content
      : ''

  // 3. Save assistant message
  await serverSupabaseClient
    .from('chats')
    .insert({
      session_id: conversationId,
      role: 'assistant',
      content: reply,
    })

    // Auto-title conversation if it doesn't have one yet
const { data: conversation } = await serverSupabaseClient
  .from('conversations')
  .select('title')
  .eq('id', conversationId)
  .single()

if (!conversation || !conversation.title || conversation.title.trim() === '') {
  const title = message
    .trim()
    .split(/\s+/)
    .slice(0, 7)
    .join(' ')

  await serverSupabaseClient
    .from('conversations')
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
}



  return { reply }
})
