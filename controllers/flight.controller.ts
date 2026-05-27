import {authenticate, isAuthError} from "../middleware/auth.ts";
import {getFlightawareKey, getOpenSkyKey} from "../utils/third_party.ts";
import {jsonResponse} from "../utils/response.ts";
import {FlightawareService} from "../services/FlightAware/flightaware.service.ts";
import {z} from "zod";
import {startOfDay, subDays, endOfDay, addDays} from "date-fns";

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

export async function trackFlight(request: Request) {
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
        return jsonResponse("Flightaware API key is missing.", 400)
    }

    const flightAwareService = new FlightawareService(flightAwareKey)
    return jsonResponse(await flightAwareService.fetchFlightInfo(parsed.data.identifier, new Date(parsed.data.date)))


}
