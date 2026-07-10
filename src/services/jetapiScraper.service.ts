import {env} from "../utils/env.ts";

export class JetapiScraperService {
    private host: string = env.JETAPI_SCRAPER_URL.concat('/api')

    public async fetchImagesForAircraft(registration: string): Promise<string | null> {
        const url = new URL(this.host)
        url.searchParams.set('reg', registration)
        url.searchParams.set('photos', '1') //returns only one image
        url.searchParams.set('only_jp', 'true') //returns only images and no flights/aircraft data

        const apiResponse: Response = await this.fetchFromJetapi(url)
        const body: any = await apiResponse.json()

        if(apiResponse.ok){
            if(!!body.response.Images && body.response.Images.length > 0 ){
                return body.response.Images[0].Image
            }
        }

        return null
    }

    private async fetchFromJetapi(endpoint: string | URL) {
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
