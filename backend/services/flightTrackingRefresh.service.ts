import {AdsbdbService} from './adsbdb.service.ts';
import {OpenSkyService} from './opensky.service.ts';
import {AdsbLolService, type AdsbLolState} from './adsbLol.service.ts';
import {JetapiScraperService} from './jetapiScraper.service.ts';
import {RadarRepository} from '../repositories/radar.repository.ts';
import {db} from '../db.ts';
import {getFlightawareKey, getOpenSkyKey} from '../utils/third_party.util.ts';
import {FlightawareService} from './flightaware.service.ts';
import {normalizeFlightPayload, hasLanded} from '../utils/flight.util.ts';
import {ThirdPartyQuotaExceededError} from '../errors/ThirdPartyQuotaExceededError.ts';

type FlightPhase = 'ground' | 'airborne' | 'completed';
type DataSource = 'flightaware' | 'adsb.lol' | 'opensky' | null;

// Normal cheap ADS-B polling cadence. Stays constant during final approach too —
// only the (expensive) FlightAware cadence changes there.
const ADSB_POLL_INTERVAL_MS = 60 * 1000; // 60 sec
// Fallback cadence used both for registration retry AND for FlightAware calls
// while in degraded mode (ADS-B sources unavailable) — keeps costly calls rare.
const FLIGHTAWARE_RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 min
// Final approach interval: when progress >= 90%, call FlightAware every 5 min for precision
// (on top of the ADS-B calls, which keep happening every ADSB_POLL_INTERVAL_MS).
const FINAL_APPROACH_INTERVAL_MS = 5 * 60 * 1000; // 5 min
// Once progress reaches this threshold, call FlightAware on every poll regardless of cadence.
const FINAL_APPROACH_PRECISION_PROGRESS = 95;
// 5 minutes before estimated landing, trigger a FlightAware call
const FINAL_APPROACH_WINDOW_MS = 5 * 60 * 1000; // 5 min

/**
 * Core flight tracking refresh orchestration service.
 * Manages smart throttling between cheap ADS-B state calls and expensive FlightAware updates.
 * Tracks a "degraded mode" flag whenever cheap ADS-B sources (adsb.lol / OpenSky) are
 * unavailable, forcing reliance on FlightAware as the sole data source.
 */
export class FlightTrackingRefreshService {
    /**
     * Derive initial phase from flight payload.
     * - 'completed': canceled, diverted, or arrived (actual_on/actual_in present or progress_percent === 100)
     * - 'airborne': any in-flight indication (actual_off, estimated_off, or progress_percent > 0)
     * - 'ground': default
     */
    static deriveInitialPhase(flight: any): FlightPhase {
        if (flight.cancelled || flight.diverted) return 'completed';
        if (flight.actual_on || flight.actual_in || flight.progress_percent === 100) return 'completed';
        if (flight.actual_off || flight.estimated_off || flight.progress_percent > 0) return 'airborne';
        return 'ground';
    }

    /**
     * Resolve aircraft identity: registration → icao24 + image URL.
     * 1. Fetch from adsbdb by registration (returns mode_s as icao24)
     * 2. If no cover_url, try jetapi scraper as fallback
     * 3. Persist to cached_icao24 via RadarRepository
     * Returns { icao24, imageUrl } or null if not found.
     */
    static async resolveAircraftIdentity(
        registration: string | null,
        userId: number
    ): Promise<{ icao24: string; imageUrl: string | null } | null> {
        if (!registration) return null;

        try {
            const adsbdbService = new AdsbdbService(userId);
            const aircraftInfo = await adsbdbService.fetchAircraftInformationByRegistration(registration);

            if (!aircraftInfo) return null;

            let imageUrl = aircraftInfo.cover_url;

            // Fallback to jetapi if no image from adsbdb
            if (!imageUrl) {
                imageUrl = await new JetapiScraperService(userId).fetchImagesForAircraft(registration);
            }

            // Persist to shared cache
            try {
                RadarRepository.persistAircraftInfo(aircraftInfo.icao24, aircraftInfo);
            } catch (e) {
                console.error(
                    `[FlightTrackingRefreshService] Error persisting aircraft info for icao24 ${aircraftInfo.icao24}:`,
                    e
                );
            }

            return { icao24: aircraftInfo.icao24, imageUrl };
        } catch (error) {
            console.error(`[FlightTrackingRefreshService] Error resolving identity for registration ${registration}:`, error);
            return null;
        }
    }

