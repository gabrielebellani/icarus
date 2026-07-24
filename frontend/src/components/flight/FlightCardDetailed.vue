<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TrackedFlightPayload } from '@/types/flight'

const props = defineProps<{
  flight: TrackedFlightPayload
  showIcao: boolean
}>()

const emit = defineEmits<{
  toggleIdent: []
}>()

const displayIdent = computed(() =>
  props.showIcao
    ? props.flight.route.ident_icao || props.flight.route.ident_iata
    : props.flight.route.ident_iata || props.flight.route.ident_icao,
)

const statusClass = computed(() => {
  if (props.flight.route.cancelled) return 'cancelled'
  if (props.flight.route.diverted) return 'diverted'
  if (props.flight.route.progress_percent === 100) return 'arrived'
  if (props.flight.route.progress_percent > 0) return 'airborne'
  return 'scheduled'
})

const departureDelay = computed(() => props.flight.schedule.departure_delay)
const arrivalDelay = computed(() => props.flight.schedule.arrival_delay)
const hasDepartureDelay = computed(() => departureDelay.value !== 0)
const hasArrivalDelay = computed(() => arrivalDelay.value !== 0)

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function formatDelay(seconds: number): string {
  if (seconds === 0) return 'On time'
  const abs = Math.abs(seconds)
  const m = Math.round(abs / 60)
  return seconds < 0 ? `${m}m early` : `+${m}m`
}

// ── Image fallback handling ────────────────────────────────────────────────────
// Hide broken images entirely (no alt text, no placeholder) instead of showing
// a broken-image icon when a logo/photo URL 404s. Mirrors RadarAircraftCard.vue.
const logoError = ref(false)
const photoError = ref(false)

watch(
  () => props.flight.airline.logo,
  () => {
    logoError.value = false
  },
)

watch(
  () => props.flight.aircraft.image_url,
  () => {
    photoError.value = false
  },
)

const showAirlineLogo = computed(() => Boolean(props.flight.airline.logo) && !logoError.value)
const showAircraftImage = computed(() => Boolean(props.flight.aircraft.image_url) && !photoError.value)
</script>

