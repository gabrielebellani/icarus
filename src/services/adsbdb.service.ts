import {RadarCommercialFlight} from "../classes/RadarCommercialFlight.ts";
import {AircraftInfo} from "../classes/AircraftInfo.ts";

export class AdsbdbService {
    private host: string = 'https://api.adsbdb.com/v0/'

    public async fetchAircraftInformationByIcao24(icao24: string) {
        const apiResponse: Response = await this.fetchFromAdsbdb('aircraft/' + icao24)
        const body: any = await apiResponse.json()

        // TODO: enable if a fallback API service is implemented
        // if(apiResponse.status === 404){
        //     throw new Error('Unknown aircraft')
        // }

        if(apiResponse.ok){
            return AircraftInfo.buildFromAdsbDbResult(icao24, body.response.aircraft)
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
