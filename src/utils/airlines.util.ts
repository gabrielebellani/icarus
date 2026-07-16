export interface Airline {
  iata: string
  icao: string
  lcc: string
  name: string
  logo: string
}

let airlinesData: Airline[] = []

  const mod = await import('../jsons/passenger.icao.min.json')
  airlinesData = mod.default as Airline[]

export function searchAirline(code: string | null): Airline | null {
  if(!code) return null
  const lowerCaseQuery = code.toLowerCase()

  return airlinesData.find(airline =>
      airline.iata.toLowerCase() === lowerCaseQuery
      || airline.icao.toLowerCase() === lowerCaseQuery
  ) ?? null
}

/**
 * Use searchAirline for better results
 * @deprecated
 * */
export function searchAirlineByIata(iata: string | null): Airline | null {
  if(!iata) return null
  const lowerCaseQuery = iata.toLowerCase()
  return airlinesData.find(airline => airline.iata.toLowerCase() === lowerCaseQuery) ?? null
}
