import {OpenSkyState} from "../classes/OpenSkyState.ts";
import {ThirdPartyHttpService} from "./thirdPartyHttp.service.ts";
import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";

export class OpenSkyService extends ThirdPartyHttpService{
    private readonly key: string|null
    override host = 'https://opensky-network.org/api/'

    constructor(key: string|null, userId: number) {
        super(ThirdPartyServiceEnum.OPENSKY, userId)
        this.key = key
    }

    public async fetchAircraftInArea(boundingBox: { lamin: number, lomin: number, lamax: number, lomax: number }) {
        const endpoint = this.host.concat('states/all')
        const url = new URL(endpoint)
        url.searchParams.set('lamin', boundingBox.lamin.toString())
        url.searchParams.set('lomin', boundingBox.lomin.toString())
        url.searchParams.set('lamax', boundingBox.lamax.toString())
        url.searchParams.set('lomax', boundingBox.lomax.toString())

        const apiResponse: any = await this.fetch(
            url,
            this.key
                ? {"Authorization": `Bearer ${this.key}`}
                : undefined
        )

        if (!apiResponse || !apiResponse.content.states) {
            return [];
        }

        return apiResponse.content.states.map((state:any)=> OpenSkyState.fromOpenSkyApi(state)) as OpenSkyState[];
    }

    public async fetchStateByIcao24(icao24: string): Promise<OpenSkyState | null> {
        const endpoint = this.host.concat('states/all')
        const url = new URL(endpoint)
        url.searchParams.set('icao24', icao24.toLowerCase())

        try {
            const apiResponse: any = await this.fetch(
                url,
                this.key
                    ? {"Authorization": `Bearer ${this.key}`}
                    : undefined
            )

            if (!apiResponse || !apiResponse.content.states || apiResponse.content.states.length === 0) {
                return null;
            }

            return OpenSkyState.fromOpenSkyApi(apiResponse.content.states[0]);
        } catch (error) {
            console.error(`[OpenSkyService] Error fetching state for icao24 ${icao24}:`, error);
            return null;
        }
    }
}
