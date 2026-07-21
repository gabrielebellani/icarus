import { request } from './client'
import type { RadarTracking, RadarCreatePayload } from '@/types/radar'

/**
 * Fetch all currently active radar trackings.
 * GET /api/radar/tracking
 */
export function getRadarTrackings(): Promise<RadarTracking[]> {
  return request<RadarTracking[]>('/radar/tracking')
}

/**
 * Create a new radar tracking.
 * POST /api/radar/tracking
 */
export function createRadarTracking(payload: RadarCreatePayload): Promise<RadarTracking> {
  return request<RadarTracking>('/radar/tracking', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Delete a radar tracking by id.
 * DELETE /api/radar/tracking/:id
 */
export function deleteRadarTracking(id: string): Promise<void> {
  return request<void>(`/radar/tracking/${id}`, { method: 'DELETE' })
}
