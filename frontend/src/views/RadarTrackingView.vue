<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getRadarTrackings } from '@/api/radar'
import { useRadarSocket } from '@/composables/useRadarSocket'
import { useAircraftCarousel } from '@/composables/useAircraftCarousel'
import { useLogout } from '@/composables/useLogout'
import { useAppChrome } from '@/composables/useAppChrome'
import type { RadarTracking } from '@/types/radar'
import RadarAircraftCard from '@/components/radar/RadarAircraftCard.vue'
import { Button } from '@/components/ui/button'

const route = useRoute()
const logout = useLogout()

const radarId = String(route.params.id)

// ── Radar metadata ────────────────────────────────────────────────────────────
const radar = ref<RadarTracking | null>(null)
const metadataError = ref<string | null>(null)

onMounted(async () => {
  try {
    const allRadars = await getRadarTrackings()
    radar.value = allRadars.find((r) => r.id === radarId) ?? null
    if (!radar.value) {
      metadataError.value = 'Radar not found.'
    }
  } catch {
    metadataError.value = 'Failed to load radar metadata.'
  }
})

// ── WebSocket + carousel ───────────────────────────────────────────────────────
const { connectionState, aircraft, lastMessageAt, error: wsError, retry: retryConnection } = useRadarSocket({
  radarId,
  onAuthFailure: logout,
})

const { currentAircraft, position } = useAircraftCarousel({
  aircraft,
})

// ── Fullscreen (via Teleport, not requestFullscreen) ──────────────────────────
const isFullscreen = ref(false)
const { isChromeHidden } = useAppChrome()

// Hide the shared app header while this view's own fullscreen mode is active.
watch(isFullscreen, (value) => {
  isChromeHidden.value = value
})

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', onEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onEscape)
  isFullscreen.value = false
  isChromeHidden.value = false
})

// ── Computed helpers ───────────────────────────────────────────────────────────
const radarName = computed(() => radar.value?.name || `Radar #${radarId}`)
const radarCoordinates = computed(() => {
  if (!radar.value) return null
  const { latitude, longitude } = radar.value.coordinates
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
})
const radarRadius = computed(() => (radar.value ? `${radar.value.radius} km` : '—'))

const isConnected = computed(() => connectionState.value === 'open')
const hasError = computed(() => connectionState.value === 'error')

const lastMessageDisplay = computed(() => {
  if (!lastMessageAt.value) return null
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(lastMessageAt.value)
})

const connectionStatusLabel = computed(() => {
  switch (connectionState.value) {
    case 'connecting':
      return 'Connecting…'
    case 'open':
      return 'Live'
    case 'reconnecting':
      return 'Reconnecting…'
    case 'error':
      return 'Connection error'
    case 'closed':
      return 'Closed'
    default:
      return 'Unknown'
  }
})

const connectionStatusTone = computed(() => {
  switch (connectionState.value) {
    case 'open':
      return 'green'
    case 'reconnecting':
    case 'connecting':
      return 'amber'
    default:
      return 'red'
  }
})
</script>

