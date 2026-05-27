import { z } from 'zod';
import { db } from '../index.ts';
import { PreferenceKeyEnum } from '../enums/PreferenceKeyEnum.ts';
import { signAccessToken, signRefreshToken, verifyToken, type TokenPayload } from '../utils/jwt.ts';
import { jsonResponse } from '../utils/response.ts';
import { authenticate, isAuthError } from '../middleware/auth.ts';
import {env} from "../utils/env.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserRole(userId: number): 'superuser' | 'user' {
    const pref = db
        .prepare("SELECT value FROM preferences WHERE user_id = ? AND key = ?")
        .get(userId, PreferenceKeyEnum.SUPERUSER) as { value: string } | null;
    return pref?.value === 'true' ? 'superuser' : 'user';
}

async function issueTokenPair(userId: number): Promise<{ access_token: string; refresh_token: string }> {
    const role = getUserRole(userId);
    const payload: TokenPayload = { user_id: userId, role };

    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);

    return { access_token: accessToken, refresh_token: refreshToken };
}

// ─── Register ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
    username: z.string().min(4).max(255),
    password: z.string().min(8).max(255),
    email: z.email()
});

export async function registerUser(request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
        return jsonResponse({ errors: parsed.error.issues }, 422);
    }
    const { username, password, email } = parsed.data;

    // Controlla se la registrazione è disabilitata (preference del superuser, user_id=1)
    const disabledPref = db
        .prepare("SELECT value FROM preferences WHERE user_id = 1 AND key = ?")
        .get(PreferenceKeyEnum.DISABLE_REGISTRATION) as { value: string } | null;
    if (disabledPref?.value === 'true') {
        return jsonResponse({ error: 'Registration is disabled' }, 403);
    }

    // Controlla duplicati
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
        return jsonResponse({ error: 'Username already taken' }, 409);
    }

    const passwordHash = await Bun.password.hash(password);
    db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)').run(username, passwordHash, email);
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number };

    const tokens = await issueTokenPair(user.id);
    return jsonResponse(tokens, 201);
}

// ─── Init User (primo accesso) ────────────────────────────────────────────────

const initUserSchema = z.object({
    openSkyNetworkKey: z.string().optional(),
    coordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
    }).optional(),
    radius: z.number().optional(),
    display_mode: z.enum(['minimal', 'detailed', 'flight', 'airport']).optional(),
});

export async function userRequiresInit(request: Request): Promise<Response> {
    const auth = await authenticate(request)
    if(isAuthError(auth)) return auth;

    const userId = auth.user_id
    const initializedPreferenceExists = db.query("SELECT COUNT(*) initialized FROM preferences WHERE user_id = ? AND key = ?")
        .get(userId, PreferenceKeyEnum.INITIALIZED) as {initialized: number}

    return jsonResponse(!initializedPreferenceExists.initialized)
}

export async function initUser(request: Request): Promise<Response> {
    const auth = await authenticate(request);
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;
    const body = await request.json();
    const parsed = initUserSchema.safeParse(body);
    if (!parsed.success) {
        return jsonResponse({ errors: parsed.error.issues }, 422);
    }


    // Controlla se già inizializzato
    const alreadyInit = db
        .prepare("SELECT id FROM preferences WHERE user_id = ? AND key = ? AND value = ?")
        .get(userId, PreferenceKeyEnum.INITIALIZED, 'true') as { id: number } | null;
    if (alreadyInit) {
        return jsonResponse({ error: 'User already initialized' }, 409);
    }

    const { openSkyNetworkKey, coordinates, radius, display_mode } = parsed.data;

    const preferencesToInsert: [number, string, string | null][] = [
        [userId, PreferenceKeyEnum.OPEN_SKY_API_KEY, openSkyNetworkKey ? openSkyNetworkKey.length > 0 ? openSkyNetworkKey : null : null],
        [userId, PreferenceKeyEnum.COORDINATES, coordinates ? JSON.stringify(coordinates) : null],
        [userId, PreferenceKeyEnum.RADIUS, radius != null ? String(radius) : null],
        [userId, PreferenceKeyEnum.DEFAULT_DISPLAY_MODE, display_mode ?? null],
        [userId, PreferenceKeyEnum.INITIALIZED, 'true'],
    ];

    const placeholders = preferencesToInsert.map(() => '(?, ?, ?)').join(', ');
    const params: (number | string | null)[] = preferencesToInsert.flat();
    db.prepare(`INSERT OR IGNORE INTO preferences (user_id, key, value) VALUES ${placeholders}`).run(...params);

    return jsonResponse({ message: 'User initialized' }, 200);
}

