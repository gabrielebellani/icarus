import {db} from "../index.ts";
import {TrackedAirport} from "../classes/TrackedAirport.ts";
import {authenticate, isAuthError} from "../middleware/auth.ts";
import {jsonResponse} from "../utils/response.ts";
import {getAirportByCode, searchAirports} from "../utils/airports.util.ts";
import {z} from "zod";
import {getFlightawareKey} from "../utils/third_party.ts";
import {FlightawareService} from "../services/FlightAware/flightaware.service.ts";
import {addHours, subHours} from "date-fns";

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

const trackAirportSchema = z.object({
    icao_code: z.string().nullable(),
    iata_code: z.string().nullable(),
    direction: z.enum(['in', 'in_out', 'out']),
})

export async function startTracking(request: Request){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = trackAirportSchema.safeParse(body);

    if (!parsed.success) {
        return jsonResponse({errors: parsed.error.issues}, 422);
    }

    const userId = auth.user_id
    const {icao_code, iata_code, direction} = parsed.data

    const airport = getAirportByCode(icao_code ?? iata_code ?? '')
    if(!airport){
        return jsonResponse({error: "Airport not found with provided ICAO or IATA code."}, 404)
    }

    if (isAirportAlreadyTracked(userId, airport.icao, airport.iata, direction).already_tracked > 0) {
        return jsonResponse({error: "This airport is already being tracked in the same direction."}, 409)
    }

    const result = db.prepare("INSERT INTO tracked_airports (user_id, icao_code, iata_code, name, city, direction, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(userId, airport.icao, airport.iata, airport.airport, airport.city, direction, airport.latitude, airport.longitude)

    return jsonResponse(getTrackedAirportById(userId, result.lastInsertRowid as number))
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

    const airport = getTrackedAirportById(userId, id)
    if(airport === null){
        return jsonResponse({error: "Tracking not found"}, 404)
    }

    if (isAirportAlreadyTracked(userId, airport.icao_code, airport.iata_code, direction, airport.id).already_tracked > 0) {
        return jsonResponse({error: "This airport is already being tracked in the same direction."}, 409)
    }

    db.prepare("UPDATE tracked_airports SET direction = ? WHERE user_id = ? AND id = ?")
        .run(direction, userId, id)

    return jsonResponse(getTrackedAirportById(userId, id))
}

const airportTimetableQuerySchema = z.object({
    start: z.iso.datetime()
        .refine(
            (datetime) => {
                const inputDate = new Date(datetime)
                return inputDate >= subHours(new Date(), 24)
            },
            {error: 'Start date can be at minimum 24 hours in the past'}
        )
        .refine(
            (datetime) => {
                const inputDate = new Date(datetime)
                return inputDate <= addHours(new Date(), 22)
            },
            {error: 'Start date can be at maximum 22 hours in the future'}
        ),
    end: z.iso.datetime()
        .refine(
            (datetime) => {
                const inputDate = new Date(datetime)
                return inputDate >= subHours(new Date(), 2)
            },
            {error: 'End date can be at minimum 22 hours in the past'}
        )
        .refine(
            (datetime) => {
                const inputDate = new Date(datetime)
                return inputDate <= addHours(new Date(), 24)
            },
            {error: 'End date can be at maximum 24 hours in the future'}
        )
}).refine(
    (data) => new Date(data.start) < new Date(data.end),
    {error: 'Start date must be before end date'}
)

export async function getAirportTimetable(request: Request, id: number){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const url = new URL(request.url)
    const parsed = airportTimetableQuerySchema.safeParse({
        start: url.searchParams.get('start'),
        end: url.searchParams.get('end'),
    });
    if (!parsed.success) {
        return jsonResponse({errors: parsed.error.issues}, 422);
    }

    const userId = auth.user_id
    const trackedAirport = getTrackedAirportById(userId, id)

    if(trackedAirport === null){
        return jsonResponse({error: "Tracking not found"}, 404)
    }

    if(trackedAirport.icao_code === null && trackedAirport.iata_code === null){
        return jsonResponse({error: "Tracked airport has no valid ICAO or IATA code."}, 400)
    }

    const flightAwareKey = getFlightawareKey(userId)
    if (flightAwareKey === null) {
        return jsonResponse({error: "Flightaware API key is missing."}, 400)
    }

    const responseData: {
        arrivals?: any[]
        departures?: any[]
    } = {}

    const flightAwareService = new FlightawareService(flightAwareKey)
    if(trackedAirport.direction === 'in_out'){
        const timetable: any = await flightAwareService.fetchAirportTimetable(
            !!trackedAirport.icao_code ? trackedAirport.icao_code : trackedAirport.iata_code!,
            new Date(parsed.data.start),
            new Date(parsed.data.end)
        )

        responseData.arrivals = [
            ...timetable.arrivals,
            ...timetable.scheduled_arrivals
        ].sort((a: any, b: any) => new Date(a.scheduled_in).getTime() - new Date(b.scheduled_in).getTime())
        responseData.departures = [
            ...timetable.departures,
            ...timetable.scheduled_departures
        ].sort((a: any, b: any) => new Date(a.scheduled_out).getTime() - new Date(b.scheduled_out).getTime())
    }else if(trackedAirport.direction === 'in'){
        const arrivals: any = await flightAwareService.fetchAirportTimetable(
            !!trackedAirport.icao_code ? trackedAirport.icao_code : trackedAirport.iata_code!,
            new Date(parsed.data.start),
            new Date(parsed.data.end),
            'arrivals'
        )

        const scheduled: any = await flightAwareService.fetchAirportTimetable(
            !!trackedAirport.icao_code ? trackedAirport.icao_code : trackedAirport.iata_code!,
            new Date(parsed.data.start),
            new Date(parsed.data.end),
            'scheduled_arrivals'
        )

        responseData.arrivals = [
            ...arrivals.arrivals,
            ...scheduled.scheduled_arrivals
        ].sort((a: any, b: any) => new Date(a.scheduled_in).getTime() - new Date(b.scheduled_in).getTime())
    }else if (trackedAirport.direction === 'out'){
        const departures: any = await flightAwareService.fetchAirportTimetable(
            !!trackedAirport.icao_code ? trackedAirport.icao_code : trackedAirport.iata_code!,
            new Date(parsed.data.start),
            new Date(parsed.data.end),
            'departures'
        )

        const scheduled: any = await flightAwareService.fetchAirportTimetable(
            !!trackedAirport.icao_code ? trackedAirport.icao_code : trackedAirport.iata_code!,
            new Date(parsed.data.start),
            new Date(parsed.data.end),
            'scheduled_departures'
        )

        responseData.departures = [
            ...departures.departures,
            ...scheduled.scheduled_departures
        ].sort((a: any, b: any) => new Date(a.scheduled_out).getTime() - new Date(b.scheduled_out).getTime())
    }

    return jsonResponse(responseData)
}

export async function getAirportDelays(request: Request, id: number){
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id
    const trackedAirport = getTrackedAirportById(userId, id)

    if(trackedAirport === null){
        return jsonResponse({error: "Tracking not found"}, 404)
    }

    if(trackedAirport.icao_code === null && trackedAirport.iata_code === null){
        return jsonResponse({error: "Tracked airport has no valid ICAO or IATA code."}, 400)
    }

    const flightAwareKey = getFlightawareKey(userId)
    if (flightAwareKey === null) {
        return jsonResponse({error: "Flightaware API key is missing."}, 400)
    }

    const flightAwareService = new FlightawareService(flightAwareKey)
    const delays = await flightAwareService.fetchAirportDelays(!!trackedAirport.icao_code ? trackedAirport.icao_code : trackedAirport.iata_code!)

    return jsonResponse(delays)
}

function getTrackedAirports(userId: number): (TrackedAirport | null)[] {
    return db.prepare("SELECT * FROM tracked_airports WHERE user_id = ?")
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

function isAirportAlreadyTracked(userId: number, icaoCode: string | null, iataCode: string | null, direction: string, id: number|null = null): {
    already_tracked: number
} {
    const query = "SELECT COUNT(*) as already_tracked FROM tracked_airports WHERE user_id = ? AND (icao_code = ? OR iata_code = ?) AND direction = ?"
        .concat(id !== null ? " AND id <> ?" : "")
        .concat("LIMIT 1")

    const args = [userId, icaoCode, iataCode, direction]
    if (id !== null) {
        args.push(id)
    }

    return db.prepare(query)
        .get(...args) as {already_tracked: number}
}
