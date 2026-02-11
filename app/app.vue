<template>
  <NuxtPage />
</template>

<script setup>
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const userState = useState('user', () => null)

// Redirect logged-in users away from /login or /signup if needed
watchEffect(() => {
  if (user.value && ['login', 'signup'].includes(useRoute().name)) {
    navigateTo('/')
  }
})

// Keep a global reactive user state in sync
onMounted(async () => {
  const { data } = await supabase.auth.getUser()
  userState.value = data.user

  supabase.auth.onAuthStateChange((event, session) => {
    userState.value = session?.user || null
  })
})
</script>
