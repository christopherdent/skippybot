import OpenAI from 'openai'
import { supabaseClient } from '../utils/supabaseClient'

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
  await supabaseClient
    .from('chats')
    .insert({
      conversation_id: conversationId,
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
  await supabaseClient
    .from('chats')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
    })

  return { reply }
})
