import {authenticate, isAuthError} from "../middleware/auth.ts";
import {db} from "../index.ts";
import {Preference} from "../classes/Preference.ts";
import {jsonResponse} from "../utils/response.util.ts";
import {PreferenceKeyEnum, PreferenceUserCanSet} from "../enums/PreferenceKeyEnum.ts";
import {getFlightawareKey} from "../utils/third_party.util.ts";
import {FlightawareService, isFlightawareBudgetBlocked} from "../services/flightaware.service.ts";
import {PreferencesRepository} from "../repositories/preferences.repository.ts";

export async function getUserPreferences(request: Request) {
    const auth = await authenticate(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const rawPreferences = PreferencesRepository.getPreferences(userId)

    return jsonResponse(Preference.fromDBBulk(rawPreferences))
}

export async function setUserPreferences(request: Request) {
    const auth = await authenticate(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const body = await request.json();
    if (!Array.isArray(body)) {
        return jsonResponse({error: 'Expected an array of preferences'}, 422);
    }

    const flightawareEntry = body.find((prefData: any) => prefData.key === PreferenceKeyEnum.FLIGHTAWARE_API_KEY);
    if (flightawareEntry) {
        body.push({
            key: PreferenceKeyEnum.OPEN_SKY_DAILY_THRESHOLD,
            value: flightawareEntry.value ? 4000 : 400,
        });
    }

    try {
        db.transaction(() => {
            for (const prefData of body) {
                if (!PreferenceUserCanSet.includes(prefData.key)) {
                    continue;
                }

                PreferencesRepository.setPreference(prefData.key, userId, prefData.value);
            }
        })();
        return jsonResponse({message: 'Preferences updated successfully', preferences: PreferencesRepository.getPreferences(userId)});
    } catch (error) {
        return jsonResponse({error: error instanceof Error ? error.message : 'An error occurred'}, 500);
    }
}

export async function getThirdPartyAPIUsage(request: Request) {
    const auth = await authenticate(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const flightAwareKey = getFlightawareKey(userId)
    if (flightAwareKey === null) {
        return jsonResponse({error: "Flightaware API key is missing."}, 400)
    }

    const flightAwareService = new FlightawareService(flightAwareKey, userId)
    const usage: any = await flightAwareService.fetchUsage()

    return jsonResponse({
        flight_aware: {
            total_calls: usage.total_calls,
            total_pages: usage.total_pages,
            total_cost: usage.total_cost,
            total_discount_cost: usage.total_discount_cost,
            total_successful_calls: usage.total_successful_calls,
            total_failed_calls: usage.total_failed_calls,
            quota_exceeded: isFlightawareBudgetBlocked(userId),
        }
    })

}
