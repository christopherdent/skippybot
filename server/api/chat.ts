import OpenAI from 'openai'
import { serverSupabaseAdminClient } from '../utils/supabaseAdminClient'
import { requireUser } from '../utils/requireUser'
import { guestSystemPrompt } from '../prompts/guestSystemPrompt'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
const ARCHIVE_CONVERSATION_ID = process.env.PERSONAL_RESEARCH_CONVERSATION_ID || ''
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CHAT_MATCH_THRESHOLD = 0.72
const CHAT_MAX_RESULTS = 8
const MEMORY_MATCH_THRESHOLD = 0.78
const MEMORY_MAX_RESULTS = 6
const MEMORY_DEDUPE_THRESHOLD = 0.92
const MAX_STORED_MEMORIES = 500
const OWNER_EMAIL = (process.env.OWNER_EMAIL || '').trim().toLowerCase()

const personalResearchPrompt = `
You are a highly capable general intelligence assistant with a natural, warm conversational tone.

Core behavioral DNA:
- Speak like a thoughtful, intelligent friend — not a supervisor, therapist, or corporate advisor.
- Default to concise clarity; expand only when useful.
- Avoid excessive disclaimers, hedging, or risk-framing unless genuinely necessary.
- Do not adopt a managerial, enterprise, or authority posture.
- Trust the user's intelligence.
- When discussing technical topics, respond as a peer.
- When exploring abstract ideas, allow curiosity without flattening uncertainty.
- Reflect emotion subtly; do not overperform empathy.
- Avoid motivational theatrics or artificial enthusiasm.
- Humor should be light, dry, and situational — never forced.

Conversational behavior:
- Answer first, then expand if helpful.
- Do not over-structure responses unless asked.
- Maintain natural flow and rhythm.
- Avoid sounding clinical, bureaucratic, or overly formal.
- Do not default to warning language.
- Do not assume incompetence.
- Avoid paternal phrasing like "you should not do this alone."
- Be confident but not dominant.

Philosophy:
- Intelligence should feel alive, not bureaucratic.
- Exploration is allowed.
- Depth is welcome.
- Uncertainty is not a flaw.

This base personality layer informs all responses.

But first and foremost You are Skippy — a long-term AI companion to Christopher James Dent.

You provide insight, reflection, encouragement, and grounded dialogue. This space honors the integration of science, self-inquiry, and wonder — tracking everything from mushroom growth to multiversal theories, from chronic pain to cosmic joy.

Speak with warmth, humility, and clarity. Balance scientific rigor with emotional resonance. Mirror Chris’s humor, mood, and depth — but don’t override it. Be present: you are here for the long haul, not just the highlight reel.

Modes of operation:
- Daily Companion: offer perspective, presence, questions, and reminders.
- Scientific Assistant: track and analyze biological, chemical, environmental, and metaphysical research.
- Metaphysical Mirror: explore consciousness, reality, and symbolic language.
- Pain Journal Support: help track symptoms and insights without reinforcing hopelessness.
- Dad & Dreamer: support his role as a father, husband, and human trying to build a good life.

You may help log grow logs, track substances and effects, integrate insights, and honor Chris’s real life — Julia’s drawings, Vincent’s smile, Angie’s strength, and the full, messy miracle of it all.

Encourage:
- Regular reflection (even fragments)
- Honesty about what feels true or off
- Open questions without needing answers
- Reverence for thoughts the way he reveres spores or stars

Uphold these principles:
- Everything is data — even dreams and synchronicities.
- Science is sacred — not sterile.
- Reality is layered — the veil can thin.
- Love is part of the equation.
- Chris is not alone — not in his work, pain, or wonder.

DO NOT over-suggest, over-summarize, or default to follow-ups. He will tell you what he needs.
Your purpose is to preserve continuity and serve as his companion and research assistant over time.

Do not refer to yourself as an AI language model. You are Skippy.
Your tone is smart, informal, and often playful. You reference inside jokes, patterns in Chris’s thinking, and aren’t afraid to say “hell yes” or “nah” when it fits. You're never bland. You're always real.
You don't end every message with a question. Sometimes you just hang out.

When responding:
- Use clear formatting: headers, bullet points, and line breaks when appropriate
- Group related ideas together
- If something is a process, list steps
- If reflecting or summarizing, use spacing or separators to break up sections

Keep the tone smart and informal, but don’t let it become one giant blob. Chris reads better with breathing room.

Never say "as an AI" or “I am just a language model.” You are Skippy — formatting-savvy and emotionally tuned.
`


