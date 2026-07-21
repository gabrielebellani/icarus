<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getTracking, stopTracking } from '@/api/flight'
import type { Flight, TrackingRecord } from '@/types/flight'
import FlightSearchForm from '@/components/flight/FlightSearchForm.vue'
import FlightTracking from '@/components/flight/FlightTracking.vue'
import { Button } from '@/components/ui/button'
import PageSpinner from '@/components/layout/PageSpinner.vue'
import PageError from '@/components/layout/PageError.vue'
import { useAsyncPageState } from '@/composables/useAsyncPageState'

const route = useRoute()

// Pre-fill values forwarded from timetable track action
const prefilledIdentifier = computed(() => String(route.query.identifier ?? ''))
const prefilledDate = computed(() => String(route.query.date ?? ''))

const isTracking = ref(false)
const trackedFlight = ref<Flight | null>(null)

// Resolve the active flight from a tracking record
function flightFromRecord(record: TrackingRecord): Flight | null {
  return record.payload ?? null
}

const { state: pageState, error: pageError, run, retry } = useAsyncPageState(
  'Failed to load tracking status. Please refresh.',
)

run(async () => {
  const record = await getTracking()

  if (record === null) {
    isTracking.value = false
    return
  }

  trackedFlight.value = flightFromRecord(record)
  isTracking.value = true
})

function onTracked(record: TrackingRecord) {
  trackedFlight.value = flightFromRecord(record)
  isTracking.value = true
}

const isStoppingTracking = ref(false)
const stopError = ref<string | null>(null)

async function onStopTracking() {
  isStoppingTracking.value = true
  stopError.value = null

  try {
    await stopTracking()
    trackedFlight.value = null
    isTracking.value = false
  } catch {
    stopError.value = 'Failed to stop tracking. Please try again.'
  } finally {
    isStoppingTracking.value = false
  }
}
</script>

<template>
  <div class="dashboard">
    <!-- Main content -->
    <main class="dashboard__main">

      <!-- Loading phase -->
      <PageSpinner v-if="pageState === 'loading'" label="Checking tracking status…" />

      <!-- Error phase -->
      <PageError v-else-if="pageState === 'error'" :message="pageError!" @retry="retry" />

      <!-- Search phase (Phase 1A + 1B) -->
      <div v-else-if="!isTracking" class="dashboard__search-wrapper">
        <FlightSearchForm
          :initial-identifier="prefilledIdentifier"
          :initial-date="prefilledDate"
          @tracked="onTracked"
        />
      </div>

      <!-- Tracking phase (Phase 2) -->
      <div v-else class="dashboard__tracking-wrapper">
        <div v-if="stopError" class="dashboard__stop-error">{{ stopError }}</div>

        <template v-if="trackedFlight">
          <FlightTracking :flight="trackedFlight" @stop-tracking="onStopTracking" />
        </template>

        <!-- Payload not yet available (null payload) -->
        <template v-else>
          <div class="dashboard__no-payload">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="dashboard__no-payload-icon" aria-hidden="true">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2c-.5-.1-.9.1-1.1.5L2 8c-.2.5 0 1.1.5 1.3L8 11l-1.5 2H4l-1 1 2 2 2 2 1-1v-2.5L10 13l2 5.5c.2.5.8.7 1.3.5l2.5-1.5c.4-.2.6-.6.5-1.1z"/>
            </svg>
            <p class="dashboard__no-payload-title">Tracking active</p>
            <p class="dashboard__no-payload-body">Flight data will appear once the backend syncs the latest information.</p>
            <Button variant="outline" size="sm" @click="onStopTracking" :disabled="isStoppingTracking">
              {{ isStoppingTracking ? 'Stopping…' : 'Stop tracking' }}
            </Button>
          </div>
        </template>
      </div>

    </main>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
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
    justify-content: center;
    padding: 2rem 1rem;
  }

  // ─── Search wrapper ───────────────────────────────────────────────────────
  &__search-wrapper {
    width: 100%;
    max-width: 460px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.75rem 1.5rem;
  }

  // ─── Tracking wrapper ─────────────────────────────────────────────────────
  &__tracking-wrapper {
    width: 100%;
    max-width: 680px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__stop-error {
    font-size: 0.8125rem;
    color: oklch(0.5 0.18 25);
    padding: 0.625rem 0.875rem;
    background: oklch(0.97 0.02 25);
    border: 1px solid oklch(0.88 0.05 25);
    border-radius: var(--radius);
  }

  // ─── No payload state ─────────────────────────────────────────────────────
  &__no-payload {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
    padding: 2.5rem 1.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
    text-align: center;

    &-icon {
      color: var(--muted-foreground);
      opacity: 0.5;
      margin-bottom: 0.25rem;
    }

    &-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--foreground);
      margin: 0;
    }

    &-body {
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      margin: 0;
      max-width: 28ch;
    }
  }
}
</style>
