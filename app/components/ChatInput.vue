<template>
  <form @submit.prevent="handleSubmit" class="flex flex-col gap-2">
    <div v-if="pendingImages.length" class="flex gap-2 overflow-x-auto pb-1">
      <div
        v-for="(img, idx) in pendingImages"
        :key="img.id"
        class="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white"
      >
        <img :src="img.previewUrl" alt="Selected image" class="h-full w-full object-cover" />
        <button
          type="button"
          class="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-xs text-white"
          @click="removeImage(idx)"
          title="Remove"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        @change="handleFiles"
      />
      <UButton type="button" variant="ghost" @click="triggerFilePicker" aria-label="Add image">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4"
        >
          <path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a2 2 0 0 1-2.83-2.83l8.49-8.49" />
        </svg>
      </UButton>
      <UInput
        v-model="message"
        placeholder="Ask Skippy something..."
        class="hidden md:block flex-1"
      />
      <UTextarea
        v-model="message"
        placeholder="Ask Skippy something..."
        :rows="2"
        class="md:hidden flex-1"
        @keydown.enter.exact.prevent="handleSubmit"
      />
      <UButton type="submit" :loading="isUploading">Send</UButton>
    </div>
  </form>
</template>

<script setup>
const props = defineProps({
  conversationId: {
    type: String,
    required: false,
    default: ''
  }
})

const message = ref('')
const isUploading = ref(false)
const fileInput = ref(null)
const pendingImages = ref([])

const emit = defineEmits(['send'])

const triggerFilePicker = () => {
  fileInput.value?.click()
}

const handleFiles = async (event) => {
  const files = Array.from(event.target.files || [])
  if (!files.length) return

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const previewUrl = URL.createObjectURL(file)
    const dimensions = await getImageDimensions(previewUrl)
    pendingImages.value.push({
      id: crypto.randomUUID(),
      file,
      previewUrl,
      width: dimensions.width,
      height: dimensions.height
    })
  }

  event.target.value = ''
}

const removeImage = (idx) => {
  const [removed] = pendingImages.value.splice(idx, 1)
  if (removed?.previewUrl) {
    URL.revokeObjectURL(removed.previewUrl)
  }
}

const getImageDimensions = (src) => new Promise((resolve) => {
  const img = new Image()
  img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
  img.onerror = () => resolve({ width: null, height: null })
  img.src = src
})

const uploadImage = async (img) => {
  if (!props.conversationId) {
    throw new Error('Missing conversationId for upload')
  }

  const res = await $fetch('/api/uploads', {
    method: 'POST',
    body: {
      conversationId: props.conversationId,
      fileName: img.file.name,
      contentType: img.file.type
    }
  })

  await fetch(res.uploadUrl, {
    method: 'PUT',
    headers: {
      'content-type': img.file.type
    },
    body: img.file
  })

  return {
    storagePath: res.path,
    bucket: res.bucket,
    mimeType: img.file.type,
    sizeBytes: img.file.size,
    width: img.width,
    height: img.height
  }
}

async function handleSubmit() {
  const text = message.value.trim()
  if (!text && !pendingImages.value.length) return

  isUploading.value = true
  try {
    const attachments = []
    for (const img of pendingImages.value) {
      const uploaded = await uploadImage(img)
      attachments.push({
        ...uploaded,
        previewUrl: img.previewUrl
      })
    }

    emit('send', { text, attachments })
    message.value = ''
    pendingImages.value = []
  } finally {
    isUploading.value = false
  }
}
</script>
