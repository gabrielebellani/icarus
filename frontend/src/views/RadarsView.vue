<script setup lang="ts">
import { ref } from 'vue'
import { getRadarTrackings } from '@/api/radar'
import type { RadarTracking } from '@/types/radar'
import RadarCard from '@/components/radar/RadarCard.vue'
import RadarCreateDialog from '@/components/radar/RadarCreateDialog.vue'
import { Button } from '@/components/ui/button'
import PageSpinner from '@/components/layout/PageSpinner.vue'
import PageError from '@/components/layout/PageError.vue'
import { useAsyncPageState } from '@/composables/useAsyncPageState'

const radars = ref<RadarTracking[]>([])
const showCreateDialog = ref(false)

const { state: pageState, error: pageError, run, retry } = useAsyncPageState(
  'Failed to load radars. Please refresh.',
)

run(async () => {
  radars.value = await getRadarTrackings()
})

function onCreated(record: RadarTracking) {
  radars.value.push(record)
  showCreateDialog.value = false
}

function onRemoved(id: string) {
  radars.value = radars.value.filter((r) => r.id !== id)
}
</script>

<template>
  <div class="radars">
    <!-- Main content -->
    <main class="radars__main">
      <!-- Loading -->
      <PageSpinner v-if="pageState === 'loading'" label="Loading radars…" />

      <!-- Error -->
      <PageError v-else-if="pageState === 'error'" :message="pageError!" @retry="retry" />

      <!-- Ready -->
      <div v-else class="radars__content">
        <!-- Page header -->
        <div class="radars__page-header">
          <div class="radars__page-title-group">
            <h1 class="radars__page-title">Radars</h1>
            <p class="radars__page-subtitle">Track aircraft in geographic zones with live radar data.</p>
          </div>
          <Button 
          size="sm" 
          @click="showCreateDialog = true"
          style="min-width: 150px;"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              style="margin-right: 0.375rem"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New radar
          </Button>
        </div>

        <!-- Create dialog -->
        <RadarCreateDialog v-model:open="showCreateDialog" @created="onCreated" />

        <!-- Radar list -->
        <div v-if="radars.length > 0" class="radars__list" role="list" aria-label="Active radars">
          <div v-for="radar in radars" :key="radar.id" role="listitem">
            <RadarCard :radar="radar" @removed="onRemoved" />
          </div>
        </div>

        <!-- Empty state (no radars, dialog not open) -->
        <div v-else class="radars__empty">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="radars__empty-icon"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
          </svg>
          <p class="radars__empty-title">No active radars</p>
          <p class="radars__empty-body">Create a radar zone to start tracking aircraft in a geographic area.</p>
          <Button size="sm" @click="showCreateDialog = true"> Create your first radar </Button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.radars {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--background);

  // ─── Main ────────────────────────────────────────────────────────────────
  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 2rem 1rem;
  }

  // ─── Ready state content ───────────────────────────────────────────────────
  &__content {
    width: 100%;
    max-width: 660px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  // ─── Page header ────────────────────────────────────────────────────────────
  &__page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  &__page-title-group {
    flex: 1;
  }

  &__page-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--foreground);
    margin: 0;
    letter-spacing: -0.01em;
  }

  &__page-subtitle {
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    margin: 0;
  }


  // ─── Radar list ───────────────────────────────────────────────────────────
  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  // ─── Empty state ──────────────────────────────────────────────────────────
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    padding: 3rem 2rem;
    text-align: center;
  }

  &__empty-icon {
    color: var(--muted-foreground);
    opacity: 0.5;
  }

  &__empty-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--foreground);
    margin: 0 0 0.5rem 0;
  }

  &__empty-body {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    max-width: 20rem;
    margin: 0 0 1rem 0;
  }
}
</style>
