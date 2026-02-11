export default defineNuxtRouteMiddleware(async (to) => {
  // Allow public access to login/signup
  if (to.path === '/LoginSignup') return

  // Skip authentication check on server-side to avoid worker crashes
  if (import.meta.server) return

  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // Only check auth on client-side after hydration
  if (!user.value) {
    try {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        return navigateTo('/LoginSignup')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      return navigateTo('/LoginSignup')
    }
  }
})
