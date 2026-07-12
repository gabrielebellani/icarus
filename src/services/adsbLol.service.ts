import {RadarCommercialFlight} from "../classes/RadarCommercialFlight.ts";
import {ThirdPartyHttpService} from "./thirdPartyHttp.service.ts";

export class AdsbLolService extends ThirdPartyHttpService {
    override host = 'https://api.adsb.lol/api/'

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

}
