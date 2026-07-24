import {getAirportByCode} from './airports.util.ts';

const ITALIAN_STATUS_TO_ENGLISH: Array<{ pattern: RegExp; value: string }> = [
    { pattern: /\bcancellat[oa]\b|\bcancelled\b/i, value: 'Cancelled' },
    { pattern: /\bdirottat[oa]\b|\bdiverted\b/i, value: 'Diverted' },
    { pattern: /\barrivat[oa]\b|\batterrat[oa]\b|\blanded\b|\barrived\b/i, value: 'Arrived' },
    { pattern: /\bin\s+volo\b|\bin\s+air\b|\bairborne\b|\ben\s+route\b/i, value: 'Airborne' },
    { pattern: /\bdecollat[oa]\b|\bdeparted\b|\bpartit[oa]\b/i, value: 'Departed' },
    { pattern: /\bha\s+lasciato\s+il\s+gate\b|\bleft\s+the\s+gate\b/i, value: 'Left the gate' },
    { pattern: /\bin\s+rullaggio\b|\btaxiing\b/i, value: 'Taxiing' },
    { pattern: /\britardat[oa]\b|\bdelayed\b/i, value: 'Delayed' },
    { pattern: /\bprogrammata?\b|\bscheduled\b|\bin\s+orario\b/i, value: 'Scheduled' },
];

function toTimestamp(value: unknown): number | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
}

function toPositiveNumber(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
    return value;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function normalizeFlightStatus(status: unknown): string {
    if (typeof status !== 'string') return 'Scheduled';

    const normalized = status.trim();
    if (!normalized) return 'Scheduled';

    for (const rule of ITALIAN_STATUS_TO_ENGLISH) {
        if (rule.pattern.test(normalized)) {
            return rule.value;
        }
    }

    return normalized;
}

export function normalizeFiledAltitude(filedAltitude: unknown): number | null {
    if (filedAltitude === null || filedAltitude === undefined) return null;
    if (typeof filedAltitude !== 'number' || !Number.isFinite(filedAltitude)) return null;

    // FlightAware sends filed_altitude in hundreds of feet (e.g. 350 = FL350).
    // Keep function idempotent: if value already looks like feet, do not scale again.
    if (filedAltitude > 1000) return Math.round(filedAltitude);
    return Math.round(filedAltitude * 100);
}

export function computeProgressPercent(flight: any, nowMs: number = Date.now()): number | null {
    if (!flight || typeof flight !== 'object') return null;

    const currentProgress = typeof flight.progress_percent === 'number'
        ? clamp(Math.round(flight.progress_percent), 0, 100)
        : null;

    // Landed: check actual_on (wheels on) first, then actual_in (gate in)
    if (flight.actual_on || flight.actual_in) return 100;
    if (flight.cancelled) return currentProgress ?? 0;

    const startMs =
        toTimestamp(flight.actual_off)
        ?? toTimestamp(flight.estimated_off)
        ?? toTimestamp(flight.scheduled_off)
        ?? toTimestamp(flight.actual_out)
        ?? toTimestamp(flight.estimated_out)
        ?? toTimestamp(flight.scheduled_out);

    const endMs =
        toTimestamp(flight.actual_on)
        ?? toTimestamp(flight.estimated_on)
        ?? toTimestamp(flight.scheduled_on)
        ?? toTimestamp(flight.actual_in)
        ?? toTimestamp(flight.estimated_in)
        ?? toTimestamp(flight.scheduled_in);

    if (startMs !== null && nowMs <= startMs) return 0;
    if (endMs !== null && nowMs >= endMs) return 100;

    const progressCandidates: number[] = [];

    if (startMs !== null && endMs !== null && endMs > startMs) {
        progressCandidates.push(((nowMs - startMs) / (endMs - startMs)) * 100);
    }

    const filedEteSeconds = toPositiveNumber(flight.filed_ete);
    const routeDistanceNm = toPositiveNumber(flight.route_distance);
    const filedAirspeedKt = toPositiveNumber(flight.filed_airspeed);
    const computedDurationSeconds = routeDistanceNm && filedAirspeedKt
        ? (routeDistanceNm / filedAirspeedKt) * 3600
        : null;
    const durationSeconds = filedEteSeconds ?? computedDurationSeconds;

    if (startMs !== null && durationSeconds && durationSeconds > 0) {
        progressCandidates.push(((nowMs - startMs) / (durationSeconds * 1000)) * 100);
    }

    if (progressCandidates.length === 0) {
        return currentProgress;
    }

    const computed = clamp(
        Math.round(progressCandidates.reduce((sum, value) => sum + value, 0) / progressCandidates.length),
        0,
        100
    );

    if (currentProgress === null) return computed;
    return clamp(Math.max(currentProgress, computed), 0, 100);
}

/**
 * Resolve an airport's name/city via airports.util.ts (iata/icao lookup) instead of
 * trusting FlightAware's route payload directly, so airport info stays consistent
 * with the rest of the app (e.g. tracked airports, airport search).
 */
export function normalizeAirportInfo(airport: any): any {
    if (!airport || typeof airport !== 'object') return airport;

    const resolved = getAirportByCode(airport.code_icao || airport.code_iata || airport.code || null);
    if (!resolved) return airport;

    return { ...airport, name: resolved.airport, city: resolved.city };
}

export function normalizeFlightPayload(payload: any, nowMs: number = Date.now()): any {
    if (!payload || typeof payload !== 'object') return payload;

    const normalized = { ...payload };
    normalized.status = normalizeFlightStatus(payload.status);
    normalized.progress_percent = computeProgressPercent(normalized, nowMs) ?? 0;
    normalized.filed_altitude = normalizeFiledAltitude(payload.filed_altitude);
    normalized.origin = normalizeAirportInfo(payload.origin);
    normalized.destination = normalizeAirportInfo(payload.destination);

    return normalized;
}

/**
 * Detect if flight has landed using multiple signals:
 * - actual_on (wheels on ground) - most reliable
 * - ADS-B on_ground flag from fresh state
 * - progress_percent === 100
 */
export function hasLanded(flight: any, adsbOnGround?: boolean | null): boolean {
    if (!flight || typeof flight !== 'object') return false;

    // Primary signal: wheels on
    if (flight.actual_on) return true;

    // Secondary signal: gate in
    if (flight.actual_in) return true;

    // Tertiary signal: ADS-B on_ground
    if (adsbOnGround === true) return true;

    // Fallback: 100% progress
    if (flight.progress_percent === 100) return true;

    return false;
}
