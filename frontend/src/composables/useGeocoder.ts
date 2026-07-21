import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { geocoders } from 'leaflet-control-geocoder'
import type L from 'leaflet'

/**
 * GeocodingResult from leaflet-control-geocoder.
 * Mirrors the shape we need from the API.
 */
interface GeocodingResult {
  name: string
  center: L.LatLng
  bbox: L.LatLngBounds
  icon?: string
  html?: string
  properties?: any
}

export interface GeocodeResult {
  label: string
  latitude: number
  longitude: number
}

/**
 * Composable for geocoding addresses via Nominatim (OpenStreetMap).
 * Handles Promise wrapping, timeout, and error management.
 * Uses client-side debouncing for search input events.
 */
export function useGeocoder() {
  const isSearching = ref(false)
  const error = ref<string | null>(null)

  // Nominatim instance (singleton per composable instance)
  const geocoder = geocoders.nominatim()

  /**
   * Perform a geocoding search.
   * Returns a promise that resolves to results or rejects on timeout/error.
   * @param query - the search string
   * @param timeoutMs - timeout in milliseconds (default 6000)
   */
  async function search(query: string, timeoutMs = 6000): Promise<GeocodeResult[]> {
    if (!query.trim()) {
      return []
    }

    error.value = null
    isSearching.value = true

    try {
      // Race the geocoding request against a timeout promise.
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Geocoding request timed out after ' + timeoutMs + 'ms'))
        }, timeoutMs)
      })

      const results = await Promise.race([geocoder.geocode(query), timeoutPromise])

      // Map GeocodingResult to our simpler GeocodeResult type.
      return results.map((r: GeocodingResult) => ({
        label: r.name,
        latitude: r.center.lat,
        longitude: r.center.lng,
      }))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An error occurred during geocoding'
      error.value = message
      console.error('[useGeocoder] Search failed:', message)
      return []
    } finally {
      isSearching.value = false
    }
  }

  /**
   * Debounced version of search, suitable for wiring to input @input events.
   * Call this with a ref to a query string; it internally debounces the search
   * and updates reactive state (isSearching, error, results).
   */
  const debouncedSearch = useDebounceFn(
    async (query: string, callback: (results: GeocodeResult[]) => void) => {
      const results = await search(query)
      callback(results)
    },
    400, // 400ms debounce delay
  )

  return {
    search,
    debouncedSearch,
    isSearching: computed(() => isSearching.value),
    error: computed(() => error.value),
  }
}