<template>
  <Teleport to="body" :disabled="!isFullscreen">
    <div class="radar-tracking-view" :class="{ 'radar-tracking-view--fullscreen': isFullscreen }">
      <!-- ── Radar header ────────────────────────────────────────────────────── -->
      <div
        class="radar-tracking-view__radar-header"
        :class="{ 'radar-tracking-view__radar-header--fullscreen': isFullscreen }"
      >
        <div v-show="!isFullscreen" class="radar-tracking-view__radar-back">
          <RouterLink :to="{ name: 'radars' }" class="radar-tracking-view__back-link" aria-label="Back to radars">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Radars
          </RouterLink>
        </div>

        <div v-show="!isFullscreen" class="radar-tracking-view__radar-identity">
          <span class="radar-tracking-view__radar-name">{{ radarName }}</span>
          <div class="radar-tracking-view__radar-meta">
            <span class="radar-tracking-view__radar-coords">{{ radarCoordinates }}</span>
            <span class="radar-tracking-view__radar-radius">{{ radarRadius }}</span>
          </div>
        </div>

        <!-- Status + fullscreen (always visible so the exit-fullscreen control is reachable) -->
        <div class="radar-tracking-view__header-group">
          <div class="radar-tracking-view__connection-status">
            <span class="radar-tracking-view__status-dot" :class="`radar-tracking-view__status-dot--${connectionStatusTone}`" aria-hidden="true" />
            <span class="radar-tracking-view__status-label">{{ connectionStatusLabel }}</span>
            <Button v-if="hasError" size="sm" variant="outline" @click="retryConnection" class="radar-tracking-view__retry-btn">
              Retry
            </Button>
          </div>

          <button class="radar-tracking-view__icon-btn" :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="toggleFullscreen">
            <!-- Enter fullscreen icon -->
            <svg v-if="!isFullscreen" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            <!-- Exit fullscreen icon -->
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="10" y1="14" x2="3" y2="21" />
              <line x1="21" y1="3" x2="14" y2="10" />
            </svg>
          </button>
        </div>
      </div>

      <!-- ── Main content ────────────────────────────────────────────────────────── -->
      <main class="radar-tracking-view__main" :class="{ 'radar-tracking-view__main--fullscreen': isFullscreen }">
        <!-- Metadata error -->
        <div v-if="metadataError" class="radar-tracking-view__message radar-tracking-view__message--error">
          {{ metadataError }}
        </div>

        <!-- WebSocket error message -->
        <div v-else-if="wsError" class="radar-tracking-view__message radar-tracking-view__message--warning">
          {{ wsError }}
        </div>

        <!-- No aircraft -->
        <div v-else-if="isConnected && aircraft.length === 0" class="radar-tracking-view__message">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2c-.5-.1-.9.1-1.1.5L2 8c-.2.5 0 1.1.5 1.3L8 11l-1.5 2H4l-1 1 2 2 2 2 1-1v-2.5L10 13l2 5.5c.2.5.8.7 1.3.5l2.5-1.5c.4-.2.6-.6.5-1.1z" />
          </svg>
          <p>No aircraft in range</p>
        </div>

        <!-- Loading -->
        <div v-else-if="!isConnected && aircraft.length === 0" class="radar-tracking-view__message">
          <svg class="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <p>Connecting…</p>
        </div>

        <!-- Aircraft card + carousel -->
        <template v-else-if="currentAircraft && currentAircraft.adsb_state.callsign">
          <div class="radar-tracking-view__aircraft" :class="{ 'radar-tracking-view__aircraft--fullscreen': isFullscreen }">
            <RadarAircraftCard :aircraft="currentAircraft" />
          </div>

          <!-- Position indicator + timestamp -->
          <div class="radar-tracking-view__footer">
            <span class="radar-tracking-view__position">{{ position.current }} / {{ position.total }}</span>
            <span v-if="lastMessageDisplay" class="radar-tracking-view__timestamp">
              Last update: {{ lastMessageDisplay }}
            </span>
          </div>
        </template>
      </main>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.radar-tracking-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--background);

  &--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    max-width: none;
    display: flex;
    flex-direction: column;
  }

  // ── Radar header ─────────────────────────────────────────────────────────────
  &__radar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--card);
    flex-shrink: 0;

    &--fullscreen {
      justify-content: flex-end;
      padding: 1rem 1.25rem 0;
      border-bottom: none;
      background: transparent;
    }
  }

  &__radar-back {
    flex-shrink: 0;
  }

  &__back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--muted-foreground);
    text-decoration: none;
    transition: color 0.15s;

    &:hover {
      color: var(--foreground);
    }
  }

  &__radar-identity {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  &__radar-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--foreground);
  }

  &__radar-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8125rem;
    color: var(--muted-foreground);
  }

  &__radar-coords {
    font-variant-numeric: tabular-nums;
  }

  &__radar-radius {
    &::before {
      content: '•';
      margin-right: 0.75rem;
    }
  }

  &__header-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--muted-foreground);
  }

  &__status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

    &--green {
      background: oklch(0.78 0.16 145);
    }

    &--amber {
      background: oklch(0.78 0.16 70);
    }

    &--red {
      background: oklch(0.72 0.18 25);
    }
  }

  &__retry-btn {
    margin-left: 0.5rem;
  }

  &__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius);
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted-foreground);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;

    &:hover {
      background: var(--muted);
      color: var(--foreground);
      border-color: var(--accent);
    }
  }

  // ── Main content ─────────────────────────────────────────────────────────────
  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    gap: 1rem;
    overflow-y: auto;

    &--fullscreen {
      padding: 5% 5%;
      gap: 0;
      justify-content: space-between;
    }
  }

  &__message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    text-align: center;
    color: var(--muted-foreground);

    p {
      font-size: 0.9375rem;
      margin: 0;
    }

    &--error {
      color: oklch(0.72 0.18 25);
    }

    &--warning {
      color: oklch(0.78 0.16 70);
    }
  }

  &__aircraft {
    width: 100%;
    max-width: 680px;

    &--fullscreen {
      width: 100%;
      max-width: none;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 680px;
    padding: 0.75rem 0;
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    flex-shrink: 0;
  }

  &__main--fullscreen &__footer {
    max-width: none;
    font-size: 1rem;
  }

  &__position {
    font-variant-numeric: tabular-nums;
  }

  &__timestamp {
    font-variant-numeric: tabular-nums;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
