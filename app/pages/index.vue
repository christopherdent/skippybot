<template>
  <div
    class="flex min-h-screen flex-col bg-gray-100 text-gray-800 md:flex-row"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- Mobile header -->
    <header class="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
      <button
        class="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700"
        @click="openSidebar"
      >
        Chats
      </button>
      <div class="text-sm font-semibold text-blue-700 truncate max-w-[55%]">
        {{ activeConversationTitle }}
      </div>
      <button
        class="text-sm text-blue-600 hover:underline"
        @click="createConversation"
      >
        + New
      </button>
    </header>
    <div
      v-if="showSwipeHint"
      class="fixed left-1/2 top-16 z-40 -translate-x-1/2 rounded-full bg-gray-900/90 px-3 py-1 text-xs text-white shadow md:hidden"
      @click="dismissSwipeHint"
    >
      Swipe from left edge to open Chats
    </div>

    <!-- Mobile sidebar drawer -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-40 md:hidden"
      @click="isSidebarOpen = false"
    >
      <div class="absolute inset-0 bg-black/30" />
      <aside
        class="absolute left-0 top-0 h-full w-72 border-r border-gray-200 bg-white p-4 flex flex-col"
        @click.stop
      >
        <div class="flex justify-center pb-3">
          <div class="h-1.5 w-12 rounded-full bg-gray-200" />
        </div>
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
            class="group flex justify-between items-center px-3 py-2.5 rounded-md cursor-pointer transition-all mb-1 text-sm"
            :class="conv.id === activeConversationId
              ? 'bg-blue-100 text-blue-800 font-medium'
              : 'hover:bg-gray-100'"
          >
            <span
              @click="selectConversation(conv.id); isSidebarOpen = false"
              class="flex-1 truncate"
            >
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
    </div>

    <!-- Desktop sidebar -->
    <aside class="hidden w-72 border-r border-gray-200 bg-white p-4 md:flex md:flex-col">
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
          class="group flex justify-between items-center px-3 py-2.5 rounded-md cursor-pointer transition-all mb-1 text-sm"
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
    <main class="flex-1 px-4 pb-4 pt-4 md:p-6 md:max-w-3xl md:mx-auto flex flex-col w-full">
      <h1 class="mb-4 mt-2 text-2xl font-bold text-center text-blue-700 md:mt-8 md:text-3xl">
        🤖 Skippybot
      </h1>

      <div ref="scrollContainer" class="flex-1 overflow-y-auto space-y-4 pb-24">
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
          <div v-if="msg.attachments?.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <img
              v-for="att in msg.attachments"
              :key="att.id || att.storage_path"
              :src="att.signed_url || att.url"
              alt="Chat attachment"
              class="h-28 w-full rounded-md border border-gray-200 object-cover"
              loading="lazy"
              @load="handleAttachmentLoad(att)"
            />
          </div>
        </div>
        <!-- 🔽 anchor for auto-scroll -->
        <div ref="bottomRef" />
      </div>

      <div class="sticky bottom-0 bg-gray-100 pt-3 pb-[env(safe-area-inset-bottom)]">
        <ChatInput :conversation-id="activeConversationId" @send="sendMessage" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import ChatInput from '~/components/ChatInput.vue';
import MarkdownRenderer from '~/components/MarkdownRenderer.vue'


const bottomRef = ref(null)
const messages = ref([])
const activeConversationId = ref(null);
const conversations = ref([]);
const isSidebarOpen = ref(false);
const touchStart = ref({ x: 0, y: 0, time: 0 });
const showSwipeHint = ref(false);

const activeConversationTitle = computed(() => {
  const active = conversations.value.find((c) => c.id === activeConversationId.value);
  return active?.title || 'Skippybot';
});

const handleTouchStart = (event) => {
  const touch = event.touches?.[0];
  if (!touch) return;
  touchStart.value = {
    x: touch.clientX,
    y: touch.clientY,
    time: Date.now()
  };
};

const handleTouchEnd = (event) => {
  const touch = event.changedTouches?.[0];
  if (!touch) return;

  const deltaX = touch.clientX - touchStart.value.x;
  const deltaY = touch.clientY - touchStart.value.y;
  const elapsed = Date.now() - touchStart.value.time;

  if (elapsed > 500) return;
  if (Math.abs(deltaY) > 50) return;

  const startedNearEdge = touchStart.value.x < 24;

  if (!isSidebarOpen.value && startedNearEdge && deltaX > 60) {
    openSidebar();
  } else if (isSidebarOpen.value && deltaX < -60) {
    isSidebarOpen.value = false;
  }
};

const openSidebar = () => {
  isSidebarOpen.value = true;
  try {
    const seen = localStorage.getItem('skippybot_swipe_hint_seen');
    if (!seen) {
      showSwipeHint.value = true;
      localStorage.setItem('skippybot_swipe_hint_seen', '1');
      setTimeout(() => {
        dismissSwipeHint();
      }, 3500);
    }
  } catch {
    // ignore storage errors
  }
};

const dismissSwipeHint = () => {
  showSwipeHint.value = false;
};



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
const sendMessage = async (payload) => {
  const text = typeof payload === 'string' ? payload : payload?.text || ''
  const attachments = typeof payload === 'string' ? [] : payload?.attachments || []
  if (!text.trim() && !attachments.length) return;
  if (!activeConversationId.value) {
    console.error('No active conversation');
    return;
  }

  const messageText = text.trim();

  // Optimistic UI update - use spread instead of push
  messages.value = [...messages.value, {
    role: 'user',
    content: messageText,
    attachments: attachments.map((att) => ({
      storage_path: att.storagePath,
      signed_url: att.previewUrl || att.signedUrl || null,
      is_preview: Boolean(att.previewUrl)
    }))
  }];

  try {
    const res = await $fetch('/api/chat', {
      method: 'POST',
      body: {
        message: messageText,
        conversationId: activeConversationId.value,
        attachments
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

const handleAttachmentLoad = (att) => {
  if (att?.is_preview && typeof att.signed_url === 'string' && att.signed_url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(att.signed_url)
    } catch {
      // ignore revoke errors
    }
    att.is_preview = false
  }
}
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
