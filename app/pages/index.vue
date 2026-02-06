<template>
  <div class="p-4 max-w-xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">
      🤖 Skippybot
    </h1>
    <div v-for="(msg, index) in messages" :key="index" class="mb-2">
      <div class="font-bold">{{ msg.role === 'user' ? 'You' : 'Skippy' }}</div>
      <div class="bg-gray-100 p-2 rounded">{{ msg.content }}</div>
    </div>

    <ChatInput @send="sendMessage" class="mt-4" />
  </div>
</template>

<script setup>
import ChatInput from '~/components/ChatInput.vue'

const messages = ref([])

async function sendMessage(content) {
  messages.value.push({ role: 'user', content })

  const response = await $fetch('/api/chat', {
    method: 'POST',
    body: { messages: messages.value }
  })

  messages.value.push({ role: 'assistant', content: response.reply })
}
</script>
