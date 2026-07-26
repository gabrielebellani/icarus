<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TrackedFlightPayload, FlightDataSource } from '@/types/flight'
import { Button } from '@/components/ui/button'
import FlightCardDetailed from './FlightCardDetailed.vue'
import FlightCardMinimal from './FlightCardMinimal.vue'

const props = defineProps<{
  flight: TrackedFlightPayload
  dataSource?: FlightDataSource
  degradedMode?: boolean
  referenceDate?: string
}>()

const emit = defineEmits<{
  stopTracking: []
}>()

// ── Live status indicator ──────────────────────────────────────────────────────
const liveStatusLabel = computed(() => (props.degradedMode ? 'Reduced updates' : 'Live'))
const liveStatusTone = computed(() => (props.degradedMode ? 'amber' : 'green'))

// ── View mode ────────────────────────────────────────────────────────────────
type View = 'minimal' | 'detailed'
const view = ref<View>('minimal')

// ── Identifier format (shared across both views) ──────────────────────────────
const showIcao = ref(false)
const displayIdent = computed(() =>
  showIcao.value
    ? props.flight.route.ident_icao || props.flight.route.ident_iata
    : props.flight.route.ident_iata || props.flight.route.ident_icao,
)

// ── Fullscreen ────────────────────────────────────────────────────────────────
const isFullscreen = ref(false)

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) isFullscreen.value = false
}

watch(isFullscreen, (val) => {
  if (val) {
    document.addEventListener('keydown', onEscape)
    document.body.style.overflow = 'hidden'
    document.documentElement.requestFullscreen().catch(() => {})
  } else {
    document.exitFullscreen().catch(() => {})
    document.removeEventListener('keydown', onEscape)
    document.body.style.overflow = ''
  }
})

// ── Stop tracking ─────────────────────────────────────────────────────────────
const confirmStop = ref(false)

function requestStop() {
  confirmStop.value = true
}

function cancelStop() {
  confirmStop.value = false
}

function doStop() {
  confirmStop.value = false
  emit('stopTracking')
}
</script>

<template>
  <Teleport to="body" :disabled="!isFullscreen">
    <div
      class="flight-tracking"
      :class="{ 'flight-tracking--fullscreen': isFullscreen }"
      role="region"
      aria-label="Flight tracking"
    >
      <!-- Toolbar -->
      <div class="flight-tracking__toolbar">
        <div class="flight-tracking__toolbar-left">
          <div class="flight-tracking__live-status">
            <span
              class="flight-tracking__status-dot"
              :class="`flight-tracking__status-dot--${liveStatusTone}`"
              aria-hidden="true"
            />
            <span class="flight-tracking__status-label">{{ liveStatusLabel }}</span>
          </div>
        </div>

        <div class="flight-tracking__view-toggle" role="group" aria-label="View mode">
          <button
            class="flight-tracking__view-btn"
            :class="{ 'flight-tracking__view-btn--active': view === 'minimal' }"
            @click="view = 'minimal'"
          >
            Minimal
          </button>
          <button
            class="flight-tracking__view-btn"
            :class="{ 'flight-tracking__view-btn--active': view === 'detailed' }"
            @click="view = 'detailed'"
          >
            Detailed
          </button>
        </div>

        <div class="flight-tracking__actions">
          <button
            class="flight-tracking__icon-btn"
            @click="toggleFullscreen"
            :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          >
            <svg v-if="!isFullscreen" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>
            </svg>
          </button>

          <button
            class="flight-tracking__icon-btn flight-tracking__icon-btn--danger"
            @click="requestStop"
            aria-label="Stop tracking"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- View content -->
      <FlightCardMinimal
        v-if="view === 'minimal'"
        :flight="flight"
        :show-icao="showIcao"
        :class="{ 'flight-tracking__minimal--fullscreen': isFullscreen }"
        @toggle-ident="showIcao = !showIcao"
      />
      <FlightCardDetailed
        v-else
        :flight="flight"
        :show-icao="showIcao"
        :reference-date="referenceDate"
        :class="{ 'flight-tracking__detailed--fullscreen': isFullscreen }"
        @toggle-ident="showIcao = !showIcao"
      />

      <!-- Stop tracking confirmation overlay -->
      <Transition name="fade">
        <div
          v-if="confirmStop"
          class="flight-tracking__confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stop-confirm-title"
        >
          <div class="flight-tracking__confirm-box">
            <p id="stop-confirm-title" class="flight-tracking__confirm-title">Stop tracking?</p>
            <p class="flight-tracking__confirm-body">
              This will end tracking for flight {{ displayIdent }}. The action cannot be undone.
            </p>
            <div class="flight-tracking__confirm-actions">
              <Button variant="outline" size="sm" @click="cancelStop">Keep tracking</Button>
              <Button variant="destructive" size="sm" @click="doStop">Stop tracking</Button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.flight-tracking {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 680px;

  &--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    max-width: none;
    background: var(--background);
    padding: 2% 10%;

    .flight-tracking__toolbar {
      width: 100%;
      max-width: none;
      flex-shrink: 0;
    }

    // Minimal widget: fill remaining vertical space (parent is flex column, 10% padding already applied)
    .flight-tracking__minimal--fullscreen {
      flex: 1;
      max-width: none;
      min-height: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .flight-tracking__detailed--fullscreen {
      flex: 1;
      display: flex;
      justify-content: center;
      max-width: none;
      min-height: 0;
      //overflow-y: auto;
    }
  }
}

// ── Toolbar ──────────────────────────────────────────────────────────────────
.flight-tracking__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.625rem;
}

.flight-tracking__toolbar-left {
  display: flex;
  align-items: center;
}

.flight-tracking__live-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.flight-tracking__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: flight-tracking-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  &--green {
    background: oklch(0.78 0.16 145);
  }

  &--amber {
    background: oklch(0.78 0.16 70);
  }
}

@keyframes flight-tracking-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.flight-tracking__view-toggle {
  display: inline-flex;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2px;
  gap: 2px;
}

.flight-tracking__view-btn {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.3rem 0.75rem;
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &--active {
    background: var(--card);
    color: var(--foreground);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  &:not(&--active):hover {
    color: var(--foreground);
  }
}

.flight-tracking__actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.flight-tracking__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 1.875rem;
  border-radius: var(--radius);
  background: var(--secondary);
  border: 1px solid var(--border);
  color: var(--secondary-foreground);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: var(--muted);
  }

  &--danger:hover {
    background: oklch(0.95 0.04 25);
    color: oklch(0.5 0.2 25);
    border-color: oklch(0.85 0.08 25);
  }
}

// ── Stop confirm overlay ──────────────────────────────────────────────────────
.flight-tracking__confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  border-radius: inherit;
}

.flight-tracking__confirm-box {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  max-width: 320px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.flight-tracking__confirm-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--foreground);
  margin: 0;
}

.flight-tracking__confirm-body {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  margin: 0;
  line-height: 1.5;
}

.flight-tracking__confirm-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

// ── Transitions ───────────────────────────────────────────────────────────────
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
