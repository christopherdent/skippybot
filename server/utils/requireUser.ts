import { serverSupabaseClient } from '#supabase/server'

export async function requireUser(event: any) {
  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = data.user.id
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return {
    supabase,
    user: {
      id: userId,
      email: data.user.email || null,
    }
  }
}
