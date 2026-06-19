import {type OpenSkyState} from "./OpenSkyState.ts";
import {type RadarCommercialFlight} from "./RadarCommercialFlight.ts";

export class RadarSingleAircraft {

    adsb_state: OpenSkyState
    route_info: RadarCommercialFlight | null

    constructor(adsb_state: OpenSkyState, route_info: RadarCommercialFlight | null) {
        this.adsb_state = adsb_state;
        this.route_info = route_info;
    }
}
