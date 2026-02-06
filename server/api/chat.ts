import { OpenAI } from 'openai'
import { supabase } from '../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const openai = new OpenAI({ apiKey: config.openaiApiKey })

  try {
    const body = await readBody(event)
    const chatHistory = body.messages || []
    const sessionId = body.sessionId || 'default-session'

    // ...existing code...

    // Validate chat history
    if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
      throw createError({ statusCode: 400, message: 'Invalid or empty chat history' })
    }

    // Validate each message has required fields
    const validMessages = chatHistory.every(
      msg => msg.role && msg.content
    )
    if (!validMessages) {
      throw createError({ statusCode: 400, message: 'Messages must have role and content' })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: chatHistory,
    })

    const reply = response.choices[0].message.content
    
    // Handle null content from OpenAI
    if (!reply) {
      throw createError({ statusCode: 500, message: 'No response content from OpenAI' })
    }

    // Save both user and assistant messages to Supabase
    const inserts = [
      {
        session_id: sessionId,
        role: 'user',
        content: chatHistory[chatHistory.length - 1].content,
      },
      {
        session_id: sessionId,
        role: 'assistant',
        content: reply,
      },
    ]

    await supabase.from('chats').insert(inserts)

    return { reply }
  } catch (error) {
    console.error('Chat error:', error)
    throw error
  }
})