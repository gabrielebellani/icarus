export class TrackedFlight {
    id: string
    iata_code: string|null
    icao_code: string|null
    reference_date: string
    payload: object

    constructor(
        id: string,
        iata_code: string|null,
        icao_code: string|null,
        reference_date: string,
        payload: object
    ) {
        this.id = id
        this.iata_code = iata_code
        this.icao_code = icao_code
        this.reference_date = reference_date
        this.payload = payload
    }

    static fromDB(row: any): TrackedFlight {
        return new this(
            row.id,
            row.iata_code,
            row.icao_code,
            row.reference_date,
            JSON.parse(row.payload)
        )
    }
}
