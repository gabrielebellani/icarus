import {authenticate, isAuthError} from "../middleware/auth.ts";
import {db} from "../index.ts";
import {Preference} from "../classes/Preference.ts";
import {jsonResponse} from "../utils/response.util.ts";
import {type PreferenceKeyEnum, PreferenceUserCanSet} from "../enums/PreferenceKeyEnum.ts";
import {AppPreference} from "../classes/AppPreference.ts";
import {getFlightawareKey} from "../utils/third_party.util.ts";
import {FlightawareService} from "../services/flightaware.service.ts";

export async function getUserPreferences(request: Request) {
    const auth = await authenticate(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const rawPreferences = db.query("SELECT * FROM preferences WHERE user_id = ?")
        .all(userId)

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

    try {
        db.transaction(async () => {
            for (const prefData of body) {
                const pref = new Preference(userId, prefData.key, prefData.value);

                if (!PreferenceUserCanSet.includes(pref.key)) {
                    continue;
                }

                db.prepare(`
                    INSERT INTO preferences (user_id, key, value)
                    VALUES (?, ?, ?)
                    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
                `).run(userId, pref.key, pref.value);
            }
        });
        return jsonResponse({message: 'Preferences updated successfully'});
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
        }
    })

}

export function getPreference(key: PreferenceKeyEnum, userId: number): Preference | null {
    const preference = db.query("SELECT * FROM preferences WHERE user_id = ? AND key = ?").get(userId, key)
    if (preference === null) {
        return null
    }
    return Preference.fromDB(preference)
}

export function getAppPreference(key: PreferenceKeyEnum): AppPreference | null {
    const preference = db.query("SELECT * FROM preferences WHERE user_id IS NULL AND key = ?").get(key)
    if (preference === null) {
        return null
    }
    return AppPreference.fromDB(preference)
}
