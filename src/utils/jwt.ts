import { SignJWT, jwtVerify } from 'jose';
import { env } from './env.ts';

export type TokenPayload = {
    user_id: number;
    role: 'superuser' | 'user';
};

function getSecret(): Uint8Array {
    return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS512' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(getSecret());
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload, type: 'refresh' })
        .setProtectedHeader({ alg: 'HS512' })
        .setIssuedAt()
        .setExpirationTime('90d')
        .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload & { type?: string }> {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS512'] });
    return payload as any;
}

export function hashToken(token: string): string {
    return new Bun.CryptoHasher('sha256').update(token).digest('hex');
}