// ─── Login ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
});

export async function loginUser(request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
        return jsonResponse({ errors: parsed.error.issues }, 422);
    }
    const { username, password } = parsed.data;

    const user = db.prepare('SELECT id, password FROM users WHERE username = ?').get(username) as { id: number; password: string } | null;
    if (!user) {
        return jsonResponse({ error: 'Invalid credentials' }, 401);
    }

    const valid = await Bun.password.verify(password, user.password);
    if (!valid) {
        return jsonResponse({ error: 'Invalid credentials' }, 401);
    }

    const tokens = await issueTokenPair(user.id);
    return jsonResponse(tokens, 200);
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

const refreshSchema = z.object({
    refresh_token: z.string(),
});

export async function refreshAccessToken(request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = refreshSchema.safeParse(body);
    if (!parsed.success) {
        return jsonResponse({ errors: parsed.error.issues }, 422);
    }
    const { refresh_token } = parsed.data;

    let payload: any;
    try {
        payload = await verifyToken(refresh_token);
    } catch {
        return jsonResponse({ error: 'Invalid or expired refresh token' }, 401);
    }

    if (payload.type !== 'refresh') {
        return jsonResponse({ error: 'Invalid token type' }, 401);
    }

    const tokens = await issueTokenPair(payload.user_id);
    return jsonResponse(tokens, 200);
}

// ─── Password Recovery ────────────────────────────────────────────────────────

const recoverySchema = z.object({
    username: z.string(),
});

export async function requestPasswordRecovery(request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = recoverySchema.safeParse(body);
    if (!parsed.success) {
        return jsonResponse({ errors: parsed.error.issues }, 422);
    }
    const { username } = parsed.data;

    const user = db.prepare('SELECT id FROM users WHERE username = ? AND username <> ?').get(username, env.SUPERUSER_USERNAME) as { id: number } | null;

    if (user) {
        const token = crypto.randomUUID();
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;
        db.prepare('UPDATE users SET password_reset_token = ?, password_reset_token_expires_at = ? WHERE id = ?')
            .run(token, expiresAt, user.id);

        // TODO: inviare per email; per ora log su console
        console.log(`[recovery] Token per "${username}": ${token}`);
    }

    console.log(user)

    return jsonResponse({ message: 'If the user exists, a recovery token has been issued' }, 200);
}

// ─── Password Reset ───────────────────────────────────────────────────────────

const resetSchema = z.object({
    token: z.string(),
    new_password: z.string().min(8).max(255),
});

export async function resetPassword(request: Request): Promise<Response> {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
        return jsonResponse({ errors: parsed.error.issues }, 422);
    }
    const { token, new_password } = parsed.data;

    const now = Math.floor(Date.now() / 1000);
    const user = db
        .prepare('SELECT id FROM users WHERE password_reset_token = ? AND password_reset_token_expires_at > ?')
        .get(token, now) as { id: number } | null;

    if (!user) {
        return jsonResponse({ error: 'Invalid or expired recovery token' }, 400);
    }

    const newHash = await Bun.password.hash(new_password);
    db.prepare('UPDATE users SET password = ?, password_reset_token = NULL, password_reset_token_expires_at = NULL WHERE id = ?')
        .run(newHash, user.id);

    return jsonResponse({ message: 'Password reset successfully' }, 200);
}
