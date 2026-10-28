import {db} from "../db.ts";
import type {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";

export class ApiRequestTrackingRepository {

    static incrementRequestCount(service: ThirdPartyServiceEnum, userId: number, date: string): void {
        db.prepare(`
            INSERT INTO third_party_api_requests (service, user_id, date, requests)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(service, user_id, date) DO UPDATE SET requests = requests + 1
        `).run(service, userId, date);
    }

    static getRequestCount(service: ThirdPartyServiceEnum, userId: number, dateFrom: string, dateTo: string): number {
        const row = db.prepare(`
            SELECT COALESCE(SUM(requests), 0) as total
            FROM third_party_api_requests
            WHERE service = ? AND user_id = ? AND date >= ? AND date <= ?
        `).get(service, userId, dateFrom, dateTo) as { total: number };
        return row.total;
    }

    static getUsageByUserAndDateRange(userId: number, dateFrom: string, dateTo: string): {
        service: string
        date: string
        requests: number
    }[] {
        return db.prepare(`
            SELECT service, date, requests
            FROM third_party_api_requests
            WHERE user_id = ? AND date >= ? AND date <= ?
            ORDER BY date ASC
        `).all(userId, dateFrom, dateTo) as { service: string, date: string, requests: number }[];
    }
}
