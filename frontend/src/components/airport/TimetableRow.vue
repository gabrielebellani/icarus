<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Flight } from '@/types/flight'

const props = defineProps<{
  flight: Flight
  mode: 'arrival' | 'departure'
}>()

// ── Time helpers ─────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined): string {
  if (!iso) return '--'
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** Primary scheduled time (gate in/out) */
const scheduledTime = computed(() =>
  fmt(props.mode === 'arrival' ? props.flight.scheduled_in : props.flight.scheduled_out),
)

/** Best available estimated/actual time. Shows if different from scheduled. */
const liveTime = computed<string | null>(() => {
  const f = props.flight
  if (props.mode === 'arrival') {
    const live = f.actual_in ?? f.estimated_in ?? null
    if (!live || !f.scheduled_in) return null
    const diff = Math.abs(new Date(live).getTime() - new Date(f.scheduled_in).getTime())
    return diff > 60_000 ? fmt(live) : null
  } else {
    const live = f.actual_out ?? f.estimated_out ?? null
    if (!live || !f.scheduled_out) return null
    const diff = Math.abs(new Date(live).getTime() - new Date(f.scheduled_out).getTime())
    return diff > 60_000 ? fmt(live) : null
  }
})

// ── Delay badge ───────────────────────────────────────────────────────────────

const delayMinutes = computed(() => {
  const delaySec = props.mode === 'arrival' ? props.flight.arrival_delay : props.flight.departure_delay
  if (!delaySec) return null
  const mins = Math.round(delaySec / 60)
  return mins !== 0 ? mins : null
})

// ── Status chip ───────────────────────────────────────────────────────────────

type StatusTone = 'green' | 'blue' | 'amber' | 'red' | 'muted'

const statusTone = computed<StatusTone>(() => {
  const f = props.flight
  if (f.cancelled) return 'red'
  if (f.diverted) return 'red'
  const s = f.status.toLowerCase()
  if (s.includes('cancel')) return 'red'
  if (s.includes('divert')) return 'red'
  if (s.includes('delay') || (delayMinutes.value !== null && delayMinutes.value > 5)) return 'red'
  if (s.includes('landed') || s.includes('arrived') || s.includes('on time')) return 'green'
  if (s.includes('early') || delayMinutes.value !== null && delayMinutes.value < -1) return 'blue'
  if (
    s.includes('en route') ||
    s.includes('in flight') ||
    s.includes('active') ||
    s.includes('climbing') ||
    s.includes('cruising') ||
    s.includes('descending')
  )
    return 'blue'
  if (s.includes('boarding') || s.includes('last call') || s.includes('gate open')) return 'amber'
  return 'muted'
})

// ── Location display ──────────────────────────────────────────────────────────

const location = computed(() => {
  const airport = props.mode === 'arrival' ? props.flight.origin : props.flight.destination
  const code = airport?.code_iata ?? airport?.code_icao ?? airport?.code ?? '--'
  const city = airport?.city ?? airport?.name ?? null
  return { code, city }
})

// ── Gate / terminal / baggage ─────────────────────────────────────────────────

const terminal = computed(() =>
  props.mode === 'arrival' ? props.flight.terminal_destination : props.flight.terminal_origin,
)

const gate = computed(() =>
  props.mode === 'arrival' ? props.flight.gate_destination : props.flight.gate_origin,
)

const baggage = computed(() =>
  props.mode === 'arrival' ? props.flight.baggage_claim : null,
)

// ── Track link ──────────────────────────────────────────────────────────

const trackDate = computed(() => {
  const iso = props.mode === 'arrival' ? props.flight.scheduled_in : props.flight.scheduled_out
  return iso ? iso.split('T')[0] : ''
})

// ── Flight ident ──────────────────────────────────────────────────────────────

const ident = computed(
  () => props.flight.ident_iata || props.flight.ident_icao || props.flight.ident,
)
</script>

