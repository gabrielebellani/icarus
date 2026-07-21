<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { AirportTracking } from '@/types/airport'
import { deleteAirportTracking } from '@/api/airport'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  airport: AirportTracking
}>()

const emit = defineEmits<{
  updated: [record: AirportTracking]
  removed: [id: number]
}>()

// ── Display helpers ───────────────────────────────────────────────────────────
const displayCode = computed(() => props.airport.iata_code ?? props.airport.icao_code ?? '???')
const displayName = computed(() => props.airport.name ?? 'Unknown Airport')
const displayCity = computed(() => props.airport.city ?? null)

// ── Delete ────────────────────────────────────────────────────────────────────
const confirmDelete = ref(false)
const isDeleting = ref(false)
const deleteError = ref<string | null>(null)

function requestDelete() {
  deleteError.value = null
  confirmDelete.value = true
}

function cancelDelete() {
  confirmDelete.value = false
}

async function doDelete() {
  isDeleting.value = true
  deleteError.value = null
  try {
    await deleteAirportTracking(props.airport.id)
    emit('removed', props.airport.id)
  } catch {
    deleteError.value = 'Failed to remove. Please try again.'
    isDeleting.value = false
    confirmDelete.value = false
  }
}
</script>

<template>
  <RouterLink
    :to="{ name: 'timetable', params: { trackingId: airport.id } }"
    class="airport-card"
  >

    <!-- Main content row -->
    <div class="airport-card__body">

      <!-- Left: code + name/city -->
      <div class="airport-card__identity">
        <span class="airport-card__code">{{ displayCode }}</span>
        <div class="airport-card__meta">
          <span class="airport-card__name">{{ displayName }}</span>
          <span v-if="displayCity" class="airport-card__city">{{ displayCity }}</span>
        </div>
      </div>

      <!-- Right: delete button -->
      <div class="airport-card__right">
        <button
          class="airport-card__icon-btn airport-card__icon-btn--danger"
          title="Remove airport"
          aria-label="Remove airport from tracking"
          @click.stop="requestDelete"
        >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
    </div>

    <!-- Delete confirmation overlay -->
    <Transition name="fade">
      <div
        v-if="confirmDelete"
        class="airport-card__confirm-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`confirm-${airport.id}`"
      >
        <div class="airport-card__confirm-box">
          <p :id="`confirm-${airport.id}`" class="airport-card__confirm-title">
            Remove {{ displayCode }}?
          </p>
          <p v-if="deleteError" class="airport-card__inline-error">{{ deleteError }}</p>
          <div class="airport-card__confirm-actions">
            <Button variant="outline" size="sm" :disabled="isDeleting" @click="cancelDelete">
              Keep
            </Button>
            <Button variant="destructive" size="sm" :disabled="isDeleting" @click="doDelete">
              {{ isDeleting ? 'Removing…' : 'Remove' }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </RouterLink>
</template>

<style scoped lang="scss">
.airport-card {
  --w-bg:          oklch(0.1 0.02 270);
  --w-bg-elevated: oklch(0.15 0.025 270);
  --w-text:        oklch(0.97 0 0);
  --w-muted:       oklch(0.52 0.01 270);
  --w-divider:     oklch(0.18 0.025 270);
  --w-accent-arr:  oklch(0.78 0.16 145);   // green — arrivals
  --w-accent-dep:  oklch(0.72 0.14 200);   // blue — departures
  --w-accent-both: oklch(0.78 0.15 265);   // indigo — both

  position: relative;
  background: var(--w-bg);
  color: var(--w-text);
  border-radius: 1.0rem;
  padding: 1rem 1.25rem;
  overflow: hidden;
  transition: background 0.15s, transform 0.2s, box-shadow 0.2s;
  text-decoration: none;
  cursor: pointer;
  display: block;

  &:hover {
    transform: scale(1.005);
    box-shadow: 0 4px 16px oklch(0 0 0 / 0.15);
  }

  &--editing {
    background: var(--w-bg-elevated);
  }

  // ── Body ───────────────────────────────────────────────────────────────────
  &__body {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: space-between;
  }

  // ── Identity ───────────────────────────────────────────────────────────────
  &__identity {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    min-width: 0;
  }

  &__code {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: var(--w-text);
    flex-shrink: 0;
    line-height: 1;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  &__name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--w-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__city {
    font-size: 0.75rem;
    color: var(--w-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // ── Right side ─────────────────────────────────────────────────────────────
  &__right {
    flex-shrink: 0;
  }

  &__badge-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  // ── Direction badge ────────────────────────────────────────────────────────
  &__direction-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-variant-numeric: tabular-nums;

    &--in {
      background: oklch(0.78 0.16 145 / 0.15);
      color: var(--w-accent-arr);
    }

    &--out {
      background: oklch(0.72 0.14 200 / 0.15);
      color: var(--w-accent-dep);
    }

    &--in_out {
      background: oklch(0.78 0.15 265 / 0.15);
      color: var(--w-accent-both);
    }
  }

  &__dir-icon {
    flex-shrink: 0;
  }

  // ── Icon buttons ───────────────────────────────────────────────────────────
  &__icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.625rem;
    height: 1.625rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid var(--w-divider);
    background: transparent;
    color: var(--w-muted);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;

    &:hover {
      border-color: oklch(0.35 0.025 270);
      background: oklch(0.18 0.025 270);
      color: var(--w-text);
    }

    &--danger {
      &:hover {
        border-color: oklch(0.72 0.18 25 / 0.5);
        background: oklch(0.72 0.18 25 / 0.1);
        color: oklch(0.72 0.18 25);
      }
    }
  }

  // ── Inline editor ──────────────────────────────────────────────────────────
  &__editor {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  &__edit-dirs {
    display: flex;
    gap: 0.25rem;
  }

  &__edit-dir-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border-radius: 999px;
    border: 1px solid var(--w-divider);
    background: transparent;
    color: var(--w-muted);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;

    &:hover {
      border-color: oklch(0.35 0.025 270);
      color: var(--w-text);
    }

    &--active {
      border-color: oklch(0.58 0.2 265);
      background: oklch(0.58 0.2 265 / 0.15);
      color: oklch(0.78 0.15 265);
    }
  }

  &__edit-actions {
    display: flex;
    gap: 0.375rem;
  }

  &__text-btn {
    padding: 0.2rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: var(--radius);
    border: 1px solid var(--w-divider);
    background: transparent;
    color: var(--w-muted);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;

    &:hover {
      border-color: oklch(0.35 0.025 270);
      color: var(--w-text);
    }

    &--primary {
      border-color: oklch(0.58 0.2 265 / 0.5);
      color: oklch(0.78 0.15 265);

      &:hover:not(:disabled) {
        border-color: oklch(0.58 0.2 265);
        background: oklch(0.58 0.2 265 / 0.1);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  &__inline-error {
    font-size: 0.75rem;
    color: oklch(0.72 0.18 25);
    margin: 0;
    text-align: right;
  }

  // ── Delete confirmation overlay ─────────────────────────────────────────────
  &__confirm-overlay {
    position: absolute;
    inset: 0;
    background: oklch(0.08 0.02 270 / 0.92);
    border-radius: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    backdrop-filter: blur(2px);
  }

  &__confirm-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
  }

  &__confirm-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--w-text);
    margin: 0;
  }

  &__confirm-actions {
    display: flex;
    gap: 0.5rem;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
