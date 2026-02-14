import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const IMPORT_USER_ID = process.env.IMPORT_USER_ID
const IMPORT_FILE = process.env.IMPORT_FILE || './conversations.json'
const CHAT_BATCH_SIZE = Number(process.env.IMPORT_CHAT_BATCH_SIZE || 200)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !IMPORT_USER_ID) {
  console.error(
    'Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY), IMPORT_USER_ID'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const conversations = JSON.parse(fs.readFileSync(path.resolve(IMPORT_FILE), 'utf8'))

const toIso = (unixSeconds, fallbackIso) => {
  if (typeof unixSeconds === 'number' && Number.isFinite(unixSeconds)) {
    return new Date(unixSeconds * 1000).toISOString()
  }
  return fallbackIso || new Date().toISOString()
}

const getRole = (message) => {
  const role = message?.author?.role || message?.role
  if (role === 'user' || role === 'assistant') return role
  return null
}

const getText = (message) => {
  const parts = message?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .filter((p) => typeof p === 'string')
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n')
}

async function getMappedConversationId(oldSessionId) {
  const { data, error } = await supabase
    .from('legacy_chat_session_id')
    .select('new_conversation_id')
    .eq('old_session_id', oldSessionId)
    .maybeSingle()

  if (error) {
    // Table might not exist. Ignore and continue without mapping support.
    return null
  }

  return data?.new_conversation_id || null
}

async function saveConversationMapping(oldSessionId, newConversationId) {
  const { error } = await supabase
    .from('legacy_chat_session_id')
    .upsert(
      [{ old_session_id: oldSessionId, new_conversation_id: newConversationId }],
      { onConflict: 'old_session_id' }
    )

  // Ignore if table is absent.
  if (error) return
}

async function ensureConversation(convo) {
  const oldSessionId = String(convo.conversation_id || '')
  const mappedId = oldSessionId ? await getMappedConversationId(oldSessionId) : null
  const conversationId = mappedId || uuidv4()
  const createdAtIso = toIso(convo.create_time)
  const updatedAtIso = toIso(convo.update_time, createdAtIso)

  const { error } = await supabase.from('conversations').upsert(
    {
      id: conversationId,
      user_id: IMPORT_USER_ID,
      title: convo.title || '(Untitled)',
      created_at: createdAtIso,
      updated_at: updatedAtIso
    },
    { onConflict: 'id' }
  )

  if (error) {
    throw new Error(`Failed conversation upsert for ${oldSessionId}: ${error.message}`)
  }

  if (oldSessionId) {
    await saveConversationMapping(oldSessionId, conversationId)
  }

  return conversationId
}

async function insertChatsBatch(rows) {
  if (!rows.length) return
  const { error } = await supabase.from('chats').insert(rows)
  if (error) throw new Error(`Failed chats insert: ${error.message}`)
}

async function runImport() {
  let importedConversations = 0
  let importedMessages = 0

  for (const convo of conversations) {
    const oldSessionId = String(convo.conversation_id || '(no-id)')
    const conversationId = await ensureConversation(convo)

    console.log(`Importing: ${convo.title || '(Untitled)'} | old=${oldSessionId} -> new=${conversationId}`)

    const sortedNodes = Object.values(convo.mapping || {})
      .filter((n) => n?.message)
      .sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0))

    const chatRows = []
    for (const node of sortedNodes) {
      const message = node.message
      const role = getRole(message)
      const text = getText(message)
      if (!role || !text) continue

      chatRows.push({
        user_id: IMPORT_USER_ID,
        session_id: conversationId,
        role,
        content: text,
        created_at: toIso(message.create_time)
      })
    }

    for (let i = 0; i < chatRows.length; i += CHAT_BATCH_SIZE) {
      await insertChatsBatch(chatRows.slice(i, i + CHAT_BATCH_SIZE))
    }

    importedConversations += 1
    importedMessages += chatRows.length
  }

  console.log(
    `✅ Import complete. Conversations: ${importedConversations}, Messages: ${importedMessages}, User: ${IMPORT_USER_ID}`
  )
}

runImport().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
