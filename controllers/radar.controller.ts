import {authenticate, isAuthError} from "../middleware/auth.ts";
import {z} from "zod";
import {jsonResponse} from "../utils/response.ts";
import {getOpenSkyKey} from "../utils/third_party.ts";
import {db} from "../index.ts";
import {RADAR_REFRESH_INTERVAL_S, RADAR_INACTIVITY_TIMEOUT_S} from "../utils/radar.util.ts";
import {RadarInstance} from "../classes/RadarInstance.ts";

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
    const openskyNetworkKey = getOpenSkyKey(userId);
    if(!openskyNetworkKey){
        return jsonResponse({error: "OpenSky Network API key is missing."}, 404);
    }

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
        INSERT INTO radars (id, user_id, name, coordinates, radius, expiration, refresh_interval, inactivity_timeout, created_at)
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

    return jsonResponse(radar);
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

function getRadarByIdAndUser(radarId: string, userId: number) {
    const radarRow = db.prepare('SELECT * FROM radars WHERE id = ? AND user_id = ?').get(radarId, userId);
    if (!radarRow) {
        return null;
    }
    return RadarInstance.fromDbRow(radarRow);

}
