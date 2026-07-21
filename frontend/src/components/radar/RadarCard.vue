<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { deleteRadarTracking } from '@/api/radar'
import type { RadarTracking } from '@/types/radar'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  radar: RadarTracking
}>()

const emit = defineEmits<{
  removed: [id: string]
}>()

// ── Status badge ──────────────────────────────────────────────────────────────
const status = computed(() => {
  if (props.radar.expired_at) return { label: 'Expired', tone: 'red' as const }
  if (props.radar.timeout_at) return { label: 'Timed out', tone: 'amber' as const }
  return { label: 'Active', tone: 'green' as const }
})

// ── Format helpers ────────────────────────────────────────────────────────────
const coordinatesDisplay = computed(() => {
  const { latitude, longitude } = props.radar.coordinates
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
})

const radiusDisplay = computed(() => `${props.radar.radius} km`)

const refreshIntervalDisplay = computed(() => `${props.radar.refresh_interval}s`)

const expirationDisplay = computed(() => {
  if (!props.radar.expiration) return 'Never'
  const date = new Date(props.radar.expiration)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
})

const inactivityDisplay = computed(() => {
  if (props.radar.inactivity_timeout === null) return 'Disabled'
  return `${props.radar.inactivity_timeout}m`
})

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
    await deleteRadarTracking(props.radar.id)
    emit('removed', props.radar.id)
  } catch {
    deleteError.value = 'Failed to remove. Please try again.'
    isDeleting.value = false
    confirmDelete.value = false
  }
}
</script>

<template>
  <RouterLink :to="{ name: 'radar-tracking', params: { id: radar.id } }" class="radar-card">
    <!-- Main content row -->
    <div class="radar-card__body">
      <!-- Left: name + status + coordinates -->
      <div class="radar-card__identity">
        <div class="radar-card__header">
          <span class="radar-card__name">{{ radar.name || `Radar #${radar.id}` }}</span>
          <span
            class="radar-card__status"
            :class="`radar-card__status--${status.tone}`"
            v-if="false"
          >
            {{ status.label }}
          </span>
        </div>
        <span class="radar-card__coordinates">{{ coordinatesDisplay }}</span>
      </div>

      <!-- Middle: details grid -->
      <div> </div>

      <!-- Right: delete button -->
      <div class="radar-card__right">
        <button
          class="radar-card__icon-btn radar-card__icon-btn--danger"
          title="Remove radar"
          aria-label="Remove radar from tracking"
          @click.stop="requestDelete"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
    
    <div class="radar-card__details">
        <div class="radar-card__detail-item">
          <span class="radar-card__detail-label">Radius</span>
          <span class="radar-card__detail-value">{{ radiusDisplay }}</span>
        </div>
        <div class="radar-card__detail-item">
          <span class="radar-card__detail-label">Update</span>
          <span class="radar-card__detail-value">{{ refreshIntervalDisplay }}</span>
        </div>
        <div class="radar-card__detail-item">
          <span class="radar-card__detail-label">Expires</span>
          <span class="radar-card__detail-value">{{ expirationDisplay }}</span>
        </div>
        <div class="radar-card__detail-item">
          <span class="radar-card__detail-label">Timeout</span>
          <span class="radar-card__detail-value">{{ inactivityDisplay }}</span>
        </div>
      </div>

    <!-- Delete confirmation overlay -->
    <Transition name="fade">
      <div
        v-if="confirmDelete"
        class="radar-card__confirm-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        @click.self="cancelDelete"
      >
        <div class="radar-card__confirm-box">
          <p id="delete-confirm-title" class="radar-card__confirm-title">Delete radar?</p>
          <p class="radar-card__confirm-body">
            This will stop tracking aircraft in this zone. The action cannot be undone.
          </p>
          <p v-if="deleteError" class="radar-card__confirm-error">{{ deleteError }}</p>
          <div class="radar-card__confirm-actions">
            <Button variant="outline" size="sm" @click="cancelDelete" :disabled="isDeleting"
              >Keep tracking
            </Button>
            <Button variant="destructive" size="sm" @click="doDelete" :disabled="isDeleting">
              {{ isDeleting ? 'Deleting…' : 'Delete' }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </RouterLink>
</template>

<style scoped lang="scss">
$bg: oklch(0.1 0.02 270);
$bg-elevated: oklch(0.15 0.025 270);
$text: oklch(0.97 0 0);
$muted: oklch(0.52 0.01 270);
$border: oklch(0.18 0.025 270);

$accent-green: oklch(0.78 0.16 145);
$accent-amber: oklch(0.78 0.16 70);
$accent-red: oklch(0.72 0.18 25);

.radar-card {
  display: block;
  border-radius: 0.75rem;
  background: $bg-elevated;
  border: 1px solid $border;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    background: oklch(0.17 0.027 270);
    border-color: oklch(0.25 0.04 270);
  }

  &__body {
    display: grid;
    grid-template-columns: 1fr 1fr 2.25rem;
    gap: 1rem;
    align-items: start;
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  &__name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: $text;
  }

  &__status {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    &--green {
      background: oklch(0.3 0.08 145);
      color: $accent-green;
    }

    &--amber {
      background: oklch(0.3 0.08 70);
      color: $accent-amber;
    }

    &--red {
      background: oklch(0.3 0.1 25);
      color: $accent-red;
    }
  }

  &__coordinates {
    font-size: 0.8125rem;
    color: $muted;
    font-variant-numeric: tabular-nums;
  }

  &__details {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    font-size: 0.8125rem;
    margin-top: 0.75rem;
    line-height: 1.4;
  }

  &__detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  &__detail-label {
    font-size: 0.6875rem;
    color: $muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  &__detail-value {
    color: $text;
    font-variant-numeric: tabular-nums;
  }

  &__right {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
  }

  &__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.875rem;
    height: 1.875rem;
    border-radius: 0.5rem;
    background: transparent;
    border: 1px solid $border;
    color: $muted;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;

    &:hover:not(:disabled) {
      background: oklch(0.18 0.025 270);
      border-color: oklch(0.25 0.04 270);
    }

    &--danger:hover:not(:disabled) {
      background: oklch(0.3 0.1 25);
      color: $accent-red;
      border-color: oklch(0.25 0.1 25);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  // ── Delete confirmation overlay ────────────────────────────────────────────

  &__confirm-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    z-index: 50;
  }

  &__confirm-box {
    background: $bg-elevated;
    border: 1px solid $border;
    border-radius: 0.75rem;
    padding: 1.25rem;
    max-width: 20rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  }

  &__confirm-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: $text;
    margin: 0 0 0.5rem 0;
  }

  &__confirm-body {
    font-size: 0.8125rem;
    color: $muted;
    margin: 0 0 0.75rem 0;
    line-height: 1.4;
  }

  &__confirm-error {
    font-size: 0.8125rem;
    color: $accent-red;
    margin: 0 0 0.75rem 0;
  }

  &__confirm-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
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
