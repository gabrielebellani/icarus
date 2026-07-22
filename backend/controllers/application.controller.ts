import {db} from "../index.ts";
import {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";
import {env} from "../utils/env.ts";
import {jsonResponse} from "../utils/response.ts";
import {getAppPreference} from "./preferences.controller.ts";
import {initEmailTransporter} from "../utils/email.util.ts";

export async function bootstrapSuperuser(): Promise<void> {
    const username = env.SUPERUSER_USERNAME;
    const password = env.SUPERUSER_PASSWORD;

    const existing = db.prepare('SELECT id, password FROM users WHERE username = ?').get(username) as { id: number; password: string } | null;

    if (!existing) {
        const passwordHash = await Bun.password.hash(password);
        db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, passwordHash);
        const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number };
        db.prepare('INSERT OR IGNORE INTO preferences (user_id, key, value) VALUES (?, ?, ?)').run(user.id, PreferenceKeyEnum.SUPERUSER, 'true');
        console.log('[bootstrap] Superuser created.');
    } else {
        const passwordMatches = await Bun.password.verify(password, existing.password);
        if (!passwordMatches) {
            const newHash = await Bun.password.hash(password);
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, existing.id);
            console.log('[bootstrap] Superuser password updated.');
        }
        db.prepare('INSERT OR IGNORE INTO preferences (user_id, key, value) VALUES (?, ?, ?)').run(existing.id, PreferenceKeyEnum.SUPERUSER, 'true');
    }

    // Bootstrap password recovery availability
    const smtpConfigured = initEmailTransporter();
    const existingPref = db.prepare('SELECT value FROM preferences WHERE user_id IS NULL AND key = ?')
        .get(PreferenceKeyEnum.PASSWORD_RECOVERY_AVAILABLE) as { value: string } | null;

    if (smtpConfigured && existingPref && existingPref.value === 'true') {
        console.log('[bootstrap] Password recovery available (SMTP configured).');
        return;
    }else if(smtpConfigured && existingPref && existingPref.value === 'false') {
        //update the value of the preference on db to true
        db.prepare('UPDATE preferences SET value = ? WHERE user_id IS NULL AND key = ?')
            .run('true', PreferenceKeyEnum.PASSWORD_RECOVERY_AVAILABLE);
        console.log('[bootstrap] Password recovery available (SMTP configured).');
        return;
    }else if(!smtpConfigured && existingPref && existingPref.value === 'true') {
        //update the value of the preference on db to false
        db.prepare('UPDATE preferences SET value = ? WHERE user_id IS NULL AND key = ?')
            .run('false', PreferenceKeyEnum.PASSWORD_RECOVERY_AVAILABLE);
    }else{
        //create the preference on db
        db.prepare('INSERT INTO preferences (user_id, key, value) VALUES (?, ?, ?)')
            .run(null, PreferenceKeyEnum.PASSWORD_RECOVERY_AVAILABLE, smtpConfigured ? 'true' : 'false');

        console.log('[bootstrap] Password recovery availability set to ' + (smtpConfigured ? 'true' : 'false') + '.');
        return
    }

    console.log('[bootstrap] Password recovery not available (SMTP not configured).');
}

export function getApplicationPublicConfig(request: Request){
    const registrationDisabledPref = getAppPreference(PreferenceKeyEnum.DISABLE_REGISTRATION)
    const passwordRecoveryAvailable = getAppPreference(PreferenceKeyEnum.PASSWORD_RECOVERY_AVAILABLE)
    return jsonResponse({
        "registration_disabled": registrationDisabledPref ? registrationDisabledPref.value as boolean : false,
        "password_recovery_available": passwordRecoveryAvailable ? passwordRecoveryAvailable.value as boolean : false
    })
}
