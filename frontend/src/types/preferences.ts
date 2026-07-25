export type PreferenceKey =
  | 'flightaware_api_key'
  | 'flightaware_allow_over_limit'
  | 'opensky_network_api_key'

export type PreferenceType = 'string' | 'number' | 'boolean' | 'json'

export interface Preference {
  id: number
  user_id: number
  key: PreferenceKey
  type: PreferenceType
  value: unknown
}

export interface PreferenceUpdate {
  key: PreferenceKey
  value: unknown
}

export interface FlightAwareUsage {
  total_calls: number
  total_pages: number
  total_cost: number
  total_discount_cost: number
  total_successful_calls: number
  total_failed_calls: number
}

export interface UsageResponse {
  flight_aware: FlightAwareUsage
}

export type ApiRequestsService = 'opensky' | 'adsb_lol' | 'adsbdb' | 'flightaware'

export interface ApiRequestsDay {
  date: string
  opensky: number
  adsb_lol: number
  adsbdb: number
  flightaware: number
}

/** Keyed by date (YYYY-MM-DD). */
export type ApiRequestsResponse = Record<string, ApiRequestsDay>
