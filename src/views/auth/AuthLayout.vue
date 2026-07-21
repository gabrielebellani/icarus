<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <span class="text-2xl font-semibold tracking-tight">Icarus</span>
      </div>

      <slot />
    </div>
  </div>
</template>
