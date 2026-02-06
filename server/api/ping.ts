export default defineEventHandler(() => {
  return {
    openaiKey: process.env.OPENAI_API_KEY || 'Not set'
  }
})
