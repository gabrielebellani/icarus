import {authenticate, isAuthError} from "../middleware/auth.ts";
import {getFlightawareKey} from "../utils/third_party.util.ts";
import {jsonResponse} from "../utils/response.util.ts";
import {FlightawareService} from "../services/flightaware.service.ts";
import {FlightTrackingRefreshService} from "../services/flightTrackingRefresh.service.ts";
import {z} from "zod";
import {addDays, endOfDay, startOfDay, subDays} from "date-fns";
import {db} from "../db.ts";
import {TrackedFlight} from "../classes/TrackedFlight.ts";
import {normalizeFlightPayload} from "../utils/flight.util.ts";

const trackFlightSchema = z.object({
    identifier: z.string().min(4).max(10),
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
    const result = await flightAwareService.fetchFlightInfo(parsed.data.identifier, new Date(parsed.data.date))

    if (result?.flights && Array.isArray(result.flights)) {
        result.flights = result.flights.map((flight: any) => normalizeFlightPayload(flight))
    }

    return jsonResponse(result)
}

export async function getTrackingFlight(request: Request){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id
    const trackedFlightRow = await FlightTrackingRefreshService.refreshTrackedFlight(userId)

    if(trackedFlightRow === null){
        return jsonResponse(null)
    } else {
        return jsonResponse(TrackedFlight.fromDB(trackedFlightRow))
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

    const flightPayload = normalizeFlightPayload(flightInfo.flights[0]);
    db.prepare("INSERT INTO tracked_flights (user_id, iata_code, icao_code, reference_date, payload) values (?, ?, ?, ?, ?)")
        .run(
            userId,
            flightPayload.ident_iata ?? null,
            flightPayload.ident_icao ?? flightPayload.ident,
            parsed.data.date,
            JSON.stringify(flightPayload)
        );

    // Initialize tracking state: derive phase, resolve aircraft identity, set timestamps
    await FlightTrackingRefreshService.initializeTrackingState(userId, flightPayload);

    const trackedFlightRow = await FlightTrackingRefreshService.refreshTrackedFlight(userId);
    return jsonResponse(trackedFlightRow ? TrackedFlight.fromDB(trackedFlightRow) : null)
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
