import {db} from "../index.ts";
import {TrackedAirport} from "../classes/TrackedAirport.ts";
import {authenticate, isAuthError} from "../middleware/auth.ts";
import {jsonResponse} from "../utils/response.ts";
import {searchAirports} from "../utils/airports.util.ts";

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

function getTrackedAirports(userId: number): (TrackedAirport | null)[] {
    return db.prepare("SELECT * FROM tracked_airports WHERE user_id = ? LIMIT 1")
        .all(userId)
        .map(row => row ? TrackedAirport.fromDB(row) : null)
}
