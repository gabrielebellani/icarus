export class ThirdPartyHttpService {

    protected host: string = ''

    public async fetch(endpoint: string | URL, headersToAdd?: { [key: string]: string }, method: string = 'GET', body?: any){
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

        return await fetch(url, {method, body, headers});
    }

}
