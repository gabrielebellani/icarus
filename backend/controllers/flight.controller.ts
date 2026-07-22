import {authenticate, isAuthError} from "../middleware/auth.ts";
import {getFlightawareKey} from "../utils/third_party.ts";
import {jsonResponse} from "../utils/response.ts";
import {FlightawareService} from "../services/flightaware.service.ts";
import {z} from "zod";
import {addDays, endOfDay, startOfDay, subDays} from "date-fns";
import {db} from "../index.ts";
import {TrackedFlight} from "../classes/TrackedFlight.ts";

const trackFlightSchema = z.object({
    identifier: z.string().min(4).max(6),
    date: z.iso.date()
        .refine(
            (date) => {
                const inputDate = new Date(date)
                return inputDate <= endOfDay(addDays(new Date(), 2))
            },
            {error: 'Flight date can be at maximum two days in the future'}
        )
        .refine(
            (date) => {
                const inputDate = new Date(date)
                return inputDate >= startOfDay(subDays(new Date(), 2))
            },
            {error: 'Flight date can be at minimum two days in the past'}
        )
});

export async function searchFlight(request: Request) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const url = new URL(request.url)
    const parsed = trackFlightSchema.safeParse({
        identifier: url.searchParams.get('identifier'),
        date: url.searchParams.get('date'),
    });
    if (!parsed.success) {
        return jsonResponse({errors: parsed.error.issues}, 422);
    }

    const userId = auth.user_id
    const flightAwareKey = getFlightawareKey(userId)
    if (flightAwareKey === null) {
        return jsonResponse({error: "Flightaware API key is missing."}, 400)
    }

    const flightAwareService = new FlightawareService(flightAwareKey, userId)
    return jsonResponse(await flightAwareService.fetchFlightInfo(parsed.data.identifier, new Date(parsed.data.date)))
}

export async function getTrackingFlight(request: Request){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id
    const trackedFlight = getTrackedFlight(userId)

    if(trackedFlight === null){
        return jsonResponse(null)
    }else{
        return jsonResponse(trackedFlight)
    }

}

export async function startTracking(request: Request){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = trackFlightSchema.safeParse(body);

    if (!parsed.success) {
        return jsonResponse({errors: parsed.error.issues}, 422);
    }

    const userId = auth.user_id
    const flightAwareKey = getFlightawareKey(userId)
    if (flightAwareKey === null) {
        return jsonResponse({error: "Flightaware API key is missing."}, 400)
    }

    const flightAwareService = new FlightawareService(flightAwareKey, userId)
    const flightInfo = await flightAwareService.fetchFlightInfo(parsed.data.identifier, new Date(parsed.data.date))

    if(flightInfo.flights.length === 0){
        return jsonResponse({error: "Flight not found"}, 404)
    }

    //removes currently tracked flight for user (only one can be tracked)
    stopTracking(userId)

    db.prepare("INSERT INTO tracked_flights (user_id, iata_code, icao_code, reference_date, payload) values (?, ?, ?, ?, ?)")
        .run(
            userId,
            flightInfo.flights[0].ident_iata ?? null,
            flightInfo.flights[0].ident_icao ?? flightInfo.flights[0].ident,
            parsed.data.date,
            JSON.stringify(flightInfo.flights[0])
        );

    return jsonResponse(getTrackedFlight(userId))
}

export async function terminateTracking(request: Request){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id
    stopTracking(userId)

    return new Response()
}

function stopTracking(userId: number){
    db.prepare("DELETE FROM tracked_flights WHERE user_id = ?").run(userId)
}

function getTrackedFlight(userId: number): TrackedFlight | null {
    const row = db.prepare("SELECT * FROM tracked_flights WHERE user_id = ? LIMIT 1")
        .get(userId)

    if (row) {
        return TrackedFlight.fromDB(row)
    } else {
        return null
    }
}
