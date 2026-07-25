<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Eye, EyeOff, Save, Loader2 } from '@lucide/vue'
import { fetchPreferences, savePreferences } from '@/api/preferences'
import { HttpError } from '@/api/client'
import type { Preference } from '@/types/preferences'
import { usePreferencesStore } from '@/stores/preferences'

const prefsStore = usePreferencesStore()

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Status = 'idle' | 'loading' | 'saving' | 'success' | 'error'

const status = ref<Status>('loading')
const errorMessage = ref<string | null>(null)

// Form field values
const flightAwareKey = ref<string>('')
const openSkyKey = ref<string>('')
const flightAwareAllowOverLimit = ref<boolean>(false)

// Original values for dirty-checking
const original = ref({
  flightAwareKey: '',
  openSkyKey: '',
  flightAwareAllowOverLimit: false,
})

// Password field visibility toggles
const showFlightAwareKey = ref(false)
const showOpenSkyKey = ref(false)

function applyPreferences(prefs: Preference[]) {
  for (const pref of prefs) {
    switch (pref.key) {
      case 'flightaware_api_key':
        flightAwareKey.value = (pref.value as string) || ''
        original.value.flightAwareKey = flightAwareKey.value
        break
      case 'opensky_network_api_key':
        openSkyKey.value = (pref.value as string) || ''
        original.value.openSkyKey = openSkyKey.value
        break
      case 'flightaware_allow_over_limit':
        flightAwareAllowOverLimit.value = Boolean(pref.value)
        original.value.flightAwareAllowOverLimit = flightAwareAllowOverLimit.value
        break
    }
  }
}

onMounted(async () => {
  try {
    const prefs = await fetchPreferences()
    applyPreferences(prefs)
    status.value = 'idle'
  } catch {
    status.value = 'error'
    errorMessage.value = 'Failed to load preferences.'
  }
})

const isDirty = computed(() => {
  return (
    flightAwareKey.value !== original.value.flightAwareKey ||
    openSkyKey.value !== original.value.openSkyKey ||
    flightAwareAllowOverLimit.value !== original.value.flightAwareAllowOverLimit
  )
})

async function save() {
  status.value = 'saving'
  errorMessage.value = null

  const updates = [
    { key: 'flightaware_api_key' as const, value: flightAwareKey.value },
    { key: 'opensky_network_api_key' as const, value: openSkyKey.value },
    { key: 'flightaware_allow_over_limit' as const, value: flightAwareAllowOverLimit.value },
  ]

  try {
    await savePreferences(updates)
    original.value = {
      flightAwareKey: flightAwareKey.value,
      openSkyKey: openSkyKey.value,
      flightAwareAllowOverLimit: flightAwareAllowOverLimit.value,
    }
    // Keep the preferences store in sync.
    prefsStore.updatePreference('flightaware_api_key', flightAwareKey.value)
    prefsStore.updatePreference('opensky_network_api_key', openSkyKey.value)
    prefsStore.updatePreference('flightaware_allow_over_limit', flightAwareAllowOverLimit.value)
    status.value = 'success'
    setTimeout(() => {
      if (status.value === 'success') status.value = 'idle'
    }, 3000)
  } catch (err) {
    if (err instanceof HttpError) {
      const body = err.body as { error?: string } | null
      errorMessage.value = body?.error ?? 'Failed to save preferences.'
    } else {
      errorMessage.value = 'Failed to save preferences.'
    }
    status.value = 'error'
  }
}
</script>

<template>
  <section class="settings-section">
    <div class="settings-section__header">
      <h2 class="settings-section__title">Preferences</h2>
      <p class="settings-section__subtitle">Manage your application settings and API keys.</p>
    </div>

    <div v-if="status === 'loading'" class="settings-section__loading">
      <Loader2 class="animate-spin" :size="20" />
      <span>Loading preferences…</span>
    </div>

    <template v-else>
      <Alert v-if="status === 'error' && errorMessage" variant="destructive" class="mb-4">
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>
      <Alert v-if="status === 'success'" class="mb-4 alert--success">
        <AlertDescription>Preferences saved successfully.</AlertDescription>
      </Alert>

      <div class="settings-fields">
        <!-- FlightAware API Key -->
        <div class="settings-field">
          <label class="settings-field__label" for="pref-fa-key">FlightAware API key</label>
          <div class="settings-field__secret-row">
            <Input
              id="pref-fa-key"
              :type="showFlightAwareKey ? 'text' : 'password'"
              placeholder="Enter your FlightAware API key"
              autocomplete="off"
              v-model="flightAwareKey"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="settings-field__secret-toggle"
              :aria-label="showFlightAwareKey ? 'Hide API key' : 'Show API key'"
              @click="showFlightAwareKey = !showFlightAwareKey"
            >
              <EyeOff v-if="showFlightAwareKey" :size="16" />
              <Eye v-else :size="16" />
            </Button>
          </div>
        </div>

        <!-- OpenSky Network API Key -->
        <div class="settings-field">
          <label class="settings-field__label" for="pref-osk-key">OpenSky Network API key</label>
          <div class="settings-field__secret-row">
            <Input
              id="pref-osk-key"
              :type="showOpenSkyKey ? 'text' : 'password'"
              placeholder="Enter your OpenSky Network API key"
              autocomplete="off"
              v-model="openSkyKey"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="settings-field__secret-toggle"
              :aria-label="showOpenSkyKey ? 'Hide API key' : 'Show API key'"
              @click="showOpenSkyKey = !showOpenSkyKey"
            >
              <EyeOff v-if="showOpenSkyKey" :size="16" />
              <Eye v-else :size="16" />
            </Button>
          </div>
        </div>

        <!-- FlightAware monthly limit override -->
        <div class="settings-field">
          <label class="settings-field__checkbox-row" for="pref-fa-allow-over-limit">
            <input
              id="pref-fa-allow-over-limit"
              type="checkbox"
              v-model="flightAwareAllowOverLimit"
            />
            <span>Allow exceeding FlightAware's $5 monthly free limit</span>
          </label>
          <p class="settings-field__hint">
            Icarus automatically stops calling FlightAware once your monthly usage nears $4.9, to
            avoid unexpected charges. Enable this if you want calls to keep going past that point
            (you will be billed by FlightAware for any usage above the free tier).
          </p>
        </div>
      </div>

      <div class="settings-section__actions">
        <Button :disabled="!isDirty || status === 'saving'" @click="save">
          <Loader2 v-if="status === 'saving'" class="animate-spin mr-2" :size="16" />
          <Save v-else class="mr-2" :size="16" />
          Save preferences
        </Button>
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

  &__header {
    margin-bottom: 1.5rem;
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

  &__actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: flex-end;
  }
}

.settings-fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-fieldset {
  border: none;
  padding: 0;
  margin: 0;

  &__legend {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--foreground);
    margin-bottom: 0.75rem;
  }
}

.settings-fields-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  &__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--foreground);
  }

  &__secret-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  &__secret-toggle {
    flex-shrink: 0;
  }

  &__checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--foreground);
    cursor: pointer;
  }

  &__hint {
    font-size: 0.8rem;
    color: var(--muted-foreground);
    margin: 0;
  }
}

.alert--success {
  border-color: oklch(0.55 0.18 145);
  background: oklch(0.95 0.04 145);
  color: oklch(0.35 0.15 145);
}
</style>
