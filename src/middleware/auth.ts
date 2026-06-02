import { verifyToken, type TokenPayload } from '../utils/jwt.ts';
import { jsonResponse } from '../utils/response.ts';

/**
 * Valida il Bearer token nell'header Authorization.
 * Se valido, restituisce il payload decodificato.
 * Se non valido o assente, restituisce una Response 401.
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
 * Restituisce true se il valore è una Response (autenticazione fallita).
 */
export function isAuthError(value: TokenPayload | Response): value is Response {
    return value instanceof Response;
}
