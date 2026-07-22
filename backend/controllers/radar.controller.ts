import {authenticate, isAuthError} from "../middleware/auth.ts";
import {verifyToken} from "../utils/jwt.util.ts";
import {z} from "zod";
import {jsonResponse} from "../utils/response.util.ts";
import {getOpenSkyKey} from "../utils/third_party.util.ts";
import {RADAR_INACTIVITY_TIMEOUT_S, RADAR_REFRESH_INTERVAL_S} from "../utils/radar.util.ts";
import type {ServerWebSocket} from "bun";
import {RadarRepository} from "../repositories/radar.repository.ts";
import {RadarDataService} from "../services/radarData.service.ts";

const startRadarSchema = z.object({
    coordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
    }),
    radius: z.number().min(5).max(99),
    expiration: z.iso.datetime().nullable(),
    refresh_interval: z.number().min(30).max(300).optional(),
    inactivity_timeout: z.enum([15, 30, 60, 120, 360, 720]).optional().nullable(), //in minutes
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
        userId: userId,
        name: parsed.data.name || `Radar ${new Date().toLocaleString()}`,
        coordinates: parsed.data.coordinates,
        radius: parsed.data.radius,
        expiration: parsed.data.expiration ? new Date(parsed.data.expiration).getTime() : null,
        refresh_interval: parsed.data.refresh_interval || RADAR_REFRESH_INTERVAL_S,
        inactivity_timeout: parsed.data.inactivity_timeout === undefined
            ? RADAR_INACTIVITY_TIMEOUT_S
            : Number(parsed.data.inactivity_timeout) * 60, //allows null to disable inactivity timeout, saved in seconds
        created_at: Date.now(),
    }

    RadarRepository.createRadar(radarData);

    return jsonResponse(RadarRepository.getRadarByIdAndUser(radarData.uuid, userId), 201);
}

export async function getTrackingRadars(request: Request) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;
    const radars = RadarRepository.getAllRadarsByUser(userId);

    return jsonResponse(radars);
}

export async function getSingleTrackingRadar(request: Request, radarId: string) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const radar = RadarRepository.getRadarByIdAndUser(radarId, userId);
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

    const radar = RadarRepository.getRadarByIdAndUser(radarId, userId);
    if (!radar) {
        return jsonResponse({error: 'Radar not found'}, 404);
    }

    RadarRepository.deleteRadar(radarId, userId);
    return new Response()
}

export async function resumeRadar(request: Request, radarId: string) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const radar = RadarRepository.getRadarByIdAndUser(radarId, userId);
    if (!radar) {
        return jsonResponse({error: 'Radar not found'}, 404);
    }

    //TODO: implementare

    return new Response()
}

/**
 * Websocket live refresh handler
 *
 * Flow:
 * 1. Verifies JWT token
 * 2. Load user requested radar
 * 4. Fetches initial data and then keeps waiting for the next refresh (refresh_interval)
 *
 * Each refresh contains:
 * - aircraft: max 5 aircraft inside radar range with route, airline and aircraft information (if applicable)
 * - openSkyDailyUsage: request made to OpenSky API between today 00:00 and current time
 */
export async function refreshRadar(radarId: string, ws: ServerWebSocket<any>) {
    let userId: number;
    try {
        const payload = await verifyToken(ws.data.token);
        userId = payload.user_id;
    } catch (error) {
        ws.close(1008, 'Invalid or expired token');
        return;
    }

    const radarInstance = RadarRepository.getRadarByIdAndUser(radarId, userId);
    if (!radarInstance) {
        ws.close(1008, 'Radar not found');
        return;
    }

    console.log(`[websocket] Radar ${radarId} connection established.`);

    const date = new Date(); //first refresh date

    const openSkyKey = getOpenSkyKey(userId);

    const computeRefresh = async () => {
        return JSON.stringify({
            aircraft: await RadarDataService.getFlightsInArea(
                radarInstance,
                userId,
                openSkyKey
            ),
        })
    }

    if (ws.readyState === WebSocket.OPEN) {
        ws.send(await computeRefresh())
    }

    setInterval(async () => {
        /* check if radar timeout is reached (delta between now and first refresh).
        radar inactivity_timeout is in seconds
         */
        const delta = new Date().getTime() - date.getTime(); //in ms
        if (radarInstance.inactivity_timeout && delta > (radarInstance.inactivity_timeout * 1000)) {
            ws.close(1008, 'Radar timeout');
            return;
        }

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(await computeRefresh())
        }
    }, radarInstance.refreshIntervalMs);
}
