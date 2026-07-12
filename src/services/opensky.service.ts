import {OpenSkyState} from "../classes/OpenSkyState.ts";
import {ThirdPartyHttpService} from "./thirdPartyHttp.service.ts";

export class OpenSkyService extends ThirdPartyHttpService{
    private readonly key: string|null
    override host = 'https://opensky-network.org/api/'

    constructor(key: string|null) {
        super()
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

        if (!apiResponse || !apiResponse.states) {
            return [];
        }

        // const apiResponse = {
        //     "time": new Date().toISOString(),
        //     "states": [
        //         ["3c65d7","DLH49M","Germany",1780385252,1780385252,8.9519,45.0579,11879.58,false,203.42,226.54,0,null,12222.48,"1000",false,0],
        //         ["71be17","KAL591","Republic of Korea",1780385252,1780385252,9.0044,44.9202,10668,false,219.69,232.33,0,null,11010.9,"1000",false,0]
        //     ]
        // }

        return apiResponse.states.map((state:any)=> OpenSkyState.fromOpenSkyApi(state)) as OpenSkyState[];
    }
}
