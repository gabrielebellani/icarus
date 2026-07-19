import {env} from "../utils/env.ts";
import {ThirdPartyHttpService, type ThirdPartyHttpServiceResponse} from "./thirdPartyHttp.service.ts";
import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";

export class JetapiScraperService extends ThirdPartyHttpService{
    override host = env.JETAPI_SCRAPER_URL.concat('/api')

    constructor(userId: number) {
        super(ThirdPartyServiceEnum.JETAPI, userId)
    }

    public async fetchImagesForAircraft(registration: string): Promise<string | null> {
        const url = new URL(this.host)
        url.searchParams.set('reg', registration)
        url.searchParams.set('photos', '1') //returns only one image
        url.searchParams.set('only_jp', 'true') //returns only images and no flights/aircraft data

        const apiResponse: ThirdPartyHttpServiceResponse = <ThirdPartyHttpServiceResponse>await this.fetch(url)

        if(apiResponse.ok){
            if(!!apiResponse.content.Images && apiResponse.content.Images.length > 0 ){
                return apiResponse.content.Images[0].Image
            }
        }

        return null
    }

}
