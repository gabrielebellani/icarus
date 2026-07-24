<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getTracking, stopTracking } from '@/api/flight'
import type { TrackedFlightPayload, TrackingRecord, FlightDataSource, FlightPhase } from '@/types/flight'
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
const trackedFlight = ref<TrackedFlightPayload | null>(null)

interface TrackingMeta {
  phase: FlightPhase
  dataSource: FlightDataSource
  degradedMode: boolean
}
const trackingMeta = ref<TrackingMeta | null>(null)

// Degraded-mode alert dismissal — reset whenever we (re-)enter degraded mode
const degradedAlertDismissed = ref(false)
watch(
  () => trackingMeta.value?.degradedMode,
  (isDegraded, wasDegraded) => {
    if (isDegraded && !wasDegraded) {
      degradedAlertDismissed.value = false
    }
  },
)

function dismissDegradedAlert() {
  degradedAlertDismissed.value = true
}

// Polling configuration: normal cadence vs. reduced cadence while degraded
// (FlightAware-only fallback, to limit costly calls).
const NORMAL_POLL_INTERVAL = 60 * 1000 // 60 seconds
const DEGRADED_POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes
let pollTimerId: ReturnType<typeof setInterval> | null = null

function updateFromRecord(record: TrackingRecord) {
  trackedFlight.value = record.payload
  trackingMeta.value = {
    phase: record.phase,
    dataSource: record.data_source,
    degradedMode: record.degraded_mode,
  }
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

  updateFromRecord(record)
  isTracking.value = true
  startPolling()
})

function currentPollInterval(): number {
  return trackingMeta.value?.degradedMode ? DEGRADED_POLL_INTERVAL : NORMAL_POLL_INTERVAL
}

function startPolling() {
  if (pollTimerId) {
    clearInterval(pollTimerId)
  }

  pollTimerId = setInterval(poll, currentPollInterval())
}

async function poll() {
  try {
    const record = await getTracking()
    if (record === null) {
      // Tracking ended server-side
      isTracking.value = false
      trackedFlight.value = null
      trackingMeta.value = null
      stopPolling()
      return
    }

    const wasDegraded = trackingMeta.value?.degradedMode ?? false
    updateFromRecord(record)

    // Cadence changed (entered/exited degraded mode) — restart interval with new timing
    if (wasDegraded !== record.degraded_mode) {
      startPolling()
    }
  } catch (error) {
    // Swallow polling errors, keep showing last known data
    console.warn('Error polling tracked flight:', error)
  }
}

function stopPolling() {
  if (pollTimerId) {
    clearInterval(pollTimerId)
    pollTimerId = null
  }
}

function onTracked(record: TrackingRecord) {
  updateFromRecord(record)
  isTracking.value = true
  startPolling()
}

const isStoppingTracking = ref(false)
const stopError = ref<string | null>(null)

async function onStopTracking() {
  isStoppingTracking.value = true
  stopError.value = null

  try {
    await stopTracking()
    trackedFlight.value = null
    trackingMeta.value = null
    isTracking.value = false
    stopPolling()
  } catch {
    stopError.value = 'Failed to stop tracking. Please try again.'
  } finally {
    isStoppingTracking.value = false
  }
}

onUnmounted(() => {
  stopPolling()
})
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
          <FlightTracking
            :flight="trackedFlight"
            :data-source="trackingMeta?.dataSource ?? null"
            :degraded-mode="trackingMeta?.degradedMode ?? false"
            @stop-tracking="onStopTracking"
          />
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

    <!-- Fixed degraded-mode alert (bottom-left) -->
    <Transition name="fade">
      <div v-if="trackingMeta?.degradedMode && !degradedAlertDismissed" class="dashboard__degraded-alert" role="status">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>Heads up: FlightAware calls have a cost, so we're reducing the update frequency to 5 minutes.</span>
        <button
          class="dashboard__degraded-alert-close"
          @click="dismissDegradedAlert"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </Transition>
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

  // ─── Degraded-mode alert (fixed bottom-left) ──────────────────────────────
  &__degraded-alert {
    position: fixed;
    left: 1rem;
    bottom: 1rem;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    max-width: 360px;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    background: oklch(0.2 0.06 70);
    border: 1px solid oklch(0.4 0.1 70);
    color: oklch(0.85 0.12 70);
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.4;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);

    svg {
      flex-shrink: 0;
    }
  }

  &__degraded-alert-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    margin-left: auto;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: inherit;
    opacity: 0.7;
    cursor: pointer;
    transition: opacity 0.15s, background 0.15s;

    &:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.08);
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
