<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RadarAircraft } from '@/types/radar'

const props = defineProps<{
  aircraft: RadarAircraft
}>()

// ── Display helpers ───────────────────────────────────────────────────────────
const callsign = computed(() => props.aircraft.adsb_state.callsign || 'UNKNOWN')

const origin = computed(() => {
  const data = props.aircraft.route_info.routeInfo.origin
  if (!data) return null
  return { code: data.iata, city: data.city }
})

const destination = computed(() => {
  const data = props.aircraft.route_info.routeInfo.destination
  if (!data) return null
  return { code: data.iata, city: data.city }
})

const airlineInfo = computed(() => props.aircraft.route_info.routeInfo.airline)

const aircraftInfo = computed(() => props.aircraft.aircraft_info)

const aircraftType = computed(() => aircraftInfo.value?.type || 'Unknown aircraft')
const registration = computed(() => aircraftInfo.value?.registration || '—')

// ── Telemetry ────────────────────────────────────────────────────────────────
const adsb = computed(() => props.aircraft.adsb_state)

const altitudeDisplay = computed(() => {
  const alt = adsb.value.geo_altitude || adsb.value.baro_altitude
  return alt ? `${Math.round(alt)} ft` : '—'
})

const speedDisplay = computed(() => {
  const speed = adsb.value.velocity
  return speed ? `${Math.round(speed)} kt` : '—'
})

const headingDisplay = computed(() => {
  const heading = adsb.value.true_track
  return heading ? `${Math.round(heading)}°` : '—'
})

const verticalRateDisplay = computed(() => {
  const vr = adsb.value.vertical_rate
  if (!vr) return 'Level'
  const fpm = Math.round(vr / 0.00508) // convert m/s to feet/min
  return vr > 0 ? `↑ ${fpm} fpm` : `↓ ${Math.abs(fpm)} fpm`
})

const distanceDisplay = computed(() => {
  const meters = adsb.value._distanceFromRadarCenter
  const km = (meters / 1000).toFixed(1)
  return `${km} km`
})

const statusLabel = computed(() => (adsb.value.on_ground ? 'On ground' : 'Airborne'))
const statusTone = computed(() => (adsb.value.on_ground ? 'amber' : 'green'))

// ── Image fallback handling ────────────────────────────────────────────────────
// Hide broken images entirely (no alt text, no placeholder) instead of showing
// a broken-image icon when a logo/photo URL 404s.
const logoError = ref(false)
const photoError = ref(false)

watch(
  () => airlineInfo.value?.logo,
  () => {
    logoError.value = false
  },
)

watch(
  () => aircraftInfo.value?.cover_url,
  () => {
    photoError.value = false
  },
)

const showLogo = computed(() => Boolean(airlineInfo.value?.logo) && !logoError.value)
const showPhoto = computed(() => Boolean(aircraftInfo.value?.cover_url) && !photoError.value)
</script>

<template>
  <div class="radar-aircraft-card">
    <!-- Top row: callsign + aircraft type -->
    <div class="radar-aircraft-card__top">
      <span class="radar-aircraft-card__callsign">{{ callsign }}</span>
      <span class="radar-aircraft-card__aircraft-type">{{ aircraftType }}</span>
    </div>

    <!-- Route row -->
    <div class="radar-aircraft-card__route">
      <div class="radar-aircraft-card__end">
        <span class="radar-aircraft-card__iata">{{ origin?.code ?? '—' }}</span>
        <span class="radar-aircraft-card__city">{{ origin?.city ?? 'Unknown origin' }}</span>
      </div>

      <div class="radar-aircraft-card__connector" aria-hidden="true">
        <svg class="radar-aircraft-card__connector-plane" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      </div>

      <div class="radar-aircraft-card__end radar-aircraft-card__end--right">
        <span class="radar-aircraft-card__iata">{{ destination?.code ?? '—' }}</span>
        <span class="radar-aircraft-card__city">{{ destination?.city ?? 'Unknown destination' }}</span>
      </div>
    </div>

    <!-- Status row: airborne/ground + distance from radar -->
    <div class="radar-aircraft-card__status-row">
      <span
        class="radar-aircraft-card__status"
        :class="`radar-aircraft-card__status--${statusTone}`"
      >{{ statusLabel }}</span>
      <span class="radar-aircraft-card__status radar-aircraft-card__status--right">
        {{ distanceDisplay }} from center
      </span>
    </div>

    <!-- Telemetry row -->
    <div class="radar-aircraft-card__telemetry">
      <div class="radar-aircraft-card__telemetry-item">
        <span class="radar-aircraft-card__telemetry-label">Altitude</span>
        <span class="radar-aircraft-card__telemetry-value">{{ altitudeDisplay }}</span>
      </div>
      <div class="radar-aircraft-card__telemetry-item">
        <span class="radar-aircraft-card__telemetry-label">Speed</span>
        <span class="radar-aircraft-card__telemetry-value">{{ speedDisplay }}</span>
      </div>
      <div class="radar-aircraft-card__telemetry-item">
        <span class="radar-aircraft-card__telemetry-label">Heading</span>
        <span class="radar-aircraft-card__telemetry-value">{{ headingDisplay }}</span>
      </div>
      <div class="radar-aircraft-card__telemetry-item">
        <span class="radar-aircraft-card__telemetry-label">Vertical rate</span>
        <span class="radar-aircraft-card__telemetry-value">{{ verticalRateDisplay }}</span>
      </div>
    </div>

    <!-- Bottom row: airline + registration -->
    <div class="radar-aircraft-card__bottom">
      <div class="radar-aircraft-card__bottom-item">
        <img
          v-if="showLogo"
          :src="airlineInfo?.logo ?? ''"
          alt=""
          class="radar-aircraft-card__airline-logo"
          @error="logoError = true"
        />
        <span class="radar-aircraft-card__bottom-text">{{ airlineInfo?.name ?? 'Airline unknown' }}</span>
      </div>
      <div class="radar-aircraft-card__bottom-item radar-aircraft-card__bottom-item--right">
        <span class="radar-aircraft-card__bottom-text" style="font-variant-numeric: tabular-nums">
          {{ registration }}
        </span>
        <img
          v-if="showPhoto"
          :src="aircraftInfo?.cover_url ?? ''"
          alt=""
          class="radar-aircraft-card__photo"
          @error="photoError = true"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Dark instrument panel tokens
