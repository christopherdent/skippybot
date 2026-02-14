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

<style>
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
  margin: 0.75em 0;
  padding-left: 0;
}

.markdown-body li {
  position: relative;
  list-style: none;
  padding-left: 1.4em;
  margin: 0.25em 0;
}

.markdown-body ul li::before {
  content: "•";
  position: absolute;
  left: 0;
  top: 0;
  color: #334155;
  font-weight: 700;
}

.markdown-body ol {
  counter-reset: item;
}

.markdown-body ol li {
  counter-increment: item;
}

.markdown-body ol li::before {
  content: counter(item) ".";
  position: absolute;
  left: 0;
  top: 0;
  color: #334155;
  font-weight: 700;
}

.markdown-body blockquote {
  border-left: 4px solid #ccc;
  padding-left: 1em;
  color: #555;
  margin: 1em 0;
}
</style>
