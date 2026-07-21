/**
 * Radar tracking system types.
 * Represents real-time aircraft detection around a geographic point via WebSocket.
 */

/**
 * Geographic coordinates for radar center.
 */
export interface RadarCoordinates {
  latitude: number
  longitude: number
}

/**
 * Radar tracking record stored on the backend.
 * Represents a single active or expired radar tracking zone.
 */
export interface RadarTracking {
  id: string
  coordinates: RadarCoordinates
  radius: number
  /**
   * ISO 8601 date. Null means the radar never expires automatically.
   */
  expiration: string | null
  /**
   * Seconds between each radar update from the server.
   * Range: 30–300 seconds. Default: 30.
   */
  refresh_interval: number
  /**
   * Minutes after which the radar stops updating if no refresh is triggered by the client.
   * Null means no inactivity timeout.
   */
  inactivity_timeout: number | null
  name: string
  created_at: string
  /**
   * ISO 8601 date when the radar timed out (stopped updating due to inactivity).
   * Null if not timed out.
   */
  timeout_at: string | null
  /**
   * ISO 8601 date when the radar expired (reached its expiration date).
   * Null if not expired.
   */
  expired_at: string | null
}

/**
 * Payload for creating a new radar tracking.
 */
export interface RadarCreatePayload {
  coordinates: RadarCoordinates
  radius: number
  /**
   * ISO 8601 date, or null for no expiration.
   */
  expiration: string | null
  /**
   * Seconds between updates. Default 30, min 30, max 300.
   */
  refresh_interval: number
  /**
   * Minutes until inactivity timeout, or null to disable.
   * Values: 15, 30, 60, 120, 360, 720.
   */
  inactivity_timeout: number | null
  name: string | null
}

/**
 * ADS-B state from a tracking radar.
 * Mirrors the OpenSky Network ADS-B state object structure.
 */
export interface RadarAdsbState {
  icao24: string
  callsign: string
  origin_country: string
  time_position: number
  last_contact: number
  longitude: number
  latitude: number
  baro_altitude: number
  on_ground: boolean
  velocity: number
  true_track: number
  vertical_rate: number
  sensors: unknown
  geo_altitude: number
  aircraft_type: number
  /**
   * Distance from radar center in meters.
   */
  _distanceFromRadarCenter: number
}

/**
 * Airport information for route origin/destination.
 */
export interface RadarAirportInfo {
  iata: string
  icao: string
  time: string
  city_code: string
  country_code: string
  airport: string
  latitude: string
  longitude: string
  elevation_ft: string
  region_name: string
  city: string
  county: string
  state: string
  type: string
  continent: string
  iso_region: string
  scheduled_service: string
  wikipedia_link: string
  home: string
  woeid: string
  phone: string
  email: string
  runway_length: string
  flightradar24_url: string
  radarbox_url: string
  flightaware_url: string
}

/**
 * Airline information for a route.
 */
export interface RadarAirlineInfo {
  iata: string
  icao: string
  lcc: string
  name: string
  logo: string
}

/**
 * Complete route information including origin, destination, and airline.
 */
export interface RadarRouteInfoData {
  origin: RadarAirportInfo | null
  destination: RadarAirportInfo | null
  airline: RadarAirlineInfo | null
}

/**
 * Route information wrapper.
 */
export interface RadarRouteInfo {
  callsign: string
  status: 'matched' | 'unknown' | string
  routeInfo: RadarRouteInfoData
}

/**
 * Aircraft information including type, registration, and photo.
 */
export interface RadarAircraftInfo {
  icao24: string
  type: string
  icaoType: string
  registration: string
  manufacturer: string
  cover_url: string
}

/**
 * Complete aircraft record from radar WebSocket update.
 * Combines ADS-B position data, route information, and static aircraft metadata.
 */
export interface RadarAircraft {
  adsb_state: RadarAdsbState
  route_info: RadarRouteInfo
  aircraft_info: RadarAircraftInfo | null
}

/**
 * WebSocket message payload from radar tracking endpoint.
 * Sent periodically with the current aircraft in the radar zone.
 */
export interface RadarUpdateMessage {
  aircraft: RadarAircraft[]
}
