import {RadarRepository} from "../repositories/radar.repository.ts";
import {OpenSkyService} from "./opensky.service.ts";
import {AdsbLolService} from "./adsbLol.service.ts";
import {FlightawareService} from "./flightaware.service.ts";
import {AdsbdbService} from "./adsbdb.service.ts";
import {JetapiScraperService} from "./jetapiScraper.service.ts";
import {AircraftTypeEnum, DefaultAircraftTypeDisplayPriority} from "../enums/AircraftTypeEnum.ts";
import {RadarSingleAircraft} from "../classes/RadarSingleAircraft.ts";
import {RadarCommercialFlight} from "../classes/RadarCommercialFlight.ts";
import {AircraftInfo} from "../classes/AircraftInfo.ts";
import {getBoundingBox} from "../utils/radar.util.ts";
import type {OpenSkyState} from "../classes/OpenSkyState.ts";
import {getFlightawareKey} from "../utils/third_party.util.ts";
import type {RadarInstance} from "../classes/RadarInstance.ts";

export class RadarDataService {

    /**
     * Actual radar data retrieval implementation
     */
    static async getFlightsInArea(
        radar: RadarInstance,
        userId: number,
        openSkyKey: string | null
    ): Promise<RadarSingleAircraft[]> {
        // if (!openSkyKey) {
        //     return [];
        // }

        const bbox = getBoundingBox(radar.coordinates.latitude, radar.coordinates.longitude, radar.radius);
        const openSkyService = new OpenSkyService(openSkyKey, userId);
        const aircraftInArea = await openSkyService.fetchAircraftInArea(bbox);

        const prioritizedAircraft = this.getPrioritizedAircraft(aircraftInArea, radar).slice(0, 5);
        return await this.getFlightsInfo(prioritizedAircraft, userId);
    }

    /**
     * Retrieves details on the aircraft
     * - Searches for cached routes
     * - If no cached route is found, fallbacks on ADSB-Lol
     * - If no results are returned from ADSB-Lol, fallbacks on FlightAware
     * - Tries to get aircraft model information from ADSBDB (newest aircraft models may not be available)
     */
    private static async getFlightsInfo(
        statesInArea: OpenSkyState[],
        userId: number
    ): Promise<RadarSingleAircraft[]> {
        // Retrieves routes persisted in database
        const validCallsigns = statesInArea.map(s => s.callsign).filter(c => c !== null);
        const persistedRoutes = RadarRepository.getPersistedRoutes(validCallsigns);

        // Retrieves routes not persisted in database from ADSB-Lol
        const nonPersistedCallsigns = validCallsigns.filter(c => !persistedRoutes.find(r => r.callsign === c));
        const nonPersistedStates = statesInArea.filter(c => c.callsign && nonPersistedCallsigns.includes(c.callsign));

        // Retrieves routes not persisted in database from ADSB-Lol (* first try *) - bulk retrieval is allowed by API
        const adsbLolFetched = nonPersistedStates.length > 0
            ? await this.fetchRoutesFromAdsbLol(nonPersistedStates, userId)
            : [];

        const aircraftsToDisplay: RadarSingleAircraft[] = [];

        for (const stateInArea of statesInArea) {
            const callsign = stateInArea.callsign;

            if (!callsign) {
                // If aircraft has no callsign,it may not have a route:
                // only adsb data and aircraft information (if available) are returned
                aircraftsToDisplay.push(
                    new RadarSingleAircraft(
                        stateInArea,
                        null,
                        await this.getAircraftInformation(stateInArea.icao24, userId)
                    )
                );
                continue;
            }

            // If aircraft has a callsign, it may have a route:
            let routeInfo = persistedRoutes.find(r => r.callsign === callsign) ?? null;


            if (!routeInfo) {
                routeInfo = await this.resolveRouteFromFallbacks(adsbLolFetched, callsign, userId);
            }

            // If route info is not found, an "unknown" route is created to prevent future calls to services.
            // TODO: NTH - add another API fallback (eg. FlightRadar24, AviationEdge, ... ? )
            if (!routeInfo) {
                routeInfo = new RadarCommercialFlight(callsign, null, null, null, 'unknown');
            }

            // Persist route information in cache
            try {
                RadarRepository.persistRoute(routeInfo);
            } catch (e) {
                console.error(`[RadarDataService] Error persisting route for ${callsign}:`, e);
            }

            aircraftsToDisplay.push(
                new RadarSingleAircraft(
                    stateInArea,
                    routeInfo,
                    await this.getAircraftInformation(stateInArea.icao24, userId)
                )
            );
        }

        return aircraftsToDisplay;
    }

