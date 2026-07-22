import { verifyToken, type TokenPayload } from '../utils/jwt.ts';
import { jsonResponse } from '../utils/response.ts';

/**
 * Validates Authorization header.
 * If valid, decoded payload is returned.
 * If missing or invalid, Response 401 is returned.
 */
export async function authenticate(request: Request): Promise<TokenPayload | Response> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return jsonResponse({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.slice(7);
    try {
        const payload = await verifyToken(token);
        if (payload.type === 'refresh') {
            return jsonResponse({ error: 'Access token required' }, 401);
        }
        return payload as TokenPayload;
    } catch {
        return jsonResponse({ error: 'Invalid or expired access token' }, 401);
    }
}

/**
 * Returns true if value is Response type (failed authentication).
 */
export function isAuthError(value: TokenPayload | Response): value is Response {
    return value instanceof Response;
}
