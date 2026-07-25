<script setup lang="ts">
import { ref, computed } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { searchFlight, startTracking } from '@/api/flight'
import { HttpError } from '@/api/client'
import type { Flight, TrackingRecord } from '@/types/flight'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const props = withDefaults(defineProps<{
  initialIdentifier?: string
  initialDate?: string
}>(), {
  initialIdentifier: '',
  initialDate: '',
})

const emit = defineEmits<{
  tracked: [record: TrackingRecord]
}>()

// Date bounds: -2 days / +2 days from today
const today = new Date()
const minDate = new Date(today)
minDate.setDate(today.getDate() - 2)
const maxDate = new Date(today)
maxDate.setDate(today.getDate() + 2)

const toIsoDate = (d: Date) => d.toISOString().split('T')[0]

type Phase = 'search' | 'confirm'

const phase = ref<Phase>('search')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const foundFlight = ref<Flight | null>(null)

// Form state preserved across phases
const searchIdentifier = ref(props.initialIdentifier)
const searchDate = ref(props.initialDate || toIsoDate(today))

const schema = toTypedSchema(
  z.object({
    identifier: z.string().min(2, 'Enter a valid flight code (e.g. LH2222)'),
    date: z
      .string()
      .min(1, 'Date is required')
      .refine((v) => {
        const d = new Date(v)
        return d >= minDate && d <= maxDate
      }, 'Date must be within ±2 days of today'),
  }),
)

const { handleSubmit, setFieldValue } = useForm({ validationSchema: schema })

// Pre-fill with provided values or today's date
setFieldValue('date', searchDate.value)
if (searchIdentifier.value) setFieldValue('identifier', searchIdentifier.value)

