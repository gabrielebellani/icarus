import {db} from "../index.ts";
import {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";
import {env} from "../utils/env.ts";
import {jsonResponse} from "../utils/response.ts";
import {getAppPreference} from "./preferences.controller.ts";

export async function bootstrapSuperuser(): Promise<void> {
    const username = env.SUPERUSER_USERNAME;
    const password = env.SUPERUSER_PASSWORD;

    const existing = db.prepare('SELECT id, password FROM users WHERE username = ?').get(username) as { id: number; password: string } | null;

    if (!existing) {
        const passwordHash = await Bun.password.hash(password);
        db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, passwordHash);
        const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number };
        db.prepare('INSERT OR IGNORE INTO preferences (user_id, key, value) VALUES (?, ?, ?)').run(user.id, PreferenceKeyEnum.SUPERUSER, 'true');
        console.log('[bootstrap] Superuser creato.');
    } else {
        const passwordMatches = await Bun.password.verify(password, existing.password);
        if (!passwordMatches) {
            const newHash = await Bun.password.hash(password);
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, existing.id);
            console.log('[bootstrap] Password superuser aggiornata.');
        }
        db.prepare('INSERT OR IGNORE INTO preferences (user_id, key, value) VALUES (?, ?, ?)').run(existing.id, PreferenceKeyEnum.SUPERUSER, 'true');
    }
}

export function getApplicationPublicConfig(request: Request){
    const registrationDisabledPref = getAppPreference(PreferenceKeyEnum.DISABLE_REGISTRATION)
    return jsonResponse({
        "registration_disabled": registrationDisabledPref ? registrationDisabledPref.value as boolean : false
    })
}
