import {RadarCommercialFlight} from "../classes/RadarCommercialFlight.ts";
import {ThirdPartyHttpService} from "./thirdPartyHttp.service.ts";
import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";

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

    /**
     * Fetch single aircraft state by registration (callsign).
     * Tries v2/registration endpoint; returns null on error or aircraft not found.
     * More reliable than icao24 lookup for live tracking.
     */
    public async fetchStateByRegistration(registration: string): Promise<{on_ground: boolean|null, velocity: number|null, altitude: number|null} | null> {
        try {
            const endpoint = `v2/registration/${registration.toUpperCase()}`;
            const response = await this.fetch(endpoint, undefined, 'GET', undefined, true) as Response;

            if (!response.ok) {
                return null;
            }

            let jsonData: any;
            try {
                jsonData = await response.json();
            } catch {
                return null;
            }

            if (!jsonData.ac || jsonData.ac.length === 0) {
                return null;
            }

            const aircraft = jsonData.ac[0];
            
            const velocityKnots = aircraft.gs ?? null;
            const velocity = velocityKnots !== null ? velocityKnots * 0.514444 : null;
            
            let altitude: number | null = null;
            let onGround: boolean | null = null;
            
            if (typeof aircraft.alt_baro === 'string' && aircraft.alt_baro === 'ground') {
                onGround = true;
                altitude = 0;
            } else if (typeof aircraft.alt_baro === 'number') {
                altitude = aircraft.alt_baro * 0.3048; // ft → m
                onGround = aircraft.on_ground ?? null;
            } else {
                onGround = aircraft.on_ground ?? null;
            }

            return { on_ground: onGround, velocity, altitude };
        } catch (error) {
            console.error(`[AdsbLolService] Error fetching state for registration ${registration}:`, error);
            return null;
        }
    }

    /**
     * Fetch single aircraft state by ICAO24 transponder address.
     * Tries v2/icao endpoint; returns null on error or aircraft not found.
     * Expected response shape (tar1090/readsb schema):
     * { ac: [ { hex, gs (knots), alt_baro (ft or "ground"), on_ground (bool) } ] }
     */
    public async fetchStateByIcao24(icao24: string): Promise<{on_ground: boolean|null, velocity: number|null, altitude: number|null} | null> {
        try {
            const endpoint = `v2/icao/${icao24.toLowerCase()}`;
            const response = await this.fetch(endpoint, undefined, 'GET', undefined, true) as Response;

            if (!response.ok) {
                return null;
            }

            let jsonData: any;
            try {
                jsonData = await response.json();
            } catch {
                // Response is not JSON or malformed
                return null;
            }

            if (!jsonData.ac || jsonData.ac.length === 0) {
                return null;
            }

            const aircraft = jsonData.ac[0];
            
            // Parse ground speed (knots) → m/s
            const velocityKnots = aircraft.gs ?? null;
            const velocity = velocityKnots !== null ? velocityKnots * 0.514444 : null;
            
            // Parse altitude: ft (number) → m, or "ground" string → on_ground=true, altitude=0
            let altitude: number | null = null;
            let onGround: boolean | null = null;
            
            if (typeof aircraft.alt_baro === 'string' && aircraft.alt_baro === 'ground') {
                onGround = true;
                altitude = 0;
            } else if (typeof aircraft.alt_baro === 'number') {
                altitude = aircraft.alt_baro * 0.3048; // ft → m
                onGround = aircraft.on_ground ?? null;
            } else {
                onGround = aircraft.on_ground ?? null;
            }

            return { on_ground: onGround, velocity, altitude };
        } catch (error) {
            console.error(`[AdsbLolService] Error fetching state for icao24 ${icao24}:`, error);
            return null;
        }
    }

}
