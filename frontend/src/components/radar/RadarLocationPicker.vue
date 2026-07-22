<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGeocoder, type GeocodeResult } from '@/composables/useGeocoder'
import type { RadarCoordinates } from '@/types/radar'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Props {
  initialZoom?: number
  initialCenter?: [number, number]
}

const props = withDefaults(defineProps<Props>(), {
  initialZoom: 2,
  initialCenter: () => [20, 0],
})

// v-model for selected coordinates
const selectedCoordinates = defineModel<RadarCoordinates | null>()

// DOM ref for the map container
const mapContainer = ref<HTMLDivElement>()
let map: L.Map | null = null
let marker: L.Marker | null = null

// Search UI state
const searchQuery = ref('')
const searchResults = ref<GeocodeResult[]>([])
const showResults = ref(false)

// Geocoding composable
const { debouncedSearch, isSearching, error: geocodingError } = useGeocoder()

// Current coordinates display (from marker, updated in real time)
const displayCoordinates = computed(() => {
  if (!selectedCoordinates.value) return null
  const { latitude, longitude } = selectedCoordinates.value
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
})

/**
 * Initialize or update the marker at the given coordinates.
 * If marker doesn't exist, create it. Otherwise, move it.
 * Emit the new coordinates via v-model.
 */
function setMarker(latlng: L.LatLng) {
  if (!map) return

  const newCoords: RadarCoordinates = {
    latitude: latlng.lat,
    longitude: latlng.lng,
  }

  if (!marker) {
    // First time: create the marker with a custom divIcon.
    const icon = L.divIcon({
      html: `
        <svg width="32" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;">
          <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z"/>
          <circle cx="12" cy="10" r="2.5" fill="currentColor"/>
        </svg>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40],
      className: 'radar-location-picker__marker',
    })

    marker = L.marker(latlng, { icon, draggable: true })
    marker.on('dragend', (e: any) => {
      setMarker(e.target.getLatLng())
    })
    marker.addTo(map)
  } else {
    marker.setLatLng(latlng)
  }

  // Update the model with new coordinates.
  selectedCoordinates.value = newCoords
}

/**
 * Handle selecting a result from the search dropdown.
 * Center the map on the result and place the marker there.
 */
async function selectResult(result: GeocodeResult) {
  if (!map) return

  const latlng = L.latLng(result.latitude, result.longitude)
  map.setView(latlng, 13)
  setMarker(latlng)

  // Clear search UI.
  searchQuery.value = ''
  searchResults.value = []
  showResults.value = false
}

/**
 * Handle search input change.
 * The actual geocoding call is debounced via `debouncedSearch` so that
 * only the last keystroke in a burst of typing triggers a request.
 */
async function handleSearchInput(query: string) {
  if (!query.trim()) {
    searchResults.value = []
    showResults.value = false
    return
  }

  showResults.value = true
  await debouncedSearch(query, (results) => {
    searchResults.value = results
  })
}

/**
 * Focus the map by clicking it. Also dismiss any open search results.
 */
function handleMapClick(e: L.LeafletMouseEvent) {
  showResults.value = false
  setMarker(e.latlng)
}

/**
 * Initialize the map on mount.
 */
onMounted(() => {
  if (!mapContainer.value) return

  // Create the map.
  map = L.map(mapContainer.value).setView(props.initialCenter, props.initialZoom)

  // Add tile layer (OpenStreetMap).
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  // Wiring: always allow click to place marker.
  map.on('click', handleMapClick)

  // If we have initial coordinates, center and place marker there.
  if (selectedCoordinates.value) {
    const { latitude, longitude } = selectedCoordinates.value
    const latlng = L.latLng(latitude, longitude)
    map.setView(latlng, 13)
    setMarker(latlng)
  }
})

/**
 * Clean up the map on unmount to avoid memory leaks.
 */
onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
    marker = null
  }
})

/**
 * Dismiss search results when clicking outside the dropdown.
 */
function handleInputBlur() {
  // Delay to allow result click to register first.
  setTimeout(() => {
    showResults.value = false
  }, 200)
}

/**
 * Watch the search query ref and debounce the search call.
 */
watch(searchQuery, async (newQuery) => {
  await handleSearchInput(newQuery)
})
</script>

<template>
  <div class="radar-location-picker">
    <!-- Search input section -->
    <div class="radar-location-picker__search-section">
      <div class="radar-location-picker__search-input-wrapper">
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="Search for a place or address…"
          class="radar-location-picker__search-input"
          @blur="handleInputBlur"
          @keydown.escape="showResults = false"
        />
        <div v-if="isSearching" class="radar-location-picker__search-spinner">
          <svg
            class="animate-spin"
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>

      <!-- Search results dropdown -->
      <div v-if="showResults && searchResults.length > 0" class="radar-location-picker__results-dropdown">
        <button
          v-for="(result, idx) in searchResults"
          :key="idx"
          type="button"
          class="radar-location-picker__result-item"
          @click="selectResult(result)"
        >
          <span class="radar-location-picker__result-label">{{ result.label }}</span>
          <span class="radar-location-picker__result-coords">
            {{ result.latitude.toFixed(4) }}, {{ result.longitude.toFixed(4) }}
          </span>
        </button>
      </div>

      <!-- No results message -->
      <div v-else-if="showResults && searchResults.length === 0 && !isSearching" class="radar-location-picker__no-results">
        No results found
      </div>
    </div>

    <!-- Error alert (shown only on real geocoding errors, not on zero results) -->
    <Alert v-if="geocodingError" variant="destructive" class="radar-location-picker__error-alert mt-2">
      <AlertDescription>
        <span class="text-xs">{{ geocodingError }}</span>
        <span class="text-xs block mt-1">Try clicking or dragging on the map to set the location manually.</span>
      </AlertDescription>
    </Alert>

    <!-- Map container -->
    <div ref="mapContainer" class="radar-location-picker__map" />

    <!-- Coordinates and helper text -->
    <div class="radar-location-picker__footer">
      <p class="radar-location-picker__helper-text">
        Click the map or drag the pin to set the exact location
      </p>
      <p v-if="displayCoordinates" class="radar-location-picker__coordinates">
        {{ displayCoordinates }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.radar-location-picker {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &__search-section {
    position: relative;
  }

  &__search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;

    :deep(.rounded-md) {
      padding-right: 2.5rem;
    }
  }

  &__search-spinner {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: oklch(0.52 0.01 270);
  }

  &__results-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 10;
    margin-top: 0.25rem;
    background: oklch(0.15 0.025 270);
    border: 1px solid oklch(0.2 0.04 270);
    border-radius: 0.375rem;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    max-height: 200px;
    overflow-y: auto;
  }

  &__result-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s;
    border-bottom: 1px solid oklch(0.18 0.025 270);

    &:hover {
      background: oklch(0.2 0.03 270);
    }

    &:last-child {
      border-bottom: none;
    }
  }

  &__result-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: oklch(0.97 0 0);
    line-height: 1.3;
  }

  &__result-coords {
    font-size: 0.75rem;
    color: oklch(0.52 0.01 270);
    font-family: monospace;
  }

  &__no-results {
    padding: 0.75rem;
    text-align: center;
    color: oklch(0.52 0.01 270);
    font-size: 0.875rem;
    background: oklch(0.15 0.025 270);
    border: 1px solid oklch(0.2 0.04 270);
    border-radius: 0.375rem;
    margin-top: 0.25rem;
  }

  &__error-alert {
    background: oklch(0.2 0.08 0);
    border-color: oklch(0.4 0.12 0);
  }

  &__map {
    min-height: 260px;
    border: 1px solid oklch(0.2 0.04 270);
    border-radius: 0.5rem;
    background: oklch(0.1 0.02 270);
    overflow: hidden;

    :deep(.leaflet-container) {
      font-family: inherit;
    }

    :deep(.leaflet-control-attribution) {
      background: rgba(10, 10, 20, 0.7);
      color: oklch(0.52 0.01 270);
      font-size: 0.75rem;

      a {
        color: oklch(0.7 0.05 270);
      }
    }
  }

  &__footer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

  &__helper-text {
    font-size: 0.75rem;
    color: oklch(0.52 0.01 270);
    margin: 0;
  }

  &__coordinates {
    font-size: 0.8125rem;
    color: oklch(0.7 0.02 270);
    font-family: monospace;
    margin: 0;
  }

  &__marker {
    // Custom marker icon styling
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
}

// Match Leaflet's default dark overlay and control styling
:deep(.leaflet-pane) {
  z-index: auto;
}

:deep(.leaflet-control) {
  border-radius: 0.375rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