    /**
     * Fetch cheap ADS-B state: try adsb.lol with registration first (most reliable),
     * then adsb.lol with icao24, then fallback to OpenSky with icao24.
     * Returns the normalized state plus which source actually answered, or null if all failed.
     */
    static async fetchAdsbState(
        icao24: string,
        userId: number,
        registration?: string | null
    ): Promise<{ state: AdsbLolState; source: 'adsb.lol' | 'opensky' } | null> {
        const adsbLolService = new AdsbLolService(userId);

        // Try adsb.lol by registration first (most reliable)
        if (registration) {
            const adsbLolStateByReg = await adsbLolService.fetchStateByRegistration(registration);
            if (adsbLolStateByReg) {
                return {state: adsbLolStateByReg, source: 'adsb.lol'};
            }
        }

        // Try adsb.lol by icao24
        const adsbLolState = await adsbLolService.fetchStateByIcao24(icao24);
        if (adsbLolState) {
            return {state: adsbLolState, source: 'adsb.lol'};
        }

        // Fallback to OpenSky with icao24
        const openSkyKey = getOpenSkyKey(userId);
        const openSkyService = new OpenSkyService(openSkyKey, userId);
        const openSkyState = await openSkyService.fetchStateByIcao24(icao24);
        if (openSkyState) {
            return {
                state: {
                    on_ground: openSkyState.on_ground,
                    velocity: openSkyState.velocity,
                    altitude: openSkyState.baro_altitude,
                },
                source: 'opensky',
            };
        }

        return null;
    }

    /**
     * Double-check if aircraft is airborne.
     * Signal: on_ground === false AND velocity > 35 m/s (≈68 kt) AND altitude > 100 m
     */
    static isAirborne(state: AdsbLolState): boolean {
        if (state.on_ground === true) return false;
        const velocity = state.velocity ?? 0;
        const altitude = state.altitude ?? 0;
        return velocity > 35 && altitude > 100;
    }

    /**
     * Determine if flight is in final approach mode (>= 90% progress).
     */
    static isFinalApproach(flight: any): boolean {
        return flight && typeof flight.progress_percent === 'number' && flight.progress_percent >= 90;
    }

    /**
     * Get estimated landing time (ISO string → ms since epoch).
     * Try: actual_on → estimated_on → scheduled_on → estimated_in → scheduled_in
     */
    static getEstimatedLandingTimeMs(flight: any): number | null {
        const times = [
            flight.actual_on,
            flight.estimated_on,
            flight.scheduled_on,
            flight.estimated_in,
            flight.scheduled_in
        ];
        
        for (const time of times) {
            if (typeof time === 'string') {
                const ms = new Date(time).getTime();
                if (Number.isFinite(ms)) return ms;
            }
        }
        
        return null;
    }

