<script setup lang="ts">
import { Button } from '@/components/ui/button'

defineProps<{ message: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="page-error">
    <p class="page-error__message">{{ message }}</p>
    <Button variant="outline" size="sm" @click="$emit('retry')">Reload</Button>
  </div>
</template>

<style scoped lang="scss">
.page-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.875rem;
  margin: auto;

  &__message {
    font-size: 0.875rem;
    color: oklch(0.5 0.18 25);
    margin: 0;
  }
}
</style>
