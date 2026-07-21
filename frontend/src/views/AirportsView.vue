<script setup lang="ts">
import { ref } from 'vue'
import { getAirportTrackings } from '@/api/airport'
import type { AirportTracking } from '@/types/airport'
import AirportCard from '@/components/airport/AirportCard.vue'
import AirportSearchForm from '@/components/airport/AirportSearchForm.vue'
import { Button } from '@/components/ui/button'
import PageSpinner from '@/components/layout/PageSpinner.vue'
import PageError from '@/components/layout/PageError.vue'
import { useAsyncPageState } from '@/composables/useAsyncPageState'

const trackings = ref<AirportTracking[]>([])
const showAddForm = ref(false)

const { state: pageState, error: pageError, run, retry } = useAsyncPageState(
  'Failed to load tracked airports. Please refresh.',
)

run(async () => {
  trackings.value = await getAirportTrackings()
})

function onTracked(record: AirportTracking) {
  trackings.value.push(record)
  showAddForm.value = false
}

function onUpdated(record: AirportTracking) {
  const idx = trackings.value.findIndex((t) => t.id === record.id)
  if (idx !== -1) trackings.value[idx] = record
}

function onRemoved(id: number) {
  trackings.value = trackings.value.filter((t) => t.id !== id)
}
</script>

<template>
  <div class="airports">
    <!-- Main content -->
    <main class="airports__main">

      <!-- Loading -->
      <PageSpinner v-if="pageState === 'loading'" label="Loading tracked airports…" />

      <!-- Error -->
      <PageError
        v-else-if="pageState === 'error'"
        :message="pageError!"
        @retry="retry"
      />

      <!-- Ready -->
      <div v-else class="airports__content">

        <!-- Page header -->
        <div class="airports__page-header">
          <div class="airports__page-title-group">
            <h1 class="airports__page-title">Airports</h1>
            <p class="airports__page-subtitle">
              Track timetables and delays for multiple airports.
            </p>
          </div>
          <Button
            v-if="!showAddForm"
            size="sm"
            @click="showAddForm = true"
            style="min-width: 150px;"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-right: 0.375rem;">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Track airport
          </Button>
        </div>

        <!-- Add form panel -->
        <Transition name="slide-down">
          <div v-if="showAddForm" class="airports__add-panel">
            <AirportSearchForm
              @tracked="onTracked"
              @cancel="showAddForm = false"
            />
          </div>
        </Transition>

        <!-- Airport list -->
        <div v-if="trackings.length > 0" class="airports__list" role="list" aria-label="Tracked airports">
          <div
            v-for="airport in trackings"
            :key="airport.id"
            role="listitem"
          >
            <AirportCard
              :airport="airport"
              @updated="onUpdated"
              @removed="onRemoved"
            />
          </div>
        </div>

        <!-- Empty state (no airports, form not open) -->
        <div
          v-else-if="!showAddForm"
          class="airports__empty"
        >
          <div class="airports__empty-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <p class="airports__empty-title">No airports tracked</p>
          <p class="airports__empty-body">
            Add an airport to start monitoring arrivals, departures, or both.
          </p>
          <Button size="sm" @click="showAddForm = true">Track your first airport</Button>
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.airports {
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
    padding: 2rem 1rem;
  }

  // ─── Content ──────────────────────────────────────────────────────────────
  &__content {
    width: 100%;
    max-width: 660px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  // ─── Page header ──────────────────────────────────────────────────────────
  &__page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  &__page-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
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

  // ─── Add form panel ────────────────────────────────────────────────────────
  &__add-panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
  }

  // ─── List ─────────────────────────────────────────────────────────────────
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
    gap: 0.625rem;
    padding: 3rem 2rem;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    text-align: center;
  }

  &__empty-icon {
    color: var(--muted-foreground);
    opacity: 0.4;
    margin-bottom: 0.25rem;
  }

  &__empty-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--foreground);
    margin: 0;
  }

  &__empty-body {
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    margin: 0;
    max-width: 30ch;
    line-height: 1.5;
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
