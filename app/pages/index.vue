<template>
  <div class="flex h-screen bg-gray-100 text-gray-800">
    <!-- Sidebar -->
    <aside class="w-72 border-r border-gray-200 bg-white p-4 flex flex-col">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold tracking-tight">Chats</h2>
        <button
          class="text-sm text-blue-600 hover:underline"
          @click="createConversation"
        >
          + New
        </button>
      </div>

      <ul class="overflow-y-auto flex-1 pr-1">
        <li
          v-for="conv in conversations"
          :key="conv.id"
          class="group flex justify-between items-center p-2 rounded-md cursor-pointer transition-all mb-1 text-sm"
          :class="conv.id === activeConversationId
            ? 'bg-blue-100 text-blue-800 font-medium'
            : 'hover:bg-gray-100'"
        >
          <span @click="selectConversation(conv.id)" class="flex-1 truncate">
            {{ conv.title || 'Untitled Chat' }}
          </span>
          <button
            @click.stop.prevent="deleteConversation(conv.id)"
            class="ml-2"
            title="Delete"
            small
          >
            🗑
          </button>
        </li>
      </ul>
    </aside>

    <!-- Main Chat -->
    <main class="flex-1 p-6 flex flex-col max-w-3xl mx-auto">
      <h1 class="mt-8 text-3xl font-bold mb-6 text-center text-blue-700">
        🤖 Skippybot
      </h1>

      <div ref="scrollContainer" class="flex-1 overflow-y-auto space-y-4">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="space-y-1"
        >
          <div class="text-sm font-semibold">
            {{ msg.role === 'user' ? 'You' : 'Skippy' }}
          </div>
          <MarkdownRenderer
            :content="msg.content"
            class="rounded-md p-3"
            :class="msg.role === 'user'
              ? 'bg-blue-50 border border-blue-100'
              : 'bg-white border border-gray-200'"
          />

        </div>
          <!-- 🔽 anchor for auto-scroll -->
        <div ref="bottomRef" />
      </div>

      <ChatInput @send="sendMessage" class="mt-6" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import ChatInput from '~/components/ChatInput.vue';
import MarkdownRenderer from '~/components/MarkdownRenderer.vue'


const bottomRef = ref(null)
const messages = ref([])
const activeConversationId = ref(null);
const conversations = ref([]);



const deleteConversation = async (conversationId) => {
  try {
    await $fetch(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    conversations.value = conversations.value.filter(
      (c) => c.id !== conversationId
    );

    // Reset active convo if it was the one deleted
    if (activeConversationId.value === conversationId) {
      if (conversations.value.length > 0) {
        activeConversationId.value = conversations.value[0].id;
        await loadMessagesForConversation(activeConversationId.value);
      } else {
        activeConversationId.value = null;
        messages.value = [];
      }
    }
  } catch (err) {
    console.error('Failed to delete conversation:', err);
  }
};


/**
 * Load messages for a given conversation
 */
const loadMessagesForConversation = async (conversationId) => {
  try {
    const res = await $fetch('/api/chats', {
      query: { conversationId },
    });

    messages.value = res.chats || [];
  } catch (err) {
    console.error('Failed to load messages:', err);
    messages.value = [];
  }
};

/**
 * Send a single message
 */
const sendMessage = async (text) => {
  if (!text || !text.trim()) return;
  if (!activeConversationId.value) {
    console.error('No active conversation');
    return;
  }

  const messageText = text.trim();

  // Optimistic UI update - use spread instead of push
  messages.value = [...messages.value, {
    role: 'user',
    content: messageText,
  }];

  try {
    const res = await $fetch('/api/chat', {
      method: 'POST',
      body: {
        message: messageText,
        conversationId: activeConversationId.value,
      },
    });

    // Use spread instead of push
    messages.value = [...messages.value, {
      role: 'assistant',
      content: res.reply,
    }];
    await loadConversations();
  } catch (err) {
    console.error('Failed to send message:', err);
    messages.value = [...messages.value, {
      role: 'assistant',
      content: '⚠️ Something went wrong.',
    }];
  }
};
const createConversation = async () => {
  console.log("Creating new convo")
  try {
    const res = await $fetch('/api/conversations', {
      method: 'POST',
    });

    const convo = res.conversation;
    conversations.value.unshift(convo);
    activeConversationId.value = convo.id;

    messages.value = [];
  } catch (err) {
    console.error('Failed to create conversation:', err);
  }
};
const selectConversation = async (conversationId) => {
  activeConversationId.value = conversationId;
  await loadMessagesForConversation(conversationId);
};


const loadConversations = async () => {
  try {
    const res = await $fetch('/api/conversations');
    conversations.value = res.conversations || [];
  } catch (err) {
    console.error('Failed to load conversations:', err);
    conversations.value = [];
  }
};

watch(messages, async () => {
  await nextTick();
  if (bottomRef.value) {
    bottomRef.value.scrollIntoView({ behavior: "smooth" });
  }
});
onMounted(async () => {
  await loadConversations();

  if (conversations.value.length > 0) {
    activeConversationId.value = conversations.value[0].id;
    await loadMessagesForConversation(activeConversationId.value);
  } else {
    await createConversation();
  }
})

</script>