<template>
  <div class="flight-detailed">
    <!-- Header: ident toggle + status -->
    <div class="flight-detailed__header">
      <div class="flight-detailed__header-left">
        <button
          class="flight-detailed__ident"
          @click="emit('toggleIdent')"
          :title="showIcao ? 'Switch to IATA' : 'Switch to ICAO'"
          aria-label="Toggle identifier format"
        >
          {{ displayIdent }}
          <span class="flight-detailed__ident-format">{{ showIcao ? 'ICAO' : 'IATA' }}</span>
        </button>
        <span class="flight-detailed__status" :class="`flight-detailed__status--${statusClass}`">
          {{ flight.route.status }}
        </span>
      </div>
      <div v-if="flight.airline.name || showAirlineLogo" class="flight-detailed__airline">
        <img
          v-if="showAirlineLogo"
          :src="flight.airline.logo!"
          :alt="flight.airline.name || flight.airline.operator"
          class="flight-detailed__airline-logo"
          @error="logoError = true"
        />
        <span v-if="flight.airline.name" class="flight-detailed__airline-name">{{ flight.airline.name }}</span>
      </div>
    </div>

    <!-- Route strip -->
    <div class="flight-detailed__route">
      <div class="flight-detailed__airport">
        <span class="flight-detailed__airport-code">{{ flight.route.origin.code_iata }}</span>
        <span class="flight-detailed__airport-name">{{ flight.route.origin.name }}</span>
        <span class="flight-detailed__airport-city">{{ flight.route.origin.city }}</span>
      </div>

      <div class="flight-detailed__progress-col">
        <div
          class="flight-detailed__progress-bar"
          role="progressbar"
          :aria-valuenow="flight.route.progress_percent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="flight-detailed__progress-fill"
            :style="{ width: `${flight.route.progress_percent}%` }"
          >
            <span
              v-if="flight.route.progress_percent > 0 && flight.route.progress_percent < 100"
              class="flight-detailed__plane-icon"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
            </span>
          </div>
        </div>
        <div class="flight-detailed__progress-meta">
          <span>{{ formatDuration(flight.route.filed_ete) }}</span>
          <span>{{ flight.route.route_distance }} nm</span>
        </div>
      </div>

      <div class="flight-detailed__airport flight-detailed__airport--right">
        <span class="flight-detailed__airport-code">{{ flight.route.destination.code_iata }}</span>
        <span class="flight-detailed__airport-name">{{ flight.route.destination.name }}</span>
        <span class="flight-detailed__airport-city">{{ flight.route.destination.city }}</span>
      </div>
    </div>

    <!-- Aircraft image -->
    <div v-if="showAircraftImage" class="flight-detailed__aircraft-image-wrapper">
      <img
        :src="flight.aircraft.image_url!"
        :alt="`${flight.aircraft.type} (${flight.aircraft.registration})`"
        class="flight-detailed__aircraft-image"
        @error="photoError = true"
      />
    </div>

    <!-- Timing grid -->
    <div class="flight-detailed__timing">
      <!-- Departure -->
      <div class="flight-detailed__timing-block">
        <div class="flight-detailed__timing-header">
          <span class="flight-detailed__timing-label">Departure</span>
          <span
            v-if="hasDepartureDelay"
            class="flight-detailed__delay"
            :class="departureDelay < 0 ? 'flight-detailed__delay--early' : 'flight-detailed__delay--late'"
          >{{ formatDelay(departureDelay) }}</span>
          <span v-else class="flight-detailed__delay flight-detailed__delay--ontime">On time</span>
        </div>
        <div class="flight-detailed__timing-rows">
          <div class="flight-detailed__timing-row">
            <span class="flight-detailed__timing-sub">Scheduled gate out</span>
            <span class="flight-detailed__timing-val">{{ formatTime(flight.schedule.scheduled_out) }}</span>
          </div>
          <div class="flight-detailed__timing-row">
            <span class="flight-detailed__timing-sub">Est. wheels off</span>
            <span class="flight-detailed__timing-val">
              {{ formatTime(flight.schedule.actual_off || flight.schedule.estimated_off) }}
              <em v-if="flight.schedule.actual_off" class="flight-detailed__actual-badge">actual</em>
            </span>
          </div>
          <div v-if="flight.schedule.gate_origin || flight.schedule.terminal_origin" class="flight-detailed__timing-row">
            <span class="flight-detailed__timing-sub">Gate / Terminal</span>
            <span class="flight-detailed__timing-val">
              {{ [flight.schedule.gate_origin ? `Gate ${flight.schedule.gate_origin}` : null, flight.schedule.terminal_origin ? `T${flight.schedule.terminal_origin}` : null].filter(Boolean).join(' · ') || '—' }}
            </span>
          </div>
          <div v-if="flight.schedule.actual_runway_off" class="flight-detailed__timing-row">
            <span class="flight-detailed__timing-sub">Runway used</span>
            <span class="flight-detailed__timing-val">{{ flight.schedule.actual_runway_off }}</span>
          </div>
        </div>
      </div>

      <div class="flight-detailed__timing-divider" aria-hidden="true" />

      <!-- Arrival -->
      <div class="flight-detailed__timing-block">
        <div class="flight-detailed__timing-header">
          <span class="flight-detailed__timing-label">Arrival</span>
          <span
            v-if="hasArrivalDelay"
            class="flight-detailed__delay"
            :class="arrivalDelay < 0 ? 'flight-detailed__delay--early' : 'flight-detailed__delay--late'"
          >{{ formatDelay(arrivalDelay) }}</span>
          <span v-else class="flight-detailed__delay flight-detailed__delay--ontime">On time</span>
        </div>
        <div class="flight-detailed__timing-rows">
          <div class="flight-detailed__timing-row">
            <span class="flight-detailed__timing-sub">Scheduled gate in</span>
            <span class="flight-detailed__timing-val">{{ formatTime(flight.schedule.scheduled_in) }}</span>
          </div>
          <div class="flight-detailed__timing-row">
            <span class="flight-detailed__timing-sub">Est. wheels on</span>
            <span class="flight-detailed__timing-val">
              {{ formatTime(flight.schedule.actual_on || flight.schedule.estimated_on) }}
              <em v-if="flight.schedule.actual_on" class="flight-detailed__actual-badge">actual</em>
            </span>
          </div>
          <div v-if="flight.schedule.gate_destination || flight.schedule.terminal_destination" class="flight-detailed__timing-row">
            <span class="flight-detailed__timing-sub">Gate / Terminal</span>
            <span class="flight-detailed__timing-val">
              {{ [flight.schedule.gate_destination ? `Gate ${flight.schedule.gate_destination}` : null, flight.schedule.terminal_destination ? `T${flight.schedule.terminal_destination}` : null].filter(Boolean).join(' · ') || '—' }}
            </span>
          </div>
          <div v-if="flight.schedule.actual_runway_on" class="flight-detailed__timing-row">
            <span class="flight-detailed__timing-sub">Runway used</span>
            <span class="flight-detailed__timing-val">{{ flight.schedule.actual_runway_on }}</span>
          </div>
          <div v-if="flight.schedule.baggage_claim" class="flight-detailed__timing-row">
            <span class="flight-detailed__timing-sub">Baggage claim</span>
            <span class="flight-detailed__timing-val">{{ flight.schedule.baggage_claim }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ADS-B state (live position data, when available) -->
    <!-- ADS-B state (live position data) -->
    <div class="flight-detailed__adsb">
      <div class="flight-detailed__detail-item">
        <span class="flight-detailed__detail-label">On ground</span>
        <span class="flight-detailed__detail-value">{{ flight.adsb_state?.on_ground == null ? '—' : (flight.adsb_state.on_ground ? 'Yes' : 'No') }}</span>
      </div>
      <div class="flight-detailed__detail-item">
        <span class="flight-detailed__detail-label">Ground speed</span>
        <span class="flight-detailed__detail-value">{{ flight.adsb_state?.velocity != null ? `${Math.round(flight.adsb_state.velocity * 1.94384)} kt` : '—' }}</span>
      </div>
      <div class="flight-detailed__detail-item">
        <span class="flight-detailed__detail-label">Altitude</span>
        <span class="flight-detailed__detail-value">{{ flight.adsb_state?.altitude != null ? `${Math.round(flight.adsb_state.altitude * 3.28084)} ft` : '—' }}</span>
      </div>
    </div>

    <!-- Details strip -->
    <div class="flight-detailed__details">
      <div class="flight-detailed__detail-item">
        <span class="flight-detailed__detail-label">Aircraft</span>
        <span class="flight-detailed__detail-value">{{ flight.aircraft.type }}</span>
      </div>
      <div class="flight-detailed__detail-item">
        <span class="flight-detailed__detail-label">Registration</span>
        <span class="flight-detailed__detail-value">{{ flight.aircraft.registration || '—' }}</span>
      </div>
      <div class="flight-detailed__detail-item">
        <span class="flight-detailed__detail-label">Operator</span>
        <span class="flight-detailed__detail-value">{{ flight.airline.operator_iata || flight.airline.operator_icao || '—' }}</span>
      </div>
      <div v-if="flight.route.codeshares_iata?.length" class="flight-detailed__detail-item">
        <span class="flight-detailed__detail-label">Codeshares</span>
        <span class="flight-detailed__detail-value">{{ flight.route.codeshares_iata.join(', ') }}</span>
      </div>
      <div
        class="flight-detailed__detail-item"
        :class="{ 'flight-detailed__detail-item--flag': flight.route.diverted || flight.route.cancelled }"
      >
        <span class="flight-detailed__detail-label">Flags</span>
        <span class="flight-detailed__detail-value">
          <template v-if="!flight.route.diverted && !flight.route.cancelled">None</template>
          <template v-else>{{ [flight.route.diverted ? 'Diverted' : null, flight.route.cancelled ? 'Cancelled' : null].filter(Boolean).join(' · ') }}</template>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Same dark palette as FlightCardMinimal for visual consistency.
.flight-detailed {
  --w-bg:           oklch(0.1 0.02 270);
  --w-bg-elevated:  oklch(0.15 0.025 270);
  --w-text:         oklch(0.97 0 0);
  --w-muted:        oklch(0.52 0.01 270);
  --w-divider:      oklch(0.18 0.025 270);
  --w-accent:       oklch(0.78 0.16 145);
  --w-accent-early: oklch(0.72 0.14 200);
  --w-accent-late:  oklch(0.72 0.18 25);
  --w-progress-bg:  oklch(0.2 0.04 270);

  display: flex;
  flex-direction: column;
  border-radius: 1.125rem;
  background: var(--w-bg);
  color: var(--w-text);
  overflow: hidden;
  width: 100%;
}

// ── Header ────────────────────────────────────────────────────────────────────
.flight-detailed__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--w-divider);

  &-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }
}

