import {AircraftInfo} from "../classes/AircraftInfo.ts";
import {ThirdPartyHttpService, type ThirdPartyHttpServiceResponse} from "./thirdPartyHttp.service.ts";
import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";

export class AdsbdbService extends ThirdPartyHttpService {
    override host = 'https://api.adsbdb.com/v0/'

    constructor(userId: number) {
        super(ThirdPartyServiceEnum.ADSBDB, userId)
    }

    public async fetchAircraftInformationByIcao24(icao24: string) {
        const apiResponse: ThirdPartyHttpServiceResponse = <ThirdPartyHttpServiceResponse>await this.fetch('aircraft/' + icao24)

        if(apiResponse.ok){
            return AircraftInfo.buildFromAdsbDbResult(icao24, apiResponse.content.response.aircraft)
        }

        return null
    }

    /**
     * Fetch aircraft information by registration (N-number, EC-*, etc.).
     * AdsbDB auto-detects mode_s vs registration format and returns mode_s in response.
     */
    public async fetchAircraftInformationByRegistration(registration: string) {
        const apiResponse: ThirdPartyHttpServiceResponse = <ThirdPartyHttpServiceResponse>await this.fetch('aircraft/' + registration)

        if(apiResponse.ok){
            // Extract mode_s (icao24) from response
            const icao24 = apiResponse.content.response.aircraft.mode_s;
            return AircraftInfo.buildFromAdsbDbResult(icao24, apiResponse.content.response.aircraft)
        }

        return null
    }
}
