import {authenticate, isAuthError} from "../middleware/auth.ts";
import {db} from "../index.ts";
import {Preference} from "../classes/Preference.ts";

export async function getUserPreferences(request: Request) {
    const auth = await authenticate(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    const rawPreferences = db.query("SELECT * FROM preferences WHERE user_id = ?")
        .all(userId)

    return Preference.fromDBBulk(rawPreferences)
}
