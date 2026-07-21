import { ref, computed } from 'vue'
import type { Flight } from '@/types/flight'
import { getTimetable } from '@/api/airport'
import { HttpError } from '@/api/client'

// How far ahead each "load more" page extends beyond the last known flight time
const LOAD_MORE_WINDOW_HRS = 6

export interface UseTimetableOptions {
  trackingId: number
  onAuthFailure?: () => void
}

export function useTimetable({ trackingId, onAuthFailure }: UseTimetableOptions) {
  const arrivals = ref<Flight[]>([])
  const departures = ref<Flight[]>([])

  // Per-direction loading state
  const arrivalsLoading = ref(false)
  const departuresLoading = ref(false)
  const arrivalsLoadingMore = ref(false)
  const departuresLoadingMore = ref(false)
  const arrivalsHasMore = ref(true)
  const departuresHasMore = ref(true)
  const arrivalsLoaded = ref(false)
  const departuresLoaded = ref(false)

  // Per-direction pagination cursors
  let arrivalsEndTime: Date | null = null
  let departuresEndTime: Date | null = null

  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)

  function buildInitialWindow() {
    const now = new Date()
    const start = new Date(now.getTime() - 1 * 60 * 60 * 1000) // now − 1 hr
    const end = new Date(now.getTime() + 6 * 60 * 60 * 1000)   // now + 6 hrs
    return { start: start.toISOString(), end: end.toISOString(), endDate: end }
  }

  /** Merge new flights into existing list, deduplicating by fa_flight_id. */
  function mergeFlights(existing: Flight[], incoming: Flight[]): Flight[] {
    const map = new Map<string, Flight>()
    for (const f of existing) map.set(f.fa_flight_id, f)
    for (const f of incoming) map.set(f.fa_flight_id, f)
    return Array.from(map.values())
  }

  function filterScheduled(flights: Flight[], mode: 'arrival' | 'departure'): Flight[] {
    return flights.filter(f =>
      mode === 'arrival' ? f.scheduled_in != null : f.scheduled_out != null,
    )
  }

  /** Fetch (or re-fetch) a single direction from scratch. */
  async function loadDirection(dir: 'in' | 'out') {
    if (dir === 'in') {
      arrivalsLoading.value = true
      arrivalsHasMore.value = true
      arrivalsEndTime = null
    } else {
      departuresLoading.value = true
      departuresHasMore.value = true
      departuresEndTime = null
    }
    error.value = null

    try {
      const { start, end, endDate } = buildInitialWindow()
      if (dir === 'in') arrivalsEndTime = endDate
      else departuresEndTime = endDate

      const data = await getTimetable(trackingId, { direction: dir, start, end })

      if (dir === 'in') {
        arrivals.value = filterScheduled(data.arrivals ?? [], 'arrival')
        arrivalsLoaded.value = true
      } else {
        departures.value = filterScheduled(data.departures ?? [], 'departure')
        departuresLoaded.value = true
      }
      lastUpdated.value = new Date()
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) {
        onAuthFailure?.()
      } else if (err instanceof HttpError && err.status === 400) {
        error.value = 'Flightaware API key is missing.'
      } else {
        error.value = 'Failed to load timetable. Please try again.'
      }
    } finally {
      if (dir === 'in') arrivalsLoading.value = false
      else departuresLoading.value = false
    }
  }

  /** Load a direction only if it has not been fetched yet. */
  async function ensureLoaded(dir: 'in' | 'out') {
    const loaded = dir === 'in' ? arrivalsLoaded.value : departuresLoaded.value
    if (!loaded) await loadDirection(dir)
  }

  /** Load the next time window for a direction. */
  async function loadMore(dir: 'in' | 'out') {
    const isLoadingMore = dir === 'in' ? arrivalsLoadingMore.value : departuresLoadingMore.value
    const isLoading    = dir === 'in' ? arrivalsLoading.value     : departuresLoading.value
    const hasMore      = dir === 'in' ? arrivalsHasMore.value     : departuresHasMore.value
    const endTime      = dir === 'in' ? arrivalsEndTime           : departuresEndTime

    if (isLoadingMore || isLoading || !hasMore || !endTime) return

    if (dir === 'in') arrivalsLoadingMore.value = true
    else departuresLoadingMore.value = true

    try {
      const start = endTime
      const end = new Date(start.getTime() + LOAD_MORE_WINDOW_HRS * 60 * 60 * 1000)
      const params = { start: start.toISOString(), end: end.toISOString() }

      // Pre-advance cursor so the next call covers the following window
      const nextEnd = new Date(end.getTime() + LOAD_MORE_WINDOW_HRS * 60 * 60 * 1000)
      if (dir === 'in') arrivalsEndTime = nextEnd
      else departuresEndTime = nextEnd

      const data = await getTimetable(trackingId, { direction: dir, ...params })
      const rawFlights = dir === 'in' ? (data.arrivals ?? []) : (data.departures ?? [])
      const mode = dir === 'in' ? 'arrival' : 'departure'
      const newFlights = filterScheduled(rawFlights, mode)

      if (newFlights.length) {
        if (dir === 'in') arrivals.value = mergeFlights(arrivals.value, newFlights)
        else departures.value = mergeFlights(departures.value, newFlights)
      } else {
        // No new flights — nothing more to load in this direction
        if (dir === 'in') arrivalsHasMore.value = false
        else departuresHasMore.value = false
      }
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) onAuthFailure?.()
      // Silently swallow non-auth errors to avoid disrupting the existing list
    } finally {
      if (dir === 'in') arrivalsLoadingMore.value = false
      else departuresLoadingMore.value = false
    }
  }

  /** Re-fetch all directions that have already been loaded. */
  async function refresh() {
    const dirs: ('in' | 'out')[] = []
    if (arrivalsLoaded.value) dirs.push('in')
    if (departuresLoaded.value) dirs.push('out')
    await Promise.all(dirs.map(d => loadDirection(d)))
  }

  const totalCount = computed(() => arrivals.value.length + departures.value.length)

  return {
    arrivals,
    departures,
    arrivalsLoading,
    departuresLoading,
    arrivalsLoadingMore,
    departuresLoadingMore,
    arrivalsHasMore,
    departuresHasMore,
    error,
    lastUpdated,
    totalCount,
    ensureLoaded,
    loadMore,
    refresh,
  }
}
