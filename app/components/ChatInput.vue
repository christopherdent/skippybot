<template>
  <form @submit.prevent="handleSubmit" class="flex items-center gap-2">
    <UInput v-model="message" placeholder="Ask Skippy something..." class="flex-1" />
    <UButton type="submit">Send</UButton>
  </form>
</template>

<script setup>
const message = ref('')

const emit = defineEmits(['send'])

function handleSubmit() {
  if (!message.value.trim()) return
  emit('send', message.value)
  message.value = ''
}
</script>