<template>
  <div
    class="tt-row"
    :class="{
      'tt-row--cancelled': flight.cancelled,
      'tt-row--diverted': flight.diverted,
    }"
    role="row"
  >
    <!-- TRACK -->
    <div class="tt-row__cell tt-row__cell--track" role="cell">
      <RouterLink
        :to="{ name: 'dashboard', query: { identifier: ident, date: trackDate } }"
        class="tt-row__track-btn"
        :title="`Track ${ident}`"
        :aria-label="`Track flight ${ident}`"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
          <line x1="12" y1="2" x2="12" y2="5"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="5" y2="12"/>
          <line x1="19" y1="12" x2="22" y2="12"/>
        </svg>
      </RouterLink>
    </div>

    <!-- TIME -->
    <div class="tt-row__cell tt-row__cell--time" role="cell">
      <span class="tt-row__sched-time">{{ scheduledTime }}</span>
      <span v-if="liveTime" class="tt-row__live-time">{{ liveTime }}</span>
    </div>

    <!-- FLIGHT -->
    <div class="tt-row__cell tt-row__cell--flight" role="cell">
      <span class="tt-row__ident">{{ ident }}</span>
      <span v-if="flight.aircraft_type" class="tt-row__aircraft">{{ flight.aircraft_type }}</span>
    </div>

    <!-- ORIGIN / DESTINATION -->
    <div class="tt-row__cell tt-row__cell--location" role="cell">
      <span class="tt-row__loc-code">{{ location.code }}</span>
      <span v-if="location.city" class="tt-row__loc-city">{{ location.city }}</span>
    </div>

    <!-- STATUS -->
    <div class="tt-row__cell tt-row__cell--status" role="cell">
      <span
        class="tt-row__status-chip"
        :class="`tt-row__status-chip--${statusTone}`"
        :title="flight.status"
      >
        {{ flight.cancelled ? 'Cancelled' : flight.diverted ? 'Diverted' : flight.status }}
      </span>
      <span v-if="delayMinutes !== null && delayMinutes > 0" class="tt-row__delay">
        +{{ delayMinutes }}m
      </span>
    </div>

    <!-- TERMINAL -->
    <div class="tt-row__cell tt-row__cell--terminal" role="cell">
      <span class="tt-row__mono">{{ terminal ?? '--' }}</span>
    </div>

    <!-- GATE -->
    <div class="tt-row__cell tt-row__cell--gate" role="cell">
      <span class="tt-row__mono">{{ gate ?? '--' }}</span>
    </div>

    <!-- BAGGAGE (arrivals only) -->
    <div v-if="mode === 'arrival'" class="tt-row__cell tt-row__cell--baggage" role="cell">
      <span class="tt-row__mono">{{ baggage ?? '--' }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Shared surface tokens (kept in sync with airport-card)
$bg:       oklch(0.1 0.02 270);
$bg-alt:   oklch(0.13 0.022 270);
$text:     oklch(0.97 0 0);
$muted:    oklch(0.52 0.01 270);
$divider:  oklch(0.18 0.025 270);

$green:  oklch(0.72 0.17 145);
$blue:   oklch(0.68 0.15 220);
$amber:  oklch(0.78 0.16 70);
$red:    oklch(0.62 0.2 25);

.tt-row {
  display: contents; // participates in the parent CSS grid
  cursor: default;

  &__cell {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid $divider;
    transition: background 0.1s;
    min-width: 0;
  }

  // Hover highlight across the whole row via grid row
  &:hover > .tt-row__cell {
    background: oklch(0.16 0.025 270);
  }

  // Cancelled / diverted dim the row
  &--cancelled > .tt-row__cell,
  &--diverted > .tt-row__cell {
    opacity: 0.5;
  }
  // ── Track cell ────────────────────────────────────────────────────────────

  &__cell--track {
    align-items: center;
    justify-content: center;
  }

  &__track-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    border: 1.5px solid oklch(0.58 0.2 265 / 0.4);
    background: oklch(0.58 0.2 265 / 0.08);
    color: oklch(0.78 0.15 265);
    text-decoration: none;
    transition: border-color 0.2s, background 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s;
    cursor: pointer;

    &:hover {
      border-color: oklch(0.78 0.15 265 / 0.7);
      background: oklch(0.58 0.2 265 / 0.2);
      color: oklch(0.85 0.18 265);
      transform: scale(1.1);
      box-shadow: 0 4px 12px oklch(0.58 0.2 265 / 0.2);
    }

    &:focus-visible {
      outline: 2px solid oklch(0.78 0.15 265);
      outline-offset: 2px;
    }
  }
  // ── Cells ──────────────────────────────────────────────────────────────────

  &__cell--time {
    gap: 0.15rem;
  }

  &__sched-time {
    font-size: 1rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: $text;
    line-height: 1.1;
  }

  &__live-time {
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    color: $amber;
    line-height: 1;
    letter-spacing: 0.01em;
  }

  // ── Flight cell ────────────────────────────────────────────────────────────

  &__ident {
    font-size: 0.9375rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: $text;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__aircraft {
    font-size: 0.6875rem;
    color: $muted;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  // ── Location cell ──────────────────────────────────────────────────────────

  &__loc-code {
    font-size: 0.9375rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: $text;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__loc-city {
    font-size: 0.7rem;
    color: $muted;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // ── Status chip ────────────────────────────────────────────────────────────

  &__cell--status {
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
  }

  &__status-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: normal;
    word-break: break-word;
    max-width: 15rem;

    &--green {
      background: oklch(0.72 0.17 145 / 0.15);
      color: $green;
    }

    &--blue {
      background: oklch(0.68 0.15 220 / 0.15);
      color: $blue;
    }

    &--amber {
      background: oklch(0.78 0.16 70 / 0.18);
      color: $amber;
    }

    &--red {
      background: oklch(0.62 0.2 25 / 0.18);
      color: $red;
    }

    &--muted {
      background: transparent;
      color: $muted;
    }
  }

  &__delay {
    font-size: 0.6875rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: $red;
    flex-shrink: 0;
  }

  // ── Mono cells (terminal, gate, baggage) ───────────────────────────────────

  &__mono {
    font-size: 0.875rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: $text;
    text-align: center;
  }

  &__cell--terminal,
  &__cell--gate,
  &__cell--baggage {
    align-items: center;
  }
}
</style>
