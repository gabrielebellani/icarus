import {type OpenSkyState} from "./OpenSkyState.ts";
import {type RadarCommercialFlight} from "./RadarCommercialFlight.ts";
import type {AircraftInfo} from "./AircraftInfo.ts";

export class RadarSingleAircraft {

    adsb_state: OpenSkyState
    route_info: RadarCommercialFlight | null
    aircraft_info: AircraftInfo | null

    constructor(adsb_state: OpenSkyState, route_info: RadarCommercialFlight | null, aircraft_info: AircraftInfo | null) {
        this.adsb_state = adsb_state;
        this.route_info = route_info;
        this.aircraft_info = aircraft_info;
    }
}
