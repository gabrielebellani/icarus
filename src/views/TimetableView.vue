<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getAirportTrackings } from '@/api/airport'
import { useTimetable } from '@/composables/useTimetable'
import { useLogout } from '@/composables/useLogout'
import { useAppChrome } from '@/composables/useAppChrome'
import TimetableBoard from '@/components/airport/TimetableBoard.vue'
import type { AirportTracking } from '@/types/airport'

const route = useRoute()
const logout = useLogout()

const trackingId = Number(route.params.trackingId)

// ── Airport info ──────────────────────────────────────────────────────────────
const airport = ref<AirportTracking | null>(null)

onMounted(async () => {
  try {
    const all = await getAirportTrackings()
    airport.value = all.find((a) => a.id === trackingId) ?? null
  } catch {
    // Non-fatal — display without airport metadata
  }
})

const displayCode = computed(
  () => airport.value?.iata_code ?? airport.value?.icao_code ?? '???',
)
const displayName = computed(() => airport.value?.name ?? 'Airport')
const displayCity = computed(() => airport.value?.city ?? null)

// ── Timetable data ────────────────────────────────────────────────────────────

const {
  arrivals,
  departures,
  arrivalsLoading,
  departuresLoading,
  arrivalsLoadingMore,
  departuresLoadingMore,
  arrivalsHasMore,
  departuresHasMore,
  error,
  lastUpdated,
  ensureLoaded,
  loadMore,
  refresh,
} = useTimetable({ trackingId, onAuthFailure: logout })

// ── Active tab ────────────────────────────────────────────────────────────────
type Tab = 'arrivals' | 'departures'
const activeTab = ref<Tab>('arrivals')

// Load arrivals on mount (default tab); lazy-load departures on first switch
onMounted(() => ensureLoaded('in'))
watch(activeTab, (tab) => ensureLoaded(tab === 'arrivals' ? 'in' : 'out'))

// ── Live clock ────────────────────────────────────────────────────────────────
const clock = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  clockTimer = setInterval(() => { clock.value = new Date() }, 1000)
})

onUnmounted(() => {
  if (clockTimer !== null) clearInterval(clockTimer)
})

const clockDisplay = computed(() =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(clock.value),
)

const clockDate = computed(() =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(clock.value),
)

// ── Last updated label ─────────────────────────────────────────────────────────
const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return null
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(lastUpdated.value)
})

// ── Fullscreen ────────────────────────────────────────────────────────────────
const isFullscreen = ref(false)
const viewEl = ref<HTMLElement | null>(null)
const { isChromeHidden } = useAppChrome()

// Hide the shared app header while this view's own fullscreen mode is active
// (native Fullscreen already excludes it from the rendered fullscreen
// element, but this keeps behavior explicit and consistent with other views).
watch(isFullscreen, (value) => {
  isChromeHidden.value = value
})

function toggleFullscreen() {
  if (!isFullscreen.value) {
    viewEl.value?.requestFullscreen().catch(() => {})
  } else {
    document.exitFullscreen().catch(() => {})
  }
}

function onFsChange() {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => document.addEventListener('fullscreenchange', onFsChange))
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
  isChromeHidden.value = false
})
</script>

<template>
  <div ref="viewEl" class="timetable-view" :class="{ 'timetable-view--fullscreen': isFullscreen }">

    <!-- ── Airport header ──────────────────────────────────────────────────── -->
    <div class="timetable-view__airport-header">

      <div class="timetable-view__airport-back">
        <RouterLink :to="{ name: 'airports' }" class="timetable-view__back-link" aria-label="Back to airports">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Airports
        </RouterLink>
      </div>

      <div class="timetable-view__airport-identity">
        <span class="timetable-view__airport-code">{{ displayCode }}</span>
        <div class="timetable-view__airport-meta">
          <span class="timetable-view__airport-name">{{ displayName }}</span>
          <span v-if="displayCity" class="timetable-view__airport-city">{{ displayCity }}</span>
        </div>
      </div>

      <!-- Live clock + fullscreen -->
      <div class="timetable-view__clock-group">
        <div class="timetable-view__clock" aria-live="off" aria-atomic="true">
          <span class="timetable-view__clock-time">{{ clockDisplay }}</span>
          <span class="timetable-view__clock-date">{{ clockDate }}</span>
        </div>
        <button
          class="timetable-view__icon-btn"
          :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          @click="toggleFullscreen"
        >
          <!-- Enter fullscreen icon -->
          <svg v-if="!isFullscreen" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          <!-- Exit fullscreen icon -->
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="4 14 10 14 10 20"/>
            <polyline points="20 10 14 10 14 4"/>
            <line x1="10" y1="14" x2="3" y2="21"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Tabs ─────────────────────────────────────────────────────────────── -->
    <div class="timetable-view__tab-bar" role="tablist" aria-label="Timetable type">
      <button
        class="timetable-view__tab"
        :class="{ 'timetable-view__tab--active': activeTab === 'arrivals' }"
        role="tab"
        :aria-selected="activeTab === 'arrivals'"
        @click="activeTab = 'arrivals'"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="12" y1="19" x2="12" y2="5"/>
          <polyline points="5 12 12 19 19 12"/>
        </svg>
        Arrivals
        <span v-if="!arrivalsLoading" class="timetable-view__tab-count">{{ arrivals.length }}</span>
      </button>

      <button
        class="timetable-view__tab"
        :class="{ 'timetable-view__tab--active': activeTab === 'departures' }"
        role="tab"
        :aria-selected="activeTab === 'departures'"
        @click="activeTab = 'departures'"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <polyline points="19 12 12 5 5 12"/>
        </svg>
        Departures
        <span v-if="!departuresLoading" class="timetable-view__tab-count">{{ departures.length }}</span>
      </button>

      <!-- Status bar -->
      <div class="timetable-view__status-bar">
        <span v-if="arrivalsLoading || departuresLoading" class="timetable-view__status-loading" aria-live="polite">
          <span class="timetable-view__spinner" aria-hidden="true" />
          Refreshing…
        </span>
        <span v-else-if="lastUpdatedLabel" class="timetable-view__status-updated">
          Updated {{ lastUpdatedLabel }}
        </span>

        <button
          class="timetable-view__icon-btn"
          title="Refresh timetable"
          aria-label="Refresh timetable"
          :disabled="arrivalsLoading || departuresLoading"
          @click="refresh"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" :class="{ 'timetable-view__spin': arrivalsLoading || departuresLoading }">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Board ─────────────────────────────────────────────────────────────── -->
    <main class="timetable-view__board" role="tabpanel" :aria-label="activeTab === 'arrivals' ? 'Arrivals board' : 'Departures board'">
      <TimetableBoard
        :flights="activeTab === 'arrivals' ? arrivals : departures"
        :mode="activeTab === 'arrivals' ? 'arrival' : 'departure'"
        :loading="activeTab === 'arrivals' ? arrivalsLoading : departuresLoading"
        :loading-more="activeTab === 'arrivals' ? arrivalsLoadingMore : departuresLoadingMore"
        :has-more="activeTab === 'arrivals' ? arrivalsHasMore : departuresHasMore"
        :error="error"
        @load-more="loadMore(activeTab === 'arrivals' ? 'in' : 'out')"
      />
    </main>

  </div>
