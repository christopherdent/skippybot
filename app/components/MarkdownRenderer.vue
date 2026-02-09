<template>
  <div v-html="renderedContent" class="markdown-body" />
</template>

<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  content: {
    type: String,
    required: true
  }
})

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const renderedContent = computed(() => {
  return md.render(props.content)
})
</script>

<style scoped>
/* Optional GitHub-like styling, or use Tailwind/prose if preferred */
.markdown-body {
  line-height: 1.6;
  word-break: break-word;
}

.markdown-body h1,
.markdown-body h2 {
  margin-top: 1.2em;
  margin-bottom: 0.4em;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 1.5em;
}

.markdown-body blockquote {
  border-left: 4px solid #ccc;
  padding-left: 1em;
  color: #555;
  margin: 1em 0;
}
</style>