const onSearch = handleSubmit(async (values) => {
  errorMessage.value = null
  isLoading.value = true
  foundFlight.value = null

  try {
    const res = await searchFlight(values.identifier, values.date)

    if (!res.flights || res.flights.length === 0) {
      errorMessage.value = 'No flight found for that identifier and date.'
      isLoading.value = false
      return
    }

    foundFlight.value = res.flights[0]
    searchIdentifier.value = values.identifier
    searchDate.value = values.date
    phase.value = 'confirm'
  } catch (err) {
    if (err instanceof HttpError && err.status === 400) {
      const body = err.body as { error?: string }
      errorMessage.value = body?.error ?? 'Bad request. Please check the flight code and date.'
    } else if (err instanceof HttpError && err.status === 422) {
      errorMessage.value = 'Invalid search parameters. Check the flight code and date.'
    } else if (err instanceof HttpError && err.status === 429) {
      const body = err.body as { error?: string }
      errorMessage.value = body?.error ?? 'Third-party service quota exceeded. Please try again later.'
    } else {
      errorMessage.value = 'Search failed. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
})

async function confirmTracking() {
  if (!foundFlight.value) return
  errorMessage.value = null
  isLoading.value = true

  try {
    const record = await startTracking({
      identifier: searchIdentifier.value,
      date: searchDate.value,
    })
    emit('tracked', record)
  } catch (err) {
    if (err instanceof HttpError && err.status === 400) {
      const body = err.body as { error?: string }
      errorMessage.value = body?.error ?? 'Bad request. Failed to start tracking.'
    } else if (err instanceof HttpError && err.status === 429) {
      const body = err.body as { error?: string }
      errorMessage.value = body?.error ?? 'Third-party service quota exceeded. Please try again later.'
    } else {
      errorMessage.value = 'Failed to start tracking. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}

function backToSearch() {
  phase.value = 'search'
  foundFlight.value = null
  errorMessage.value = null
}

const flight = computed(() => foundFlight.value)

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}
</script>

<template>
  <!-- Phase 1A: Search form -->
  <div v-if="phase === 'search'" class="flight-search">
    <div class="flight-search__header">
      <div class="flight-search__icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2c-.5-.1-.9.1-1.1.5L2 8c-.2.5 0 1.1.5 1.3L8 11l-1.5 2H4l-1 1 2 2 2 2 1-1v-2.5L10 13l2 5.5c.2.5.8.7 1.3.5l2.5-1.5c.4-.2.6-.6.5-1.1z"/>
        </svg>
      </div>
      <div>
        <h2 class="flight-search__title">Track a Flight</h2>
        <p class="flight-search__subtitle">Enter a flight code and date to get started</p>
      </div>
    </div>

    <Alert v-if="errorMessage" variant="destructive" class="mb-4">
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <form @submit.prevent="onSearch" class="flight-search__form">
      <FormField name="identifier" v-slot="{ componentField }">
        <FormItem>
          <FormLabel>Flight code</FormLabel>
          <FormControl>
            <Input
              type="text"
              placeholder="e.g. LH2222 or DLH2222"
              autocomplete="off"
              autocapitalize="characters"
              v-bind="componentField"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField name="date" v-slot="{ componentField }">
        <FormItem>
          <FormLabel>Date</FormLabel>
          <FormControl>
            <Input
              type="date"
              :min="toIsoDate(minDate)"
              :max="toIsoDate(maxDate)"
              v-bind="componentField"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <Button type="submit" class="w-full" :disabled="isLoading">
        <span v-if="isLoading">Searching…</span>
        <span v-else>Search flight</span>
      </Button>
    </form>
  </div>

  <!-- Phase 1B: Confirm tracking -->
  <div v-else-if="phase === 'confirm' && flight" class="flight-confirm">
    <div class="flight-confirm__header">
      <button class="flight-confirm__back" @click="backToSearch" aria-label="Back to search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>
      <p class="flight-confirm__hint">Flight found — confirm to start tracking</p>
    </div>

    <Alert v-if="errorMessage" variant="destructive" class="mb-4">
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <div class="flight-preview">
      <!-- Identifier + Status -->
      <div class="flight-preview__top">
        <div class="flight-preview__ident-group">
          <span class="flight-preview__ident">{{ flight.ident_iata || flight.ident_icao }}</span>
          <span class="flight-preview__aircraft">{{ flight.aircraft_type }}</span>
        </div>
        <span class="flight-preview__status" :class="`flight-preview__status--${flight.cancelled ? 'cancelled' : flight.diverted ? 'diverted' : 'default'}`">
          {{ flight.status }}
        </span>
      </div>

      <!-- Route -->
      <div class="flight-preview__route">
        <div class="flight-preview__airport">
          <span class="flight-preview__iata">{{ flight.origin.code_iata }}</span>
          <span class="flight-preview__city">{{ flight.origin.city }}</span>
        </div>

        <div class="flight-preview__arrow">
          <svg width="60" height="16" viewBox="0 0 60 16" fill="none">
            <line x1="0" y1="8" x2="52" y2="8" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
            <path d="M52 4l6 4-6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>

        <div class="flight-preview__airport flight-preview__airport--right">
          <span class="flight-preview__iata">{{ flight.destination.code_iata }}</span>
          <span class="flight-preview__city">{{ flight.destination.city }}</span>
        </div>
      </div>

      <!-- Times -->
      <div class="flight-preview__times">
        <div class="flight-preview__time-col">
          <span class="flight-preview__time-label">Departure</span>
          <span class="flight-preview__time-value">{{ formatTime(flight.estimated_off || flight.scheduled_off) }}</span>
        </div>
        <div class="flight-preview__time-col flight-preview__time-col--center">
          <span class="flight-preview__time-label">Duration</span>
          <span class="flight-preview__time-value">{{ formatDuration(flight.filed_ete) }}</span>
        </div>
        <div class="flight-preview__time-col flight-preview__time-col--right">
          <span class="flight-preview__time-label">Arrival</span>
          <span class="flight-preview__time-value">{{ formatTime(flight.estimated_in || flight.scheduled_in) }}</span>
        </div>
      </div>
    </div>

    <div class="flight-confirm__actions">
      <Button variant="outline" @click="backToSearch" :disabled="isLoading">Cancel</Button>
      <Button @click="confirmTracking" :disabled="isLoading">
        <span v-if="isLoading">Starting…</span>
        <span v-else>Track this flight</span>
      </Button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.flight-search {
  width: 100%;
  max-width: 420px;

  &__header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    margin-bottom: 1.75rem;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius);
    background: var(--muted);
    color: var(--foreground);
    flex-shrink: 0;
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--foreground);
    margin: 0;
  }

  &__subtitle {
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    margin: 0.125rem 0 0;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
}

.flight-confirm {
  width: 100%;
  max-width: 460px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    gap: 1rem;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;

    &:hover {
      color: var(--foreground);
    }
  }

  &__hint {
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    margin: 0;
  }

  &__actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;

    > * {
      flex: 1;
    }
  }
}

.flight-preview {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  background: var(--card);
  display: flex;
  flex-direction: column;
  gap: 1.125rem;

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__ident-group {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  &__ident {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--foreground);
  }

  &__aircraft {
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    font-weight: 500;
  }

  &__status {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    letter-spacing: 0.01em;

    &--default {
      background: var(--secondary);
      color: var(--secondary-foreground);
    }

    &--cancelled {
      background: oklch(0.95 0.04 25);
      color: oklch(0.55 0.2 25);
    }

    &--diverted {
      background: oklch(0.95 0.06 60);
      color: oklch(0.55 0.15 60);
    }
  }

  &__route {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__airport {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;

    &--right {
      text-align: right;
    }
  }

  &__iata {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--foreground);
    line-height: 1;
  }

  &__city {
    font-size: 0.75rem;
    color: var(--muted-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90px;
  }

  &__arrow {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted-foreground);
    opacity: 0.6;
  }

  &__times {
    display: flex;
    gap: 0.5rem;
    border-top: 1px solid var(--border);
    padding-top: 1rem;
  }

  &__time-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    &--center {
      text-align: center;
    }

    &--right {
      text-align: right;
    }
  }

  &__time-label {
    font-size: 0.6875rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
  }

  &__time-value {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }
}
</style>
