<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <aside class="w-64 border-r p-4 bg-gray-50">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-bold">Chats</h2>
        <button
          class="text-sm text-blue-600"
          @click="createConversation"
        >
          + New
        </button>
      </div>

      <ul>
        <li
          v-for="conv in conversations"
          :key="conv.id"
          @click="selectConversation(conv.id)"
          class="p-2 rounded cursor-pointer mb-1"
          :class="conv.id === activeConversationId
            ? 'bg-blue-100 font-semibold'
            : 'hover:bg-gray-200'"
        >
          {{ conv.title || 'Untitled Chat' }}
        </li>
      </ul>
    </aside>

    <!-- Main Chat -->
    <main class="flex-1 p-4 max-w-xl mx-auto">
      <h1 class="text-2xl font-bold mb-4">
        🤖 Skippybot
      </h1>

      <div v-for="(msg, index) in messages" :key="index" class="mb-2">
        <div class="font-bold">
          {{ msg.role === 'user' ? 'You' : 'Skippy' }}
        </div>
        <div class="bg-gray-100 p-2 rounded">
          {{ msg.content }}
        </div>
      </div>

      <ChatInput @send="sendMessage" class="mt-4" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ChatInput from '~/components/ChatInput.vue'

const messages = ref([])
const activeConversationId = ref(null)
const conversations = ref([])

/**
 * Load messages for a given conversation
 */
const loadMessagesForConversation = async (conversationId) => {
  try {
    const res = await $fetch('/api/chats', {
      query: { conversationId },
    })

    messages.value = res.chats || []
  } catch (err) {
    console.error('Failed to load messages:', err)
    messages.value = []
  }
}

/**
 * Send a single message
 */
const sendMessage = async (text) => {
  if (!text || !text.trim()) return
  if (!activeConversationId.value) {
    console.error('No active conversation')
    return
  }

  const messageText = text.trim()

  // Optimistic UI update
  messages.value.push({
    role: 'user',
    content: messageText,
  })

  try {
    const res = await $fetch('/api/chat', {
      method: 'POST',
      body: {
        message: messageText,
        conversationId: activeConversationId.value,
      },
    })

    messages.value.push({
      role: 'assistant',
      content: res.reply,
    })
  } catch (err) {
    console.error('Failed to send message:', err)
    messages.value.push({
      role: 'assistant',
      content: '⚠️ Something went wrong.',
    })
  }
}
const createConversation = async () => {
  try {
    const res = await $fetch('/api/conversations', {
      method: 'POST',
    })

    const convo = res.conversation
    conversations.value.unshift(convo)
    activeConversationId.value = convo.id

    messages.value = []
  } catch (err) {
    console.error('Failed to create conversation:', err)
  }
}
const selectConversation = async (conversationId) => {
  activeConversationId.value = conversationId
  await loadMessagesForConversation(conversationId)
}


const loadConversations = async () => {
  try {
    const res = await $fetch('/api/conversations')
    conversations.value = res.conversations || []
  } catch (err) {
    console.error('Failed to load conversations:', err)
    conversations.value = []
  }
}


onMounted(async () => {
  await loadConversations()

  if (conversations.value.length > 0) {
    activeConversationId.value = conversations.value[0].id
    await loadMessagesForConversation(activeConversationId.value)
  } else {
    await createConversation()
  }
})

</script>
