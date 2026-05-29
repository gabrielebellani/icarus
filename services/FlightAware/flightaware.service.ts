import {endOfDay, startOfDay, formatISO} from "date-fns";

export class FlightawareService {
    private readonly key: string
    private host: string = 'https://aeroapi.flightaware.com/aeroapi/'

    constructor(key: string) {
        this.key = key
    }

    public async fetchFlightInfo(code: string, date: Date) {
        const endpoint = this.host.concat('flights', '/', code)
        const url = new URL(endpoint)
        const start = formatISO(startOfDay(date))
        const end = formatISO(endOfDay(date))

        url.searchParams.set('start', start)
        url.searchParams.set('end', end)

        return await this.fetchFromFlightAware(url)
    }

    public async fetchAirportTimetable(code: string, start: Date, end: Date, direction: string|null = null) {
        const endpoint = this.host.concat('airports', '/', code, '/', 'flights', direction ? `/${direction}` : '')
        const url = new URL(endpoint)
        url.searchParams.set('start', formatISO(start))
        url.searchParams.set('end', formatISO(end))

        return await this.fetchFromFlightAware(url);
    }

    public async fetchAirportDelays(code: string) {
        return await this.fetchFromFlightAware(['airports', '/', code, '/', 'delays'])
    }

    private async fetchFromFlightAware(endpoint: string[]|URL) {
        let ep = this.host
        if(endpoint instanceof URL){
            ep = endpoint.toString()
        }else{
            ep = ep.concat(...endpoint)
        }
        const url = new URL(ep)
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'x-apikey': this.key
            }
        });

        return await response.json();
    }
}
