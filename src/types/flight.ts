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
  type: string
}

export interface FlightSearchResponse {
  flights: Flight[]
  links: null | unknown
  num_pages: number
}

/** Tracking record returned by GET /api/flight/tracking */
export interface TrackingRecord {
  id: number
  user_id: number
  iata_code: string | null
  icao_code: string | null
  reference_date: string
  payload: Flight | null
}
