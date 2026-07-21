<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QUICK_RANGES, useApiRequestsChart } from '@/composables/useApiRequestsChart'
import type { ApiRequestsDay, ApiRequestsService } from '@/types/preferences'

const { range, customFrom, customTo, status, errorMessage, days, load, selectQuickRange, applyCustomRange } =
  useApiRequestsChart()

onMounted(() => load())

const SERVICES: { key: ApiRequestsService; label: string; color: string }[] = [
  { key: 'opensky', label: 'OpenSky', color: 'oklch(0.62 0.15 250)' },
  { key: 'adsb_lol', label: 'ADS-B Lol', color: 'oklch(0.66 0.16 300)' },
  { key: 'adsbdb', label: 'AdsbDB', color: 'oklch(0.68 0.13 190)' },
  { key: 'flightaware', label: 'FlightAware', color: 'oklch(0.72 0.15 70)' },
]

const hoveredIndex = ref<number | null>(null)

function dayTotal(day: ApiRequestsDay): number {
  return day.opensky + day.adsb_lol + day.adsbdb + day.flightaware
}

/** Rounds up to a "nice" scale ceiling (1/2/5/10 × 10^n) for readable gridlines. */
function niceCeil(value: number): number {
  if (value <= 0) return 4
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const residual = value / magnitude
  let niceResidual: number
  if (residual <= 1) niceResidual = 1
  else if (residual <= 2) niceResidual = 2
  else if (residual <= 5) niceResidual = 5
  else niceResidual = 10
  return niceResidual * magnitude
}

const maxTotal = computed(() => niceCeil(Math.max(0, ...days.value.map(dayTotal))))

const gridLines = computed(() => {
  const steps = 4
  return Array.from({ length: steps + 1 }, (_, i) => Math.round((maxTotal.value * (steps - i)) / steps))
})

// Thin out x-axis labels when there are many days to keep them legible.
const labelStep = computed(() => Math.max(1, Math.ceil(days.value.length / 10)))

function formatDayLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function formatFullDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const totals = computed(() => {
  const result: Record<ApiRequestsService, number> = { opensky: 0, adsb_lol: 0, adsbdb: 0, flightaware: 0 }
  for (const day of days.value) {
    result.opensky += day.opensky
    result.adsb_lol += day.adsb_lol
    result.adsbdb += day.adsbdb
    result.flightaware += day.flightaware
  }
  return result
})

const grandTotal = computed(() => Object.values(totals.value).reduce((a, b) => a + b, 0))

function onApplyCustom() {
  applyCustomRange(customFrom.value, customTo.value)
}
</script>

<template>
  <section class="settings-section">
    <div class="settings-section__header-row">
      <div>
        <h2 class="settings-section__title">API calls over time</h2>
        <p class="settings-section__subtitle">
          Daily requests made to third-party providers to source flight, airport and radar data.
        </p>
      </div>
    </div>

    <div class="chart-controls">
      <div class="chart-controls__quick-ranges" role="group" aria-label="Quick date range">
        <Button
          v-for="option in QUICK_RANGES"
          :key="option.value"
          type="button"
          size="sm"
          :variant="range === option.value ? 'default' : 'outline'"
          @click="selectQuickRange(option.value)"
        >
          {{ option.label }}
        </Button>
      </div>

      <form class="chart-controls__custom-range" @submit.prevent="onApplyCustom">
        <Input v-model="customFrom" type="date" class="chart-controls__date-input" aria-label="Start date" />
        <span class="chart-controls__range-sep">–</span>
        <Input v-model="customTo" type="date" class="chart-controls__date-input" aria-label="End date" />
        <Button type="submit" size="sm" :variant="range === 'custom' ? 'default' : 'outline'">Apply</Button>
      </form>
    </div>

    <div v-if="status === 'loading'" class="settings-section__loading">
      <Loader2 class="animate-spin" :size="20" />
      <span>Loading API usage…</span>
    </div>

    <Alert v-else-if="status === 'error'" variant="destructive">
      <AlertTriangle :size="16" />
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <Alert v-else-if="days.length === 0" class="alert--empty">
      <AlertDescription>No API calls recorded for this period.</AlertDescription>
    </Alert>

    <template v-else>
      <div class="chart-summary">
        <div class="chart-summary__stat">
          <span class="chart-summary__value">{{ grandTotal.toLocaleString() }}</span>
          <span class="chart-summary__label">Total calls</span>
        </div>
        <div v-for="service in SERVICES" :key="service.key" class="chart-summary__stat">
          <span class="chart-summary__value" :style="{ color: service.color }">
            {{ totals[service.key].toLocaleString() }}
          </span>
          <span class="chart-summary__label">{{ service.label }}</span>
        </div>
      </div>

      <div class="bar-chart">
        <div class="bar-chart__grid">
          <span v-for="(value, index) in gridLines" :key="index" class="bar-chart__grid-value">
            {{ value.toLocaleString() }}
          </span>
        </div>

        <div class="bar-chart__plot-wrap">
          <div class="bar-chart__plot">
            <div
              v-for="(_, lineIndex) in gridLines"
              :key="`line-${lineIndex}`"
              class="bar-chart__grid-line"
              :style="{ top: `${(lineIndex / (gridLines.length - 1)) * 100}%` }"
            />

            <div
              v-for="(day, index) in days"
              :key="day.date"
              class="bar-chart__column"
              @mouseenter="hoveredIndex = index"
              @mouseleave="hoveredIndex = null"
            >
              <div
                v-if="hoveredIndex === index"
                class="bar-chart__tooltip"
                :class="{
                  'bar-chart__tooltip--edge-start': index === 0,
                  'bar-chart__tooltip--edge-end': index === days.length - 1,
                }"
              >
                <div class="bar-chart__tooltip-date">{{ formatFullDate(day.date) }}</div>
                <div v-for="service in SERVICES" :key="service.key" class="bar-chart__tooltip-row">
                  <span class="bar-chart__tooltip-dot" :style="{ background: service.color }" />
                  <span class="bar-chart__tooltip-label">{{ service.label }}</span>
                  <span class="bar-chart__tooltip-value">{{ day[service.key].toLocaleString() }}</span>
                </div>
                <div class="bar-chart__tooltip-row bar-chart__tooltip-row--total">
                  <span class="bar-chart__tooltip-label">Total</span>
                  <span class="bar-chart__tooltip-value">{{ dayTotal(day).toLocaleString() }}</span>
                </div>
              </div>

              <div class="bar-chart__bar">
                <div
                  v-for="service in SERVICES"
                  :key="service.key"
                  class="bar-chart__segment"
                  :style="{ height: `${(day[service.key] / maxTotal) * 100}%`, background: service.color }"
                />
              </div>
            </div>
          </div>

          <div class="bar-chart__labels">
            <span
              v-for="(day, index) in days"
              :key="day.date"
              class="bar-chart__x-label"
              :class="{ 'bar-chart__x-label--hidden': index % labelStep !== 0 && index !== days.length - 1 }"
            >
              {{ formatDayLabel(day.date) }}
            </span>
          </div>
        </div>
      </div>

      <div class="chart-legend">
        <div v-for="service in SERVICES" :key="service.key" class="chart-legend__item">
          <span class="chart-legend__dot" :style="{ background: service.color }" />
          <span>{{ service.label }}</span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.settings-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;

  &__header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    gap: 1rem;
  }

  &__title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--foreground);
    margin: 0 0 0.25rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    margin: 0;
  }

  &__loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--muted-foreground);
    font-size: 0.875rem;
    padding: 0.5rem 0;
  }
}

