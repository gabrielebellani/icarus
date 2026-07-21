<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import { useAppChrome } from '@/composables/useAppChrome'

const { isChromeHidden } = useAppChrome()
</script>

<template>
  <div class="authenticated-layout">
    <AppHeader v-show="!isChromeHidden" />
    <RouterView />
  </div>
</template>

<style scoped lang="scss">
.authenticated-layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}
</style>
