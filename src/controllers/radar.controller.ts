import {authenticate, isAuthError} from "../middleware/auth.ts";
import {z} from "zod";
import {jsonResponse} from "../utils/response.ts";
import {getFlightawareKey, getOpenSkyKey} from "../utils/third_party.ts";
import {db} from "../index.ts";
import {getBoundingBox, RADAR_INACTIVITY_TIMEOUT_S, RADAR_REFRESH_INTERVAL_S} from "../utils/radar.util.ts";
import {RadarInstance} from "../classes/RadarInstance.ts";
import {OpenSkyService} from "../services/opensky.service.ts";
import type {ServerWebSocket} from "bun";
import {redis} from "bun"
import type {OpenSkyState} from "../classes/OpenSkyState.ts";
import {RadarCommercialFlight} from "../classes/RadarCommercialFlight.ts";
import {AdsbdbService} from "../services/adsbdb.service.ts";
import {FlightawareService} from "../services/flightaware.service.ts";
import {DefaultAircraftTypeDisplayPriority} from "../enums/AircraftTypeEnum.ts";
import {RadarSingleAircraft} from "../classes/RadarSingleAircraft.ts";

const startRadarSchema = z.object({
    coordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
    }),
    radius: z.number().min(5).max(99),
    expiration: z.iso.datetime().nullable(),
    refresh_interval: z.number().optional(),
    inactivity_timeout: z.number().optional().nullable(),
    name: z.string().min(1).max(255).optional(),
})

