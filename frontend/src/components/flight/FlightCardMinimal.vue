<script setup lang="ts">
import { computed } from 'vue'
import type { Flight } from '@/types/flight'

const props = defineProps<{
  flight: Flight
  showIcao: boolean
}>()

const emit = defineEmits<{
  toggleIdent: []
}>()

const displayIdent = computed(() =>
  props.showIcao
    ? props.flight.ident_icao || props.flight.ident_iata
    : props.flight.ident_iata || props.flight.ident_icao,
)

// Best available departure time: actual wheels-off > estimated > scheduled gate out
const departureTime = computed(() =>
  props.flight.actual_off || props.flight.estimated_off || props.flight.scheduled_out,
)

// Best available arrival time: actual gate in > estimated > scheduled gate in
const arrivalTime = computed(() =>
  props.flight.actual_in || props.flight.estimated_in || props.flight.scheduled_in,
)

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDelay(seconds: number): string {
  if (seconds === 0) return 'On time'
  const m = Math.round(Math.abs(seconds) / 60)
  return seconds < 0 ? `${m}m early` : `+${m}m`
}

const departureStatus = computed(() => formatDelay(props.flight.departure_delay))
const arrivalStatus = computed(() => formatDelay(props.flight.arrival_delay))

const isOnTimeDep = computed(() => props.flight.departure_delay === 0)
const isOnTimeArr = computed(() => props.flight.arrival_delay === 0)
const isEarlyDep = computed(() => props.flight.departure_delay < 0)
const isEarlyArr = computed(() => props.flight.arrival_delay < 0)

// Time remaining (only when in-flight)
const timeRemaining = computed(() => {
  const p = props.flight.progress_percent
  if (p <= 0 || p >= 100) return null
  const arrival = props.flight.estimated_in || props.flight.scheduled_in
  if (!arrival) return null
  const ms = new Date(arrival).getTime() - Date.now()
  if (ms <= 0) return null
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`
})

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

const bottomRight = computed(() =>
  timeRemaining.value ?? formatDuration(props.flight.filed_ete),
)

const originTerminal = computed(() => {
  const parts = [
    props.flight.terminal_origin ? `Terminal ${props.flight.terminal_origin}` : null,
    props.flight.gate_origin ? `Gate ${props.flight.gate_origin}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join('  ') : null
})
</script>

<template>
  <div class="flight-minimal">
    <!-- Top row: ident | operator -->
    <div class="flight-minimal__top">
      <button
        class="flight-minimal__ident"
        @click="emit('toggleIdent')"
        :title="showIcao ? 'Switch to IATA' : 'Switch to ICAO'"
        aria-label="Toggle identifier format"
      >
        {{ displayIdent }}
      </button>
      <span class="flight-minimal__aircraft">{{ flight.aircraft_type }}</span>
    </div>

    <!-- Route row -->
    <div class="flight-minimal__route">
      <!-- Origin -->
      <div class="flight-minimal__end">
        <span class="flight-minimal__iata">{{ flight.origin.code_iata }}</span>
        <span class="flight-minimal__time">{{ formatTime(departureTime) }}</span>
      </div>

      <!-- Connector -->
      <div class="flight-minimal__connector" aria-hidden="true">
        <svg class="flight-minimal__connector-plane" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      </div>

      <!-- Destination -->
      <div class="flight-minimal__end flight-minimal__end--right">
        <span class="flight-minimal__time">{{ formatTime(arrivalTime) }}</span>
        <span class="flight-minimal__iata">{{ flight.destination.code_iata }}</span>
      </div>
    </div>

    <!-- Status row -->
    <div class="flight-minimal__status-row">
      <span
        class="flight-minimal__status"
        :class="{
          'flight-minimal__status--ontime': isOnTimeDep,
          'flight-minimal__status--early':  isEarlyDep && !isOnTimeDep,
          'flight-minimal__status--late':   !isEarlyDep && !isOnTimeDep,
        }"
      >{{ departureStatus }}</span>
      <span
        class="flight-minimal__status flight-minimal__status--right"
        :class="{
          'flight-minimal__status--ontime': isOnTimeArr,
          'flight-minimal__status--early':  isEarlyArr && !isOnTimeArr,
          'flight-minimal__status--late':   !isEarlyArr && !isOnTimeArr,
        }"
      >{{ arrivalStatus }}</span>
    </div>

    <!-- Progress bar -->
    <div
      class="flight-minimal__progress-track"
      role="progressbar"
      :aria-valuenow="flight.progress_percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="flight-minimal__progress-fill"
        :style="{ width: `${Math.max(flight.progress_percent, 4)}%` }"
      >
        <svg class="flight-minimal__progress-plane" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      </div>
    </div>

    <!-- Bottom row: terminal | time remaining / duration -->
    <div class="flight-minimal__bottom">
      <span v-if="originTerminal" class="flight-minimal__terminal">{{ originTerminal }}</span>
      <span v-else class="flight-minimal__terminal flight-minimal__terminal--empty">—</span>
      <span class="flight-minimal__duration">{{ bottomRight }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Intentionally dark-themed widget regardless of system theme —
// designed for fast glanceability, inspired by airline tracking widgets.
.flight-minimal {
  --w-bg:            oklch(0.1 0.02 270);
  --w-bg-elevated:   oklch(0.15 0.025 270);
  --w-text:          oklch(0.97 0 0);
  --w-muted:         oklch(0.52 0.01 270);
  --w-accent:        oklch(0.78 0.16 145);   // green — times & on-time
  --w-accent-early:  oklch(0.72 0.14 200);   // blue — early
  --w-accent-late:   oklch(0.72 0.18 25);    // red — late
  --w-progress-bg:   oklch(0.2 0.04 270);
  --w-progress-fill: oklch(0.58 0.2 265);    // blue/purple fill

  background: var(--w-bg);
  color: var(--w-text);
  border-radius: 1.125rem;
  padding: 1.25rem 1.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  width: 100%;
  user-select: none;

  // Fullscreen: distribute sections evenly to fill the available height
  &.flight-tracking__minimal--fullscreen {
    gap: 0;
    justify-content: space-between;
    border-radius: 1.5rem;
    padding: 2rem 2.5rem;

    .flight-minimal__ident        { font-size: 1.625rem; }
    .flight-minimal__aircraft     { font-size: 1.375rem; }

    .flight-minimal__iata         { font-size: 5.5rem;  line-height: normal}
    .flight-minimal__time         { font-size: 4rem;  line-height: normal}
    .flight-minimal__connector-plane { width: 2.75rem; height: 2.75rem; }

    .flight-minimal__status       { font-size: 1.5rem; }

    .flight-minimal__progress-track  { height: 5rem; }
    .flight-minimal__progress-plane  { width: 2.75rem; height: 2.75rem; }

    .flight-minimal__terminal     { font-size: 1.375rem; }
    .flight-minimal__duration     { font-size: 1.625rem; }
  }
}

// ── Top ───────────────────────────────────────────────────────────────────────
.flight-minimal__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flight-minimal__ident {
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--w-muted);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 0.15s;

  &:hover { color: var(--w-text); }
}

