import {AircraftInfo} from "../classes/AircraftInfo.ts";
import {ThirdPartyHttpService, type ThirdPartyHttpServiceResponse} from "./thirdPartyHttp.service.ts";

export class AdsbdbService extends ThirdPartyHttpService {
    override host = 'https://api.adsbdb.com/v0/'

    public async fetchAircraftInformationByIcao24(icao24: string) {
        const apiResponse: ThirdPartyHttpServiceResponse = <ThirdPartyHttpServiceResponse>await this.fetch('aircraft/' + icao24)

        // TODO: enable if a fallback API service is implemented
        // if(apiResponse.status === 404){
        //     throw new Error('Unknown aircraft')
        // }

        if(apiResponse.ok){
            return AircraftInfo.buildFromAdsbDbResult(icao24, apiResponse.content.response.aircraft)
        }

        return null
    }
}