</template>

<style scoped lang="scss">
$bg:        oklch(0.1 0.02 270);
$bg-nav:    oklch(0.12 0.022 270);
$bg-header: oklch(0.13 0.025 270);
$text:      oklch(0.97 0 0);
$muted:     oklch(0.52 0.01 270);
$divider:   oklch(0.18 0.025 270);

.timetable-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: $bg;
  color: $text;
  overflow: hidden;

  &--fullscreen {
    height: 100vh;
  }

  // ── Airport header ─────────────────────────────────────────────────────────
  &__airport-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1.5rem;
    background: $bg-header;
    border-bottom: 1px solid $divider;
    flex-shrink: 0;
  }

  &__airport-back {
    flex-shrink: 0;
  }

  &__back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: $muted;
    text-decoration: none;
    transition: color 0.15s;

    &:hover {
      color: $text;
    }
  }

  &__airport-identity {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    flex: 1;
    min-width: 0;
  }

  &__airport-code {
    font-size: 2.25rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: $text;
    flex-shrink: 0;
    line-height: 1;
  }

  &__airport-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  &__airport-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: $text;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__airport-city {
    font-size: 0.75rem;
    color: $muted;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // ── Direction switcher ─────────────────────────────────────────────────────
  &__dir-switcher {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  &__dir-btn {
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border: 1px solid $divider;
    background: transparent;
    color: $muted;
    cursor: pointer;
    transition: color 0.15s, background 0.15s, border-color 0.15s;

    &:hover:not(:disabled) {
      color: $text;
      border-color: oklch(0.32 0.03 270);
    }

    &--active {
      background: oklch(0.72 0.14 200 / 0.15);
      border-color: oklch(0.72 0.14 200 / 0.4);
      color: oklch(0.72 0.14 200);
    }

    &--saving {
      opacity: 0.6;
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  // ── Clock + fullscreen group ───────────────────────────────────────────────
  &__clock-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__clock {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.1rem;
  }

  &__clock-time {
    font-size: 1.5rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.04em;
    line-height: 1;
    color: $text;
  }

  &__clock-date {
    font-size: 0.6875rem;
    font-weight: 500;
    color: $muted;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  // ── Shared icon button ─────────────────────────────────────────────────────
  &__icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    border: 1px solid $divider;
    background: transparent;
    color: $muted;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      color: $text;
      background: oklch(0.18 0.025 270);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  // ── Tab bar ────────────────────────────────────────────────────────────────
  &__tab-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 1.5rem;
    border-bottom: 1px solid $divider;
    background: $bg-nav;
    flex-shrink: 0;
  }

  &__tab {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.75rem 1.25rem;
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: $muted;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    margin-bottom: -1px;
    white-space: nowrap;

    &:hover {
      color: $text;
    }

    &--active {
      color: $text;
      border-bottom-color: oklch(0.72 0.14 200);
    }
  }

  &__tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.4rem;
    height: 1.1rem;
    padding: 0 0.3rem;
    background: oklch(0.18 0.025 270);
    border-radius: 999px;
    font-size: 0.625rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: $muted;
  }

  // ── Status bar ─────────────────────────────────────────────────────────────
  &__status-bar {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  &__status-loading,
  &__status-updated {
    font-size: 0.6875rem;
    color: $muted;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  &__spinner {
    display: inline-block;
    width: 0.6rem;
    height: 0.6rem;
    border: 1.5px solid $muted;
    border-top-color: $text;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__spin {
    animation: spin 0.8s linear infinite;
  }

  // ── Board area ─────────────────────────────────────────────────────────────
  &__board {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0 1.5rem;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