$bg: oklch(0.1 0.02 270);
$text: oklch(0.97 0 0);
$muted: oklch(0.52 0.01 270);

$accent-green: oklch(0.78 0.16 145);
$accent-amber: oklch(0.78 0.16 70);

.radar-aircraft-card {
  background: $bg;
  color: $text;
  border-radius: 1.125rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  width: 100%;
  user-select: none;
}

// ── Top ───────────────────────────────────────────────────────────────────────
.radar-aircraft-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.radar-aircraft-card__callsign {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.radar-aircraft-card__aircraft-type {
  font-size: 0.8125rem;
  font-weight: 500;
  color: $muted;
  text-align: right;
}

// ── Route ─────────────────────────────────────────────────────────────────────
.radar-aircraft-card__route {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.radar-aircraft-card__end {
  display: flex;
  flex-direction: column;
  align-items: baseline;
  gap: 0.375rem;
  flex-shrink: 0;

  &--right {
    align-items: flex-end;
  }
}

.radar-aircraft-card__iata {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.radar-aircraft-card__city {
  font-size: 0.8125rem;
  color: $muted;
}

.radar-aircraft-card__connector {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: repeating-linear-gradient(
      90deg,
      $muted 0,
      $muted 4px,
      transparent 4px,
      transparent 8px
    );
    transform: translateY(-50%);
    opacity: 0.5;
  }
}

.radar-aircraft-card__connector-plane {
  width: 1.25rem;
  height: 1.25rem;
  color: $muted;
  position: relative;
  z-index: 1;
  background: $bg;
  padding: 0 0.25rem;
}

// ── Status row ────────────────────────────────────────────────────────────────
.radar-aircraft-card__status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.radar-aircraft-card__status {
  font-size: 0.8125rem;
  font-weight: 600;
  color: $muted;

  &--right {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  &--green {
    color: $accent-green;
  }

  &--amber {
    color: $accent-amber;
  }
}

// ── Telemetry ────────────────────────────────────────────────────────────────
.radar-aircraft-card__telemetry {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.radar-aircraft-card__telemetry-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.radar-aircraft-card__telemetry-label {
  font-size: 0.6875rem;
  color: $muted;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.radar-aircraft-card__telemetry-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: $text;
  font-variant-numeric: tabular-nums;
}

// ── Bottom ────────────────────────────────────────────────────────────────────
.radar-aircraft-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.radar-aircraft-card__bottom-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;

  &--right {
    flex-direction: row-reverse;
  }
}

.radar-aircraft-card__bottom-text {
  font-size: 0.8125rem;
  font-weight: 500;
  color: $muted;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.radar-aircraft-card__airline-logo {
  width: 20px;
  height: auto;
  border-radius: 4px;
  flex-shrink: 0;
}

.radar-aircraft-card__photo {
  width: 36px;
  height: 26px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

// ── Fullscreen scaling ──────────────────────────────────────────────────────
.radar-tracking-view__aircraft--fullscreen & {
  gap: 0;
  justify-content: space-between;
  border-radius: 1.5rem;
  padding: 2rem 2.5rem;

  .radar-aircraft-card__callsign {
    font-size: 3rem;
  }

  .radar-aircraft-card__aircraft-type {
    font-size: 1.375rem;
  }

  .radar-aircraft-card__iata {
    font-size: 5.5rem;
  }

  .radar-aircraft-card__city {
    font-size: 1.25rem;
  }

  .radar-aircraft-card__connector-plane {
    width: 2.75rem;
    height: 2.75rem;
  }

  .radar-aircraft-card__status {
    font-size: 1.375rem;
  }

  .radar-aircraft-card__telemetry-label {
    font-size: 0.875rem;
  }

  .radar-aircraft-card__telemetry-value {
    font-size: 2rem;
  }

  .radar-aircraft-card__bottom-text {
    font-size: 1.25rem;
  }

  .radar-aircraft-card__airline-logo {
    width: 32px;
  }

  .radar-aircraft-card__photo {
    width: 56px;
    height: 40px;
  }
}
</style>
