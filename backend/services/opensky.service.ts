import {formatISO} from "date-fns";
import {OpenSkyState} from "../classes/OpenSkyState.ts";
import {ThirdPartyHttpService} from "./thirdPartyHttp.service.ts";
import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";
import {ApiRequestTrackingRepository} from "../repositories/apiRequestTracking.repository.ts";
import {getPreference, setPreference} from "../controllers/preferences.controller.ts";
import {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";
import {ThirdPartyQuotaExceededError} from "../errors/ThirdPartyQuotaExceededError.ts";

const DEFAULT_DAILY_THRESHOLD = 400;

// OpenSky's own daily quota resets at 01:00 UTC, not at midnight.
function nextOneAmUtc(from: Date): Date {
    const next = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 1, 0, 0, 0));
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
    return next;
}

export class OpenSkyService extends ThirdPartyHttpService{
    private readonly key: string|null
    override host = 'https://opensky-network.org/api/'

    constructor(key: string|null, userId: number) {
        super(ThirdPartyServiceEnum.OPENSKY, userId)
        this.key = key
    }

    /**
     * Blocks OpenSky calls once the user is one call away from OPEN_SKY_DAILY_THRESHOLD,
     * pausing until 01:00 UTC the next day (mirrors OpenSky's own reset time).
     */
    private async enforceDailyQuota(): Promise<void> {
        const now = new Date();

        const blockedUntil = getPreference(PreferenceKeyEnum.OPEN_SKY_BLOCKED_UNTIL, this.userId)?.value;
        if (blockedUntil && now < new Date(blockedUntil)) {
            throw new ThirdPartyQuotaExceededError(
                ThirdPartyServiceEnum.OPENSKY,
                `OpenSky daily request threshold reached. Calls are paused until ${new Date(blockedUntil).toISOString()}.`
            );
        }

        const threshold = getPreference(PreferenceKeyEnum.OPEN_SKY_DAILY_THRESHOLD, this.userId)?.value ?? DEFAULT_DAILY_THRESHOLD;
        const today = formatISO(now, {representation: 'date'});
        const todayCount = ApiRequestTrackingRepository.getRequestCount(ThirdPartyServiceEnum.OPENSKY, this.userId, today, today);

        if (todayCount >= threshold - 1) {
            const nextReset = nextOneAmUtc(now);
            setPreference(PreferenceKeyEnum.OPEN_SKY_BLOCKED_UNTIL, this.userId, nextReset.toISOString());
            throw new ThirdPartyQuotaExceededError(
                ThirdPartyServiceEnum.OPENSKY,
                `OpenSky daily request threshold reached. Calls are paused until ${nextReset.toISOString()}.`
            );
        }
    }

    public async fetchAircraftInArea(boundingBox: { lamin: number, lomin: number, lamax: number, lomax: number }) {
        await this.enforceDailyQuota();

        const endpoint = this.host.concat('states/all')
        const url = new URL(endpoint)
        url.searchParams.set('lamin', boundingBox.lamin.toString())
        url.searchParams.set('lomin', boundingBox.lomin.toString())
        url.searchParams.set('lamax', boundingBox.lamax.toString())
        url.searchParams.set('lomax', boundingBox.lomax.toString())

        const apiResponse: any = await this.fetch(
            url,
            this.key
                ? {"Authorization": `Bearer ${this.key}`}
                : undefined
        )

        if (!apiResponse || !apiResponse.content.states) {
            return [];
        }

        return apiResponse.content.states.map((state:any)=> OpenSkyState.fromOpenSkyApi(state)) as OpenSkyState[];
    }

    public async fetchStateByIcao24(icao24: string): Promise<OpenSkyState | null> {
        const endpoint = this.host.concat('states/all')
        const url = new URL(endpoint)
        url.searchParams.set('icao24', icao24.toLowerCase())

        try {
            await this.enforceDailyQuota();

            const apiResponse: any = await this.fetch(
                url,
                this.key
                    ? {"Authorization": `Bearer ${this.key}`}
                    : undefined
            )

            if (!apiResponse || !apiResponse.content.states || apiResponse.content.states.length === 0) {
                return null;
            }

            return OpenSkyState.fromOpenSkyApi(apiResponse.content.states[0]);
        } catch (error) {
            console.error(`[OpenSkyService] Error fetching state for icao24 ${icao24}:`, error);
            return null;
        }
    }
}
