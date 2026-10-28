import {db} from "../db.ts";
import {subHours, subDays, isBefore, parseISO} from "date-fns";

export function deleteExpiredRadars() {
    try{
        console.log('Deleting expired radars...', new Date().toISOString());
        db.prepare('UPDATE radars SET expired_at = ? WHERE expiration < ? AND expired_at IS NULL')
            .run(Date.now(), Date.now() / 1000);
        console.log('Expired radars deleted', new Date().toISOString());
    } catch (error) {
        console.error('Error deleting expired radars:', error);
    }
}

/**
 * Clean up tracked flights that have landed or are too old.
 * - If payload contains actual_in (confirmed arrival): delete if arrival time > 4 hours ago
 * - else: delete if reference_date > 48 hours ago
 */
export function cleanupExpiredTrackedFlights() {
    try {
        console.log('[Cron] Cleaning up expired tracked flights...', new Date().toISOString());

        const rows = db.prepare(`SELECT id, reference_date, payload FROM tracked_flights`).all() as any[];
        const idsToDelete: number[] = [];
        const now = new Date();
        const fourHoursAgo = subHours(now, 4);
        const twoDaysAgo = subDays(now, 2);

        for (const row of rows) {
            try {
                const payload = JSON.parse(row.payload || '{}');
                let shouldDelete = false;

                // If actual_in (confirmed arrival) present: check 4-hour window
                if (payload.actual_in) {
                    try {
                        const actualInDate = typeof payload.actual_in === 'string'
                            ? parseISO(payload.actual_in)
                            : new Date(payload.actual_in);
                        if (isBefore(actualInDate, fourHoursAgo)) {
                            shouldDelete = true;
                        }
                    } catch (e) {
                        console.warn(`[Cron] Failed to parse actual_in for tracked_flights.id=${row.id}:`, e);
                    }
                } else {
                    // No confirmation: check 48-hour reference_date window
                    try {
                        const referenceDate = typeof row.reference_date === 'string'
                            ? parseISO(row.reference_date)
                            : new Date(row.reference_date);
                        if (isBefore(referenceDate, twoDaysAgo)) {
                            shouldDelete = true;
                        }
                    } catch (e) {
                        console.warn(`[Cron] Failed to parse reference_date for tracked_flights.id=${row.id}:`, e);
                    }
                }

                if (shouldDelete) {
                    idsToDelete.push(row.id);
                }
            } catch (e) {
                console.error(`[Cron] Error processing tracked_flights row id=${row.id}:`, e);
            }
        }

        // Batch delete
        if (idsToDelete.length > 0) {
            const placeholders = idsToDelete.map(() => '?').join(',');
            db.prepare(`DELETE FROM tracked_flights WHERE id IN (${placeholders})`).run(...idsToDelete);
            console.log(`[Cron] Deleted ${idsToDelete.length} expired tracked flight(s)`, new Date().toISOString());
        } else {
            console.log('[Cron] No expired tracked flights to delete', new Date().toISOString());
        }
    } catch (error) {
        console.error('[Cron] Error cleaning up expired tracked flights:', error);
    }
}
