import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";
import {trackApiRequest} from "../utils/apiRequestTracking.util.ts";

export class ThirdPartyHttpService {

    protected host: string = ''
    protected readonly service: ThirdPartyServiceEnum
    protected readonly userId: number

    constructor(service: ThirdPartyServiceEnum, userId: number) {
        this.service = service
        this.userId = userId
    }

    public async fetch(endpoint: string | URL, headersToAdd?: { [key: string]: string }, method: string = 'GET', body?: any, returnResponse: boolean = false): Promise<ThirdPartyHttpServiceResponse|Response> {
        let ep = this.host
        if (endpoint instanceof URL) {
            ep = endpoint.toString()
        } else {
            ep = ep.concat(endpoint)
        }
        const url = new URL(ep)

        const headers = new Headers()
        if (headersToAdd) {
            for (const [key, value] of Object.entries(headersToAdd)) {
                headers.set(key, value)
            }
        }
        headers.set('Accept', 'application/json')

        let response: Response
        try {
            response = await fetch(url, {method, body, headers});
        } finally {
            // Fire-and-forget: request counting must never delay or affect the caller.
            trackApiRequest(this.service, this.userId)
        }

        if(returnResponse){
            return response
        }

        return {
            content: await response.json(),
            status: response.status,
            ok: response.ok
        }
    }

}

export interface ThirdPartyHttpServiceResponse {
    content: any
    status: number
    ok: boolean
}
