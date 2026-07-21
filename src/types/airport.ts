export interface AirportTracking {
  id: number
  iata_code: string | null
  icao_code: string | null
  name: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

export interface AirportSearchResult {
  IATACode: string
  ICAOCode: string
  airport: string
  city: string
  country: string
  countryCode: string
  county: string
  region: string
  type: string
}