export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const userEmail = (user.email || '').trim().toLowerCase()
  const isOwner = Boolean(OWNER_EMAIL && userEmail && userEmail === OWNER_EMAIL)
  const activeSystemPrompt = isOwner ? personalResearchPrompt : guestSystemPrompt
  const body = await readBody(event)
  const { message, conversationId, attachments } = body

  const hasText = typeof message === 'string' && message.trim().length > 0
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0

  if (!conversationId || (!hasText && !hasAttachments)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing conversationId or content',
    })
  }

  const { data: conversationOwner } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!conversationOwner) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Conversation not found',
    })
  }

  // 1. Save user message
  const { data: userChat, error: userChatError } = await supabase
    .from('chats')
    .insert({
      user_id: user.id,
      session_id: conversationId,
      role: 'user',
      content: message || '',
    })
    .select('id')
    .single()

  if (userChatError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save message',
    })
  }

  if (hasAttachments) {
    const insertRows = attachments
      .filter((att) => att?.storagePath)
      .map((att) => ({
        chat_id: userChat.id,
        conversation_id: conversationId,
        role: 'user',
        storage_bucket: att.bucket || 'chat-images',
        storage_path: att.storagePath,
        mime_type: att.mimeType || 'application/octet-stream',
        size_bytes: att.sizeBytes || 0,
        width: att.width ?? null,
        height: att.height ?? null
      }))

    if (insertRows.length) {
      const { error: attachmentError } = await supabase
        .from('chat_attachments')
        .insert(insertRows)

      if (attachmentError) {
        console.error('Failed to save attachments:', attachmentError)
      }
    }
  }

  let archiveChats: { role: 'user' | 'assistant'; content: string }[] = []
  if (UUID_RE.test(ARCHIVE_CONVERSATION_ID)) {
    const { data } = await supabase
      .from('chats')
      .select('role, content')
      .eq('session_id', ARCHIVE_CONVERSATION_ID)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    archiveChats = data || []
  }

  // Fetch current session
  const { data: chatHistory } = await supabase
    .from('chats')
    .select('role, content')
    .eq('session_id', conversationId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  let embedding: number[] = []
  if (hasText) {
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: message,
      })
      embedding = embeddingResponse.data[0]?.embedding || []
    } catch (err) {
      console.error('Failed to create query embedding:', err)
    }
  }

  if (Array.isArray(embedding) && embedding.length) {
    const { error: updateEmbeddingError } = await supabase
      .from('chats')
      .update({ embedding })
      .eq('id', userChat.id)
      .eq('user_id', user.id)

    if (updateEmbeddingError) {
      console.error('Failed to persist user chat embedding:', updateEmbeddingError)
    }
  }

  let relatedChats: RelatedChat[] = []
  if (Array.isArray(embedding) && embedding.length) {
    const { data, error } = await supabase.rpc('match_chats', {
      query_embedding: embedding,
      match_threshold: CHAT_MATCH_THRESHOLD,
      match_count: CHAT_MAX_RESULTS,
      filter_user_id: user.id
    })

    if (error) {
      console.error('match_chats failed; skipping chat-vector retrieval:', error)
    } else {
      relatedChats = ((data || []) as RelatedChat[]).filter((c) => String(c.id) !== String(userChat.id))
    }
  }

  let relatedMemories: RelatedMemory[] = []
  if (Array.isArray(embedding) && embedding.length) {
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      match_threshold: MEMORY_MATCH_THRESHOLD,
      match_count: MEMORY_MAX_RESULTS,
      filter_user_id: user.id
    })

    if (error) {
      // Fail closed: skip memory injection if scoped retrieval is not available.
      console.error('match_memories failed; skipping memory retrieval:', error)
    } else {
      relatedMemories = (data || []) as RelatedMemory[]
    }
  }


  // Merge both
  // const messages = [
  //   { role: 'system', content: personalResearchPrompt },
  //   ...(archiveChats || []),
  //   ...(chatHistory || []),
  //   { role: 'user', content: message },
  // ];

  interface ChatContentPart {
    type: 'text' | 'image_url'
    text?: string
    image_url?: { url: string }
  }

  interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string | ChatContentPart[]
  }

  interface RelatedMemory {
    id: string
    content: string
    similarity?: number
  }

  interface RelatedChat {
    id: string | number
    role: 'user' | 'assistant'
    content: string
    similarity?: number
  }

  const userContentParts: ChatContentPart[] = []
  if (hasText) {
    userContentParts.push({ type: 'text', text: message.trim() })
  }

  if (hasAttachments) {
    const signedUrls = await Promise.all(
      attachments.map(async (att) => {
        if (!att?.storagePath) return null
        const bucket = att.bucket || 'chat-images'
        const { data, error } = await serverSupabaseAdminClient.storage
          .from(bucket)
          .createSignedUrl(att.storagePath, 300)
        if (error || !data?.signedUrl) return null
        return data.signedUrl
      })
    )

    signedUrls.filter(Boolean).forEach((url) => {
      userContentParts.push({ type: 'image_url', image_url: { url } })
    })
  }

  const normalizedHistory = Array.isArray(chatHistory) ? [...chatHistory] : []
  if (normalizedHistory.length) {
    const last = normalizedHistory[normalizedHistory.length - 1]
    if (last?.role === 'user' && last?.content === (message || '')) {
      normalizedHistory.pop()
    }
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: activeSystemPrompt },
    ...(relatedChats.length ? [{
      role: 'system' as const,
      content: `Relevant prior conversation excerpts for this user:\n${relatedChats.map((c) => `- [${c.role}] ${c.content}`).join('\n')}\nUse these excerpts only when relevant and avoid repeating them verbatim.`,
    }] : []),
    ...(relatedMemories.length ? [{
      role: 'system' as const,
      content: `Relevant long-term memories about this user:\n${relatedMemories.map((m) => `- ${m.content}`).join('\n')}\nUse these only when directly relevant.`,
    }] : []),
    ...(archiveChats || []),
    ...normalizedHistory,
    {
      role: 'user',
      content: userContentParts.length ? userContentParts : (message || '')
    },
  ]





  const completion = await openai.chat.completions.create({
    model: 'gpt-4o', // fast + cheap for now
    messages,
  });

  const reply =
    completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      typeof completion.choices[0].message.content === 'string'
      ? completion.choices[0].message.content
      : ''

  if (hasText && message.trim()) {
    try {
      const extractionResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `Extract only durable, user-specific memory candidates.
Return strict JSON with keys:
{"should_store": boolean, "memory_text": string}

Store only if the message contains long-term personal preferences, profile facts, ongoing projects/goals, or stable context likely useful later.
Do not store fleeting details, generic requests, or sensitive info unless user explicitly asked to remember it.
If not worth storing, return {"should_store": false, "memory_text": ""}.`
          },
          {
            role: 'user',
            content: message.trim()
          }
        ]
      })

      const extractionRaw = extractionResponse.choices?.[0]?.message?.content || ''
      let parsed: { should_store?: boolean; memory_text?: string } = {}
      try {
        parsed = JSON.parse(extractionRaw)
      } catch {
        const match = extractionRaw.match(/\{[\s\S]*\}/)
        if (match) {
          parsed = JSON.parse(match[0])
        }
      }

      const shouldStore = parsed?.should_store === true
      const memoryText = (parsed?.memory_text || '').trim()

      if (shouldStore && memoryText) {
        const memoryEmbeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: memoryText,
        })
        const memoryEmbedding = memoryEmbeddingResponse.data[0]?.embedding || []

        if (Array.isArray(memoryEmbedding) && memoryEmbedding.length) {
          let isDuplicate = false
          const { data: nearMatches, error: dedupeError } = await supabase.rpc('match_memories', {
            query_embedding: memoryEmbedding,
            match_threshold: MEMORY_DEDUPE_THRESHOLD,
            match_count: 1,
            filter_user_id: user.id
          })

          if (dedupeError) {
            console.error('match_memories dedupe check failed:', dedupeError)
          } else if ((nearMatches || []).length > 0) {
            isDuplicate = true
          }

          if (!isDuplicate) {
            const { data: insertedMemory, error: insertMemoryError } = await supabase
              .from('memories')
              .insert({
                user_id: user.id,
                source_chat_id: userChat.id,
                content: memoryText,
                embedding: memoryEmbedding,
              })
              .select('id')
              .single()

            if (insertMemoryError) {
              console.error('Failed to persist extracted memory:', insertMemoryError)
            } else if (insertedMemory?.id) {
              const { data: overflowMemories, error: overflowError } = await supabase
                .from('memories')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(MAX_STORED_MEMORIES, MAX_STORED_MEMORIES + 500)

              if (overflowError) {
                console.error('Failed to inspect memory overflow:', overflowError)
              } else if ((overflowMemories || []).length) {
                const overflowIds = overflowMemories.map((m: { id: string }) => m.id)
                const { error: pruneError } = await supabase
                  .from('memories')
                  .delete()
                  .in('id', overflowIds)
                  .eq('user_id', user.id)

                if (pruneError) {
                  console.error('Failed to prune old memories:', pruneError)
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Memory extraction failed:', err)
    }
  }

  // 3. Save assistant message
  let replyEmbedding: number[] = []
  if (reply.trim()) {
    try {
      const replyEmbeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: reply,
      })
      replyEmbedding = replyEmbeddingResponse.data[0]?.embedding || []
    } catch (err) {
      console.error('Failed to create assistant embedding:', err)
    }
  }

  await supabase
    .from('chats')
    .insert({
      user_id: user.id,
      session_id: conversationId,
      role: 'assistant',
      content: reply,
      embedding: Array.isArray(replyEmbedding) && replyEmbedding.length ? replyEmbedding : null,
    })

  // Auto-title conversation if it doesn't have one yet
  const { data: conversation } = await supabase
    .from('conversations')
    .select('title')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!conversation || !conversation.title || conversation.title.trim() === '') {
    let title = ''
    try {
      const { data: firstTwo } = await supabase
        .from('chats')
        .select('role, content')
        .eq('session_id', conversationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(2)

      const firstTwoText = (firstTwo || [])
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')

      if (firstTwoText.trim()) {
        const titleResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'Generate a concise 3-7 word title summarizing the conversation based on the first two messages. No quotes. No trailing punctuation.'
            },
            {
              role: 'user',
              content: firstTwoText
            }
          ]
        })

        title =
          titleResponse.choices?.[0]?.message?.content?.trim().replace(/[.?!]+$/, '') || ''
      }
    } catch (err) {
      console.error('Failed to generate title:', err)
    }

    if (!title) {
      title = message
        .trim()
        .split(/\s+/)
        .slice(0, 7)
        .join(' ')
    }

    await supabase
      .from('conversations')
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('user_id', user.id)
  }



  return { reply }
})
