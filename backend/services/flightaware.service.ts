import {endOfDay, formatISO, startOfDay, startOfMonth, subMinutes} from "date-fns";
import {ThirdPartyHttpService, type ThirdPartyHttpServiceResponse} from "./thirdPartyHttp.service.ts";
import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";
import {ApiRequestTrackingRepository} from "../repositories/apiRequestTracking.repository.ts";
import {getPreference, setPreference} from "../controllers/preferences.controller.ts";
import {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";
import {ThirdPartyQuotaExceededError} from "../errors/ThirdPartyQuotaExceededError.ts";

// FlightAware's AeroAPI offers $5 of free credit per month; leave a small margin before blocking.
const MONTHLY_FREE_CREDIT_USD = 5;
const BLOCK_THRESHOLD_USD = 4.9;
// Real cost is only known on demand (account/usage), so it's only re-checked periodically.
const USAGE_CHECK_INTERVAL = 50;

export class FlightawareService extends ThirdPartyHttpService {
    private readonly key: string
    override host = 'https://aeroapi.flightaware.com/aeroapi/'

    constructor(key: string, userId: number) {
        super(ThirdPartyServiceEnum.FLIGHTAWARE, userId);
        this.key = key
    }

    /**
     * Blocks FlightAware calls once the monthly free credit is close to exhausted.
     * Every USAGE_CHECK_INTERVAL requests it re-checks the real cost via account/usage
     * (FlightAware doesn't push usage in real time); once cost reaches BLOCK_THRESHOLD_USD it
     * blocks further calls for the rest of the month unless the user opted to exceed the limit.
     * fetchUsage() itself is exempt so the user can always see current cost to make that call.
     */
    private async enforceMonthlyBudget(): Promise<void> {
        if (getPreference(PreferenceKeyEnum.FLIGHTAWARE_ALLOW_OVER_LIMIT, this.userId)?.value === true) {
            return;
        }

        const currentMonth = formatISO(new Date(), {representation: 'date'}).slice(0, 7); // YYYY-MM
        if (getPreference(PreferenceKeyEnum.FLIGHTAWARE_LIMIT_REACHED_MONTH, this.userId)?.value === currentMonth) {
            throw new ThirdPartyQuotaExceededError(
                ThirdPartyServiceEnum.FLIGHTAWARE,
                `FlightAware's $${MONTHLY_FREE_CREDIT_USD} monthly free credit has been reached. Enable "Allow exceeding FlightAware monthly limit" in Preferences to keep making calls.`
            );
        }

        const monthStart = formatISO(startOfMonth(new Date()), {representation: 'date'});
        const today = formatISO(new Date(), {representation: 'date'});
        const requestsThisMonth = ApiRequestTrackingRepository.getRequestCount(ThirdPartyServiceEnum.FLIGHTAWARE, this.userId, monthStart, today);

        if (requestsThisMonth === 0 || requestsThisMonth % USAGE_CHECK_INTERVAL !== 0) {
            return;
        }

        const usage: any = await this.fetchUsage();
        if (usage.total_cost >= BLOCK_THRESHOLD_USD) {
            setPreference(PreferenceKeyEnum.FLIGHTAWARE_LIMIT_REACHED_MONTH, this.userId, currentMonth);
            throw new ThirdPartyQuotaExceededError(
                ThirdPartyServiceEnum.FLIGHTAWARE,
                `FlightAware's $${MONTHLY_FREE_CREDIT_USD} monthly free credit has been reached. Enable "Allow exceeding FlightAware monthly limit" in Preferences to keep making calls.`
            );
        }
    }

    public async fetchFlightInfo(code: string, date: Date): Promise<any> {
        await this.enforceMonthlyBudget();

        const endpoint = this.host.concat('flights', '/', code)
        const url = new URL(endpoint)
        const start = formatISO(startOfDay(date))
        const end = formatISO(endOfDay(date))

        url.searchParams.set('start', start)
        url.searchParams.set('end', end)

        return await this.fetchFromFlightAware(url)
    }

    public async fetchAirportTimetable(code: string, start: Date, end: Date, direction: string | null = null) {
        await this.enforceMonthlyBudget();

        const endpoint = this.host.concat('airports', '/', code, '/', 'flights', direction ? `/${direction}` : '')
        const url = new URL(endpoint)
        url.searchParams.set('start', formatISO(start))
        url.searchParams.set('end', formatISO(end))

        return await this.fetchFromFlightAware(url);
    }

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
        const response = <ThirdPartyHttpServiceResponse>await this.fetch(
            endpoint,
            {
                'x-apikey': this.key,
                'Accept-Language': 'en'
            },
            undefined,
            undefined,
        )

        return response.content;
    }
}
