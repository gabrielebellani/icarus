import type { Flight } from './flight'

export interface TimetableResponse {
  arrivals?: Flight[]
  departures?: Flight[]
}

export interface TimetableParams {
  direction?: 'in' | 'out'
  start?: string
  end?: string
}
