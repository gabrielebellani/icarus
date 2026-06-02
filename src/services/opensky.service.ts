import {OpenSkyState} from "../classes/OpenSkyState.ts";

export class OpenSkyService {
    private readonly key: string|null
    private host: string = 'https://opensky-network.org/api/'

    constructor(key: string|null) {
        this.key = key
    }

    public async fetchFlightsInArea(boundingBox: { lamin: number, lomin: number, lamax: number, lomax: number }) {
        const endpoint = this.host.concat('states/all')
        const url = new URL(endpoint)
        url.searchParams.set('lamin', boundingBox.lamin.toString())
        url.searchParams.set('lomin', boundingBox.lomin.toString())
        url.searchParams.set('lamax', boundingBox.lamax.toString())
        url.searchParams.set('lomax', boundingBox.lomax.toString())

        const apiResponse: any = await this.fetchFromOpenSky(url)
        if (!apiResponse || !apiResponse.states) {
            return [];
        }

        return apiResponse.states.map((state:any)=> OpenSkyState.fromOpenSkyApi(state)) as OpenSkyState[];
    }

    private async fetchFromOpenSky(endpoint: string|URL) {
        let ep = this.host
        if(endpoint instanceof URL){
            ep = endpoint.toString()
        }else{
            ep = ep.concat(endpoint)
        }
        const url = new URL(ep)

        const headers = new Headers()
        headers.set('Accept', 'application/json')
        if (this.key) {
            headers.set('Authorization', `Bearer ${this.key}`)
        }

        const response = await fetch(url, {headers});
        if (!response.ok) {
            throw new Error(`OpenSky API request failed with status ${response.status}`);
        }

        return await response.json();
    }
}
