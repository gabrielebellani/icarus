import {AircraftInfo} from "../classes/AircraftInfo.ts";
import {ThirdPartyHttpService} from "./thirdPartyHttp.service.ts";

export class AdsbdbService extends ThirdPartyHttpService {
    override host = 'https://api.adsbdb.com/v0/'

    public async fetchAircraftInformationByIcao24(icao24: string) {
        const apiResponse: Response = await this.fetch('aircraft/' + icao24)
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
}
