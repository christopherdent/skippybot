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

  const authUser: any = data.user
  const fallbackEmail =
    authUser?.email ||
    authUser?.user_metadata?.email ||
    authUser?.identities?.[0]?.identity_data?.email ||
    null

  return {
    supabase,
    user: {
      id: userId,
      email: typeof fallbackEmail === 'string' ? fallbackEmail.trim().toLowerCase() : null,
    }
  }
}
