import { request } from './client'
import type { FlightSearchResponse, TrackingRecord } from '@/types/flight'

/**
 * Search for flights by identifier and date.
 * GET /api/flight?identifier=...&date=...
 */
export function searchFlight(identifier: string, date: string): Promise<FlightSearchResponse> {
  const params = new URLSearchParams({ identifier, date })
  return request<FlightSearchResponse>(`/flight?${params.toString()}`)
}

/**
 * Get the currently tracked flight, or null if none is active.
 * GET /api/flight/tracking
 */
export function getTracking(): Promise<TrackingRecord | null> {
  return request<TrackingRecord | null>('/flight/tracking')
}

/**
 * Start tracking a flight.
 * POST /api/flight/tracking
 */
export function startTracking(payload: {
  identifier: string
  date: string
}): Promise<TrackingRecord> {
  return request<TrackingRecord>('/flight/tracking', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Terminate tracking the current flight.
 * DELETE /api/flight/tracking
 */
export function stopTracking(): Promise<void> {
  return request<void>('/flight/tracking', { method: 'DELETE' })
}
