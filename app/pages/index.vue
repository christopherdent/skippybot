<template>
  <div
    class="flex h-[100dvh] flex-col bg-gray-100 text-gray-800 md:h-screen md:flex-row overflow-hidden"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <UButton
      v-if="user"
      class="fixed right-3 top-3 z-50 md:right-6 md:top-4"
      :loading="isSigningOut"
      @click="signOut"
    >
      Logout
    </UButton>

    <!-- Mobile header -->
    <header class="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 md:hidden">
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
    <aside class="hidden h-screen w-72 border-r border-gray-200 bg-white p-4 md:flex md:flex-col overflow-hidden">
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
    <main class="flex-1 px-3 pb-3 pt-3 md:p-6 md:max-w-3xl md:mx-auto flex flex-col w-full min-h-0">
      <h1
        class="sticky top-0 z-20 bg-gray-100/95 backdrop-blur overflow-hidden transition-opacity duration-300 will-change-[opacity]"
        :class="headerCollapsed ? 'max-h-0 mb-0 py-0' : 'max-h-[55.2%] mb-4 py-2'"
        :style="{ opacity: headerOpacity }"
      >
        <span class="inline-flex items-center justify-center gap-2">
          <img
            src="/images/skippy-banner.png"
            alt="Skippy logo"
            class="transform-gpu"
          />
        </span>
      </h1>

      <div
        v-if="hasMessages"
        ref="scrollContainer"
        class="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pb-28 md:pb-24"
        @scroll="handleScroll"
      >
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div class="max-w-[82%] space-y-1">
            <div
              class="text-[11px] font-semibold text-gray-500 px-1"
              :class="msg.role === 'user' ? 'text-right' : 'text-left'"
            >
              {{ msg.role === 'user' ? 'You' : 'Skippy' }}
            </div>
            <div
              class="chat-bubble border p-3"
              :class="msg.role === 'user'
                ? 'bg-emerald-100 border-emerald-200 rounded-2xl rounded-br-md'
                : 'bg-white border-gray-200 rounded-2xl rounded-bl-md'"
            >
              <MarkdownRenderer :content="msg.content" />
            </div>
            <div
              v-if="msg.attachments?.length"
              class="grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              <img
                v-for="att in msg.attachments"
                :key="att.id || att.storage_path"
                :src="att.signed_url || att.url"
                alt="Chat attachment"
                class="h-28 w-full rounded-xl border border-gray-200 object-cover"
                loading="lazy"
                @load="handleAttachmentLoad(att)"
              />
            </div>
          </div>
        </div>
        <div v-if="isResponding" class="flex justify-start">
          <div class="max-w-[82%] space-y-1">
            <div class="px-1 text-left text-[11px] font-semibold text-gray-500">Skippy</div>
            <div class="chat-bubble rounded-2xl rounded-bl-md border border-gray-200 bg-white p-3">
              <span class="inline-flex items-center gap-1" aria-label="Skippy is responding">
                <span class="typing-dot" />
                <span class="typing-dot" />
                <span class="typing-dot" />
              </span>
            </div>
          </div>
        </div>
        <!-- 🔽 anchor for auto-scroll -->
        <div ref="bottomRef" />
      </div>

      <div
        :class="hasMessages
          ? 'fixed inset-x-0 bottom-0 z-30 bg-gray-100/95 backdrop-blur border-t border-gray-200 pt-2 pb-[calc(env(safe-area-inset-bottom)+20px)] md:sticky md:inset-x-auto'
          : 'flex-1 flex items-start justify-center bg-gray-100 pt-6 pb-[calc(env(safe-area-inset-bottom)+20px)]'"
      >
        <div :class="hasMessages ? 'mx-auto w-full max-w-3xl px-3 md:px-0' : 'w-full max-w-xl pl-6'">
          <ChatInput :conversation-id="activeConversationId" @send="sendMessage" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import ChatInput from '~/components/ChatInput.vue';
import MarkdownRenderer from '~/components/MarkdownRenderer.vue'


const bottomRef = ref(null)
const scrollContainer = ref(null)
const messages = ref([])
const activeConversationId = ref(null);
const conversations = ref([]);
const isSidebarOpen = ref(false);
const touchStart = ref({ x: 0, y: 0, time: 0 });
const showSwipeHint = ref(false);
const headerOpacity = ref(1);
const suppressScrollFade = ref(false);
const headerCollapsed = ref(false);
const isSigningOut = ref(false);
const isResponding = ref(false);
let headerRafId = 0;
const HEADER_FADE_DISTANCE = 140;
const HEADER_COLLAPSE_AT = 220;
const HEADER_EXPAND_AT = 8;
const user = useSupabaseUser()
const supabase = useSupabaseClient()

const hasMessages = computed(() => messages.value.length > 0);

const resetHeaderFade = () => {
  headerOpacity.value = 1;
  headerCollapsed.value = false;
  suppressScrollFade.value = true;
  setTimeout(() => {
    suppressScrollFade.value = false;
  }, 300);
};

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

const signOut = async () => {
  if (isSigningOut.value) return;

  isSigningOut.value = true;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    await navigateTo('/LoginSignup');
  } catch (error) {
    console.error('Failed to sign out:', error);
  } finally {
    isSigningOut.value = false;
  }
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
    resetHeaderFade();
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
    isResponding.value = true;
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
  } finally {
    isResponding.value = false;
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
    resetHeaderFade();
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

const handleScroll = () => {
  if (suppressScrollFade.value) return;
  if (headerRafId) return;
  headerRafId = requestAnimationFrame(() => {
    headerRafId = 0;
    const top = scrollContainer.value?.scrollTop || 0;
    const next = top < 4 ? 1 : 1 - Math.min(top / HEADER_FADE_DISTANCE, 1);
    const clamped = Math.max(0, next);
    // Wide hysteresis prevents collapse/expand loops from layout shifts.
    if (!headerCollapsed.value && top > HEADER_COLLAPSE_AT) {
      headerCollapsed.value = true;
    } else if (headerCollapsed.value && top < HEADER_EXPAND_AT) {
      headerCollapsed.value = false;
    }
    const targetOpacity = headerCollapsed.value ? 0 : clamped;
    if (Math.abs(targetOpacity - headerOpacity.value) >= 0.01) {
      headerOpacity.value = targetOpacity;
    }
  });
};

</script>

<style scoped>
.chat-bubble {
  position: relative;
  overflow: visible;
  box-shadow:
    0 6px 18px -10px rgba(15, 23, 42, 0.35),
    0 2px 8px -6px rgba(15, 23, 42, 0.25);
}

.typing-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 9999px;
  background-color: #64748b;
  animation: typingPulse 1s ease-in-out infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingPulse {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-0.125rem);
  }
}
</style>