.flight-detailed__airline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.flight-detailed__airline-logo {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
  border-radius: 3px;
}

.flight-detailed__airline-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--w-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.flight-detailed__ident {
  display: inline-flex;
  align-items: baseline;
  gap: 0.375rem;
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--w-text);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 1;
  transition: opacity 0.15s;

  &:hover { opacity: 0.7; }

  &-format {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--w-muted);
    padding: 0.125rem 0.3rem;
    border-radius: 3px;
    background: var(--w-divider);
    vertical-align: middle;
  }
}

.flight-detailed__status {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  white-space: nowrap;

  &--scheduled { background: var(--w-divider); color: var(--w-muted); }
  &--airborne  { background: oklch(0.2 0.1 145);  color: oklch(0.78 0.16 145); }
  &--arrived   { background: oklch(0.2 0.08 200); color: oklch(0.72 0.14 200); }
  &--cancelled { background: oklch(0.2 0.08 25);  color: oklch(0.72 0.18 25); }
  &--diverted  { background: oklch(0.2 0.08 60);  color: oklch(0.78 0.15 60); }
}

// ── Route strip ───────────────────────────────────────────────────────────────
.flight-detailed__route {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem 1.25rem 1.25rem;
}

.flight-detailed__airport {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;

  &--right { text-align: right; }

  &-code {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--w-text);
    line-height: 1;
  }

  &-name {
    font-size: 0.6875rem;
    color: var(--w-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
  }

  &-city {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--w-text);
    opacity: 0.65;
  }
}

