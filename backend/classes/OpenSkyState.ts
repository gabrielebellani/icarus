import {AircraftTypeEnum} from "../enums/AircraftTypeEnum.ts";
import {getDistanceFromCoordinates} from "../utils/radar.util.ts";
import type {Coordinates} from "../utils/Coordinates.ts";

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
    aircraft_type: AircraftTypeEnum
    private _distanceFromRadarCenter: number | null = null

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

        if (Object.values(AircraftTypeEnum).includes(aircraft_category)) {
            this.aircraft_type = aircraft_category as AircraftTypeEnum;
        } else {
            this.aircraft_type = AircraftTypeEnum.NoInfo;
        }
    }

    public static fromOpenSkyApi(data: any): OpenSkyState {
        return new OpenSkyState(
            (data[0] as string).trim(),
            (data[1] as string).trim(),
            data[2],
            data[3],
            data[4],
            data[5],
            data[6],
            data[7],
            data[8],
            data[9],
            data[10],
            data[11],
            data[12],
            data[13],
            data[16],
        )
    }


    get distanceFromRadarCenter(): number | null {
        return this._distanceFromRadarCenter;
    }

    set distanceFromRadarCenter(radarCenterCoordinates: Coordinates) {
        this._distanceFromRadarCenter = getDistanceFromCoordinates({ latitude: this.latitude!, longitude: this.longitude! }, radarCenterCoordinates);
    }
}
