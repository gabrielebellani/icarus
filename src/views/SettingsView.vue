<script setup lang="ts">
import { ref } from 'vue'
import PreferencesSection from '@/components/settings/PreferencesSection.vue'
import SecuritySection from '@/components/settings/SecuritySection.vue'
import ApiUsageSection from '@/components/settings/ApiUsageSection.vue'
import ApiRequestsChartSection from '@/components/settings/ApiRequestsChartSection.vue'
import DangerZoneSection from '@/components/settings/DangerZoneSection.vue'

const preferencesRef = ref<HTMLElement | null>(null)

function scrollToPreferences() {
  preferencesRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="settings-view-page">
    <div class="settings-view">
      <header class="settings-view__header">
        <h1 class="settings-view__page-title">Settings</h1>
        <p class="settings-view__page-subtitle">Manage your account and application preferences.</p>
      </header>

      <div class="settings-view__sections">
        <div ref="preferencesRef">
          <PreferencesSection />
        </div>
        <SecuritySection />
        <ApiUsageSection @scroll-to-preferences="scrollToPreferences" />
        <ApiRequestsChartSection />
        <DangerZoneSection />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings-view-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--background);
}

.settings-view {
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1rem;

  @media (min-width: 768px) {
    padding: 2.5rem 1.5rem;
  }

  &__header {
    margin-bottom: 2rem;
  }

  &__page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--foreground);
    margin: 0 0 0.25rem;
    letter-spacing: -0.01em;
  }

  &__page-subtitle {
    font-size: 0.9rem;
    color: var(--muted-foreground);
    margin: 0;
  }

  &__sections {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
}
</style>