    /**
     * Try to resolve route through fallbacks (ADSB-Lol and FlightAware)
     * @param adsbLolFetched Routes fetched from ADSB-Lol (first try, passed from caller because bulk retrieval is allowed by API)
     * @param callsign Callsign of the aircraft
     * @param userId User ID
     */
    private static async resolveRouteFromFallbacks(
        adsbLolFetched: any[],
        callsign: string,
        userId: number
    ): Promise<RadarCommercialFlight | null> {
        const adsbLolRoute = adsbLolFetched.find(r => r.callsign === callsign);

        if (!adsbLolRoute) {
            return null;
        }

        if (adsbLolRoute.route && adsbLolRoute.plausible) {
            return adsbLolRoute.route;
        }

        if (adsbLolRoute.route === null) {
            // Fallback on FlightAware
            return await this.fetchRouteFromFlightAware(callsign, userId);
        }

        return null;
    }

    /**
     * Search route on ADSB-Lol
     */
    private static async fetchRoutesFromAdsbLol(states: OpenSkyState[], userId: number): Promise<any[]> {
        const adsblolService = new AdsbLolService(userId);
        const objs = states.map(e => ({
            callsign: e.callsign,
            lat: e.latitude,
            lng: e.longitude
        }));

        try {
            return await adsblolService.fetchFlightsByCallsignAndPosition(objs as unknown as {
                callsign: string;
                lat: string;
                lng: string;
            }[]);
        } catch (e) {
            console.error('[RadarDataService] Error fetching routes from ADSB-Lol:', e);
            return [];
        }
    }

    /**
     * Search route on FlightAware
     */
    private static async fetchRouteFromFlightAware(
        callsign: string,
        userId: number
    ): Promise<RadarCommercialFlight | null> {
        const flightAwareKey = getFlightawareKey(userId);

        if (!flightAwareKey) {
            return null;
        }

        const flightawareService = new FlightawareService(flightAwareKey, userId);
        const flightInfo = await flightawareService.fetchFlightInfo(callsign, new Date());

        if (!flightInfo.flights.length) {
            return null;
        }

        const flight = flightInfo.flights[0];
        return flight ? RadarCommercialFlight.buildFromFlightAwareResult(callsign, flight) : null;
    }

    /**
     * Retrieves aircraft model information
     */
    private static async getAircraftInformation(icao24: string, userId: number): Promise<AircraftInfo | null> {
        // Search cached data
        const fromDB = RadarRepository.getPersistedAircraft(icao24);
        if (fromDB) {
            return AircraftInfo.buildFromPersistedRecord(fromDB);
        }

        // Fetch from adsbdb
        const aircraftInfo = await new AdsbdbService(userId).fetchAircraftInformationByIcao24(icao24);

        // If adsbdb data doesn't include aircraft image, I try to get one from jetapi service (scraping)
        if (!aircraftInfo?.cover_url && aircraftInfo?.registration) {
            aircraftInfo.cover_url = await new JetapiScraperService(userId).fetchImagesForAircraft(aircraftInfo.registration);
        }

        // Persist aircraft information in cache
        try {
            RadarRepository.persistAircraftInfo(icao24, aircraftInfo);
        } catch (e) {
            console.error(`[RadarDataService] Error persisting aircraft info for ${icao24}:`, e);
        }

        return aircraftInfo;
    }

    /**
     * Sort adsb aircraft by priority based on type and ascending distance from the radar center coordinates
     * Note: currently OpenSky does not return the correct aircraft type, it always returns 0 (No Info)
     */
    private static getPrioritizedAircraft(flights: OpenSkyState[], radar: RadarInstance): OpenSkyState[] {
        const priority = DefaultAircraftTypeDisplayPriority;
        const prioritizedFlights: OpenSkyState[] = [];

        for (const aircraftTypeEnum of priority) {
            const filteredFlights = flights.filter(
                (flight: OpenSkyState) =>
                    flight.aircraft_type === aircraftTypeEnum ||
                    (
                        flight.aircraft_type > AircraftTypeEnum.Others &&
                        flight.aircraft_type < AircraftTypeEnum.SpecialTypesMinimum
                    )
            );
            prioritizedFlights.push(...filteredFlights);
        }

        return prioritizedFlights
            .map(state => {
                state.distanceFromRadarCenter = radar.coordinates
                return state
            })
            .filter(state =>
                state.distanceFromRadarCenter !== null
                && state.distanceFromRadarCenter <= (radar.radius * 1000 /* convert to meters */)
            )
            .sort((a: OpenSkyState, b: OpenSkyState) => {
                if (a.distanceFromRadarCenter && b.distanceFromRadarCenter) {
                    return a.distanceFromRadarCenter - b.distanceFromRadarCenter
                }
                return 1
            })
    }
}
