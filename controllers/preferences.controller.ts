import {authenticate, isAuthError} from "../middleware/auth.ts";
import {db} from "../index.ts";
import {Preference} from "../classes/Preference.ts";
import {jsonResponse} from "../utils/response.ts";
import type {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";

export async function getUserPreferences(request: Request) {
    const auth = await authenticate(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const rawPreferences = db.query("SELECT * FROM preferences WHERE user_id = ?")
        .all(userId)

    return jsonResponse(Preference.fromDBBulk(rawPreferences))
}

export function getPreference(key: PreferenceKeyEnum, userId: number){
    const preference = db.query("SELECT * FROM preferences WHERE user_id = ? AND key = ?").get(userId, key)
    if(preference === null){
        return null
    }
    return Preference.fromDB(preference)
}
