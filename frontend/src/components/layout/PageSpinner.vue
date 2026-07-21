<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'Loading…' })
</script>

<template>
  <div class="page-spinner" role="status" :aria-label="label">
    <svg class="page-spinner__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
    <p class="page-spinner__label">{{ label }}</p>
  </div>
</template>

<style scoped lang="scss">
.page-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.875rem;
  margin: auto;

  &__icon {
    animation: page-spinner-spin 1s linear infinite;
    color: var(--muted-foreground);
  }

  &__label {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    margin: 0;
  }
}

@keyframes page-spinner-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
