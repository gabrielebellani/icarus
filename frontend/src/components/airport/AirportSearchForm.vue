<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { searchAirports, addAirportTracking } from '@/api/airport'
import { HttpError } from '@/api/client'
import type { AirportTracking, AirportSearchResult } from '@/types/airport'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const emit = defineEmits<{
  tracked: [record: AirportTracking]
  cancel: []
}>()

// ── Search state ──────────────────────────────────────────────────────────────
const query = ref('')
const results = ref<AirportSearchResult[]>([])
const selectedAirport = ref<AirportSearchResult | null>(null)
const isSearching = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const showDropdown = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

// ── Debounced airport search ───────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (val) => {
  if (selectedAirport.value) return // don't re-search when query was set by selection
  errorMessage.value = null
  if (searchTimer) clearTimeout(searchTimer)
  if (!val.trim() || val.length < 2) {
    results.value = []
    showDropdown.value = false
    return
  }
  searchTimer = setTimeout(async () => {
    isSearching.value = true
    try {
      results.value = await searchAirports(val.trim())
      showDropdown.value = results.value.length > 0
    } catch {
      results.value = []
      showDropdown.value = false
    } finally {
      isSearching.value = false
    }
  }, 300)
})

function selectAirport(airport: AirportSearchResult) {
  selectedAirport.value = airport
  query.value = `${airport.airport} (${airport.IATACode})`
  showDropdown.value = false
}

function clearSelection() {
  selectedAirport.value = null
  query.value = ''
  results.value = []
  showDropdown.value = false
  errorMessage.value = null
  inputEl.value?.focus()
}

function onInputFocus() {
  if (!selectedAirport.value && results.value.length > 0) {
    showDropdown.value = true
  }
}

function onInputBlur() {
  // Delay so click on dropdown items registers before hiding
  setTimeout(() => {
    showDropdown.value = false
  }, 150)
}

// ── Submit ────────────────────────────────────────────────────────────────────
const canSubmit = computed(() => selectedAirport.value !== null && !isSubmitting.value)

