import {endOfDay, startOfDay, formatISO} from "date-fns";

export class FlightawareService {
    private key: string
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

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'x-apikey': this.key
            }
        });

        return await response.json();
    }

}
