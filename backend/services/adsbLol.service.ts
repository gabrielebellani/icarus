import {RadarCommercialFlight} from "../classes/RadarCommercialFlight.ts";
import {ThirdPartyHttpService} from "./thirdPartyHttp.service.ts";
import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";

export type AdsbLolState = { on_ground: boolean | null, velocity: number | null, altitude: number | null };

const KNOTS_TO_MS = 0.514444;
const FEET_TO_METERS = 0.3048;

function knotsToMs(knots: number | undefined): number | null {
    return typeof knots === 'number' ? knots * KNOTS_TO_MS : null;
}

export class AdsbLolService extends ThirdPartyHttpService {
    override host = 'https://api.adsb.lol/api/'

    constructor(userId: number) {
        super(ThirdPartyServiceEnum.ADSB_LOL, userId)
    }

    public async fetchFlightsByCallsignAndPosition(flights: {callsign: string, lat: string, lng: string}[]) {
        const apiResponse: Response = <Response>await this.fetch(
            '0/routeset',
            {
                "Content-Type": "application/json",
                "Referer": "https://api.adsb.lol/docs"
            },
            'POST',
            JSON.stringify({planes: flights}),
            true
        )

        if (!apiResponse.ok) {
            throw new Error(`HTTP error ${apiResponse.status}`)
        }

        const body = await apiResponse.json()

        if (!Array.isArray(body) || body.length === 0) {
            throw new Error('Not found')
        }

        const results: {callsign: string, route: RadarCommercialFlight|null, plausible: boolean}[] = [];
        for (const requestedFlight of flights){
            const flight = body.find((f: any) => f.callsign === requestedFlight.callsign)
            results.push({
                callsign: requestedFlight.callsign,
                route: flight ? RadarCommercialFlight.buildFromAdsbLolResult(requestedFlight.callsign, flight) : null,
                plausible: flight ? flight.plausible : false
            })
        }

        return results
    }

    /** Live state by registration: more reliable than icao24 for tracking a specific flight. */
    public fetchStateByRegistration(registration: string): Promise<AdsbLolState | null> {
        return this.fetchState(`v2/registration/${registration.toUpperCase()}`);
    }

    public fetchStateByIcao24(icao24: string): Promise<AdsbLolState | null> {
        return this.fetchState(`v2/icao/${icao24.toLowerCase()}`);
    }

    /** Reads the first aircraft of a readsb response: { ac: [{ gs (kt), alt_baro (ft | "ground"), on_ground }] }. */
    private async fetchState(endpoint: string): Promise<AdsbLolState | null> {
        try {
            const response = await this.fetch(endpoint, undefined, 'GET', undefined, true) as Response;
            if (!response.ok) {
                return null;
            }

            const body: any = await response.json();
            const aircraft = body?.ac?.[0];
            if (!aircraft) {
                return null;
            }

            if (aircraft.alt_baro === 'ground') {
                return {on_ground: true, velocity: knotsToMs(aircraft.gs), altitude: 0};
            }
            return {
                on_ground: aircraft.on_ground ?? null,
                velocity: knotsToMs(aircraft.gs),
                altitude: typeof aircraft.alt_baro === 'number' ? aircraft.alt_baro * FEET_TO_METERS : null,
            };
        } catch (error) {
            console.error(`[AdsbLolService] Error fetching ${endpoint}:`, error);
            return null;
        }
    }
}
