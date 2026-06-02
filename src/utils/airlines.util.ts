export interface Airline {
  iata: string
  lcc: string
  name: string
  logo: string
}

let airlinesData: Airline[] = []

  const mod = await import('../jsons/passenger.min.json')
  airlinesData = mod.default as Airline[]

export function searchAirline(iata: string): Airline | null {
  const lowerCaseQuery = iata.toLowerCase()
  return airlinesData.find(airline => airline.iata.toLowerCase() === lowerCaseQuery) ?? null
}
