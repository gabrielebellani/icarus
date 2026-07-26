<script setup lang="ts">
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

defineProps<{
  src: string
  alt: string
}>()
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="sm:max-w-3xl w-fit p-2">
      <DialogTitle class="sr-only">{{ alt }}</DialogTitle>
      <img :src="src" :alt="alt" class="image-modal-image">
    </DialogContent>
  </Dialog>
</template>

<style scoped>
:slotted(img) {
  cursor: zoom-in;
}

.image-modal-image {
  display: block;
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  margin: 0 auto;
}
</style>
