<script setup>
const user = useSupabaseUser()
const supabase = useSupabaseClient()

const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
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
