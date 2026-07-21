export type FlightAirportSuggestion = {
  airlineCompany?: string
  airlineCompanyCode?: string
  airlineCompanyLogo?: string
  airlineIATA?: string
  airlineICAO?: string
  aircraftType?: string
  airport?: string
  city?: string
  country?: string
  countryCode?: string
  county?: string
  faFlightId?: string
  flightNumber?: string
  flightRoute?: {
    destinationAirportCity: string
    destinationAirportIATA: string
    destinationAirportICAO: string
    destinationAirportName: string
    originAirportCity: string
    originAirportIATA: string
    originAirportICAO: string
    originAirportName: string
  }
  IATACode?: string
  ICAOCode?: string
  region?: string
  scheduledLanding?: string
  scheduledTakeOff?: string
  type: 'airport' | 'flight' | 'general'
}
