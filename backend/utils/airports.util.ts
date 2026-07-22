import airports from '../jsons/airports.json'
import {getCountryNameByCode} from './countries.util.ts'

export interface Airport {
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

export type AirportSearchResult = {
    IATACode: string
    ICAOCode: string
    airport: string
    city: string
    country: string
    countryCode: string
    county: string
    region: string
    type: 'airport'
}

const data: Airport[] = airports as Airport[]

export function searchAirports(query: string): AirportSearchResult[] {
    const lowerCaseQuery = query.toLowerCase()

    const results = data.filter(
        (airport) =>
            airport.iata.toLowerCase().includes(lowerCaseQuery) ||
            airport.icao.toLowerCase().includes(lowerCaseQuery) ||
            airport.city.toLowerCase().includes(lowerCaseQuery) ||
            airport.airport.toLowerCase().includes(lowerCaseQuery),
    )

    return results.slice(0, 20).map((result) => ({
        IATACode: result.iata,
        ICAOCode: result.icao,
        airport: result.airport,
        city: result.city,
        country: getCountryNameByCode(result.country_code),
        countryCode: result.country_code,
        county: result.county,
        region: result.region_name,
        type: 'airport' as const,
    }))
}

export function getAirportByCode(code: string | null): Airport | null {
    if (code === '' || code === null) return null
    const lowerCaseCode = code.toLowerCase()
    return data.find(
        (value) =>
            value.iata.toLowerCase() === lowerCaseCode ||
            value.icao.toLowerCase() === lowerCaseCode,
    ) ?? null
}