.chart-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  &__quick-ranges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  &__custom-range {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  &__date-input {
    width: 9.5rem;
    height: 2rem;
    font-size: 0.8rem;
  }

  &__range-sep {
    color: var(--muted-foreground);
    font-size: 0.8rem;
  }
}

.chart-summary {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  &__stat {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.85rem 1rem;
    background: var(--card);
  }

  &__value {
    font-size: 1.15rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--foreground);
    line-height: 1.2;
  }

  &__label {
    font-size: 0.72rem;
    color: var(--muted-foreground);
  }
}

$bar-area-height: 12.5rem;

.bar-chart {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  &__grid {
    height: $bar-area-height;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    padding-right: 0.5rem;
    flex-shrink: 0;
  }

  &__grid-value {
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground);
    line-height: 1;
    transform: translateY(50%);

    &:first-child {
      transform: none;
    }

    &:last-child {
      transform: translateY(100%);
    }
  }

  &__plot-wrap {
    flex: 1;
    min-width: 0;
  }

  &__plot {
    position: relative;
    height: $bar-area-height;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    border-bottom: 1px solid var(--border);
  }

  &__grid-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: oklch(0.18 0.025 270 / 40%);
  }

  &__column {
    position: relative;
    flex: 0 1 2.5rem;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  &__bar {
    width: 65%;
    max-width: 1.75rem;
    height: 100%;
    display: flex;
    flex-direction: column-reverse;
    border-radius: 3px 3px 0 0;
    overflow: hidden;
    background: oklch(0.18 0.025 270 / 40%);
  }

  &__segment {
    width: 100%;
    transition: height 0.2s ease;
  }

  &__labels {
    display: flex;
    gap: 4px;
    margin-top: 0.4rem;
  }

  &__x-label {
    flex: 0 1 2.5rem;
    text-align: center;
    font-size: 0.65rem;
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--hidden {
      visibility: hidden;
    }
  }

  &__tooltip {
    position: absolute;
    bottom: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    pointer-events: none;
    background: var(--popover, oklch(0.15 0.025 270));
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem 0.65rem;
    min-width: 9.5rem;
    box-shadow: 0 4px 16px rgb(0 0 0 / 35%);

    &--edge-start {
      left: 0;
      transform: translateX(0);
    }

    &--edge-end {
      left: auto;
      right: 0;
      transform: translateX(0);
    }
  }

  &__tooltip-date {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--foreground);
    margin-bottom: 0.35rem;
    white-space: nowrap;
  }

  &__tooltip-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    color: var(--muted-foreground);
    padding: 0.1rem 0;

    &--total {
      margin-top: 0.25rem;
      padding-top: 0.3rem;
      border-top: 1px solid var(--border);
      color: var(--foreground);
      font-weight: 600;
    }
  }

  &__tooltip-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    flex-shrink: 0;
  }

  &__tooltip-label {
    flex: 1;
    white-space: nowrap;
  }

  &__tooltip-value {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--foreground);
  }
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;

  &__item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: var(--muted-foreground);
  }

  &__dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    flex-shrink: 0;
  }
}

.alert--empty {
  color: var(--muted-foreground);
}
</style>
