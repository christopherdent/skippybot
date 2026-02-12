<script setup>
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const runtimeConfig = useRuntimeConfig()

const getOAuthRedirectUrl = () => {
  const configuredSiteUrl = runtimeConfig.public.siteUrl?.trim()
  if (configuredSiteUrl) {
    try {
      return new URL('/LoginSignup', configuredSiteUrl).toString()
    } catch (error) {
      console.error('Invalid NUXT_PUBLIC_SITE_URL. Falling back to current origin.', error)
    }
  }

  return `${window.location.origin}/LoginSignup`
}

const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getOAuthRedirectUrl()
    }
  })
  if (error) console.error('Login error:', error)
}

watchEffect(() => {
  if (user.value) {
    navigateTo('/')
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center h-screen">
    <h1 class="text-2xl mb-6">Welcome to Skippybot</h1>
    <button @click="signInWithGoogle" class="bg-blue-600 text-white px-6 py-2 rounded">
      Sign in with Google
    </button>
  </div>
</template>
