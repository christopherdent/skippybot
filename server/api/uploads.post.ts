import { randomUUID } from 'crypto'
import { serverSupabaseAdminClient } from '../utils/supabaseAdminClient'
import { requireUser } from '../utils/requireUser'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireUser(event)
  const body = await readBody(event)
  const { conversationId, fileName, contentType } = body

  if (!conversationId || !fileName || !contentType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing conversationId, fileName, or contentType'
    })
  }

  if (!String(contentType).startsWith('image/')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only image uploads are allowed'
    })
  }

  const { data: convo } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', String(conversationId))
    .eq('user_id', user.id)
    .maybeSingle()

  if (!convo) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Conversation not found'
    })
  }

  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `conversations/${user.id}/${conversationId}/${randomUUID()}-${safeName}`
  const bucket = 'chat-images'

  const { data, error } = await serverSupabaseAdminClient.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error || !data?.signedUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create upload URL'
    })
  }

  return {
    uploadUrl: data.signedUrl,
    path,
    bucket
  }
})
