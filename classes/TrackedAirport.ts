export class TrackedAirport {
    id: number
    iata_code: string | null
    icao_code: string | null
    name: string | null
    city: string | null
    latitude: number|null
    longitude: number|null

    constructor(
        id: number,
        iata_code: string | null,
        icao_code: string | null,
        name: string | null,
        city: string | null,
        latitude: number|null = null,
        longitude: number|null = null
    ) {
        this.id = id
        this.iata_code = iata_code
        this.icao_code = icao_code
        this.city = city
        this.name = name
        this.latitude = latitude
        this.longitude = longitude
    }

    static fromDB(row: any): TrackedAirport {
        return new this(
            row.id,
            row.iata_code,
            row.icao_code,
            row.name,
            row.city,
            row.latitude ? Number(row.latitude) : null,
            row.longitude ? Number(row.longitude) : null
        )
    }
}
