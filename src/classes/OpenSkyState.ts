export class OpenSkyState {
    icao24: string
    callsign: string | null
    origin_country: string
    time_position: number | null
    last_contact: number
    longitude: number | null
    latitude: number | null
    baro_altitude: number | null
    on_ground: boolean
    velocity: number | null
    true_track: number | null
    vertical_rate: number | null
    sensors: number[] | null
    geo_altitude: number | null
    aircraft_category: number

    constructor(
        icao24: string,
        callsign: string | null,
        origin_country: string,
        time_position: number | null,
        last_contact: number,
        longitude: number | null,
        latitude: number | null,
        baro_altitude: number | null,
        on_ground: boolean,
        velocity: number | null,
        true_track: number | null,
        vertical_rate: number | null,
        sensors: number[] | null,
        geo_altitude: number | null,
        aircraft_category: number,
    ) {
        this.icao24 = icao24
        this.callsign = callsign
        this.origin_country = origin_country
        this.time_position = time_position
        this.last_contact = last_contact
        this.longitude = longitude
        this.latitude = latitude
        this.baro_altitude = baro_altitude
        this.on_ground = on_ground
        this.velocity = velocity
        this.true_track = true_track
        this.vertical_rate = vertical_rate
        this.sensors = sensors
        this.geo_altitude = geo_altitude
        this.aircraft_category = aircraft_category
    }

    public static fromOpenSkyApi(data: any): OpenSkyState {
        return new OpenSkyState(
            data.icao24,
            data.callsign,
            data.origin_country,
            data.time_position,
            data.last_contact,
            data.longitude,
            data.latitude,
            data.baro_altitude,
            data.on_ground,
            data.velocity,
            data.true_track,
            data.vertical_rate,
            data.sensors,
            data.geo_altitude,
            data.aircraft_category,
        )
    }
}
