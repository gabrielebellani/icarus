export interface AirportInfo {
  code: string
  code_icao: string
  code_iata: string
  code_lid: string | null
  timezone: string
  name: string
  city: string
  airport_info_url: string
}

export interface Flight {
  ident: string
  ident_icao: string
  ident_iata: string
  actual_runway_off: string | null
  actual_runway_on: string | null
  fa_flight_id: string
  operator: string
  operator_icao: string
  operator_iata: string
  flight_number: string
  registration: string
  atc_ident: string
  inbound_fa_flight_id: string | null
  codeshares: string[]
  codeshares_iata: string[]
  blocked: boolean
  diverted: boolean
  cancelled: boolean
  position_only: boolean
  origin: AirportInfo
  destination: AirportInfo
  departure_delay: number
  arrival_delay: number
  filed_ete: number
  foresight_predictions_available: boolean
  scheduled_out: string
  estimated_out: string
  actual_out: string | null
  scheduled_off: string
  estimated_off: string
  actual_off: string | null
  scheduled_on: string
  estimated_on: string
  actual_on: string | null
  scheduled_in: string
  estimated_in: string
  actual_in: string | null
  progress_percent: number
  status: string
  aircraft_type: string
  route_distance: number
  filed_airspeed: number
  filed_altitude: number | null
  route: string | null
  baggage_claim: string | null
  seats_cabin_business: number | null
  seats_cabin_coach: number | null
  seats_cabin_first: number | null
  gate_origin: string | null
  gate_destination: string | null
  terminal_origin: string | null
  terminal_destination: string | null
  aircraft_image_url: string | null
  type: string
}

export interface FlightSearchResponse {
  flights: Flight[]
  links: null | unknown
  num_pages: number
}

// ── Tracking response (restructured) ──────────────────────────────────────────

export interface TrackedRouteInfo {
  ident: string
  ident_icao: string
  ident_iata: string
  fa_flight_id: string
  atc_ident: string
  origin: AirportInfo
  destination: AirportInfo
  route_distance: number
  filed_ete: number
  route: string | null
  progress_percent: number
  status: string
  diverted: boolean
  cancelled: boolean
  blocked: boolean
  position_only: boolean
  codeshares: string[]
  codeshares_iata: string[]
  inbound_fa_flight_id: string | null
  foresight_predictions_available: boolean
}

export interface TrackedAircraftInfo {
  type: string
  registration: string
  icao24: string | null
  image_url: string | null
}

export interface TrackedAirlineInfo {
  operator: string
  operator_icao: string
  operator_iata: string
  name: string | null
  logo: string | null
}

export interface TrackedScheduleInfo {
  scheduled_out: string
  estimated_out: string
  actual_out: string | null
  scheduled_off: string
  estimated_off: string
  actual_off: string | null
  scheduled_on: string
  estimated_on: string
  actual_on: string | null
  scheduled_in: string
  estimated_in: string
  actual_in: string | null
  departure_delay: number
  arrival_delay: number
  gate_origin: string | null
  gate_destination: string | null
  terminal_origin: string | null
  terminal_destination: string | null
  actual_runway_off: string | null
  actual_runway_on: string | null
  baggage_claim: string | null
  filed_airspeed: number
  filed_altitude: number | null
  seats_cabin_business: number | null
  seats_cabin_coach: number | null
  seats_cabin_first: number | null
}

export interface TrackedAdsbState {
  on_ground: boolean | null
  velocity: number | null
  altitude: number | null
  updated_at: number
}

export interface TrackedFlightPayload {
  route: TrackedRouteInfo
  aircraft: TrackedAircraftInfo
  airline: TrackedAirlineInfo
  schedule: TrackedScheduleInfo
  adsb_state: TrackedAdsbState | null
}

export type FlightPhase = 'ground' | 'airborne' | 'completed'
export type FlightDataSource = 'flightaware' | 'adsb.lol' | 'opensky' | null

/** Tracking record returned by GET /api/flight/tracking */
export interface TrackingRecord {
  id: number
  iata_code: string | null
  icao_code: string | null
  reference_date: string
  phase: FlightPhase
  data_source: FlightDataSource
  degraded_mode: boolean
  payload: TrackedFlightPayload | null
}

