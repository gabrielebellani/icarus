import { request } from './client'
import type { ApiRequestsResponse, Preference, PreferenceUpdate, UsageResponse } from '@/types/preferences'

export function fetchPreferences(): Promise<Preference[]> {
  return request<Preference[]>('/preferences')
}

export function savePreferences(updates: PreferenceUpdate[]): Promise<{ message: string }> {
  return request<{ message: string }>('/preferences', {
    method: 'POST',
    body: JSON.stringify(updates),
  })
}

export function changePassword(payload: {
  current_password: string
  new_password: string
}): Promise<{ message: string }> {
  return request<{ message: string }>('/user/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchUsage(): Promise<UsageResponse> {
  return request<UsageResponse>('/user/usage')
}

/** Day-by-day count of calls made to third-party data providers, keyed by date. */
export function fetchApiRequests(dateFrom: string, dateTo: string): Promise<ApiRequestsResponse> {
  const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
  return request<ApiRequestsResponse>(`/user/api_requests?${params.toString()}`)
}

export function deleteAccount(): Promise<{ message: string }> {
  return request<{ message: string }>('/user', {
    method: 'DELETE',
  })
}
