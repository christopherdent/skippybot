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

const loadChatHistory = async () => {
  try {
    const res = await $fetch('/api/chat-history')
    messages.value = res.messages || []
  } catch (e) {
    console.error('Failed to load chat history:', e)
  }
}



const messages = ref([])

const sendMessage = async () => {
  if (!newMessage.value.trim()) return

  const userMessage = {
    role: 'user',
    content: newMessage.value.trim(),
  }

  messages.value.push(userMessage)
  newMessage.value = ''

  try {
    const res = await $fetch('/api/chat', {
      method: 'POST',
      body: {
        messages: messages.value,
      },
    })

    messages.value.push({
      role: 'assistant',
      content: res.reply,
    })
  } catch (e) {
    console.error('Failed to send message:', e)
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I had trouble replying. Please try again.',
    })
  }
}


onMounted(async () => {
  messages.value = await loadChatHistory()
})

</script>
