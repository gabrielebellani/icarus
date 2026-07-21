<script setup lang="ts">
import type { Flight } from '@/types/flight'
import TimetableRow from './TimetableRow.vue'

const props = defineProps<{
  flights: Flight[]
  mode: 'arrival' | 'departure'
  loading: boolean
  loadingMore?: boolean
  hasMore?: boolean
  error: string | null
}>()

const emit = defineEmits<{ loadMore: [] }>()
</script>

<template>
  <div class="tt-board" :class="`tt-board--${mode}`">

    <!-- Column header -->
    <div class="tt-board__grid" role="table" :aria-label="mode === 'arrival' ? 'Arrivals' : 'Departures'">
      <div class="tt-board__head" role="row">
        <div class="tt-board__th tt-board__th--center" role="columnheader"><span class="sr-only">Track</span></div>
        <div class="tt-board__th" role="columnheader">Time</div>
        <div class="tt-board__th" role="columnheader">Flight</div>
        <div class="tt-board__th" role="columnheader">
          {{ mode === 'arrival' ? 'From' : 'To' }}
        </div>
        <div class="tt-board__th" role="columnheader">Status</div>
        <div class="tt-board__th tt-board__th--center" role="columnheader">Terminal</div>
        <div class="tt-board__th tt-board__th--center" role="columnheader">Gate</div>
        <div v-if="mode === 'arrival'" class="tt-board__th tt-board__th--center" role="columnheader">Baggage</div>
      </div>

      <!-- Loading skeleton -->
      <template v-if="loading && flights.length === 0">
        <div
          v-for="i in 8"
          :key="i"
          class="tt-board__skeleton-row"
          role="row"
          aria-hidden="true"
        >
          <div class="tt-board__sk tt-board__sk--sm" />
          <div class="tt-board__sk tt-board__sk--time" />
          <div class="tt-board__sk tt-board__sk--flight" />
          <div class="tt-board__sk tt-board__sk--location" />
          <div class="tt-board__sk tt-board__sk--status" />
          <div class="tt-board__sk tt-board__sk--sm" />
          <div class="tt-board__sk tt-board__sk--sm" />
          <div v-if="mode === 'arrival'" class="tt-board__sk tt-board__sk--sm" />
        </div>
      </template>

      <!-- Flight rows -->
      <template v-else-if="flights.length > 0">
        <TimetableRow
          v-for="flight in flights"
          :key="flight.fa_flight_id"
          :flight="flight"
          :mode="mode"
        />
      </template>
    </div>

    <!-- Load more -->
    <div v-if="flights.length > 0 && !error" class="tt-board__load-more-row">
      <button
        v-if="hasMore !== false"
        class="tt-board__load-more-btn"
        :disabled="loadingMore || loading"
        @click="emit('loadMore')"
      >
        <span v-if="loadingMore" class="tt-board__load-more-spinner" aria-hidden="true" />
        <span>{{ loadingMore ? 'Loading…' : 'Load more' }}</span>
      </button>
      <span v-else class="tt-board__load-more-end">All flights loaded</span>
    </div>

    <!-- Error state -->
    <div v-if="error" class="tt-board__message tt-board__message--error">
      {{ error }}
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && flights.length === 0"
      class="tt-board__message"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2c-.5-.1-.9.1-1.1.5L2 8c-.2.5 0 1.1.5 1.3L8 11l-1.5 2H4l-1 1 2 2 2 2 1-1v-2.5L10 13l2 5.5c.2.5.8.7 1.3.5l2.5-1.5c.4-.2.6-.6.5-1.1z"/>
      </svg>
      <p>No {{ mode === 'arrival' ? 'arrivals' : 'departures' }} in this window</p>
    </div>

  </div>
</template>

<style scoped lang="scss">
$bg:       oklch(0.1 0.02 270);
$bg-alt:   oklch(0.13 0.022 270);
$text:     oklch(0.97 0 0);
$muted:    oklch(0.52 0.01 270);
$divider:  oklch(0.18 0.025 270);
$amber:    oklch(0.78 0.16 70);

// Column widths: track | time | flight | FROM/TO | status | terminal | gate | [baggage]
$grid-arrivals:    2.75rem 5rem 6.5rem minmax(7rem, 1fr) 17rem 5.5rem 4.5rem 5rem;
$grid-departures:  2.75rem 5rem 6.5rem minmax(7rem, 1fr) 17rem 5.5rem 4.5rem;

.tt-board {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__grid {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  &--arrival &__grid {
    display: grid;
    grid-template-columns: $grid-arrivals;
  }

  &--departure &__grid {
    display: grid;
    grid-template-columns: $grid-departures;
  }

  // ── Header row ─────────────────────────────────────────────────────────────

  &__head {
    display: contents;
  }

  &__th {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 0.55rem 0.75rem;
    background: oklch(0.12 0.022 270);
    border-bottom: 1px solid $divider;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: $muted;
    white-space: nowrap;

    &--center {
      text-align: center;
    }
  }

  // ── Skeleton rows ──────────────────────────────────────────────────────────

  &__skeleton-row {
    display: contents;
    pointer-events: none;
  }

  &__sk {
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid $divider;
    display: flex;
    align-items: center;

    &::after {
      content: '';
      display: block;
      height: 0.6rem;
      border-radius: 4px;
      background: oklch(0.18 0.025 270);
      animation: shimmer 1.4s ease-in-out infinite;
      width: 100%;
    }

    &--time::after   { width: 3rem; }
    &--flight::after { width: 4rem; }
    &--location::after { width: 60%; }
    &--status::after { width: 5rem; }
    &--sm::after     { width: 2rem; margin: 0 auto; }
  }

  // ── Message states ─────────────────────────────────────────────────────────

  &__message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3rem 2rem;
    color: $muted;
    font-size: 0.875rem;
    text-align: center;

    svg {
      opacity: 0.35;
    }

    p {
      margin: 0;
    }

    &--error {
      color: oklch(0.62 0.2 25);
    }
  }
  &__load-more-row {
    display: flex;
    justify-content: center;
    padding: 1.25rem 1.5rem;
    flex-shrink: 0;
  }

  &__load-more-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 1.25rem;
    border-radius: 0.4rem;
    border: 1px solid $divider;
    background: oklch(0.15 0.025 270);
    color: $muted;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.15s, background 0.15s, border-color 0.15s;

    &:hover:not(:disabled) {
      color: $text;
      background: oklch(0.18 0.025 270);
      border-color: oklch(0.28 0.03 270);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__load-more-end {
    font-size: 0.75rem;
    color: oklch(0.35 0.01 270);
    letter-spacing: 0.04em;
  }

  &__load-more-spinner {
    display: inline-block;
    width: 0.75rem;
    height: 0.75rem;
    border: 2px solid oklch(0.25 0.025 270);
    border-top-color: $muted;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
</style>
