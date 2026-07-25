import {db} from "../index.ts";
import {Preference} from "../classes/Preference.ts";
import {AppPreference} from "../classes/AppPreference.ts";
import {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";

export class PreferencesRepository {

    static setPreference(key: PreferenceKeyEnum, userId: number, value: any): void {
        const pref = new Preference(userId, key, value);
        db.prepare(`
            INSERT INTO preferences (user_id, key, value)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
        `).run(userId, pref.key, pref.value);
    }

    static getPreference(key: PreferenceKeyEnum, userId: number): Preference | null {
        const preference = db.query("SELECT * FROM preferences WHERE user_id = ? AND key = ?").get(userId, key)
        if (preference === null) {
            return null
        }
        return Preference.fromDB(preference)
    }

    static getAppPreference(key: PreferenceKeyEnum): AppPreference | null {
        const preference = db.query("SELECT * FROM preferences WHERE user_id IS NULL AND key = ?").get(key)
        if (preference === null) {
            return null
        }
        return AppPreference.fromDB(preference)
    }

    static getPreferences(userId: number) {
        return db.query("SELECT * FROM preferences WHERE user_id = ?")
            .all(userId)
    }
}