async function onSubmit() {
  if (!selectedAirport.value) return
  errorMessage.value = null
  isSubmitting.value = true
  try {
    const record = await addAirportTracking({
      iata_code: selectedAirport.value.IATACode,
      icao_code: null,
    })
    emit('tracked', record)
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 409) {
        errorMessage.value = 'This airport is already being tracked with that direction.'
      } else if (err.status === 404) {
        errorMessage.value = 'Airport not found. Try a different code or name.'
      } else if (err.status === 400) {
        errorMessage.value = 'Flightaware API key is missing.'
      } else {
        errorMessage.value = 'Failed to add tracking. Please try again.'
      }
    } else {
      errorMessage.value = 'An unexpected error occurred.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="airport-search-form" @keydown.escape="emit('cancel')">
    <div class="airport-search-form__header">
      <h2 class="airport-search-form__title">Track an airport</h2>
      <button class="airport-search-form__close" aria-label="Cancel" @click="emit('cancel')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Airport search input -->
    <div class="airport-search-form__field">
      <label class="airport-search-form__label" for="airport-search">Airport</label>
      <div class="airport-search-form__input-wrap">
        <div class="airport-search-form__search-icon" aria-hidden="true">
          <svg v-if="!isSearching" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <svg v-else class="airport-search-form__spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
        <input
          id="airport-search"
          ref="inputEl"
          v-model="query"
          class="airport-search-form__input"
          :class="{ 'airport-search-form__input--selected': selectedAirport }"
          type="text"
          placeholder="Search by name, city, or IATA code…"
          autocomplete="off"
          :readonly="!!selectedAirport"
          @focus="onInputFocus"
          @blur="onInputBlur"
        />
        <button
          v-if="selectedAirport"
          class="airport-search-form__clear"
          aria-label="Clear selection"
          @click="clearSelection"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Dropdown results -->
        <Transition name="dropdown">
          <ul
            v-if="showDropdown && results.length"
            class="airport-search-form__dropdown"
            role="listbox"
            aria-label="Airport results"
          >
            <li
              v-for="result in results.slice(0, 8)"
              :key="result.IATACode + result.ICAOCode"
              class="airport-search-form__result"
              role="option"
              @mousedown.prevent="selectAirport(result)"
            >
              <span class="airport-search-form__result-code">{{ result.IATACode || result.ICAOCode }}</span>
              <div class="airport-search-form__result-info">
                <span class="airport-search-form__result-name">{{ result.airport }}</span>
                <span class="airport-search-form__result-location">{{ result.city }}, {{ result.country }}</span>
              </div>
              <span class="airport-search-form__result-type">{{ result.type }}</span>
            </li>
          </ul>
        </Transition>
      </div>

      <!-- Selected airport preview -->
      <Transition name="fade">
        <div v-if="selectedAirport" class="airport-search-form__selected-preview">
          <span class="airport-search-form__preview-code">{{ selectedAirport.IATACode }}</span>
          <div class="airport-search-form__preview-info">
            <span class="airport-search-form__preview-name">{{ selectedAirport.airport }}</span>
            <span class="airport-search-form__preview-location">{{ selectedAirport.city }}, {{ selectedAirport.country }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Error -->
    <Alert v-if="errorMessage" variant="destructive" class="airport-search-form__alert">
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <!-- Actions -->
    <div class="airport-search-form__actions">
      <Button variant="outline" size="sm" @click="emit('cancel')">Cancel</Button>
      <Button size="sm" :disabled="!canSubmit" @click="onSubmit">
        {{ isSubmitting ? 'Adding…' : 'Track airport' }}
      </Button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.airport-search-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--foreground);
    margin: 0;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: var(--radius);
    border: none;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--accent);
      color: var(--foreground);
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--muted-foreground);
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  &__input-wrap {
    position: relative;
  }

  &__search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted-foreground);
    pointer-events: none;
    display: flex;
    align-items: center;
  }

  &__spinner {
    animation: spin 1s linear infinite;
  }

  &__input {
    width: 100%;
    height: 2.25rem;
    padding: 0 2.25rem 0 2.25rem;
    font-size: 0.875rem;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--foreground);
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;

    &::placeholder {
      color: var(--muted-foreground);
    }

    &:focus {
      border-color: var(--ring);
    }

    &--selected {
      background: var(--accent);
      border-color: transparent;
      cursor: default;
      color: var(--foreground);
      font-weight: 500;
    }
  }

  &__clear {
    position: absolute;
    right: 0.625rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--muted);
      color: var(--foreground);
    }
  }

  // ── Dropdown ───────────────────────────────────────────────────────────────
  &__dropdown {
    position: absolute;
    top: calc(100% + 0.375rem);
    left: 0;
    right: 0;
    z-index: 50;
    background: var(--popover);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 4px 20px oklch(0 0 0 / 0.12);
    list-style: none;
    margin: 0;
    padding: 0.25rem;
    overflow: hidden;
  }

  &__result {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.625rem;
    border-radius: calc(var(--radius) - 2px);
    cursor: pointer;
    transition: background 0.1s;

    &:hover {
      background: var(--accent);
    }
  }

  &__result-code {
    font-size: 0.8125rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: var(--foreground);
    min-width: 2.5rem;
    flex-shrink: 0;
  }

  &__result-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    flex: 1;
    min-width: 0;
  }

  &__result-name {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__result-location {
    font-size: 0.75rem;
    color: var(--muted-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__result-type {
    font-size: 0.6875rem;
    color: var(--muted-foreground);
    text-transform: capitalize;
    flex-shrink: 0;
  }

  // ── Selected preview ───────────────────────────────────────────────────────
  &__selected-preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: oklch(0.1 0.02 270 / 0.06);
    border: 1px solid oklch(0.58 0.2 265 / 0.25);
    border-radius: var(--radius);
  }

  &__preview-code {
    font-size: 1.25rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
    color: oklch(0.72 0.14 265);
    flex-shrink: 0;
  }

  &__preview-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  &__preview-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--foreground);
  }

  &__preview-location {
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }

  // ── Direction ──────────────────────────────────────────────────────────────
  &__direction-group {
    display: flex;
    gap: 0.5rem;
  }

  &__dir-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.625rem 0.5rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;

    &:hover {
      border-color: var(--ring);
      color: var(--foreground);
    }

    &--active {
      border-color: oklch(0.58 0.2 265);
      background: oklch(0.58 0.2 265 / 0.12);
      color: oklch(0.78 0.16 265);
    }
  }

  &__dir-short {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-variant-numeric: tabular-nums;
  }

  &__dir-label {
    font-size: 0.75rem;
    font-weight: 500;
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  &__alert {
    padding: 0.625rem 0.875rem;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.625rem;
  }
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
