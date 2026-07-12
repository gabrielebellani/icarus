import {endOfDay, formatISO, startOfDay, startOfMonth, subMinutes} from "date-fns";
import {ThirdPartyHttpService} from "./thirdPartyHttp.service.ts";

export class FlightawareService extends ThirdPartyHttpService {
    private readonly key: string
    override host = 'https://aeroapi.flightaware.com/aeroapi/'

    constructor(key: string) {
        super();
        this.key = key
    }

    public async fetchFlightInfo(code: string, date: Date): Promise<any> {
        const endpoint = this.host.concat('flights', '/', code)
        const url = new URL(endpoint)
        const start = formatISO(startOfDay(date))
        const end = formatISO(endOfDay(date))

        url.searchParams.set('start', start)
        url.searchParams.set('end', end)

        return await this.fetchFromFlightAware(url)
    }

    public async fetchAirportTimetable(code: string, start: Date, end: Date, direction: string | null = null) {
        const endpoint = this.host.concat('airports', '/', code, '/', 'flights', direction ? `/${direction}` : '')
        const url = new URL(endpoint)
        url.searchParams.set('start', formatISO(start))
        url.searchParams.set('end', formatISO(end))

        return await this.fetchFromFlightAware(url);
    }

    // public async fetchAirportDelays(code: string) {
    //     const url = new URL(this.host.concat('airports', '/', code, '/', 'delays'))
    //     return await this.fetchFromFlightAware(url)
    // }

    public async fetchUsage() {
        const endpoint = this.host.concat('account', '/', 'usage')
        const url = new URL(endpoint)
        const start = formatISO(startOfMonth(new Date()))
        const end = formatISO(subMinutes(new Date(), 1))

        url.searchParams.set('start', start)
        url.searchParams.set('end', end)

        return await this.fetchFromFlightAware(url)
    }

    private async fetchFromFlightAware(endpoint: URL) {
        const response = await this.fetch(
            endpoint,
            {
                'x-apikey': this.key
            },
            undefined,
            undefined,
        )

        return await response.json();
    }
}
