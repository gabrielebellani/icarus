export class TrackedAirport {
    id: string
    iata_code: string | null
    icao_code: string | null
    name: string | null
    city: string | null
    direction: string

    constructor(
        id: string,
        iata_code: string | null,
        icao_code: string | null,
        name: string | null,
        city: string | null,
        direction: string
    ) {
        this.id = id
        this.iata_code = iata_code
        this.icao_code = icao_code
        this.city = city
        this.name = name
        this.direction = direction
    }

    static fromDB(row: any): TrackedAirport {
        return new this(
            row.id,
            row.iata_code,
            row.icao_code,
            row.name,
            row.city,
            row.direction
        )
    }
}