    /**
     * Initialize tracking state after startTracking inserts the row.
     * - Derive phase from flight payload
     * - Attempt aircraft identity resolution if registration present
     * - Update row with icao24, phase, imageUrl, timestamps, data_source, degraded_mode
     */
    static async initializeTrackingState(userId: number, flightPayload: any): Promise<void> {
        try {
            const normalizedFlightPayload = normalizeFlightPayload(flightPayload);
            const phase = this.deriveInitialPhase(normalizedFlightPayload);
            let icao24: string | null = null;
            let imageUrl: string | null = null;

            // Try to resolve registration → icao24 + image
            if (normalizedFlightPayload.registration) {
                const identity = await this.resolveAircraftIdentity(normalizedFlightPayload.registration, userId);
                if (identity) {
                    icao24 = identity.icao24;
                    imageUrl = identity.imageUrl;
                }
            }

            // Merge imageUrl into payload
            const updatedPayload = { ...normalizedFlightPayload, aircraft_image_url: imageUrl };

            // No ADS-B data has been fetched yet — start in degraded mode with FlightAware
            // as the source of truth; the next refresh cycle will attempt cheap ADS-B.
            db.prepare(
                `UPDATE tracked_flights 
                 SET icao24 = ?, phase = ?, last_flightaware_at = ?, payload = ?, data_source = ?, degraded_mode = ?, adsb_state = NULL
                 WHERE user_id = ?`
            ).run(icao24, phase, Date.now(), JSON.stringify(updatedPayload), 'flightaware', 1, userId);
        } catch (error) {
            console.error(`[FlightTrackingRefreshService] Error initializing tracking state for user ${userId}:`, error);
            // Non-fatal: row was inserted, refresh will handle missing icao24
        }
    }

