// server/api/chat.ts
import { OpenAI } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  console.log('Request received', body)

  const chatHistory = body.messages || []

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: chatHistory,
  })

  return { reply: response.choices[0]?.message?.content ?? '' }
})
