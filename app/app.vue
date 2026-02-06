<template>
  <div class="min-h-screen bg-gradient-to-b from-sky-50 to-white text-gray-800 flex flex-col">
    <!-- HEADER -->
    <header class="bg-white shadow p-4 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <img src="/images/skippy-logo.png" alt="Skippybot Logo" class="w-8 h-8" />
        <h1 class="text-2xl font-bold text-sky-700">Skippybot</h1>
      </div>
      <div class="flex items-center space-x-4">
        <button class="hover:text-sky-600" title="Theme Toggle">
          <i class="i-lucide-sun"></i>
        </button>
        <a href="https://github.com" target="_blank" class="hover:text-sky-600">
          <i class="i-lucide-github"></i>
        </a>
      </div>
    </header>

    <!-- CHAT CONTAINER -->
    <main class="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div class="w-full max-w-2xl space-y-4">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="[
            'p-4 rounded-xl shadow-md whitespace-pre-line break-words',
            msg.role === 'user' ? 'bg-white text-right border border-gray-200 ml-12' : 'bg-sky-100 text-left border border-sky-200 mr-12'
          ]"
        >
          <div class="text-sm font-medium mb-1">
            {{ msg.role === 'user' ? 'You' : 'Skippy' }}
          </div>
          <div>{{ msg.content }}</div>
        </div>

        <form @submit.prevent="sendMessage" class="flex gap-2 items-center">
          <input
            v-model="input"
            type="text"
            class="flex-1 px-4 py-3 rounded-lg border-2 border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="Ask Skippy something..."
          />
          <button
            type="submit"
            class="bg-sky-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sky-600 shadow-md transition"
          >
            Send
          </button>
        </form>
      </div>
    </main>

    <!-- FOOTER -->
    <footer class="text-sm text-gray-400 text-center py-4">
      Skippybot © 2026 — Powered by OpenAI
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { $fetch } from 'ofetch'

const input = ref('')
const messages = ref([
  { role: 'assistant', content: 'Hello! How can I assist you today?' }
])

const sendMessage = async () => {
  if (!input.value.trim()) return

  messages.value.push({ role: 'user', content: input.value })
  const userInput = input.value
  input.value = ''

  try {
    const { reply } = await $fetch('/api/chat', {
      method: 'POST',
      body: { messages: messages.value }
    })

    messages.value.push({ role: 'assistant', content: reply })
  } catch (err) {
    messages.value.push({ role: 'assistant', content: '⚠️ Something went wrong.' })
    console.error(err)
  }
}
</script>

<style>
body {
  font-family: 'Inter', sans-serif;
}
</style>