.flight-minimal__aircraft {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--w-muted);
}

// ── Route ─────────────────────────────────────────────────────────────────────
.flight-minimal__route {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.flight-minimal__end {
  display: flex;
  flex-direction: column;
  align-items: baseline;
  gap: 0.5em;
  flex-shrink: 0;

  &--right {
    align-items: flex-end;
    flex-direction: column-reverse;
  }
}

.flight-minimal__iata {
  font-size: 1.875rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--w-text);
}

.flight-minimal__time {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--w-accent);
  font-variant-numeric: tabular-nums;
}

.flight-minimal__connector {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  // Dashed line
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: repeating-linear-gradient(
      90deg,
      var(--w-muted) 0,
      var(--w-muted) 4px,
      transparent 4px,
      transparent 8px
    );
    transform: translateY(-50%);
    opacity: 0.5;
  }
}

.flight-minimal__connector-plane {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--w-muted);
  position: relative;
  z-index: 1;
  background: var(--w-bg);
  padding: 0 0.25rem;
}

// ── Status row ────────────────────────────────────────────────────────────────
.flight-minimal__status-row {
  display: flex;
  justify-content: space-between;
  margin-top: -0.375rem;
}

.flight-minimal__status {
  font-size: 0.8125rem;
  font-weight: 600;

  &--right { text-align: right; }

  &--ontime { color: var(--w-accent); }
  &--early  { color: var(--w-accent-early); }
  &--late   { color: var(--w-accent-late); }
}

// ── Progress bar ──────────────────────────────────────────────────────────────
.flight-minimal__progress-track {
  position: relative;
  height: 2.625rem;
  border-radius: 9999px;
  background: var(--w-progress-bg);
  overflow: hidden;
}

.flight-minimal__progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    oklch(0.5 0.22 270),
    oklch(0.62 0.2 260)
  );
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.75rem;
  min-width: 3.5rem;
}

.flight-minimal__progress-plane {
  width: 1.375rem;
  height: 1.375rem;
  color: var(--w-text);
  flex-shrink: 0;
}

// ── Bottom ────────────────────────────────────────────────────────────────────
.flight-minimal__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flight-minimal__terminal {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--w-muted);

  &--empty { opacity: 0.4; }
}

.flight-minimal__duration {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--w-text);
  font-variant-numeric: tabular-nums;
}
</style>