export async function startTracking(request: Request) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = startRadarSchema.safeParse(body);

    if (!parsed.success) {
        return jsonResponse({errors: parsed.error.issues}, 422);
    }

    const userId = auth.user_id;

    const radarData = {
        uuid: crypto.randomUUID(),
        name: parsed.data.name || `Radar ${new Date().toLocaleString()}`,
        coordinates: parsed.data.coordinates,
        radius: parsed.data.radius,
        expiration: parsed.data.expiration ? new Date(parsed.data.expiration).getTime() : null,
        refresh_interval: parsed.data.refresh_interval || RADAR_REFRESH_INTERVAL_S,
        inactivity_timeout: parsed.data.inactivity_timeout === undefined
            ? RADAR_INACTIVITY_TIMEOUT_S
            : parsed.data.inactivity_timeout, //allows null to disable inactivity timeout
        created_at: Date.now(),
    }

    db.prepare(`
        INSERT INTO radars (id, user_id, name, coordinates, radius, expiration, refresh_interval, inactivity_timeout,
                            created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        radarData.uuid,
        userId,
        radarData.name,
        JSON.stringify(radarData.coordinates),
        radarData.radius,
        radarData.expiration,
        radarData.refresh_interval,
        radarData.inactivity_timeout,
        radarData.created_at
    );

    return jsonResponse(getRadarByIdAndUser(radarData.uuid, userId), 201);
}

export async function getTrackingRadars(request: Request) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const radarRows = db.prepare('SELECT * FROM radars WHERE user_id = ?').all(userId) as any[];
    const radars = radarRows.map(row => RadarInstance.fromDbRow(row));

    return jsonResponse(radars);
}

export async function getSingleTrackingRadar(request: Request, radarId: string) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const radar = getRadarByIdAndUser(radarId, userId);
    if (!radar) {
        return jsonResponse({error: 'Radar not found'}, 404);
    }

    return jsonResponse({
        ...radar,
        daily_usage_projection: {
            opensky_api_calls: 60 * 60 * 24 / radar.refresh_interval,
        }
    });
}

export async function terminateTracking(request: Request, radarId: string) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const radar = getRadarByIdAndUser(radarId, userId);
    if (!radar) {
        return jsonResponse({error: 'Radar not found'}, 404);
    }

    db.prepare('DELETE FROM radars WHERE id = ? AND user_id = ?').run(radarId, userId);

    return new Response()
}

export async function resumeRadar(request: Request, radarId: string) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const radar = getRadarByIdAndUser(radarId, userId);
    if (!radar) {
        return jsonResponse({error: 'Radar not found'}, 404);
    }

    //TODO: implement

    return new Response()
}

//live radar websocket handler
export async function refreshRadar(radarId: string, ws: ServerWebSocket<any>) {
    const radarInstance = getRadarByIdAndUser(radarId, 1); //TODO get user id from ws request context
    if (!radarInstance) {
        ws.close(1008, 'Radar not found');
        return;
    }

    console.log(`[websocket] Radar ${radarId} connection established.`);

    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(await getFlightsInArea(radarInstance.coordinates, radarInstance.radius, 1))) //TODO get user id from ws request context;
    }

    setInterval(async () => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(await getFlightsInArea(radarInstance.coordinates, radarInstance.radius, 1))) //TODO get user id from ws request context;
        }
    }, radarInstance.refreshIntervalMs);
}

export async function getFlightsInArea(coordinates: {
    latitude: number,
    longitude: number
}, radius: number, userId: number) {
    const bbox = getBoundingBox(coordinates.latitude, coordinates.longitude, radius)

    const openskyNetworkKey = getOpenSkyKey(userId);

    const openSkyService = new OpenSkyService(openskyNetworkKey);
    const aircraftInArea = await openSkyService.fetchAircraftInArea(bbox)

    const prioritizedAircraft = getPrioritizedAircraft(aircraftInArea, userId).slice(0, 5)
    const aircraftsToDisplay: RadarSingleAircraft[] = []

    for (const adsbState of prioritizedAircraft) {
        //if it doesn't have a callsign return only adsb data, else get flight info
        if (!adsbState.callsign) {
            aircraftsToDisplay.push(
                new RadarSingleAircraft(adsbState, null)
            )
        } else {
            const flightInfo = await getFlightInfo(adsbState.callsign, userId)
            aircraftsToDisplay.push(
                new RadarSingleAircraft(adsbState, flightInfo)
            )
        }
    }

    return aircraftsToDisplay
}

function getRadarByIdAndUser(radarId: string, userId: number) {
    const radarRow = db.prepare('SELECT * FROM radars WHERE id = ? AND user_id = ?').get(radarId, userId);
    if (!radarRow) {
        return null;
    }
    return RadarInstance.fromDbRow(radarRow);
}

async function getFlightInfo(callsign: string, userId: number) {

    const fallbackFlightSearch = async () => {
        const flightAwareKey = getFlightawareKey(userId);
        if (!flightAwareKey) {
            return null;
        }
        const flightawareService = new FlightawareService(flightAwareKey);
        const flightInfo = await flightawareService.fetchFlightInfo(callsign, new Date());

        if (flightInfo.flights.length === 0) {
            return null
        }

        const flight = flightInfo.flights[0]

        if (!flight) {
            return null;
        }

        return RadarCommercialFlight.buildFromFlightAwareResult(
            callsign, flight
        )
    }
    const fallbackAdsdb = async () => {
        const adsbdbService = new AdsbdbService();
        return await adsbdbService.fetchFlightByCallsign(callsign);
    }

    //search in the database if the route is persisted
    let flightInfo: RadarCommercialFlight | null = getPersistedRoute(callsign)
    if (flightInfo) {
        return flightInfo
    }

    try {
        //search if is available on adsbdb.com
        if (!flightInfo) {
            flightInfo = await fallbackAdsdb()
        }

    } catch (e: any) {
        //if not found, try on FlightAware
        if (e.message === 'Unknown callsign') {
            flightInfo = await fallbackFlightSearch()
        }
    }

    //if not found, return an unknown flight to save future calls to external APIs
    if (!flightInfo) {
        return new RadarCommercialFlight(
            callsign,
            null,
            null,
            null,
            'unknown'
        )
    }

    persistRoute(flightInfo)
        .catch((e) => {
            console.error(e)
        })

    return flightInfo;
}

function getPersistedRoute(callsign: string): RadarCommercialFlight | null {
    const result: any = db.query('SELECT * FROM cached_routes WHERE callsign = ?')
        .get(callsign)

    if (!!result) {
        return RadarCommercialFlight.buildFormPersistedRoute(result)
    }

    return null
}

async function persistRoute(flight: RadarCommercialFlight) {
     db.prepare(
         `INSERT INTO cached_routes (callsign, origin_icao, origin_iata, destination_icao, destination_iata, airline)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (callsign) DO UPDATE SET origin_icao      = excluded.origin_icao,
                                               origin_iata      = excluded.origin_iata,
                                               destination_icao = excluded.destination_icao,
                                               destination_iata = excluded.destination_iata,
                                               airline          = excluded.airline`
     ).run(
         flight.callsign,
         flight.routeInfo?.origin?.icao ?? null,
         flight.routeInfo?.origin?.iata ?? null,
         flight.routeInfo?.destination?.icao ?? null,
         flight.routeInfo?.destination?.iata ?? null,
         flight.routeInfo?.airline?.iata ?? null,
     );
}

function getPrioritizedAircraft(flights: OpenSkyState[], userId: number) {
    const priority = DefaultAircraftTypeDisplayPriority
    const prioritizedFlights: OpenSkyState[] = []

    for (const aircraftTypeEnum of priority) {
        const filteredFlights = flights.filter((flight: OpenSkyState) => flight.aircraft_type === aircraftTypeEnum)
        prioritizedFlights.push(...filteredFlights)
    }
    return prioritizedFlights
}
