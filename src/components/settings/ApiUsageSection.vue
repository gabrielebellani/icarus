<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RefreshCw, Loader2, AlertTriangle } from '@lucide/vue'
import { fetchUsage } from '@/api/preferences'
import { HttpError } from '@/api/client'
import type { FlightAwareUsage } from '@/types/preferences'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Status = 'loading' | 'ready' | 'refreshing' | 'error' | 'missing-key'

const status = ref<Status>('loading')
const usage = ref<FlightAwareUsage | null>(null)
const errorMessage = ref<string | null>(null)

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

async function load(isRefresh = false) {
  status.value = isRefresh ? 'refreshing' : 'loading'
  errorMessage.value = null
  try {
    const data = await fetchUsage()
    usage.value = data.flight_aware
    status.value = 'ready'
  } catch (err) {
    if (err instanceof HttpError && err.status === 400) {
      status.value = 'missing-key'
    } else {
      errorMessage.value = 'Failed to load usage data.'
      status.value = 'error'
    }
  }
}

onMounted(() => load())

const emit = defineEmits<{ scrollToPreferences: [] }>()
</script>

<template>
  <section class="settings-section">
    <div class="settings-section__header-row">
      <div>
        <h2 class="settings-section__title">Third-party API usage</h2>
        <p class="settings-section__subtitle">Current month's usage for external services.</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        :disabled="status === 'loading' || status === 'refreshing'"
        aria-label="Refresh usage data"
        @click="load(true)"
      >
        <RefreshCw :size="16" :class="{ 'animate-spin': status === 'refreshing' }" />
      </Button>
    </div>

    <div v-if="status === 'loading'" class="settings-section__loading">
      <Loader2 class="animate-spin" :size="20" />
      <span>Loading usage data…</span>
    </div>

    <Alert v-else-if="status === 'missing-key'" class="alert--warning">
      <AlertTriangle :size="16" />
      <AlertDescription>
        FlightAware API key is not configured. Go to
        <button class="alert-link" @click="emit('scrollToPreferences')">Preferences</button>
        to add your key.
      </AlertDescription>
    </Alert>

    <Alert v-else-if="status === 'error'" variant="destructive">
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <div v-else-if="usage" class="usage-card">
      <div class="usage-card__header">
        <span class="usage-card__service">FlightAware</span>
      </div>
      <div class="usage-grid">
        <div class="usage-stat">
          <span class="usage-stat__value">{{ usage.total_calls.toLocaleString() }}</span>
          <span class="usage-stat__label">Total calls</span>
        </div>
        <div class="usage-stat">
          <span class="usage-stat__value usage-stat__value--success">
            {{ usage.total_successful_calls.toLocaleString() }}
          </span>
          <span class="usage-stat__label">Successful</span>
        </div>
        <div class="usage-stat">
          <span class="usage-stat__value usage-stat__value--danger">
            {{ usage.total_failed_calls.toLocaleString() }}
          </span>
          <span class="usage-stat__label">Failed</span>
        </div>
        <div class="usage-stat">
          <span class="usage-stat__value">{{ usage.total_pages.toLocaleString() }}</span>
          <span class="usage-stat__label">Pages</span>
        </div>
        <div class="usage-stat">
          <span class="usage-stat__value">{{ usd.format(usage.total_cost) }}</span>
          <span class="usage-stat__label">Total cost</span>
        </div>
        <div class="usage-stat">
          <span class="usage-stat__value usage-stat__value--accent">
            {{ usd.format(usage.total_discount_cost) }}
          </span>
          <span class="usage-stat__label">Discounted cost</span>
        </div>
      </div>
    </div>
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
    margin-bottom: 1.5rem;
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

.usage-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;

  &__header {
    padding: 0.6rem 1rem;
    background: var(--muted);
    border-bottom: 1px solid var(--border);
  }

  &__service {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
  }
}

.usage-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.usage-stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 1rem 1.25rem;
  background: var(--card);

  &__value {
    font-size: 1.25rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--foreground);
    line-height: 1.2;

    &--success { color: oklch(0.55 0.18 145); }
    &--danger  { color: var(--destructive); }
    &--accent  { color: oklch(0.55 0.18 250); }
  }

  &__label {
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }
}

.alert--warning {
  border-color: oklch(0.7 0.18 70);
  background: oklch(0.97 0.04 70);
  color: oklch(0.45 0.15 70);
}

.alert-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}
</style>
