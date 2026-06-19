import {RadarCommercialFlight} from "../classes/RadarCommercialFlight.ts";

export class AdsbLolService {
    private host: string = 'https://api.adsb.lol/api/'

    public async fetchFlightsByCallsignAndPosition(flights: {callsign: string, lat: string, lng: string}[]) {
        const apiResponse: Response = await this.fetchFromAdsbLol(
            '0/routeset',
            'POST',
            JSON.stringify({planes: flights})
        )
        const body: any = await apiResponse.json()

        if(body === null || body.length === 0){
            throw new Error('Not found')
        }

        const results: {callsign: string, route: RadarCommercialFlight|null, plausible: boolean}[] = [];
        for (const requestedFlight of flights){
            const flight = body.find((f: any) => f.callsign === requestedFlight.callsign)
            results.push({
                callsign: requestedFlight.callsign,
                route: flight ? RadarCommercialFlight.buildFromAdsbLolResult(requestedFlight.callsign, flight) : null,
                plausible: flight ? flight.plausible : false
            })
        }

        return results
    }

    private async fetchFromAdsbLol(endpoint: string | URL, method: RequestInit['method'] = 'GET', body: RequestInit['body']) {
        let ep = this.host
        if (endpoint instanceof URL) {
            ep = endpoint.toString()
        } else {
            ep = ep.concat(endpoint)
        }
        const url = new URL(ep)

        const headers = new Headers()
        headers.set('Accept', 'application/json')

        return await fetch(url, {headers, method, body});
    }
}
