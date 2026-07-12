import {env} from "../utils/env.ts";
import {ThirdPartyHttpService} from "./thirdPartyHttp.service.ts";

export class JetapiScraperService extends ThirdPartyHttpService{
    override host = env.JETAPI_SCRAPER_URL.concat('/api')

    public async fetchImagesForAircraft(registration: string): Promise<string | null> {
        const url = new URL(this.host)
        url.searchParams.set('reg', registration)
        url.searchParams.set('photos', '1') //returns only one image
        url.searchParams.set('only_jp', 'true') //returns only images and no flights/aircraft data

        const apiResponse: Response = await this.fetch(url)
        const body: any = await apiResponse.json()

        if(apiResponse.ok){
            if(!!body.response.Images && body.response.Images.length > 0 ){
                return body.response.Images[0].Image
            }
        }

        return null
    }

}
