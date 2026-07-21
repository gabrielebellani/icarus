import { request } from './client'
import type { AirportTracking, AirportSearchResult } from '@/types/airport'
import type { TimetableResponse, TimetableParams } from '@/types/timetable'

/**
 * Search for airports by name, city, or code.
 * GET /api/airport?query=...
 */
export function searchAirports(query: string): Promise<AirportSearchResult[]> {
  const params = new URLSearchParams({ query })
  return request<AirportSearchResult[]>(`/airport?${params.toString()}`)
}

/**
 * Get all currently tracked airports.
 * GET /api/airport/tracking
 */
export function getAirportTrackings(): Promise<AirportTracking[]> {
  return request<AirportTracking[]>('/airport/tracking')
}

/**
 * Start tracking an airport.
 * POST /api/airport/tracking
 */
export function addAirportTracking(payload: {
  iata_code: string
  icao_code: null
}): Promise<AirportTracking> {
  return request<AirportTracking>('/airport/tracking', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Remove a tracked airport.
 * DELETE /api/airport/tracking/{tracking_id}
 */
export function deleteAirportTracking(trackingId: number): Promise<void> {
  return request<void>(`/airport/tracking/${trackingId}`, { method: 'DELETE' })
}

/**
 * Fetch the arrivals/departures timetable for a tracked airport.
 * GET /api/airport/tracking/{tracking_id}/timetable
 *
 * direction: 'in' for arrivals, 'out' for departures.
 * Defaults: start = now - 30 min, end = now + 6 hrs.
 */
export function getTimetable(
  trackingId: number,
  params?: TimetableParams,
): Promise<TimetableResponse> {
  const query = new URLSearchParams()
  if (params?.direction) query.set('direction', params.direction)
  if (params?.start) query.set('start', params.start)
  if (params?.end) query.set('end', params.end)
  const qs = query.size ? `?${query.toString()}` : ''
  return request<TimetableResponse>(`/airport/tracking/${trackingId}/timetable${qs}`)
}