.flight-detailed__progress-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
}

.flight-detailed__progress-bar {
  position: relative;
  height: 4px;
  border-radius: 9999px;
  background: var(--w-progress-bg);
  overflow: visible;
}

.flight-detailed__progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, oklch(0.5 0.22 270), oklch(0.62 0.2 260));
  transition: width 0.4s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.flight-detailed__plane-icon {
  position: absolute;
  right: -7px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--w-text);
  display: flex;
}

.flight-detailed__progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: var(--w-muted);
  font-variant-numeric: tabular-nums;
}

// ── Timing grid ───────────────────────────────────────────────────────────────
.flight-detailed__timing {
  display: flex;
  border-top: 1px solid var(--w-divider);
}

.flight-detailed__timing-block {
  flex: 1;
  padding: 1rem 1.25rem;
  min-width: 0;
}

.flight-detailed__timing-divider {
  width: 1px;
  background: var(--w-divider);
  flex-shrink: 0;
}

.flight-detailed__timing-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.875rem;
}

.flight-detailed__timing-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--w-muted);
}

.flight-detailed__delay {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.45rem;
  border-radius: 9999px;

  &--ontime { background: oklch(0.2 0.1 145);  color: oklch(0.78 0.16 145); }
  &--early  { background: oklch(0.2 0.08 200); color: oklch(0.72 0.14 200); }
  &--late   { background: oklch(0.2 0.08 25);  color: oklch(0.72 0.18 25); }
}

.flight-detailed__timing-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.flight-detailed__timing-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.flight-detailed__timing-sub {
  font-size: 0.75rem;
  color: var(--w-muted);
  flex-shrink: 0;
}

.flight-detailed__timing-val {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--w-text);
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.flight-detailed__actual-badge {
  font-size: 0.625rem;
  font-style: normal;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  background: oklch(0.2 0.08 200);
  color: oklch(0.72 0.14 200);
}

// ── ADS-B state strip ─────────────────────────────────────────────────────────
.flight-detailed__adsb {
  display: flex;
  flex-wrap: wrap;
  border-top: 1px solid var(--w-divider);
}

// ── Details strip ─────────────────────────────────────────────────────────────
.flight-detailed__details {
  display: flex;
  flex-wrap: wrap;
  border-top: 1px solid var(--w-divider);
  background: var(--w-bg-elevated);
}

.flight-detailed__detail-item {
  flex: 1 1 140px;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.875rem 1.25rem;
  border-right: 1px solid var(--w-divider);

  &:last-child { border-right: none; }

  &--flag .flight-detailed__detail-value { color: oklch(0.72 0.18 25); }
}

.flight-detailed__detail-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--w-muted);
}

.flight-detailed__detail-value {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--w-text);
}

// ── Aircraft image ────────────────────────────────────────────────────────────
.flight-detailed__aircraft-image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem 1.25rem;
  border-top: 1px solid var(--w-divider);
  background: var(--w-bg);
  min-height: 160px;
}

.flight-detailed__aircraft-image {
  max-width: 100%;
  max-height: 200px;
  height: auto;
  object-fit: contain;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
