import {db} from "../index.ts";
import {TrackedAirport} from "../classes/TrackedAirport.ts";
import {authenticate, isAuthError} from "../middleware/auth.ts";
import {jsonResponse} from "../utils/response.ts";
import {searchAirports} from "../utils/airports.util.ts";
import {z} from "zod";

export async function searchAirport(request: Request) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const url = new URL(request.url)
    const query = url.searchParams.get('query') || ''

    if (query.length < 3) {
        return jsonResponse({error: "Query must be at least 3 characters long."}, 422)
    }

    const results = searchAirports(query)

    return jsonResponse(results)
}

export async function getTrackingAirports(request: Request){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    return jsonResponse(getTrackedAirports(auth.user_id))
}

export async function terminateTracking(request: Request, id: number){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id
    stopTracking(userId, id)

    return new Response()
}

const trackAirportUpdateSchema = z.object({
    direction: z.enum(['in', 'in_out', 'out']),
})

export async function updateTracking(request: Request, id: number){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = trackAirportUpdateSchema.safeParse(body);

    if (!parsed.success) {
        return jsonResponse({errors: parsed.error.issues}, 422);
    }

    const userId = auth.user_id
    const {direction} = parsed.data

    const result = db.prepare("UPDATE tracked_airports SET direction = ? WHERE user_id = ? AND id = ?")
        .run(direction, userId, id)

    if(result.changes === 0){
        return jsonResponse({error: "Tracking not found"}, 404)
    }

    return jsonResponse({message: "Tracking updated", airport: getTrackedAirportById(userId, id)})
}

function getTrackedAirports(userId: number): (TrackedAirport | null)[] {
    return db.prepare("SELECT * FROM tracked_airports WHERE user_id = ? LIMIT 1")
        .all(userId)
        .map(row => row ? TrackedAirport.fromDB(row) : null)
}

function getTrackedAirportById(userId: number, id: number): TrackedAirport | null {
    const row = db.prepare("SELECT * FROM tracked_airports WHERE user_id = ? AND id = ?")
        .get(userId, id)

    return row ? TrackedAirport.fromDB(row) : null
}

function stopTracking(userId: number, id: number){
    db.prepare("DELETE FROM tracked_airports WHERE user_id = ? AND id = ?").run(userId, id)
}
