import {OpenSkyState} from "../classes/OpenSkyState.ts";
import {RadarCommercialFlight} from "../classes/RadarCommercialFlight.ts";

export class AdsbdbService {
    private host: string = 'https://api.adsbdb.com/v0/'

    public async fetchFlightByCallsign(callsign: string) {
        const apiResponse: Response = await this.fetchFromAdsbdb('callsign/' + callsign)
        const body: any = await apiResponse.json()

        if(apiResponse.status === 404){
            throw new Error('Unknown callsign')
        }

        if(apiResponse.ok){
            return RadarCommercialFlight.buildFromAdsbdbResult(callsign, body.response.flightroute)
        }

        return null
    }

    private async fetchFromAdsbdb(endpoint: string | URL) {
        let ep = this.host
        if (endpoint instanceof URL) {
            ep = endpoint.toString()
        } else {
            ep = ep.concat(endpoint)
        }
        const url = new URL(ep)

        const headers = new Headers()
        headers.set('Accept', 'application/json')

        return await fetch(url, {headers});
    }
}
