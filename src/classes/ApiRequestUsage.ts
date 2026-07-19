import {eachDayOfInterval, formatISO} from "date-fns";
import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";

/**
 * DTO representing the number of requests made to each tracked third-party service on a
 * given date.
 */
export class ApiRequestUsage {

    date: string;
    opensky: number;
    adsb_lol: number;
    adsbdb: number;
    flightaware: number;

    constructor(date: string, counts: Partial<Record<ThirdPartyServiceEnum, number>> = {}) {
        this.date = date;
        this.opensky = counts[ThirdPartyServiceEnum.OPENSKY] ?? 0;
        this.adsb_lol = counts[ThirdPartyServiceEnum.ADSB_LOL] ?? 0;
        this.adsbdb = counts[ThirdPartyServiceEnum.ADSBDB] ?? 0;
        this.flightaware = counts[ThirdPartyServiceEnum.FLIGHTAWARE] ?? 0;
    }

    /**
     * Builds a map keyed by date (YYYY-MM-DD) covering every day in [dateFrom, dateTo], filling
     * days without tracked requests with zero counts.
     */
    static buildRangeFromRows(
        dateFrom: string,
        dateTo: string,
        rows: { service: string, date: string, requests: number }[]
    ): Record<string, ApiRequestUsage> {
        const groupedByDate = new Map<string, Partial<Record<ThirdPartyServiceEnum, number>>>();
        for (const row of rows) {
            if (!groupedByDate.has(row.date)) {
                groupedByDate.set(row.date, {});
            }
            groupedByDate.get(row.date)![row.service as ThirdPartyServiceEnum] = row.requests;
        }

        const result: Record<string, ApiRequestUsage> = {};
        const days = eachDayOfInterval({start: new Date(dateFrom), end: new Date(dateTo)});
        for (const day of days) {
            const dateStr = formatISO(day, {representation: 'date'});
            result[dateStr] = new ApiRequestUsage(dateStr, groupedByDate.get(dateStr) ?? {});
        }

        return result;
    }
}