    /**
     * Main refresh entry point: called from getTrackingFlight.
     * Implements smart throttling logic:
     * - If phase === 'completed': return as-is (no calls)
     * - If icao24 null: retry FlightAware every 5 min (registration not yet published), degraded mode stays true
     * - If icao24 known: call cheap ADS-B state every 60s; if unavailable, fall back to FlightAware
     *   every 5 min and mark degraded mode; trigger FlightAware on phase transitions regardless
     */
    static async refreshTrackedFlight(userId: number): Promise<{
        id: number;
        user_id: number;
        iata_code: string | null;
        icao_code: string | null;
        reference_date: string;
        payload: any;
        icao24: string | null;
        phase: FlightPhase;
        last_adsb_at: number | null;
        last_flightaware_at: number | null;
        adsb_state: string | null;
        data_source: DataSource;
        degraded_mode: number;
    } | null> {
        const row = db.prepare(`SELECT * FROM tracked_flights WHERE user_id = ? LIMIT 1`).get(userId) as any;

        if (!row) return null;

        const now = Date.now();
        let payload = normalizeFlightPayload(JSON.parse(row.payload || '{}'), now);
        let {icao24, last_adsb_at, last_flightaware_at} = row;
        let dataSource: DataSource = row.data_source ?? null;
        let degradedMode: boolean = !!row.degraded_mode;
        
        // Re-derive phase from normalized payload to catch state changes
        // (e.g., actual_in appearing after normalization)
        let phase = this.deriveInitialPhase(payload);

        // Phase 1: Already completed, no updates needed
        if (phase === 'completed') {
            // Update DB if phase changed to completed
            if (row.phase !== 'completed') {
                db.prepare(
                    `UPDATE tracked_flights 
                     SET phase = ?, payload = ?
                     WHERE user_id = ?`
                ).run(phase, JSON.stringify(payload), userId);
            }
            return db.prepare(`SELECT * FROM tracked_flights WHERE user_id = ?`).get(userId) as any;
        }

        // Phase 2: Registration not yet resolved (icao24 null) — no ADS-B possible at all
        if (!icao24) {
            const needsFlightAwareRetry = !last_flightaware_at || now - last_flightaware_at >= FLIGHTAWARE_RETRY_INTERVAL_MS;

            dataSource = 'flightaware';

            if (needsFlightAwareRetry && payload.registration) {
                // Try to resolve identity again
                const identity = await this.resolveAircraftIdentity(payload.registration, userId);
                if (identity) {
                    icao24 = identity.icao24;
                    payload.aircraft_image_url = identity.imageUrl;
                    phase = this.deriveInitialPhase(payload);
                    last_flightaware_at = now;
                }

                db.prepare(
                    `UPDATE tracked_flights 
                     SET icao24 = ?, phase = ?, last_flightaware_at = ?, payload = ?, data_source = ?, degraded_mode = ?, adsb_state = NULL
                     WHERE user_id = ?`
                ).run(icao24, phase, last_flightaware_at, JSON.stringify(payload), dataSource, 1, userId);

                return db.prepare(`SELECT * FROM tracked_flights WHERE user_id = ?`).get(userId) as any;
            }

            // Still no icao24 and no retry due yet, return cached (but reflect degraded flag)
            db.prepare(`UPDATE tracked_flights SET data_source = ?, degraded_mode = ? WHERE user_id = ?`)
                .run(dataSource, 1, userId);
            return db.prepare(`SELECT * FROM tracked_flights WHERE user_id = ?`).get(userId) as any;
        }

        // Phase 3: icao24 known, not completed
        // Determine polling interval:
        // - Normal ADS-B (including final approach): 60 sec checks
        // - Degraded mode (no ADS-B): 5 min checks (still retries ADS-B on that cadence)
        const inFinalApproach = this.isFinalApproach(payload);
        const pollInterval = degradedMode ? FLIGHTAWARE_RETRY_INTERVAL_MS : ADSB_POLL_INTERVAL_MS;
        const needsCheck = !last_adsb_at || now - last_adsb_at >= pollInterval;

        // Also check if we need to call FlightAware at critical times during final approach
        let needsFinalApproachCheck = false;
        if (inFinalApproach && phase === 'airborne' && !payload.actual_in) {
            const estimatedLandingMs = this.getEstimatedLandingTimeMs(payload);
            if (estimatedLandingMs !== null) {
                // Trigger FlightAware call:
                // 1. 5 minutes before estimated landing
                // 2. At estimated landing time
                const timeUntilLanding = estimatedLandingMs - now;
                needsFinalApproachCheck = 
                    (timeUntilLanding <= FINAL_APPROACH_WINDOW_MS && timeUntilLanding > 0) ||
                    (Math.abs(timeUntilLanding) < 60000); // Within 1 min of landing
            }
        }

        if (needsCheck || needsFinalApproachCheck) {
            last_adsb_at = now;
            let adsbStateRecord: (AdsbLolState & { updated_at: number }) | null = null;

            // Always attempt cheap ADS-B first — including during final approach and when
            // recovering from degraded mode, so a source coming back online is picked up.
            const adsbResult = await this.fetchAdsbState(icao24, userId, payload.registration);

            if (adsbResult) {
                // Cheap ADS-B available: exit degraded mode
                degradedMode = false;
                dataSource = adsbResult.source;
                adsbStateRecord = {...adsbResult.state, updated_at: now};

                // Transition detection: ground → airborne
                if (phase === 'ground' && this.isAirborne(adsbResult.state)) {
                    console.log(
                        `[FlightTrackingRefreshService] Takeoff detected for user ${userId}; refreshing FlightAware`
                    );
                    const updatedPayload = await this.fetchLatestFlightInfo(payload, userId);
                    if (updatedPayload) {
                        payload = normalizeFlightPayload(updatedPayload, now);
                        phase = 'airborne';
                        last_flightaware_at = now;
                        dataSource = 'flightaware';
                    }
                }
                // Transition detection: airborne → landed (check payload actual_on + ADS-B on_ground)
                else if (phase === 'airborne' && hasLanded(payload, adsbResult.state.on_ground)) {
                    console.log(
                        `[FlightTrackingRefreshService] Landing detected for user ${userId}; refreshing FlightAware`
                    );
                    const updatedPayload = await this.fetchLatestFlightInfo(payload, userId);
                    if (updatedPayload) {
                        payload = normalizeFlightPayload(updatedPayload, now);
                        phase = 'completed';
                        last_flightaware_at = now;
                        dataSource = 'flightaware';
                    }
                }
                // Final approach: ADS-B keeps polling every minute (above), but also call
                // FlightAware on its own 5 min cadence — sooner if progress hits 95% or
                // any ADS-B source reports the aircraft on the ground.
                else if (inFinalApproach && phase === 'airborne') {
                    const onGroundSignal = adsbResult.state.on_ground === true;
                    const needsFlightAwareUpdate = !last_flightaware_at ||
                        now - last_flightaware_at >= FINAL_APPROACH_INTERVAL_MS ||
                        payload.progress_percent >= FINAL_APPROACH_PRECISION_PROGRESS ||
                        onGroundSignal ||
                        needsFinalApproachCheck;

                    if (needsFlightAwareUpdate) {
                        console.log(
                            `[FlightTrackingRefreshService] Final approach: calling FlightAware for user ${userId}`
                        );
                        const updatedPayload = await this.fetchLatestFlightInfo(payload, userId);
                        if (updatedPayload) {
                            payload = normalizeFlightPayload(updatedPayload, now);
                            last_flightaware_at = now;

                            // Check if landed during final approach (check actual_on first, then actual_in)
                            if (hasLanded(payload) && phase === 'airborne') {
                                phase = 'completed';
                                console.log(
                                    `[FlightTrackingRefreshService] Flight landed during final approach for user ${userId} (actual_on: ${!!payload.actual_on}, actual_in: ${!!payload.actual_in})`
                                );
                            }
                            dataSource = 'flightaware';
                        }
                    }
                }
            } else {
                // Both adsb.lol and OpenSky failed: fall back to FlightAware as sole source of truth
                degradedMode = true;

                const needsFlightAwareFallback = !last_flightaware_at || now - last_flightaware_at >= FLIGHTAWARE_RETRY_INTERVAL_MS;

                if (needsFlightAwareFallback) {
                    console.log(
                        `[FlightTrackingRefreshService] ADS-B sources unavailable for user ${userId}; falling back to FlightAware (degraded mode)`
                    );
                    const updatedPayload = await this.fetchLatestFlightInfo(payload, userId);
                    if (updatedPayload) {
                        payload = normalizeFlightPayload(updatedPayload, now);
                        phase = this.deriveInitialPhase(payload);
                        last_flightaware_at = now;
                    }
                }

                dataSource = 'flightaware';
            }

            // Persist state regardless of ADS-B call outcome (throttle even on failure)
            // Final check: if payload now indicates landed, force phase to completed
            if (hasLanded(payload) && phase !== 'completed') {
                phase = 'completed';
                console.log(
                    `[FlightTrackingRefreshService] Force phase to completed for user ${userId} (actual_on: ${!!payload.actual_on}, actual_in: ${!!payload.actual_in}, progress: ${payload.progress_percent}%)`
                );
            }
            
            db.prepare(
                `UPDATE tracked_flights 
                 SET phase = ?, last_adsb_at = ?, last_flightaware_at = ?, payload = ?, adsb_state = ?, data_source = ?, degraded_mode = ?
                 WHERE user_id = ?`
            ).run(
                phase,
                last_adsb_at,
                last_flightaware_at,
                JSON.stringify(payload),
                adsbStateRecord ? JSON.stringify(adsbStateRecord) : null,
                dataSource,
                degradedMode ? 1 : 0,
                userId
            );
        }

        return db.prepare(`SELECT * FROM tracked_flights WHERE user_id = ?`).get(userId) as any;
    }

    /**
     * Helper: fetch latest flight info from FlightAware and merge into existing payload.
     * Returns updated payload or null if fetch fails.
     */
    private static async fetchLatestFlightInfo(currentPayload: any, userId: number): Promise<any | null> {
        try {
            const flightAwareKey = getFlightawareKey(userId);
            if (!flightAwareKey) return null;

            const flightAwareService = new FlightawareService(flightAwareKey, userId);
            const result = await flightAwareService.fetchFlightInfo(
                currentPayload.ident_iata || currentPayload.ident_icao || currentPayload.ident,
                new Date(currentPayload.scheduled_out || currentPayload.scheduled_off)
            );

            if (result.flights && result.flights.length > 0) {
                // Merge new data while preserving aircraft_image_url
                return normalizeFlightPayload({ ...result.flights[0], aircraft_image_url: currentPayload.aircraft_image_url });
            }

            return null;
        } catch (error) {
            if (error instanceof ThirdPartyQuotaExceededError) {
                throw error;
            }
            console.error(`[FlightTrackingRefreshService] Error fetching updated flight info:`, error);
            return null;
        }
    }
}
